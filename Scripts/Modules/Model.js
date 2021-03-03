import * as Storage from './StorageManager.js';

//TODO might want to freeze this once the values have been set
//TODO should this be inside of or consolidated with TabManager?

let tabId = null;
let app = null; //TODO might want to keep app and tracklistType together in one object to be set and passed around together more easily
let tracklistType = null;
let tracklistTitle = null;
let localStorageKey = null;
//const localStorageBackupKey = chrome.runtime.id + '_Backup';

let tab = {
    id: null,
    app: null
};
let tracklist = { //TODO maybe rename to currentTracklist?
    type: null,
    title: null,
    metadataScraped: null,
    metadataFromStorage: null
}; //TODO why are these let instead of const?

// let scrapedTracklistMetadata = null;

// function getScrapedTracklistMetadata() {
//     return scrapedTracklistMetadata;
// }

// function setScrapedTracklistMetadata(metadata) {
//     scrapedTracklistMetadata = metadata;
//     Storage.setTestData(metadata);
// }

/**
 * Retrieves a tracklist's metadata (either from storage or from a local variable, if previously fetched), and then executes the callback function
 * @param {function} callback The function to execute once the metadata has been retrieved from storage
 */
function getStoredMetadata(callback) {

    //If the metadata in storage for the current tracklist has already been set, pass that as the parameter in the provided callback function
    if (Array.isArray(tracklist.metadataFromStorage) === true) {
        callback(tracklist.metadataFromStorage);
    }
    else { //Else, retrieve the metadata from storage and then pass it as a parameter in the provided callback function
        const _onMetadataRetrieved = function(metadata) {
            tracklist.metadataFromStorage = metadata; //TODO is there any point doing this? Is it ever referenced again? Is there no way for the cached data to become out-of-date (i.e. from another tracklist)?
            callback(metadata);
        }
    
        Storage.retrieveTracklistMetadata(tracklist.type, tracklist.title, _onMetadataRetrieved);
    }
}

//export {getScrapedTracklistMetadata, setScrapedTracklistMetadata};
export {tab, tracklist, getStoredMetadata};