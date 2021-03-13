//import * as Storage from './Modules/StorageManager.js';
import * as IO from './Modules/Utilities/IO.js';

//TODO could switch to using browser_action and use badge on icon to indicate if the trackcount is different than what is stored.
    //Alternatively, could leave it as a page_action and use SetIcon to change the icon as needed

console.log("Background: Running Background script.");

//TODO the fact that these variables are still accessible much later on is indication that the background script isn't getting properly unloaded.
const _iconPaths = {
    default: 'Images/icon.png',
    exclamation: 'Images/icon_exclamation_black.png'
    //disabled: 'Images/icon_disabled.png',
};

//TODO this won't work for the 'All Songs' lists
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

// const regexNot = /^((?!https:\/\/music.youtube.com).)*$/;
// console.log(regexNot);

// //TODO A likely better way to do this would be to have the default icon be a greyed out / disabled version, and then only apply an enabled one (default or exclamation) when navigating to a valid tracklist
//     //This would solve two problems, because it provides a disabled icon for most pages AND we already need to set the default or exclamation icon anyway when opening a tracklist page
       //HOWEVER, there would still be the wrong icon showing for pages within YTM that aren't valid tracklists, but that could also be handled separately
//     //OR switch to using tabs permission instead of activeTab, and find a way to have the scripts run on the "correct" YTM pages (i.e. valid tracklists)
// const _conditionsForInvalidTracklistPage = [
//     new chrome.declarativeContent.PageStateMatcher({
//         pageUrl: { 
//             urlMatches: '^((?!https:\/\/music.youtube.com).)*$'
//         }
//     })
// ];

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
            // let _ruleDisabled = {
            //     conditions: _conditionsForInvalidTracklistPage,
            //     actions: [
            //         new chrome.declarativeContent.SetIcon({imageData: imageData})
            //         //new chrome.declarativeContent.ShowPageAction()
            //     ] 
            // };

            chrome.declarativeContent.onPageChanged.addRules([_rule/*, _ruleDisabled*/]); 
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
chrome.webNavigation.onHistoryStateUpdated.addListener(function(details) {
    // alert("This is my favorite website!");
    // console.log("WebNavigation Completed")
    //console.log(details.transitionQualifiers);
    // console.log("ICON PATH: ");
    // console.log(_iconPath);

    setTimeout(() => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {greeting: 'GetTrackCount', app:'ytm'}, function(message) {
                let tracklist = {
                    type: 'playlist',
                    title: undefined,
                    currentTrackCount: message.response
                    //storedTrackCount: undefined
                };
                                
                console.log("Background: Retrieved the track count from the content script (from the DOM):" + tracklist.currentTrackCount);

                chrome.tabs.sendMessage(tabs[0].id, {greeting: 'GetTracklistTitle', app:'ytm'}, (message) => {

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
                                    chrome.pageAction.setIcon({path: _iconPaths.exclamation, tabId:tabs[0].id});
                                    // createImageDataFromFile(_iconPath, 96, (imageData) => {
                                    //     chrome.pageAction.setIcon({imageData: imageData});  
                                    //     //chrome.pag  
                                    // });
                                } else {
                                    console.log("Background: The current track count (from the DOM) is the same as the stored track count.");
                                    chrome.pageAction.setIcon({path: _iconPaths.default, tabId:tabs[0].id});
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
        });
    }, 1000); //TODO this timeout is just temporary until a better solution can be found. On a slow device or connection, this isn't reliable. 
}, {url: [{hostEquals : 'music.youtube.com', pathEquals: '/playlist'}]});


// chrome.webNavigation.onCommitted.addListener(function() {
//     alert("This is my favorite website!");
//     console.log("WebNavigation Completed")
// }, {url: [{urlMatches : 'https://music.youtube.com/'}]});

/**
 * Creates a canvas element, loads an image from a file, and returns the image data
 * @param {string} path The path of the file to load
 * @param {number} size The size of the image file (i.e. width/height in pixels). A square image is assumed.  
 * @param {function} callback The function to execute once the image has been loaded
 */
function createImageDataFromFile(path, size, callback) {
    const _canvas = document.createElement("canvas");
    const _canvasContext = _canvas.getContext("2d");
    const _image = new Image();
    _image.onload = function() {
        _canvasContext.drawImage(_image,0,0,size,size);
        const _imageData = _canvasContext.getImageData(0,0,size,size);
        callback(_imageData);
    }
    _image.src = chrome.runtime.getURL(path);
}