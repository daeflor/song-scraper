//TODO might be good to have a single module that handles loading and initializing all necessary firebase libraries
    //Then, any files that have a dependency on firebase (e.g. Auth, Storage, etc.) can just import that module
import '/node_modules/firebase/firebase-app.js'; //Import the Firebase App before any other Firebase libraries
import '/node_modules/firebase/firebase-firestore.js'; //Import the Cloud Firestore library

//TODO might not need a StorageManager separate from the Model

let _firestoreDatabase = undefined;

/**
 * Stores the provided tracklist data in Firestore and then executes the provided callback
 * @param {Object} tracklistMetadata An object containing metaata about the tracklist. Must include at least title and type fields.
 * @param {Object[]} tracksArray The array of tracks to store with the tracklist
 * @param {function} callback The function to execute once the data has been successfully stored
 */
export function storeTracklistInFirestore(tracklistTitle, tracklistType, tracksArray, callback) {

    if (typeof tracklistTitle === 'string' && typeof tracklistType === 'string' && Array.isArray(tracksArray) === true) {


        const userId = firebase.auth().currentUser.uid;
        const tracklistCollection = firebase.firestore().collection('users').doc(userId).collection('tracklists');
        //const _tracklistKey = tracklistData.type + "_'" + tracklistData.title + "'";
        //TODO might be better to create an ID for the tracklist the first time it is scraped/stored and use that for the key instead / as well, since the title is not unique.
            //For manual playlist, the ID in the YTM URL could be used for this.

        const currentTracklistDocument = tracklistCollection.doc(tracklistTitle);

        const documentData = {
            title: tracklistTitle,
            type: tracklistType,
            tracks: tracksArray
        };

        //TODO could promisify this
        // Add or update the document for the current tracklist, merging it with any existing data if the document already exists
        currentTracklistDocument
            .set(documentData, {merge:true})
            .then(callback)
            .catch(error => console.error("Error writing document to storage:" + error));
    } else console.error("Tried to store the scraped tracklist in Firestore but the parameters provided were invalid.");
}

/**
 * Retrieves tracklist data from Firestore that corresponds to the provided tracklist title
 * @param {string} tracklistTitle The title of the tracklist to retrieve
 * @param {function} callback The function to execute once the data has been successfully retrieved
 */
export function retrieveTracklistFromFirestore(tracklistTitle, callback) {
    //Initialize an instance of Cloud Firestore if it hasn't already been initialized
    if (typeof _firestoreDatabase !== 'object') {
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
            //TODO it would probably be good to have a check before this to ensure the tracklist title isn't undefined...
                //...right now, if it is undefined, it will result in the warning below, whereas it really should be an error and separate.
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

//TODO could have a storage directory that contains multiple files, maybe:
    //One for Firebase related logic
    //One for chrome storage related logic
    //One for chrome storage utility/helper functions?

/**
 * Stores the provided track count for the given tracklist in chrome sync storage
 * @param {string} tracklistTitle The title of the tracklist
 * @param {number} trackCount The latest track count of the tracklist
 */
export function storeTrackCountInChromeSyncStorage(tracklistTitle, trackCount) {
    const storageKey = 'trackCounts_' + firebase.auth().currentUser.uid;
            
    chrome.storage.sync.get(storageKey, storageResult => {
        storageResult[storageKey] = storageResult[storageKey] ?? {} // If a track counts object doesn't already exist for the current user, create a new one
        storageResult[storageKey][tracklistTitle] = trackCount; // Set the latest track count for the current tracklist 

        chrome.storage.sync.set(storageResult, () => {
            if (typeof chrome.runtime.error !== 'undefined') {
                console.error("Error encountered while attempting to store track count in chrome sync storage: " + chrome.runtime.lastError.message);
            }
        });
    });
}