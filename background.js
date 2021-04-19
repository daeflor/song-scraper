
//TODO could switch to using browser_action and use badge on icon to indicate if the trackcount is different than what is stored.
    //Alternatively, could leave it as a page_action and use SetIcon to change the icon as needed
        //Actually, the API has been consolidated now, so it's possible to do both!

const _iconPaths = {
    default: 'Images/icon.png',
    exclamation: 'Images/icon_exclamation_black.png',
    disabled: 'Images/icon_disabled.png',
};

//TODO this won't work for the 'All Songs' lists, which is fine for now because they aren't supported yet anyway
const _conditionsForValidTracklistPage = [
    new chrome.declarativeContent.PageStateMatcher({
        pageUrl: { 
            hostEquals: 'play.google.com', 
            schemes: ['https'],
            pathEquals: '/music/listen'
        }
    }),
    new chrome.declarativeContent.PageStateMatcher({
        pageUrl: { 
            hostEquals: 'music.youtube.com', 
            schemes: ['https'],
            pathEquals: '/playlist' 
        }
    })
];

//TODO it seems that the page action is being shown on all pages now for some reason.
    //Could be related to the move to manifest V3. Needs investigation.
//When the extenstion is installed or updated...
chrome.runtime.onInstalled.addListener(function(details) {
    console.log("Background: Extension installed"); 
    //Remove all pre-existing rules to start from a clean slate and then...
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
        
        //createImageDataFromFile(_iconPaths.disabled, 96, function(imageData) {
            let _rule = {
                conditions: _conditionsForValidTracklistPage,
                actions: [
                    //new chrome.declarativeContent.SetIcon({imageData: imageData}),
                    new chrome.declarativeContent.ShowPageAction()
                ] 
            };

            chrome.declarativeContent.onPageChanged.addRules([_rule]); 
            console.log("Background: Rules have been updated.");     
        //});
    });
});

// chrome.action.setBadgeText({text: "3"});
// chrome.action.setBadgeBackgroundColor({color: [0, 255, 0, 0]});//green


// chrome.runtime.onSuspend.addListener(function() {
//     console.log("Unloading.");
//     //chrome.browserAction.setBadgeText({text: ""});
// });

//Note that this works because YouTube Music appears to use the History API to navigate between pages on the site
chrome.webNavigation.onHistoryStateUpdated.addListener(details => {
    if (details.url.includes('list=PL') === false) {
        console.info("Background: Navigated to a YouTube Music page that isn't a valid tracklist. The extension icon will be disabled.");
        chrome.action.setIcon({path: _iconPaths.disabled/*, tabId:_currentTabId*/});
        clearCachedTracklistMetadata();
    }
    //TODO update this so it checks/omits other URLs, not just 'list=PL'
    //TODO could also technically do no check and just always set the disabled icon, which would then get overwritten when the metadata gets updated/sent
        //But I don't like that approach so much

        
}, 
/*{url: [ {hostEquals : 'music.youtube.com', queryPrefix: '?list=PL'},
        {hostEquals : 'music.youtube.com', queryPrefix: '?list=LM'}]}*/
{url: [{hostEquals : 'music.youtube.com'/*, pathEquals: '/playlist'*/}]}
);

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.greeting === 'TracklistMetadataUpdated') {
            console.log('The current tracklist metadata was updated. New track title is "%s" and new track count is "%s".',
                request.currentTracklistMetadata.title, request.currentTracklistMetadata.trackCount);

            //TODO I could technically just put all this logic in the content script, if that helps at all 
            getTrackCountFromGPMTracklistData(request.currentTracklistMetadata.title, gpmTrackCount => {
                if (request.currentTracklistMetadata.trackCount === gpmTrackCount) {
                    console.log("Background: The current track count (from the DOM) is the same as the stored track count.");
                    chrome.action.setIcon({path: _iconPaths.default});
                } else {
                    console.log("Background: The current track count (from the DOM) is different from the stored track count.");
                    chrome.action.setIcon({path: _iconPaths.exclamation});
                }
            });
        }
    }
);

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

// //TODO This won't trigger on the initial load of YTM if the data previously stored hasn't changed at all
//     //There are various way we could work around this:
//         //1) basic-data-scraper could scrap any of the basic data in storage first, then store the latest data
//         //2) when background.js loads, delete the sessionStorage kvp from storage
//             //However, it will still be a problem with the following flow: valid tracklist -> invalid YTM page -> back to same tracklist
//                 //May have to use message passing after all, and have basic-data-scraper also do a comparison between latest data and storage
//                 //Could also have background reset/re-store session storage on every history change
// chrome.storage.onChanged.addListener((changes, namespace) => {
//     for (var key in changes) {

//         if (key === 'songScraperSessionStorage') { //TODO should avoid this hard-coding
//             console.log('Session storage was updated. New track title is "%s" and new track count is "%s".',
//                 changes[key].newValue.tracklistTitle, changes[key].newValue.trackCount);
//         }

//     //   var storageChange = changes[key];
//     //   console.log('Storage key "%s" in namespace "%s" changed. ' +
//     //               'Old value was "%s", new value is "%s".',
//     //               key,
//     //               namespace,
//     //               storageChange.oldValue,
//     //               storageChange.newValue);
//     }
// });