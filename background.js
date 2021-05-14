//try {
    self.importScripts('/node_modules/firebase/firebase-app.js'); //Import the Firebase App before any other Firebase libraries
    self.importScripts('/node_modules/firebase/firebase-auth.js'); //Import the Firebase Auth library
    self.importScripts('/scripts/Configuration/config-old.js');
    self.importScripts('/scripts/modules/utilities/chrome-storage-promises-old-format.js');
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
                    } else if (trackCountDelta < 0) {
                        chrome.action.setBadgeText({text: trackCountDelta.toString(), tabId: tabId});
                        chrome.action.setBadgeBackgroundColor({color: [255, 153, 153, 200], tabId: tabId}); // Rose
                    } else { // Track count delta not a valid number
                        chrome.action.setBadgeText({text: "?", tabId: tabId});
                        chrome.action.setBadgeBackgroundColor({color: [255, 178, 102, 200], tabId: tabId}); // Peach
                        console.warn("Tried to display the track count delta in the extension's icon, but a valid track count delta could not be determined.");
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
        const tracklistMetadata = {type: tracklistType, title: tracklistTitle};
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

    //TODO it would be nice if the helper functions below to get the previous/stored track count could be in their own module, 
    //along with other related functions that the extension scripts need to access.
    //Once ES6 module import is possible in service workers, could make this change.

    /**
     * Returns the previous track count for the given tracklist, if available
     * @param {string} tracklistTitle The title of the tracklist
     * @returns {Promise} A promise with the resulting track count
     */
    async function getPreviousTrackCount(tracklistTitle) {
        let comparisonMethodPreference = await getPreferencesFromChromeSyncStorage('Comparison Method');
        console.log("Comparison method found in user's preferences: " + comparisonMethodPreference);
        comparisonMethodPreference = 'alwaysGPM'; //TODO this is currently hard-coded, until we have actual user preferences enabled
        console.log("Comparison method that will be used: " + comparisonMethodPreference);

        switch(comparisonMethodPreference) {
            case 'alwaysGPM': 
                return await getTrackCountFromGPMTracklistData(tracklistTitle);
            case 'preferYTM': 
                return await getTrackCountFromChromeSyncStorage(tracklistTitle) ?? await getTrackCountFromGPMTracklistData(tracklistTitle);
            default: // 'alwaysYTM'
                return await getTrackCountFromChromeSyncStorage(tracklistTitle);
        }
    }

    /**
     * Gets the track count from Chrome sync storage for a given tracklist 
     * @param {string} tracklistTitle The title of the tracklist, used to search storage
     * @returns {Promise} A promise with the track count matching the given tracklist title
     */
    async function getTrackCountFromChromeSyncStorage(tracklistTitle) {
        const userKey = 'trackCounts_' + firebase.auth().currentUser.uid;
        const storageItems = await /*chromeStorage.*/getKeyValuePairs('sync', userKey);
        return storageItems[userKey]?.[tracklistTitle];
    }

    /**
     * Returns the track count for the given tracklist stored in the exported GPM library data, if available
     * @param {string} tracklistTitle The title of the tracklist
     * @returns {Promise} A promise with the resulting track count
     */
    async function getTrackCountFromGPMTracklistData(tracklistTitle){
        const gpmLibraryKey = 'gpmLibraryData';
        const storageItems = await /*chromeStorage.*/getKeyValuePairs('local', gpmLibraryKey);
        const gpmLibraryData = storageItems[gpmLibraryKey];
        for (const tracklistKey in gpmLibraryData) {
            if (tracklistKey.includes("'" + tracklistTitle + "'")) {
                console.log("Background: Retrieved tracklist metadata from GPM exported data. Track count: " + gpmLibraryData[tracklistKey].length);
                return gpmLibraryData[tracklistKey].length;
            }
        }
        console.warn("Tried retrieving GPM tracklist data but no tracklist with the provided title was found in storage. Tracklist Title: " + tracklistTitle);
        return undefined;
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

    /**
     * Returns the user's preferences object, or a particular preference value if specified
     * @param {*} [preference] An optional preference to specify, if only one value is desired
     * @returns {Promise} A promise with either an object containing all the user's preferences, or the value of a single preference, if specified
     */
    async function getPreferencesFromChromeSyncStorage(preference) {
        const preferencesKey = 'preferences';
        const storageItems = await /*chromeStorage.*/getKeyValuePairs('sync', preferencesKey);
        return (typeof preference === 'undefined')
        ? storageItems[preferencesKey]
        : storageItems[preferencesKey]?.[preference];
    }
// } catch (error) {
//     console.error(error);
// }