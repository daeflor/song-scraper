
//window.document.body.onload = scrapeAndStoreBasicTracklistData;//function() {console.log('onload works for some reason');};

// window.addEventListener('DOMContentLoaded', events => {
//     console.log('DOM fully loaded and parsed');
// });

// window.document.body.addEventListener('load', event => {
//     console.log('something loaded: ' + event);
//     scrapeAndStoreBasicTracklistData();
// });

// const tracklistElements = Object.freeze({
//     tracklistTitle: {
//         ytm: function() {return document.querySelector('#header .metadata yt-formatted-string.title');},
//         gpm: function() {return document.querySelector('div.title-row h2');}
//     },
//     playlistTrackCount: {
//         ytm: function() {return document.querySelector('div#header div.metadata yt-formatted-string.second-subtitle span');},
//         gpm: function() {return document.querySelector('span[slot="metadata"]').children[0];}
//     },
//     yourLikesTrackCount: {
//         ytm: function() {return document.querySelector('div#header div.metadata yt-formatted-string.second-subtitle');},
//         gpm: function() {return document.querySelector('span[slot="metadata"]').children[0];}
//     }
// });

/**
 * Calls the corresponding functions to scrape the basic tracklist data from the DOM and then stores it in local storage
 */
function getTracklistMetadataElements(callback) {
    // console.log(document.querySelector('#header .metadata yt-formatted-string.title'));
    // console.log(document.querySelector('#header')); 
    //ytmusic-editable-playlist-detail-header-renderer
    //ytmusic-detail-header-renderer
    //div.content-container style-scope ytmusic-detail-header-renderer

    const _ytmHeaderElement = document.body.querySelector('#header');
    const _ytmMetadataElement = _ytmHeaderElement.querySelector('.metadata');

    if (_ytmMetadataElement !== null) { //TODO would a more thorough isElement check be good here?
        console.log("YouTube Music tracklist metadata header element already loaded.");

        // console.log(_ytmMetadataElement);
        // console.log(typeof _ytmMetadataElement);

        const _ytmTitleElement = _ytmMetadataElement.querySelector('yt-formatted-string.title');
        console.log("Title is: " + _ytmTitleElement.textContent);

        const _ytmTrackCountElement = _ytmMetadataElement.querySelector('yt-formatted-string.second-subtitle span');
        console.log("Track Count String is: " + _ytmTrackCountElement.textContent);

        //Execute the callbcak function to extract and store the metadata from the corresponding elements
        callback(_ytmTitleElement, _ytmTrackCountElement);
    } else {
        console.log("YouTube Music tracklist metadata header element not yet loaded.");
        //Wait for the tracklist metadata elements to load and then execute the callbcak function to extract and store the metadata
        getYtmElementsOnceLoaded(_ytmHeaderElement, callback);
       
        
//         scrapeYtmElementsOnceLoaded((title, trackCount) => {

//             callback(_ytmTitleElement, _ytmTrackCountElement);
// /*
//             console.log("Retrieved title and track count from mutation obs:");
//             console.log(title);
//             console.log(trackCount);

//             const _message = Object.freeze({
//                 greeting: 'BasicTracklistDataUpdated',
//                 tracklistTitle: title,
//                 trackCount: trackCount
//             });

//             const _storageObject = Object.freeze({
//                 songScraperSessionStorage: {
//                     tracklistTitle: title,
//                     trackCount: trackCount
//                 }
//             });

//             chrome.storage.local.set (_storageObject, () => {
//                 if (chrome.runtime.lastError != null) {
//                     console.error("ERROR: " + chrome.runtime.lastError.message);
//                 } else {
//                     chrome.runtime.sendMessage(_message);
                        
//                     // chrome.storage.local.get(null, result => {
//                     //     console.log(result);
//                     // });
//                 }
//             });
//             */
//         });
    }
}

function getTrackCountNumberFromString(trackCountString) {
    trackCountString = trackCountString.split(" ")[0]; //Split off any trailing text after the actual number
    trackCountString = trackCountString.replace(/,/g, ""); //Remove any commas from the string (e.g. for counts > 999)
    return parseInt(trackCountString); //Parse the string to get the track count value as an integer and return it
}

