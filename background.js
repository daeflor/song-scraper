//Note: It appears that since the transition to MV3, the declarative content rules have stopped working
    //The icon and popup are now enabled for all pages/tabs. 
    //Because of this, I've switched to using a different approach to only enable the icon/popup for specific pages.
// const _conditionsForValidTracklistPage = [
//     new chrome.declarativeContent.PageStateMatcher({
//         pageUrl: { 
//             hostEquals: 'music.youtube.com', 
//             schemes: ['https'],
//             pathEquals: '/playlist' 
//         }
//     })
// ];
// //When the extenstion is installed or updated...
// chrome.runtime.onInstalled.addListener(function(details) {
//     console.log("Background: Extension installed"); 
//     //Remove all pre-existing rules to start from a clean slate and then...
//     chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
        
//         // //createImageDataFromFile(_iconPaths.disabled, 96, function(imageData) {
//             let rule = {
//                 conditions: _conditionsForValidTracklistPage,
//                 actions: [
//                     //new chrome.declarativeContent.SetIcon({imageData: imageData}),
//                     new chrome.declarativeContent.ShowPageAction()
//                 ]
//             };

//             chrome.declarativeContent.onPageChanged.addRules([rule]); 
//             console.log("Background: Rules have been updated.");     
//         // //});
//     });
// });

// chrome.runtime.onSuspend.addListener(function() {
//     console.log("Unloading.");
//     chrome.action.setBadgeText({text: ""});
// });

