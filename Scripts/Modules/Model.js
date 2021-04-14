import * as DebugController from './DebugController.js';
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
    metadataScraped: null, //TODO Rename to scrapedTrackMetadata?
    metadataFromStorage: null,
    metadataFromStorageGPM: null,
}; //TODO why are these let instead of const?
//TODO should these be undefined instead of null to start with?

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
export function getStoredMetadata(callback) {

    //If the metadata in storage for the current tracklist has previously been fetched, pass that as the parameter in the provided callback function
    if (Array.isArray(tracklist.metadataFromStorage) === true) {
        callback(tracklist.metadataFromStorage);
    }
    else { //Else, retrieve the metadata from storage and then pass it as a parameter in the provided callback function
        Storage.retrieveTracklistFromFirestore(tracklist.title, tracksArray => {
            tracklist.metadataFromStorage = tracksArray; //TODO is there any point doing this? Is it ever referenced again? Is there no way for the cached data to become out-of-date (i.e. from another tracklist)?
            callback(tracksArray);
        });
    }
}

export function getStoredMetadataGPM(callback) {
    //If the GPM metadata in storage for the current tracklist has previously been fetched, pass that as the parameter in the provided callback function
    if (Array.isArray(tracklist.metadataFromStorageGPM) === true) {
        callback(tracklist.metadataFromStorageGPM);
    }
    //Otherwise, fetch the GPM data from a local file and extract the current tracklist metadata from that
    else {
        //Retrieve the GPM tracklist from chrome local storage and then store it in a local variable and execute the callback function
        Storage.retrieveGPMTracklistFromLocalStorage(tracklist.title, tracksArray => {
            //console.log("Model: Retrieved a GPM tracklist array from chrome local storage: ");
            //console.table(tracksArray);
            tracklist.metadataFromStorageGPM = tracksArray; //TODO is this really necessary / helpful?
            callback(tracksArray);
        });
    }    
}

//export {getScrapedTracklistMetadata, setScrapedTracklistMetadata};
export {tab, tracklist};