function extractAndStoreTracklistMetadata(tracklistTitleElement, trackCountElement) {
    // const _tracklistTitle = tracklistTitleElement.textContent;

    // let _trackCountString = trackCountElement.textContent; //Get the track count string from the node's text content
    // _trackCountString = _trackCountString.split(" ")[0]; //Split off any trailing text after the actual number
    // _trackCountString = _trackCountString.replace(/,/g, ""); //Remove any commas from the string (e.g. for counts > 999)
    // const _trackCount = parseInt(_trackCountString); //Parse the string to get the track count value as an integer
           
    // const _message = Object.freeze({
    //     greeting: 'BasicTracklistDataUpdated',
    //     tracklistTitle: title,
    //     trackCount: trackCount
    // });

    // const _storageObject = Object.freeze({
    //     songScraperSessionStorage: {
    //         tracklistTitle: title,
    //         trackCount: trackCount
    //     }
    // });



    const _tracklistMetadata = {
        title: tracklistTitleElement.textContent,
        trackCount: getTrackCountNumberFromString(trackCountElement.textContent)
    };

    // const _transmissionObject = {currentTracklistMetadata: _tracklistMetadata};

    chrome.storage.local.set ({currentTracklistMetadata: _tracklistMetadata}, () => {
        if (chrome.runtime.lastError != null) {
            console.error("ERROR: " + chrome.runtime.lastError.message);
        } else {
            //_transmissionObject.greeting = 'TracklistMetadataUpdated';
            const _message = { greeting: 'TracklistMetadataUpdated', currentTracklistMetadata: _tracklistMetadata };
            chrome.runtime.sendMessage(_message);
                
            // chrome.storage.local.get(null, result => {
            //     console.log(result);
            // });
        }
    });
}


// /**
//      * Returns the current tracklist title from the DOM
//      * @param {string} [app] The current app that the extension is running on. Default to 'ytm' (for YouTube Music).
//      * @returns {string} The tracklist title
//      */
//  function scrapeTracklistTitle(app='ytm') {

//     console.log(document.readyState);
//     console.log(document.body);

//     console.log(tracklistElements.tracklistTitle[app]);

//     const _tracklistTitleElement = tracklistElements.tracklistTitle[app]();
    
//     if (_tracklistTitleElement != null) { //TODO use a better isElement check
//         console.log("Tracklist name is: " + _tracklistTitleElement.textContent)
//         return _tracklistTitleElement.textContent;
//     } else {
//         console.error("ERROR: Received request to get the tracklist name, but it failed to be retrieved from the DOM.");
//     }
// }

//scrapeTracklistTitle();

// const _titleElement = Object.freeze({
//     auth: document.getElementById('auth'),
//     header: document.getElementById('header'),
//     status: document.getElementById('status'),
//     buttons: document.getElementById('buttons'),
//     checkboxes: document.getElementById('checkboxes'),
//     tracktables: document.getElementById('tracktables')
// });

// function getTracklistElement(element, app='ytm') {
//     switch(element) {
//         case 'tracklistTitle':
//             return _splitDurationIntegers[0];
//         case 'playlistTrackCount':
//             return _splitDurationIntegers[0]*60 + _splitDurationIntegers[1];
//         case 'yourLikesTrackCount':
//             return _splitDurationIntegers[0]*3600 + _splitDurationIntegers[1]*60 + _splitDurationIntegers[2];
//         default:
//             DebugController.logWarning("Tried to extract a seconds integer value from a duration string, but the duration is not in a supported format (e.g. the duration may be longer than 24 hours).");
//     }
// }