try {
    self.importScripts('/node_modules/firebase/firebase-app.js'); //Import the Firebase App before any other Firebase libraries
    self.importScripts('/node_modules/firebase/firebase-auth.js'); //Import the Firebase Auth library
    self.importScripts('/scripts/Configuration/config-old.js');
        
    // chrome.runtime.onInstalled.addListener(details => {
    //     firebase.initializeApp(firebaseConfig);
    //     firebase.auth(); //TODO I think this is janky
    //     console.info("Extension installed and Firebase initialized.");
    //     chrome.action.disable();
    // });

    console.log("Starting service worker");

    const ICON_PATHS = Object.freeze({
        default: 'Images/icon.png',
        disabled: 'Images/icon_disabled.png'
    });

if (firebase.apps.length === 0) { // If Firebase has not yet been initialized (i.e. if the extension was just installed)...
    firebase.initializeApp(firebaseConfig); // Initialize Firebase
    firebase.auth(); // "Initialize" Firebase auth - TODO this is janky. It doesn't really seem necessary to do this, given how we're using firebase elsewhere in this script. Not including this triggers a warning when Firebase auth is first reference later in this script, however (nested under other listeners).
    chrome.action.disable(); // Disable the extension's icons on all tabs
}

//TODO the problem with doing this logic in an auth listener in the background script is that,
    //...on installation, if a user is signed in, the current tab (likely the Extensions Manager screen), will have its icon enabled, which is undesired behavior.
    //An alternative approach would be to update the icon directly from an extension script when the user manually logs in or out,
        //or send a message to the background script to update the icon accordingly.
// firebase.auth().onAuthStateChanged(user => { // When a change in the user's authentication state is detected...
//     console.log("The Firebase auth state changed.");
//     chrome.tabs.query({active: true, currentWindow: true}, tabs => {
//         //TODO get the current track count from cached metadata
//             //TODO get the previous track count from local or sync storage
//                 console.log(tabs);
//                 chrome.webNavigation.getAllFrames({tabId: tabs[0].id}, details => {
//                     console.log(details);
//                 });
//                 //TODO for some reason sometimes tabs is undefined when the user logs out manually...
//                     //My guess is that in some cases the auth listener fires before the YTM tab is actually set as active again... Doesn't make much sense though
//                 enableAndUpdateIcon(tabs[0].id);
//     });
//     // //(user === null) ? startFirebaseUIAuthFlow() : onSuccessCallback();
//     // if (user === null) { // If the user is not signed in, show the auth screen
//     //     console.log("A Firebase user is NOT signed in.");
//     //     chrome.action.setPopup({popup: ''});
//     //     //updateBadgeText("login"); //TODO this won't be sufficient because it seems on page reload, the badge text gets reset. Right now, it's getting reset to blank and then not updated.
//     // } else { 
//     //     console.log("A Firebase user is signed in.");
//     //     chrome.action.setPopup({popup: 'popup.html'});
        
//     //     //TODO these don't work to properly override the YTM icon & badge because they don't specify tabId. Since previously the icon & badge were updated specifically for YTM tab, these calls now get ignored by that tab.
//     //     // chrome.action.disable();
//     //     // chrome.action.setBadgeText({text: "reload"});//TODO this affects all tabs. Could try force reloading the ytm page instead
//     //     // chrome.action.setBadgeBackgroundColor({color: [255, 153, 153, 200]}); // Rose
//     // }
// });

// Note: this works because YouTube Music appears to use the History API to navigate between pages on the site
chrome.webNavigation.onHistoryStateUpdated.addListener(details => {    

    // chrome.identity.getProfileUserInfo(userInfo => {
    //     console.log(userInfo);
    // });

    // chrome.tabs.get(details.tabId, tab => {
    //     console.log(tab);
    // });

    //console.log("Web nav event fired");
    if (details.url.includes('/library/songs') === true) {
        cacheTracklistMetadata('all', 'Added from YouTube Music'); // Cache the tracklist type and title in chrome local storage
        enableAndUpdateIcon(details.tabId);
    } else if (details.url.includes('/library/uploaded_songs') === true) {
        cacheTracklistMetadata('uploads', 'Uploaded Songs'); //Cache the tracklist type and title in chrome local storage
        enableAndUpdateIcon(details.tabId);
    }   
    //TODO Since the track count reported in the YTM UI for the 'Your Likes' list seems to be way off, it may be acceptable to just not bother getting the track count to update the icon for this page, since it's likely to be incorrect anyway. Instead, we could just always display the icon with a question mark, like with the 'added' and 'uploaded' cases.
    else if (details.url.includes('list=LM') === false && details.url.includes('list=PL') === false) {
        chrome.action.disable(details.tabId); // Disable the popup action for the specified tab
        chrome.action.setIcon({path: ICON_PATHS.disabled, tabId: details.tabId}); // Show the 'disabled' icon
        chrome.action.setBadgeText({text: "", tabId: details.tabId}); // Clear any badge text on the icon
    } // TEMP (because the flow from the content script metadata observer hasn't been updated yet for the new logic):
    else {
        enableAndUpdateIcon(details.tabId);
    }
}, {url: [{hostEquals : 'music.youtube.com'}]});

function enableAndUpdateIcon(tabId, trackCountDelta) {
    //TODO maybe in here call a helper function to get the trackcount delta?
        //TODO include a param indicating whether or not a track count delta should be shown

    chrome.action.setIcon({path: ICON_PATHS.default, tabId: tabId});
    chrome.action.enable(tabId); // Enable the popup action for the specified tab
    
    if (firebase.auth().currentUser instanceof firebase.User === true) {
        if (typeof trackCountDelta === 'number') {
            if (trackCount === 0) {
                chrome.action.setBadgeText({text: "0", tabId: tabId});
                chrome.action.setBadgeBackgroundColor({color: [255, 178, 102, 200], tabId: tabId}); // Peach
            } else if (trackCount > 0) {
                chrome.action.setBadgeText({text: "+" + trackCountDelta, tabId: tabId});
                chrome.action.setBadgeBackgroundColor({color: [255, 178, 102, 200], tabId: tabId}); // Peach
            } else {
                chrome.action.setBadgeText({text: trackCountDelta, tabId: tabId});
                chrome.action.setBadgeBackgroundColor({color: [255, 153, 153, 200], tabId: tabId}); // Rose
            }
        } else {
            chrome.action.setBadgeText({text: "?", tabId: tabId});
            chrome.action.setBadgeBackgroundColor({color: [255, 178, 102, 200], tabId: tabId}); // Peach
        }
    } else {
        chrome.action.setBadgeText({text: "login", tabId: tabId});
        chrome.action.setBadgeBackgroundColor({color: [64, 64, 64, 200], tabId: tabId}); // Dark Grey
    }
}

/*
// Note: this works because YouTube Music appears to use the History API to navigate between pages on the site
chrome.webNavigation.onHistoryStateUpdated.addListener(details => {    

    if (details.url.includes('/library/songs') === true) {
        cacheTracklistMetadata('all', 'Added from YouTube Music'); // Cache the tracklist type and title in chrome local storage
        chrome.action.enable(details.tabId); // Enable the popup action for this tab

        if (firebase.auth().currentUser instanceof firebase.User === true) {
            updateIcon('exclamation', details.tabId); //Note: since the track count isn't known prior to a complete scrape, the 'exclamation' icon is shown by default
            updateBadgeText("?");
            chrome.action.setBadgeBackgroundColor({color: [255, 127, 0, 255]});
            console.log("Updated the extension icon as applicable for 'Added from YTM' tracklist.");
        } else {
            updateBadgeText("login");
        }
    } 
}, {url: [{hostEquals : 'music.youtube.com'}]});
*/

// function reactToPageChange(url, tabId, userIsAuthenticated/*, icon, badgeText, badgeColor*/) {
    
//     // If the URL matches the 'Added from YTM' or 'Uploaded Songs' Tracklists, cache the tracklist title and type
//     if (url.includes('/library/songs') === true) {
//         cacheTracklistMetadata('all', 'Added from YouTube Music');
//     } else if (url.includes('/library/uploaded_songs') === true) {
//         cacheTracklistMetadata('uploads', 'Uploaded Songs'); //Cache the tracklist type and title in chrome local storage
//     }

//     chrome.action.enable(tabId); // Enable the popup action for the current tab

//     if (userIsAuthenticated === true) {
//         updateIcon(icon, details.tabId); //Note: since the track count isn't known prior to a complete scrape, the 'exclamation' icon is shown by default
//         updateBadgeText(badgeText);
//         chrome.action.setBadgeBackgroundColor({color: [255, 127, 0, 255]});
//         console.log("Updated the extension icon as applicable for 'Added from YTM' tracklist.");
//     }
// }

// function updateIconForValidYTMPage(trackCountDelta) {
//     updateIcon('default');

//     if (firebase.auth().currentUser instanceof firebase.User === true) {
//         if (typeof trackCountDelta === 'number') {
//             if (trackCountDelta === 0) {
//                 updateBadgeText("0");
//                 chrome.action.setBadgeBackgroundColor({color: [255, 255, 255, 255]});
//                 console.info("Background: The current track count (from the DOM) is the same as the stored track count.");
//             } else {
//                 console.info("Background: The current track count (from the DOM) is different from the stored track count.");
//                 const _badgeText = (_trackCountDelta > 0) ? "+" + _trackCountDelta.toString() : _trackCountDelta.toString(); //Prefix the badge text with a "+" if the delta is positive
//                 const _badgeColor = (_trackCountDelta > 0) ? [255, 127, 0, 255] : [255, 0, 0, 255]; //Set to badge color to orange if the delta is positive, red if negative
//                 updateBadgeText(_badgeText);
//                 chrome.action.setBadgeBackgroundColor({color: _badgeColor});
//             }
//         }
//     } else {
//         chrome.action.setBadgeBackgroundColor({color: [255, 255, 255, 255]});
//         updateBadgeText("login");
//     }
// }

// const TRACK_COUNT_DELTA_TO_ICON_MAPPING = Object.freeze({
//     unknown: {
//         path: ICON_PATHS.default,
//         badgeText: "?",
//         badgeColor: [255, 127, 0, 255]
//     },
//     zero: {
//         path: ICON_PATHS.default,
//         badgeText: "0",
//         badgeColor: [255, 127, 0, 255]
//     },
//     positive: {
//         path: ICON_PATHS.default,
//         badgeText: "?",
//         badgeColor: [255, 127, 0, 255]
//     },
//     negative: {
//         path: ICON_PATHS.default,
//         badgeText: "?",
//         badgeColor: [255, 127, 0, 255]
//     }
// });

// function setIconBasedOnTrackCountDelta(tabId, trackCountDelta) {
//     let iconMapping = TRACK_COUNT_DELTA_TO_ICON_MAPPING.unknown;
//     if (typeof trackCountDelta === 'number') {
//         if (trackCount === 0) {
//             iconMapping = TRACK_COUNT_DELTA_TO_ICON_MAPPING.zero;
//         } else if (trackCount > 0) {
//             iconMapping = TRACK_COUNT_DELTA_TO_ICON_MAPPING.positive;
//         } else {
//             iconMapping = TRACK_COUNT_DELTA_TO_ICON_MAPPING.negative;
//         }
//     }

//     chrome.action.setIcon({path: iconMapping.path, tabId: tabId});
//     chrome.action.setBadgeText({text: text, tabId: tabs[0].id});
//     chrome.action.setBadgeBackgroundColor({color: [255, 255, 255, 255]});
// }


// //Note: this works because YouTube Music appears to use the History API to navigate between pages on the site
// chrome.webNavigation.onHistoryStateUpdated.addListener(details => {
//     console.log("history changed");
//     console.log(details);

//     //chrome.action.disable();

//     // chrome.action.getPopup({tabId: details.tabId}, result => { //TODO could use promise instead
//     //     console.log("Got Popup:");
//     //     console.log(result);

//     //     //TODO would be better if this could be done (just once) in options.js instead of here (every time the page changes).
//     //         //However, options would somehow need to be able to get the right tabID.
//     //         //Actually doing it here makes more sense, even if it is cumbersome, because the user could sign in from the options at any time, even when there is no YTM tab open. 
//     //         //...And the tab that needs to have the popup enabled isn't always going to be the same. It can be closed and opened again much later.
//     //     //if (result === '' && firebase.auth().currentUser !== null) { // If an html page for the popup has not yet been set, and the user is already signed into Firebase...
//     //     if (result === '') { // If an html for the popup has not yet been set...
//     //         if (firebase.auth().currentUser !== null) { // If the user is already signed into Firebase...
//     //             chrome.action.setPopup({popup: 'popup.html', tabId: details.tabId}); // Allow the popup to be opened if the icon is clicked on
//     //         } else { // Else, if the user is not yet signed in...
//     //             updateBadgeText("login", details.tabId); //Clear any badge text on the icon
//     //         }
//     //     }
//     // });

//     //firebase.initializeApp(firebaseConfig);
//     //console.log(firebase.auth());
//     console.log(firebase.auth().currentUser?.uid);
//     console.log(typeof firebase.auth().currentUser);
//     console.log(firebase.auth().currentUser);
//     console.log(firebase.auth().currentUser instanceof firebase.User);

//     //TODO what happens when user manually signs in or out when a YTM tab is open and they don't refresh the tab?
//         //Might have to do message passing from options to background, so the latter can update the icon accordingly.
//         //The options.js might also then store the firebaseuid in local storage cache (or clear the cache, if applicable)
//             //...so that the background script can access the uid without needing to actually connect to firebase.
//             //However, that's only if we somehow get rid of the check below to see if a firebase user is signed in
//             //As it is currently connecting to firebase from the background script is necessary anyway, so access to the uid is a given.

//     //TODO could change this with an if getPopup() !== ''
//     if (firebase.auth().currentUser !== null) {
//         //chrome.action.setPopup({popup: 'popup.html', tabId: details.tabId});
//         //console.log("Main web nav event fired");
//         //Update the tracklist metadata in the cache depending on the current URL
//         if (details.url.includes('/library/songs') === true) {
//             cacheTracklistMetadata('all', 'Added from YouTube Music'); //Cache the tracklist type and title in chrome local storage
            
//             //if (typeof firebase.auth().currentUser !== 'undefined') {
//                 updateIcon('exclamation', details.tabId); //Note: since the track count isn't known prior to a complete scrape, the 'exclamation' icon is shown by default
//                 updateBadgeText("?");
//                 chrome.action.setBadgeBackgroundColor({color: [255, 127, 0, 255]});
//                 //chrome.action.setPopup({popup: 'popup.html', tabId: details.tabId}); //Allow the popup to be opened if the icon is clicked on
//                 chrome.action.enable(details.tabId);
//                 //}
//         } else if (details.url.includes('/library/uploaded_songs') === true) {
//             cacheTracklistMetadata('uploads', 'Uploaded Songs'); //Cache the tracklist type and title in chrome local storage
            
//             //if (typeof firebase.auth().currentUser !== 'undefined') {
//                 updateIcon('exclamation', details.tabId); //Note: since the track count isn't known prior to a complete scrape, the 'exclamation' icon is shown by default
//                 updateBadgeText("?"); //TODO if gonna do this, should change color too
//                 chrome.action.setBadgeBackgroundColor({color: [255, 127, 0, 255]});
//                 //chrome.action.setPopup({popup: 'popup.html', tabId: details.tabId}); //Allow the popup to be opened if the icon is clicked on
//                 chrome.action.enable(details.tabId);
//                 //}
//         } else if (details.url.includes('list=LM') === true) {
//             //cacheTracklistMetadata('auto', 'Your Likes');
//             //chrome.action.setIcon({path: _iconPaths.exclamation});
//             //if (typeof firebase.auth().currentUser !== 'undefined') {
//                 //chrome.action.setPopup({popup: 'popup.html', tabId: details.tabId}); //Allow the popup to be opened if the icon is clicked on
//                 chrome.action.enable(details.tabId);
//                 //}
//         } //TODO Since the track count reported in the YTM UI for the 'Your Likes' list seems to be way off...
//             //...it may be acceptable to just not bother getting the track count to update the icon...
//             //...since it's likely to be incorrect anyway. Instead, we could just always display the regular icon, or a special one.
//         else if (details.url.includes('list=PL') === true) {
//             //if (typeof firebase.auth().currentUser !== 'undefined') { //TODO without these checks here, it may be possible for the user to sign in, then not refresh the page, then open the extension popup, and the 
//                 //chrome.action.setPopup({popup: 'popup.html', tabId: details.tabId}); //Allow the popup to be opened if the icon is clicked on
//                 chrome.action.enable(details.tabId);
//                 //}
//         } else { //Else, if the URL doesn't include any valid tracklist substrings...
//             console.info("Background: Navigated to a YouTube Music page that isn't a valid tracklist. The extension icon will be disabled.");
//             clearCachedTracklistMetadata(); //Clear the metadata cached in storage
//             //updateIcon('disabled', details.tabId); //Disable the extension icon
//             //updateBadgeText("", details.tabId); //Clear any badge text on the icon
//             chrome.action.disable(details.tabId);
//             //chrome.action.enable();
//             //chrome.action.setPopup({popup: '', tabId: details.tabId}); //Prevent the popup from being able to be opened
//         }
//     } else { // Else, if the user isn't signed in...
//         //TODO a problem with this approach is, if the user isn't signed in, the popup doesn't open, and so the user isn't
//             //...informed that they need to sign in and isn't given a link to sign in (e.g. in html or to options page)
//             //Might be able to leverage chrome.action.onClicked.addListener
//         console.info("User isn't signed in so the extension popup will be disabled.");
//         //updateIcon('disabled', details.tabId); //Disable the extension icon
//         updateBadgeText("login", details.tabId); //Clear any badge text on the icon
//         //chrome.action.disable(details.tabId);
//         chrome.action.setPopup({popup: '', tabId: details.tabId}); //Prevent the popup from being able to be opened
//         chrome.action.enable();
//     } 

// }, {url: [{hostEquals : 'music.youtube.com'}]});

// chrome.action.onClicked.addListener(tab => {
//     console.log("Onclicked fired.");
//     chrome.runtime.openOptionsPage(()=> {
//         console.log("The options page was opened.");
//     });
// });

function cacheTracklistMetadata(tracklistType, tracklistTitle) {
    const _tracklistMetadata = {
        type: tracklistType,
        title: tracklistTitle //TODO it may turn out that there's no point in storing the title at this point (i.e. we may always want to fetch it when loading the popup just in case it has changed since the page first loaded - unlikely but possible)
    };
    chrome.storage.local.set ({currentTracklistMetadata: _tracklistMetadata}, () => { //Cache the metadata in local storage
        if (typeof chrome.runtime.error !== 'undefined') {
            console.error("Error encountered while attempting to store metadata in local storage: " + chrome.runtime.lastError.message);
        }
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.greeting === 'TracklistMetadataUpdated') {
        console.log('The current tracklist metadata was updated. New track title is "%s" and new track count is "%s".',
            message.currentTracklistMetadata.title, message.currentTracklistMetadata.trackCount);

            //TODO can get tab id via sender.tab.id, so should send this along when updating the icon.
            
        if (firebase.auth().currentUser !== null) {
            compareTrackCountsAndUpdateIcon(message.currentTracklistMetadata.title, message.currentTracklistMetadata.trackCount);
        }
        // } else if (message.greeting === 'GetAuthToken'){
    //     chrome.identity.clearAllCachedAuthTokens(() => {
    //         console.log("Cleared cached token");
    //         getAuthToken((token) => {
    //             message.response = token;
    //             sendResponse(message);
    //         });
    //     });
    } /*else if (message.greeting === 'FirebaseUserSignedOut') {
        console.log("Received message from auth script. User signed out of Firebase.");
    } else if (message.greeting === 'Test') {
        console.log("Received message from extension script. Popup lost focus.");
    }*/
});

chrome.runtime.onConnect.addListener(port => {
    if (port.name === 'AuthenticationChangePending') {
        console.log("Port opened, with name: " + port.name);
        port.onDisconnect.addListener(port => {
            console.log(port);
            console.log("popup has been closed");

            chrome.tabs.query({active: true, currentWindow: true}, tabs => {
                enableAndUpdateIcon(tabs[0].id);
            });
        });
    }
});

/**
 * Compares the current and stored track counts for the current tracklist, and then updates the extension icon accordingly
 * @param {string} tracklistTitle The title of the tracklist, used to fetch the track count from storage
 * @param {number} currentTrackCount The tracklist's current track count
 */
//TODO getting the track count should probably be decoupled from updating the icon
//TODO I could technically just put almost all this logic (except action API calls) in the content script, if that helps at all 
function compareTrackCountsAndUpdateIcon(tracklistTitle, currentTrackCount) {
    getTrackCountFromGPMTracklistData(tracklistTitle, gpmTrackCount => {
        //(currentTrackCount === gpmTrackCount) ? updateIcon(_iconPaths.default) : updateIcon(_iconPaths.exclamation);

        if (typeof gpmTrackCount === 'undefined') {
            console.info("Background: The stored track count could not be determined.");
            updateIcon('default');
        } else {
            const _trackCountDelta = currentTrackCount - gpmTrackCount;
            if (_trackCountDelta === 0) {
                console.info("Background: The current track count (from the DOM) is the same as the stored track count.");
                updateIcon('default');
            } else {
                console.info("Background: The current track count (from the DOM) is different from the stored track count.");
                updateIcon('exclamation');
                const _badgeText = (_trackCountDelta > 0) ? "+" + _trackCountDelta.toString() : _trackCountDelta.toString(); //Prefix the badge text with a "+" if the delta is positive
                const _badgeColor = (_trackCountDelta > 0) ? [255, 127, 0, 255] : [255, 0, 0, 255]; //Set to badge color to orange if the delta is positive, red if negative
                updateBadgeText(_badgeText);
                chrome.action.setBadgeBackgroundColor({color: _badgeColor});
            }
        }
    });
}

/**
 * Updates the extension icon using the image at the given path for the specified tab or the active tab, if none is specified
 * @param {string} name The user-friendly name of the icon that should be show. Accepted values are: 'default', 'disabled', 'exclamation'
 * @param {number} [tabId] An optional ID to indicate the tab which should have its icon updated. If none is specified, only the active tab has its icon updated.
 */
function updateIcon(name, tabId) {
    const _iconPaths = Object.freeze({
        default: 'Images/icon.png',
        disabled: 'Images/icon_disabled.png',
        exclamation: 'Images/icon_exclamation_black.png' //TODO would prefer a different 'friendly' name for this
    });

    if (typeof tabId === 'number') {
        chrome.action.setIcon({path: _iconPaths[name], tabId: tabId});
    } else {
        chrome.tabs.query( { active: true, currentWindow: true}, tabs => { 
            chrome.action.setIcon({path: _iconPaths[name], tabId: tabs[0].id});
        });
    }

    console.info("Update the extension's icon.");
}

/**
 * Updates the icon badge text with the given text for the specified tab or, if none is specified, the active tab 
 * @param {string} text The text to display on the icon badge
 * @param {number} [tabId] An optional ID to indicate the tab which should have its icon updated. If none is specified, only the active tab has its icon updated.
 */
function updateBadgeText(text, tabId) {
    if (typeof tabId === 'number') {
        chrome.action.setBadgeText({text: text, tabId:tabId});
    } else {
        chrome.tabs.query( { active: true, currentWindow: true}, tabs => { 
            chrome.action.setBadgeText({text: text, tabId: tabs[0].id});
        });
    }
}

function getTrackCountFromGPMTracklistData(tracklistTitle, callback){
    const _storagekey = 'gpmLibraryData';
    chrome.storage.local.get(_storagekey, storageResult => {
        const _gpmLibraryData = storageResult[_storagekey];
        for (const tracklistKey in _gpmLibraryData) {
            if (tracklistKey.includes("'" + tracklistTitle + "'")) {
                console.log("Background: Retrieved tracklist metadata from GPM exported data. Track count: " + _gpmLibraryData[tracklistKey].length);
                callback(_gpmLibraryData[tracklistKey].length);
                return;
            }
        }
        console.warn("Tried retrieving GPM tracklist data but no tracklist with the provided title was found in storage. Tracklist Title: " + tracklistTitle);
        callback(undefined);
    });
}

/**
 * Clears the tracklist metadata which is cached in chrome local storage
 */
function clearCachedTracklistMetadata() {
    chrome.storage.local.set ({currentTracklistMetadata: {}}, () => {
        if (chrome.runtime.lastError != null) 
            console.error("ERROR: " + chrome.runtime.lastError.message);
        else
            console.info("Background: Cleared cached tracklist metadata.");
    });
}

// function getAuthToken(callback) {
//     chrome.identity.getAuthToken({interactive: true}, token => {
//         callback(token);
//     });
// }

} catch (error) {
    console.error(error);
}