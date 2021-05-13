try {
    self.importScripts('/node_modules/firebase/firebase-app.js'); //Import the Firebase App before any other Firebase libraries
    self.importScripts('/node_modules/firebase/firebase-auth.js'); //Import the Firebase Auth library
    self.importScripts('/scripts/Configuration/config-old.js');
    console.info("Starting service worker");

    const ICON_PATHS = Object.freeze({
        default: 'Images/icon.png',
        disabled: 'Images/icon_disabled.png'
    });

    if (firebase.apps.length === 0) { // If Firebase has not yet been initialized (i.e. if the extension was just installed)...
        firebase.initializeApp(firebaseConfig); // Initialize Firebase
        firebase.auth(); // "Initialize" Firebase auth - TODO this is janky. It doesn't really seem necessary to do this, given how we're using firebase elsewhere in this script. Not including this triggers a warning when Firebase auth is first reference later in this script, however (nested under other listeners).
        chrome.action.disable(); // Disable the extension's icons on all tabs
    }

    // Note: this works because YouTube Music appears to use the History API to navigate between pages on the site
    chrome.webNavigation.onHistoryStateUpdated.addListener(details => {    
        //TODO is it possible to re-use this logic in some sort of validateURL func that could also be called after port disconnect?
        if (details.url.includes('/library/songs') === true) {
            const metadata = cacheTracklistMetadata('all', 'Added from YouTube Music'); // Cache the tracklist type and title in chrome local storage
            enableAndUpdateIcon(metadata, details.tabId);

            // cacheTracklistMetadata('all', 'Added from YouTube Music', metadataObject => {
            //     enableAndUpdateIcon(metadataObject, details.tabId);
            // });
        } else if (details.url.includes('/library/uploaded_songs') === true) {
            const metadata = cacheTracklistMetadata('uploads', 'Uploaded Songs'); //Cache the tracklist type and title in chrome local storage
            enableAndUpdateIcon(metadata, details.tabId);
        }   
        //TODO Since the track count reported in the YTM UI for the 'Your Likes' list seems to be way off, it may be acceptable to just not bother getting the track count to update the icon for this page, since it's likely to be incorrect anyway. Instead, we could just always display the icon with a question mark, like with the 'added' and 'uploaded' cases.
        else if (details.url.includes('list=LM') === false && details.url.includes('list=PL') === false) {
            chrome.action.disable(details.tabId); // Disable the popup action for the specified tab
            chrome.action.setIcon({path: ICON_PATHS.disabled, tabId: details.tabId}); // Show the 'disabled' icon
            chrome.action.setBadgeText({text: "", tabId: details.tabId}); // Clear any badge text on the icon
        }
    }, {url: [{hostEquals : 'music.youtube.com'}]});

    /**
     * Enables and updates the icon & badge for the specified tab based on the tracklist metadata provided
     * @param {Object} currentTracklistMetadata An object containing the current tracklist metadata, which will be used to determine the changes made to the icon. In some cases, this includes calculating and displaying the track count delta in the icon badge.
     * @param {number} [tabId] The id of the tab for which to update the icon. If none is provided, the active tab ID will be used.
    */
     async function enableAndUpdateIcon(currentTracklistMetadata, tabId) {
        if (typeof tabId === 'undefined') {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            tabId = tab.id;
        }

        if (firebase.auth().currentUser instanceof firebase.User === true) {
            if (typeof currentTracklistMetadata === 'object') {
                if (currentTracklistMetadata.type === 'all' || currentTracklistMetadata.type === 'uploads') {
                    chrome.action.setBadgeText({text: "?", tabId: tabId});
                    chrome.action.setBadgeBackgroundColor({color: [255, 178, 102, 200], tabId: tabId}); // Peach
                } else if (currentTracklistMetadata.type === 'playlist' || currentTracklistMetadata.type === 'likes') {

                    const previousTrackCount = await getPreviousTrackCount(currentTracklistMetadata.title);
                    const trackCountDelta = currentTracklistMetadata.trackCount - previousTrackCount;

                    if (trackCountDelta === 0) {
                        chrome.action.setBadgeText({text: "0", tabId: tabId});
                        chrome.action.setBadgeBackgroundColor({color: [255, 178, 102, 200], tabId: tabId}); // Peach
                    } else if (trackCountDelta > 0) {
                        chrome.action.setBadgeText({text: "+" + trackCountDelta.toString(), tabId: tabId});
                        chrome.action.setBadgeBackgroundColor({color: [255, 178, 102, 200], tabId: tabId}); // Peach
                    } else {
                        chrome.action.setBadgeText({text: trackCountDelta.toString(), tabId: tabId});
                        chrome.action.setBadgeBackgroundColor({color: [255, 153, 153, 200], tabId: tabId}); // Rose
                    }
                } else console.error(Error("Tried to update the extension's icon, but a valid tracklist type was not available in the provided tracklist metadata."));
            } else console.error(Error("Tried to update the extension's icon, but no metadata was provided for the current tracklist."));
        } else {
            chrome.action.setBadgeText({text: "login", tabId: tabId});
            chrome.action.setBadgeBackgroundColor({color: [64, 64, 64, 200], tabId: tabId}); // Dark Grey
        }

        chrome.action.setIcon({path: ICON_PATHS.default, tabId: tabId}); // Set the default icon (i.e. with full color, as opposed to the washed out 'disabled' icon)
        chrome.action.enable(tabId); // Enable the popup action for the specified tab
    }

    function cacheTracklistMetadata(tracklistType, tracklistTitle) {
        const tracklistMetadata = {type: tracklistType, title: tracklistTitle}; //TODO it may turn out that there's no point in storing the title at this point (i.e. we may always want to fetch it when loading the popup just in case it has changed since the page first loaded - unlikely but possible)
        chrome.storage.local.set({currentTracklistMetadata: tracklistMetadata}, () => { //Cache the metadata in local storage
            if (typeof chrome.runtime.error !== 'undefined') {
                console.error("Error encountered while attempting to store metadata in local storage: " + chrome.runtime.lastError.message);
            }
        });

        return tracklistMetadata;
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.greeting === 'TracklistMetadataUpdated') {
            console.log('The current tracklist metadata was updated. New track title is "%s" and new track count is "%s".',
                message.currentTracklistMetadata.title, message.currentTracklistMetadata.trackCount);
                
            enableAndUpdateIcon(message.currentTracklistMetadata, sender.tab?.id);
        }
    });

    chrome.runtime.onConnect.addListener(port => {
        if (port.name === 'AuthenticationChangePending') {
            port.onDisconnect.addListener(port => {
                chrome.storage.local.get('currentTracklistMetadata', storageResult => {
                    const metadata = storageResult['currentTracklistMetadata'];
                    enableAndUpdateIcon(metadata);
                });
            });
        }
    });

    /**
     * Returns a promise with the previous track count for the current tracklist, if available
     * @param {string} tracklistTitle The title of the current tracklist
     * @returns {Promise} A promise with the resulting track count, or an error if the tracklist data could not be found
     */
    function getPreviousTrackCount(tracklistTitle) {
        return new Promise((resolve, reject) => {
            //TODO in the future, I'll need a check here to determine if GPM or YTM data should be used to fetch the previous track count.
            getTrackCountFromGPMTracklistData(tracklistTitle, previousTrackCount => {
                typeof previousTrackCount === 'number'
                ? resolve(previousTrackCount)
                : reject(Error("Tried to retrieve the previous track count for the current tracklist, but data for the tracklist could not be found in storage."))
            });
        });
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
} catch (error) {
    console.error(error);
}