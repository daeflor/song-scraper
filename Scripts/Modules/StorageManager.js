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
            console.warn("Tried retrieving tracklist data but no tracklist with the provided title was found in storage. Tracklist Title: " + title);
        }
    }).catch((error) => {
        console.error("Error getting document:", error);
    });
}