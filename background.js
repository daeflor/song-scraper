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

// chrome.runtime.onSuspend.addListener(function() {
//     console.log("Unloading.");
//     chrome.action.setBadgeText({text: ""});
// });

//Note: this works because YouTube Music appears to use the History API to navigate between pages on the site
chrome.webNavigation.onHistoryStateUpdated.addListener(details => {
    //console.log("Main web nav event fired");
    //Update the tracklist metadata in the cache depending on the current URL
    if (details.url.includes('/library/songs') === true) {
        cacheTracklistMetadata('all', 'Added from YouTube Music'); //Cache the tracklist type and title in chrome local storage
        updateIcon('exclamation', details.tabId); //Note: since the track count isn't known prior to a complete scrape, the 'exclamation' icon is shown by default
        updateBadgeText("?");
        chrome.action.setBadgeBackgroundColor({color: [255, 127, 0, 255]});
        chrome.action.setPopup({popup: 'popup.html', tabId: details.tabId}); //Allow the popup to be opened if the icon is clicked on
        //chrome.action.enable();
    } else if (details.url.includes('/library/uploaded_songs') === true) {
        cacheTracklistMetadata('uploads', 'Uploaded Songs'); //Cache the tracklist type and title in chrome local storage
        updateIcon('exclamation', details.tabId); //Note: since the track count isn't known prior to a complete scrape, the 'exclamation' icon is shown by default
        updateBadgeText("?"); //TODO if gonna do this, should change color too
        chrome.action.setBadgeBackgroundColor({color: [255, 127, 0, 255]});
        chrome.action.setPopup({popup: 'popup.html', tabId: details.tabId}); //Allow the popup to be opened if the icon is clicked on
    } else if (details.url.includes('list=LM') === true) {
        //cacheTracklistMetadata('auto', 'Your Likes');
        //chrome.action.setIcon({path: _iconPaths.exclamation});
        chrome.action.setPopup({popup: 'popup.html', tabId: details.tabId}); //Allow the popup to be opened if the icon is clicked on
    } //TODO Since the track count reported in the YTM UI for the 'Your Likes' list seems to be way off...
        //...it may be acceptable to just not bother getting the track count to update the icon...
        //...since it's likely to be incorrect anyway. Instead, we could just always display the regular icon, or a special one.
      else if (details.url.includes('list=PL') === true) {
        chrome.action.setPopup({popup: 'popup.html', tabId: details.tabId}); //Allow the popup to be opened if the icon is clicked on
    } else { //Else, if the URL doesn't include any valid tracklist substrings...
        console.info("Background: Navigated to a YouTube Music page that isn't a valid tracklist. The extension icon will be disabled.");
        clearCachedTracklistMetadata(); //Clear the metadata cached in storage
        updateIcon('disabled', details.tabId); //Disable the extension icon
        updateBadgeText("", details.tabId); //Clear any badge text on the icon
        chrome.action.setPopup({popup: '', tabId: details.tabId}); //Prevent the popup from being able to be opened
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

/**
 * Compares the current and stored track counts for the current tracklist, and then updates the extension icon accordingly
 * @param {string} tracklistTitle The title of the tracklist, used to fetch the track count from storage
 * @param {number} currentTrackCount The tracklist's current track count
 */
//TODO I could technically just put almost all this logic (except action API calls) in the content script, if that helps at all 
function compareTrackCountsAndUpdateIcon(tracklistTitle, currentTrackCount) {
    getTrackCountFromGPMTracklistData(tracklistTitle, gpmTrackCount => {
        //(currentTrackCount === gpmTrackCount) ? updateIcon(_iconPaths.default) : updateIcon(_iconPaths.exclamation);

        if (gpmTrackCount === undefined) {
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

    const _iconPaths = {
        default: 'Images/icon.png',
        disabled: 'Images/icon_disabled.png',
        exclamation: 'Images/icon_exclamation_black.png' //TODO would prefer a different 'friendly' name for this
    };

    if (typeof tabId === 'number') {
        chrome.action.setIcon({path: _iconPaths[name], tabId: tabId});
    } else {
        chrome.tabs.query( { active: true, currentWindow: true}, tabs => { 
            chrome.action.setIcon({path: _iconPaths[name], tabId: tabs[0].id});
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