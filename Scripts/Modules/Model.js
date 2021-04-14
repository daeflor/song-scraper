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
        //TODO but this property never actually gets set
    }
    //Otherwise, fetch the GPM data from a local file and extract the current tracklist metadata from that
    else {
        //Once the exported Google Play Music tracklist data has been loaded from a local file, convert it to a CSV file
        const _onGooglePlayMusicDataLoaded = function(gpmLibraryObject) {
            //TODO If I'm searching for the key based on the title, I could just get the array by using the title instead of going through the extra step
                //Although generally I dislike the idea of relying on the title, it seems the only way in this case anyway.
            const _gpmTracklistKey = window.Utilities.GetTracklistKeyFromTracklistName(gpmLibraryObject, tracklist.title);
            // console.log('GPM Tracklist Key: ' + _gpmTracklistKey);
            // console.log("TracklistArray:");
            // console.log(gpmLibraryObject);
            // console.log(typeof gpmLibraryObject);
            // console.log("Item at the extracted key in TracklistArray:");
            // console.log(gpmLibraryObject[_gpmTracklistKey]);
            // console.log(typeof gpmLibraryObject[_gpmTracklistKey]);

            if (typeof _gpmTracklistKey === 'string') {
                callback(gpmLibraryObject[_gpmTracklistKey]);
            }
            else {
                DebugController.logError("Request received to fetch a tracklist array from an exported GPM data file, but a matching key couldn't be found for the current tracklist.");
            }
        };

        //TODO Can now switch to loading GPM from local storage instead
        //Send an XMLHttpRequest to load the exported GPM tracklist data from a local file, and then execute the callback
        window.Utilities.SendRequest_LoadGooglePlayMusicExportData(_onGooglePlayMusicDataLoaded);
    }    
}

//export {getScrapedTracklistMetadata, setScrapedTracklistMetadata};
export {tab, tracklist};