function getYtmElementsOnceLoaded(rootElement, callback) {
    //const _rootElement = document.querySelector('#header');
    const _observerConfig = {childList: true, subtree: true}; //Set up the configuration options for the Mutation Observer

    let _title = undefined;
    let _trackCount = undefined;

    //Set up the callback function to execute once the scraped has either been successfully completed or timed out
    const _endObservation = () => {
        _observer.disconnect(); //Disconnect the mutation observer
        callback(_title, _trackCount); //Execute the provided callback function, passing the title and track count
    }

    //Set up the callback to execute whenever a mutation of the pre-specified type is observed. //the childList is modified for any element in the root element's subtree
    const _onMutationObserved = (mutationsList, observer) => {
        //For each mutation observed on the target DOM element...
        for (const mutation of mutationsList) {
            //If the observed mutation is that the element's childList was modified...
            //if (mutation.type === 'childList') {

            const _addedNode = mutation.addedNodes[0];

            //console.log(mutation);

            // //If the mutation was adding a node to the element's childList...
            // if (typeof _addedNode === 'object') {
            //     //If the mutated elementn has the "title" class...
            //     if (mutation.target.classList.contains("title")) {
            //         //If a "Text Node" object was added to the element's childList...
            //         if (_addedNode.nodeType === 3) {
            //             console.log(_addedNode.textContent);
            //         }
            //     }
            //     //Else, if mutated element has the "second-subtitle" class
            //     else if (mutation.target.classList.contains("second-subtitle")) {
            //         const _element = _addedNode.childNodes[0];
            //         //If a "Text Node" object was added to the element's childList...
            //         if (typeof _element === 'object' && _element.nodeType === 3) {
            //             console.log(_element.textContent);
            //         }
            //     }
            // } 


            /** */

            //TODO Would be good to avoid some of the hard-coding done here
            //If the mutated element has the "title" class and the mutation was adding a node to it's childList...
            if (mutation.target.classList.contains("title") && typeof _addedNode === 'object') {
                //If the node added to the element's childList was a "Text Node" object...
                if (_addedNode.nodeType === 3) {
                    //console.log(_addedNode.textContent);
                    //_title = _addedNode.textContent; //Get the tracklist title from the Text Node's text content
                    _title = _addedNode;
                    if (typeof _trackCount === 'object') _endObservation(); //If the track count has already been determined, end the observation
                }
            }
            //Else, if mutated element has the "second-subtitle" class and the mutation was adding a node to it's childList...
            else if (mutation.target.classList.contains("second-subtitle") && typeof _addedNode === 'object') {
                const _addedGrandchild = _addedNode.childNodes[0];
                //If the node added to the element's childList has its own "Text Node" child object...
                if (typeof _addedGrandchild === 'object' && _addedGrandchild.nodeType === 3) {
                    //console.log(_addedGrandchild.textContent);
                    // //Get the track count string from the node's text content and split off the trailing text after the actual number
                    // const _trackCountString = _addedGrandchild.textContent.split(" ")[0]; 

                    // //Remove any commas from the track count string (e.g. for counts > 999), and then get the count value as an integer
                    // _trackCount = parseInt(_trackCountString.replace(/,/g, ""));

                    /** */
                    
                    // let _trackCountString = _addedGrandchild.textContent; //Get the track count string from the node's text content
                    // _trackCountString = _trackCountString.split(" ")[0]; //Split off any trailing text after the actual number
                    // _trackCountString = _trackCountString.replace(/,/g, ""); //Remove any commas from the string (e.g. for counts > 999)
                    // _trackCount = parseInt(_trackCountString); //Parse the string to get the track count value as an integer
                    

                    _trackCount = _addedGrandchild;
                    if (typeof _title === 'object') _endObservation(); //If the tracklist title has already been determined, end the observation
                }
            }

            
/** */

            // //If the element that was mutated has the "title" class...
            // if (mutation.target.classList.contains("title")) {
            //     const _addedNode = mutation.addedNodes[0];
            //     //If a "Text Node" object was added to the element's childList...
            //     if (typeof _addedNode === 'object' && _addedNode.nodeType === 3) {
            //         console.log(_addedNode.textContent);
            //     }
            // }
            // //Else, if mutated element has the "second-subtitle" class and the mutation was adding a node to it's childList...
            // else if (mutation.target.classList.contains("second-subtitle") && typeof mutation.addedNodes[0] === 'object') {
            //     const _addedNode = mutation.addedNodes[0].childNodes[0];
            //     //If a "Text Node" object was added to the element's childList...
            //     if (_addedNode.nodeType === 3) {
            //         console.log(_addedNode.textContent);
            //     }

            //     }
            //     const _addedNode = mutation.addedNodes[0].childNodes[0];
                
            // }

            //}
        }
    };

    //Create a new mutation observer instance linked to the callback function defined above
    const _observer = new MutationObserver(_onMutationObserved);

    //Start observing the track row container element for configured mutations (i.e. for any changes to its childList)
    console.log("Basic Data Scraper: Observing YTM header element for DOM changes.");
    _observer.observe(rootElement, _observerConfig);
}

//Get the tracklist metadata elements and then extract and store the metadata itself
getTracklistMetadataElements(extractAndStoreTracklistMetadata);

//TODO Should this whole file be wrapped in an IIFE?