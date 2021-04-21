
//TODO could switch to using browser_action and use badge on icon to indicate if the trackcount is different than what is stored.
    //Alternatively, could leave it as a page_action and use SetIcon to change the icon as needed
        //Actually, the API has been consolidated now, so it's possible to do both!

//TODO could just include this within the updateIcon function
const _iconPaths = {
    default: 'Images/icon.png',
    exclamation: 'Images/icon_exclamation_black.png',
    disabled: 'Images/icon_disabled.png',
};

// //TODO this won't work for the 'All Songs' lists
// const _conditionsForValidTracklistPage = [
//     new chrome.declarativeContent.PageStateMatcher({
//         pageUrl: { 
//             hostEquals: 'play.google.com', 
//             schemes: ['https'],
//             pathEquals: '/music/listen'
//         }
//     }),
//     new chrome.declarativeContent.PageStateMatcher({
//         pageUrl: { 
//             hostEquals: 'music.youtube.com', 
//             schemes: ['https'],
//             pathEquals: '/playlist' 
//         }
//     })
// ];

//TODO it seems that the page action is being shown on all pages now for some reason.
    //Could be related to the move to manifest V3. Needs investigation.
//When the extenstion is installed or updated...
// chrome.runtime.onInstalled.addListener(function(details) {
//     console.log("Background: Extension installed"); 
//     //Remove all pre-existing rules to start from a clean slate and then...
//     chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
        
//         // //createImageDataFromFile(_iconPaths.disabled, 96, function(imageData) {
//         //     let _rule = {
//         //         conditions: _conditionsForValidTracklistPage,
//         //         actions: [
//         //             //new chrome.declarativeContent.SetIcon({imageData: imageData}),
//         //             new chrome.declarativeContent.ShowPageAction()
//         //         ] 
//         //     };

//         //     chrome.declarativeContent.onPageChanged.addRules([_rule]); 
//              console.log("Background: Rules have been updated.");     
//         // //});
//     });
// });

// chrome.action.setBadgeText({text: "3"});
// chrome.action.setBadgeBackgroundColor({color: [0, 255, 0, 0]});//green


// chrome.runtime.onSuspend.addListener(function() {
//     console.log("Unloading.");
//     //chrome.browserAction.setBadgeText({text: ""});
// });

//Note: this works because YouTube Music appears to use the History API to navigate between pages on the site
chrome.webNavigation.onHistoryStateUpdated.addListener(details => {
    //console.log("Main web nav event fired");
    //Update the tracklist metadata in the cache depending on the current URL
    if (details.url.includes('/library/songs') === true) {
        cacheTracklistMetadata('all', 'Added from YouTube Music'); //Cache the tracklist type and title in chrome local storage
        updateIcon(_iconPaths.exclamation, details.tabId); //Note: since the track count isn't known prior to a complete scrape, the 'exclamation' icon is shown by default
        chrome.action.setPopup({popup: 'popup.html', tabId:details.tabId}); //Allow the popup to be opened if the icon is clicked on
        //chrome.action.enable();
    } else if (details.url.includes('/library/uploaded_songs') === true) {
        cacheTracklistMetadata('uploads', 'Uploaded Songs'); //Cache the tracklist type and title in chrome local storage
        updateIcon(_iconPaths.exclamation, details.tabId); //Note: since the track count isn't known prior to a complete scrape, the 'exclamation' icon is shown by default
        chrome.action.setPopup({popup: 'popup.html', tabId:details.tabId}); //Allow the popup to be opened if the icon is clicked on
    } else if (details.url.includes('list=LM') === true) {
        //cacheTracklistMetadata('auto', 'Your Likes');
        //chrome.action.setIcon({path: _iconPaths.exclamation});
        chrome.action.setPopup({popup: 'popup.html', tabId:details.tabId}); //Allow the popup to be opened if the icon is clicked on
    } //TODO Since the track count reported in the YTM UI for the 'Your Likes' list seems to be way off...
        //...it may be acceptable to just not bother getting the track count to update the icon...
        //...since it's likely to be incorrect anyway. Instead, we could just always display the regular icon, or a special one.
      else if (details.url.includes('list=PL') === true) {
        chrome.action.setPopup({popup: 'popup.html', tabId:details.tabId}); //Allow the popup to be opened if the icon is clicked on
    } else { //Else, if the URL doesn't include any valid tracklist substrings...
        console.info("Background: Navigated to a YouTube Music page that isn't a valid tracklist. The extension icon will be disabled.");
        clearCachedTracklistMetadata(); //Clear the metadata cached in storage
        updateIcon(_iconPaths.disabled, details.tabId); //Disable the extension icon
        updateBadgeText("", details.tabId); //Clear any badge text on the icon
        chrome.action.setPopup({popup: '', tabId:details.tabId}); //Prevent the popup from being able to be opened
    }
}, {url: [{hostEquals : 'music.youtube.com'}]});

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

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.greeting === 'TracklistMetadataUpdated') {
            console.log('The current tracklist metadata was updated. New track title is "%s" and new track count is "%s".',
                request.currentTracklistMetadata.title, request.currentTracklistMetadata.trackCount);
            compareTrackCountsAndUpdateIcon(request.currentTracklistMetadata.title, request.currentTracklistMetadata.trackCount);
        }
    }
);

//TODO There should be a better way to only have the popup enabled for specific tabs/pages
// chrome.tabs.onCreated.addListener(tab => {
//     console.log("Disabling icon for tab:");
//     console.log(tab);
//     chrome.action.disable(tab.id, () => {
//         console.log("The icon should now be disabled.");
//         //TODO i don't think the tab is fully set up at this point so the popup doesn't actually get disabled
//     });
// });

/**
 * Compares the current and stored track counts for the current tracklist, and then updates the extension icon accordingly
 * @param {string} tracklistTitle The title of the tracklist, used to fetch the track count from storage
 * @param {number} currentTrackCount The tracklist's current track count
 */
//TODO I could technically just put almost all this logic (except action API calls) in the content script, if that helps at all 
function compareTrackCountsAndUpdateIcon(tracklistTitle, currentTrackCount) {
    getTrackCountFromGPMTracklistData(tracklistTitle, gpmTrackCount => {
        //(currentTrackCount === gpmTrackCount) ? updateIcon(_iconPaths.default) : updateIcon(_iconPaths.exclamation);

        const _trackCountDelta = currentTrackCount - gpmTrackCount;
        if (_trackCountDelta === 0) {
            console.info("Background: The current track count (from the DOM) is the same as the stored track count.");
            updateIcon(_iconPaths.default);
        } else {
            console.info("Background: The current track count (from the DOM) is different from the stored track count.");
            updateIcon(_iconPaths.exclamation);
            const _badgeText = (_trackCountDelta > 0) ? "+" + _trackCountDelta.toString() : _trackCountDelta.toString();
            updateBadgeText(_badgeText);
        }
    });
}

/**
 * Updates the extension icon using the image at the given path for the specified tab or the active tab, if none is specified
 * @param {string} path The path to the image file to use to update the icon
 * @param {number} [tabId] An optional ID to indicate the tab which should have its icon updated. If none is specified, only the active tab has its icon updated.
 */
function updateIcon(path, tabId) {
    if (typeof tabId === 'number') {
        chrome.action.setIcon({path: path, tabId:tabId});
    } else {
        chrome.tabs.query( { active: true, currentWindow: true}, tabs => { 
            chrome.action.setIcon({path: path, tabId: tabs[0].id});
        });
    }
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
            }
        }
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