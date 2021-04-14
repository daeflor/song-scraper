//import { tracklist } from './Model.js';
import * as LocalStorage from './Utilities/LocalStorage.js'; 

//TODO might be good to have a single module that handles loading and initializing all necessary firebase libraries
    //Then, any files that have a dependency on firebase (e.g. Auth, Storage, etc.) can just import that module
import '/node_modules/firebase/firebase-app.js'; //Import the Firebase App before any other Firebase libraries
import '/node_modules/firebase/firebase-firestore.js'; //Import the Cloud Firestore library

//TODO Should this go with the other frozen objects in a separate References module, or something like that?
// const _environments = Object.freeze({
//     prod: 'prod',
//     test: 'test'
// });

// const _tracklistCategories = Object.freeze({
//     playlists: 'playlists',
//     autoPlaylists: 'autoPlaylists',
//     allSongsLists: 'allSongsLists'
// });

//TODO might not need a StorageManager separate from the Model

let _testMode = true;
let _firestoreDatabase = undefined;

function retrieveTracklistMetadata(tracklistType, tracklistTitle, callback) {    
    const _tracklistKey = tracklistType + "_'" + tracklistTitle + "'";

    //If Test Mode is enabled, get the test data object from storage and then get the tracklist metadata kvp from that
    if (_testMode === true) {
        const _onTestDataRetrieved = function(testDataObject) {
            if (typeof callback === 'function') {
                callback(testDataObject[_tracklistKey]);
            }
        }

        LocalStorage.get('test', _onTestDataRetrieved);
    }
    //Else, if Test Mode is disabled, use the tracklist key to get its metadata array
    else {
        LocalStorage.get(_tracklistKey, callback);
    }
}

//TODO might be better to create an ID for the tracklist the first time it is scraped/stored and use that for the key instead / as well, since the title is not unique.
    //For manual playlist, the ID in the YTM URL could be used for this.
function storeTracklistMetadata(tracklistType, tracklistTitle, tracklistMetadataArray) { 

    //const _objectToStore = (_testMode === true) ? {test: {key: metadataArray}} : {key: metadataArray};

    // const _keyToStore = (_testMode === false) ? tracklistTitle : 'test';
    // const _valueToStore = (_testMode === false) ? tracklistMetadataArray : {tracklistTitleTODO: tracklistMetadataArray};

    const _tracklistKey = tracklistType + "_'" + tracklistTitle + "'";
    const _objectToStore = {};
    //const _objectToStore = (_testMode === false) ? {} : {'test':{}};

    if (_testMode === true) {
        _objectToStore['test'] = {};
        _objectToStore['test'][_tracklistKey] = tracklistMetadataArray;
    }
    else {
        _objectToStore[_tracklistKey] = tracklistMetadataArray;
    }

    LocalStorage.set(_objectToStore); //TODO currently overwriting test data each time, instead of loading it from storage
}

/**
 * Stores the provided tracklist data in Firestore and then executes the provided callback
 * @param {object} tracklistData An object containing data about the tracklist. Must include at least title, type, and metadataScraped fields.
 * @param {function} callback The function to execute once the data has been successfully stored
 */
export function storeTracklistInFirestore(tracklistData, callback) {
    //Initialize an instance of Cloud Firestore if it hasn't already been initialized
    if(typeof _firestoreDatabase !== 'object') {
        _firestoreDatabase = firebase.firestore();
    }

    const _userId = firebase.auth().currentUser.uid;
    //console.log("The Firebasue UID for the user currently signed in is: " + _userId);
    const _tracklistCollection = _firestoreDatabase.collection('users').doc(_userId).collection('tracklists');
    //const _tracklistKey = tracklistData.type + "_'" + tracklistData.title + "'";
    const _currentTracklistDocument = _tracklistCollection.doc(tracklistData.title);

    const _documentData = {
        title: tracklistData.title,
        type: tracklistData.type,
        tracks: tracklistData.metadataScraped
    };

    //Add or update the document for the current tracklist, merging it with any existing data if the document already exists
    _currentTracklistDocument.set(_documentData, {merge:true})
        .then(callback)
        .catch(function(error) {
            console.error("Error writing document to storage:" + error);
        });

    //TODO How can I provide better feedback that the storage process was successful?
        //Maybe only enable the "store" button after doing a comparison of the scraped and stored data, and only if they differ
}

/**
 * Retrieves tracklist data from Firestore that corresponds to the provided tracklist title
 * @param {string} tracklistTitle The title of the tracklist to retrieve
 * @param {function} callback The function to execute once the data has been successfully retrieved
 */
export function retrieveTracklistFromFirestore(tracklistTitle, callback) {
    //Initialize an instance of Cloud Firestore if it hasn't already been initialized
    if(typeof _firestoreDatabase !== 'object') {
        _firestoreDatabase = firebase.firestore();
    }

    const _userId = firebase.auth().currentUser.uid;
    const _tracklistCollection = _firestoreDatabase.collection('users').doc(_userId).collection('tracklists');
    //const _tracklistKey = tracklistType + "_'" + tracklistTitle + "'";
    const _currentTracklistDocument = _tracklistCollection.doc(tracklistTitle);

    _currentTracklistDocument.get().then(doc => {
        if (doc.exists) {
            callback(doc.data().tracks);
        } else {
            console.warn("Tried retrieving tracklist data but no tracklist with the provided title was found in storage. Tracklist Title: " + tracklistTitle);
        }
    }).catch((error) => {
        console.error("Error getting document:", error);
    });
}

/**
 * Retrieves GPM tracklist data from chrome local storage that corresponds to the provided tracklist title
 * @param {string} tracklistTitle The title of the tracklist to retrieve
 * @param {function} callback The function to execute once the data has been successfully retrieved
 */
export function retrieveGPMTracklistFromLocalStorage(tracklistTitle, callback){
    const _storagekey = 'gpmLibraryData';
    chrome.storage.local.get(_storagekey, storageResult => {
        const _gpmLibraryData = storageResult[_storagekey];

        for (const _tracklistKey in _gpmLibraryData) {
            if (_tracklistKey.includes("'" + tracklistTitle + "'")) {
                //console.log("Retrieved tracklist metadata from GPM exported data. Track count: " + _gpmLibraryData[_tracklistKey].length);
                callback(_gpmLibraryData[_tracklistKey]);
                return;
            }
        }
        console.warn("Tried retrieving tracklist data but no tracklist with the provided title was found in storage. Tracklist Title: " + tracklistTitle);
    });
}

/**
 * Stores the provided track count for the given tracklist in chrome sync storage
 * @param {string} tracklistTitle The title of the tracklist
 * @param {number} trackCount The latest track count of the tracklist
 */
export function storeTrackCountInSyncStorage(tracklistTitle, trackCount) {
    const _storagekey = 'trackCounts';
    chrome.storage.sync.get(_storagekey, storageResult => {
        //Get the track counts object from storage or create a new empty object if one doesn't exist
        const _trackCountsObject = storageResult[_storagekey] || {}; 

        // console.log("Retrieved track counts object from sync storage: ");
        // console.table(_trackCountsObject);
        _trackCountsObject[tracklistTitle] = trackCount;
        // console.log("Updated track counts object with latest track count for tracklist: " + tracklistTitle);
        // console.table(_trackCountsObject);

        chrome.storage.sync.set ({trackCounts: _trackCountsObject}, () => {
            if (chrome.runtime.lastError != null) {
                console.error("ERROR: " + chrome.runtime.lastError.message);
            } else {
                console.info("StorageManager: Successfully updated track count in chrome sync storage for tracklist: " + tracklistTitle);
            }
        });
    });
}