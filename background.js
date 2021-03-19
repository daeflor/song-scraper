//import * as Storage from './Modules/StorageManager.js';
import * as IO from './Modules/Utilities/IO.js';

//TODO could switch to using browser_action and use badge on icon to indicate if the trackcount is different than what is stored.
    //Alternatively, could leave it as a page_action and use SetIcon to change the icon as needed

console.log("Background: Running Background script.");

//TODO the fact that these variables are still accessible much later on is indication that the background script isn't getting properly unloaded.
const _iconPaths = {
    default: 'Images/icon.png',
    exclamation: 'Images/icon_exclamation_black.png',
    disabled: 'Images/icon_disabled.png',
};

//TODO this won't work for the 'All Songs' lists, which is fine for me because they aren't supported yet anyway
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

// chrome.runtime.onSuspend.addListener(function() {
//     console.log("Unloading.");
//     //chrome.browserAction.setBadgeText({text: ""});
// });

// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//     //console.log(changeInfo.url);
//     //if (changeInfo.url.includes('https://music.youtube.com/playlist')) {
//     if (changeInfo.status === 'complete') {
//         console.log("Tab was updated: ");
//         console.log(tabId);
//         console.log(changeInfo);
//         console.log(tab);
//     }
// });

//Note that this works because YouTube Music appears to use the History API to navigate between pages on the site
//TODO this doesn't work when first loading the youtube site 
   // (or refreshing the page, because this triggers before the content script can load),
   // but it does seem to work for future site navigations.
   // Except it doesn't work when going 'back' for some reason. Could also be a timing issue.
   // Two possible work-arounds:
        // Programmatic injection of code to get track count. 
            //Then maybe save it in local storage for popup to grab later.
        // OR setTimeout before sending the message to the content script.
chrome.webNavigation.onHistoryStateUpdated.addListener(details => {
    // console.log("WebNavigation Completed");
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        const _currentTabId = tabs[0].id;
        if (details.url.includes('list=PL')) {
            console.info("Background: Navigated to a valid tracklist page within YouTube Music. The extension icon will be enabled.");
            setTimeout(() => {
                chrome.tabs.sendMessage(_currentTabId, {greeting: 'GetTrackCount', app:'ytm'}, message => {
                    let tracklist = {
                        type: 'playlist',
                        title: undefined,
                        currentTrackCount: message.response
                        //storedTrackCount: undefined
                    };

                    console.log("Background: Retrieved the track count from the content script (from the DOM):" + tracklist.currentTrackCount);

                    chrome.tabs.sendMessage(_currentTabId, {greeting: 'GetTracklistTitle', app:'ytm'}, message => {

                        tracklist.title = message.response;

                        const _filepath = "ExportedData/LocalStorageExport_2020-10-12-10-30PM_ThumbsUpDuplicatedAsYourLikes.txt";
                        IO.loadTextFileViaXMLHttpRequest(_filepath, gpmLibraryObject => {
                            console.log("Background: Retrieved GPM exported data from local file.");
                            for (const key in gpmLibraryObject) {
                                if (key.includes("'" + tracklist.title + "'")) {
                                    console.log("Background: Retrieved tracklist metadata from GPM exported data. Track count: " + gpmLibraryObject[key].length);
                                    gpmLibraryObject[key];

                                    if (tracklist.currentTrackCount !== gpmLibraryObject[key].length) {
                                        console.log("Background: The current track count (from the DOM) is different from the stored track count.");
                                        chrome.pageAction.setIcon({path: _iconPaths.exclamation, tabId:_currentTabId});
                                        // createImageDataFromFile(_iconPath, 96, (imageData) => {
                                        //     chrome.pageAction.setIcon({imageData: imageData});  
                                        //     //chrome.pag  
                                        // });
                                    } else {
                                        console.log("Background: The current track count (from the DOM) is the same as the stored track count.");
                                        chrome.pageAction.setIcon({path: _iconPaths.default, tabId:_currentTabId});
                                    }
                                }
                            }
                        });

                        // Storage.retrieveTracklistMetadata(tracklist.type, tracklist.title, (metadataArray) => {
                        //     console.log("Background: Retrieved tracklist metadata from storage. Track count: " + metadataArray.length);

                        //     if (tracklist.currentTrackCount !== metadataArray.length) {
                        //         console.log("The current track count (from the DOM) is different from the stored track count.");
                        //     }
                        // });
                    });
                });
            }, 1000); //TODO this timeout is just temporary until a better solution can be found. On a slow device or connection, this isn't reliable. 
        } else {
            console.info("Background: Navigated to a YouTube Music page that isn't a valid tracklist. The extension icon will be disabled.");
            chrome.pageAction.setIcon({path: _iconPaths.disabled, tabId:_currentTabId});
        }
    });
}, {url: [{hostEquals : 'music.youtube.com'/*, pathEquals: '/playlist'*/}]});
