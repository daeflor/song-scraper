import * as Storage from './StorageManager.js';

//TODO might want to freeze this once the values have been set
//TODO should this be inside of or consolidated with TabManager?

let tabId = null;
let app = null; //TODO might want to keep app and tracklistType together in one object to be set and passed around together more easily
let tracklistType = null;
let tracklistTitle = null;
let localStorageKey = null;
//const localStorageBackupKey = chrome.runtime.id + '_Backup';

export const tab = {
    id: null,
    app: null
};

export const tracklist = { //TODO maybe rename to currentTracklist?
    type: undefined,
    title: undefined,
    tracks: {
        scraped: undefined,
        stored: undefined,
        gpm: undefined
    }
}; 

/**
 * Retrieves a tracklist's metadata (either from storage or from a local variable, if previously fetched), and then executes the callback function
 * @param {function} callback The function to execute once the metadata has been retrieved from storage
 */
export function getStoredMetadata(callback) {

    //If the metadata in storage for the current tracklist has previously been fetched, pass that as the parameter in the provided callback function
    if (Array.isArray(tracklist.tracks.stored) === true) {
        callback(tracklist.tracks.stored);
    } else { //Else, retrieve the metadata from storage and then pass it as a parameter in the provided callback function
        Storage.retrieveTracklistFromFirestore(tracklist.title, tracksArray => {
            tracklist.tracks.stored = tracksArray; //Cache the array in a local variable for future reference
            callback(tracklist.tracks.stored);
        });
    }
}

export function getStoredMetadataGPM(callback) {
    //If the GPM metadata in storage for the current tracklist has previously been fetched, pass that as the parameter in the provided callback function
    if (Array.isArray(tracklist.tracks.gpm) === true) {
        callback(tracklist.tracks.gpm);
    } else { //Else, retrieve the GPM tracklist from chrome local storage and then pass it as a parameter in the provided callback function
        Storage.retrieveGPMTracklistFromLocalStorage(tracklist.title, tracksArray => {
            //console.log("Model: Retrieved a GPM tracklist array from chrome local storage: ");
            //console.table(tracksArray);
            tracklist.tracks.gpm = tracksArray; //Cache the array in a local variable for future reference
            callback(tracklist.tracks.gpm);
        });
    }
}

/**
 * Stores the scraped tracklist in the cache and Cloud Firestore, and the track count in chrome sync storage
 * @param {function} callback The function to execute once the tracklist and track count have been stored
 */
export function storeScrapedTracklist(callback) {
    //Set the stored tracks array equal to the scraped tracks array, caching it for future reference within the current app session
    tracklist.tracks.stored = tracklist.tracks.scraped;

    //TODO Doing this ^ caching actually may not be helping much after all, because even so
        //the track table still needs to get re-created and that's the part that probably takes the longest time. (versus accessing storage)
        //As it currently stands, when the Store button is pressed, the out-dated tracklist is still shown.
        //When this happens we may need to force uncheck the 'Stored YTM Tracklist' checkbox, and then...
        //when it is re-checked manually, re-create the track table.
    
    //Store the tracklist in Firestore, then store the track count in chrome sync storage, and then execute the callback function
    //TODO should I pass the whole tracklist object or just the necessary fields/values?
    Storage.storeTracklistInFirestore(tracklist, tracklist.tracks.stored, () => {
        //UIController.triggerUITransition('ScrapedMetadataStored');
        Storage.storeTrackCountInSyncStorage(tracklist.title, tracklist.tracks.stored.length);
        callback();
    });
}

//TODO Is this getter and setter necessary or is it ok for other files to just access the entire tracklist object?
/**
 * Get the scraped tracks array
 * @returns {array} the scraped tracks array
 */
export function getScrapedTracksArray() {
    return tracklist.tracks.scraped;
}

/**
 * Sets the scraped tracks array
 * @param {array} tracksArray The scraped tracks array
 */
export function setScrapedTracksArray(tracksArray) {
    tracklist.tracks.scraped = tracksArray;
}