//TODO might be good to have a single module that handles loading and initializing all necessary firebase libraries
    //Then, any files that have a dependency on firebase (e.g. Auth, Storage, etc.) can just import that module
import '/node_modules/firebase/firebase-app.js'; //Import the Firebase App before any other Firebase libraries
import '/node_modules/firebase/firebase-firestore.js'; //Import the Cloud Firestore library

import * as chromeStorage from './utilities/chrome-storage-promises.js'

let _firestoreDatabase = undefined;

/**
 * Stores the provided tracklist data in Firestore and then executes the provided callback
 * @param {string} tracklistTitle The tracklist title
 * @param {string} tracklistType The tracklist type
 * @param {Object[]} tracksArray The array of tracks to store with the tracklist
 */
export async function storeTracklistInFirestore(tracklistTitle, tracklistType, tracksArray) {
    if (typeof tracklistTitle === 'string' && typeof tracklistType === 'string' && Array.isArray(tracksArray) === true) {
        const userId = firebase.auth().currentUser.uid;
        const tracklistCollection = firebase.firestore().collection('users').doc(userId).collection('tracklists');
        //const _tracklistKey = tracklistData.type + "_'" + tracklistData.title + "'";
        //TODO might be better to create an ID for the tracklist the first time it is scraped/stored and use that for the key instead / as well, since the title is not unique.
            //For manual playlist, the ID in the YTM URL could be used for this.

        const currentTracklistDocument = tracklistCollection.doc(tracklistTitle);
        const documentData = {title: tracklistTitle, type: tracklistType, tracks: tracksArray};

        // Add or update the document for the current tracklist, merging it with any existing data if the document already exists
        await currentTracklistDocument.set(documentData, {merge:true})
            //.catch(error => console.error("Error writing document to storage:" + error));
    } else throw new TypeError("Tried to store the scraped tracklist in Firestore but the parameters provided were invalid.");
}

/**
 * Retrieves the tracks array stored in Firestore that matches the provided tracklist title, if it exists
 * @param {string} tracklistTitle The title of the tracklist to retrieve
 * @returns {Promise} A promise with the tracks array matching the provided tracklist title, if it exists
 */
export function retrieveTracksFromFirestore(tracklistTitle) {
    return new Promise((resolve, reject) => {
        if (typeof tracklistTitle === 'string') {
            const userId = firebase.auth().currentUser.uid;
            const tracklistCollection = firebase.firestore().collection('users').doc(userId).collection('tracklists');
            //const _tracklistKey = tracklistType + "_'" + tracklistTitle + "'";
            const currentTracklistDocument = tracklistCollection.doc(tracklistTitle);
        
            currentTracklistDocument.get().then(doc => {
                if (doc.exists) {
                    resolve(doc.data().tracks);
                } else {
                    console.info("Tried retrieving tracklist data from Firestore but no tracklist with the provided title was found in storage. Tracklist Title: " + tracklistTitle);
                    resolve(undefined);
                }
            });
        } else reject (Error("Tried to retrieve tracks from Firestore, but a valid string was not provided for the tracklist title."));
    });
}

//TODO since almost the exact same logic is used to get the GPM tracks array as the track count (in background script),
    //...it may make sense to make a single helper function that does this and re-use that.
    //It could possibly return either the tracks array or the track count, depending on what is requested
    //Should wait until Chrome 91 comes out to see if it addresses Chromium Bug 824647
/**
 * Retrieves GPM tracklist data from chrome local storage that matches the provided tracklist title
 * @param {string} tracklistTitle The title of the tracklist to retrieve
 * @returns {Promise} A promise with the tracks array, if it's found
 */
export async function retrieveGPMTracklistFromLocalStorage(tracklistTitle){
    const gpmLibraryKey = 'gpmLibraryData';
    const storageItems = await chromeStorage.getKeyValuePairs('local', gpmLibraryKey);
    const gpmLibraryData = storageItems[gpmLibraryKey];
    for (const tracklistKey in gpmLibraryData) {
        if (tracklistKey.includes("'" + tracklistTitle + "'")) {
            //console.log("Background: Retrieved tracklist metadata from GPM exported data. Track count: " + gpmLibraryData[tracklistKey].length);
            return gpmLibraryData[tracklistKey];
        }
    }
    console.warn("Tried retrieving GPM tracklist data but no tracklist with the provided title was found in storage. Tracklist Title: " + tracklistTitle);
    return undefined;
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
export async function storeTrackCountInChromeSyncStorage(tracklistTitle, trackCount) {
    if (typeof tracklistTitle === 'string' && typeof trackCount === 'number') {
        const key = 'trackCounts_' + firebase.auth().currentUser.uid;
        const storageItems = await chromeStorage.getKeyValuePairs('sync', key);
        storageItems[key] = storageItems[key] ?? {}; // If a track counts object doesn't already exist for the current user, create a new one
        storageItems[key][tracklistTitle] = trackCount; // Set the track count for the current tracklist
        
        await chromeStorage.set('sync', storageItems);
    } else throw new TypeError("Tried to store the track count in Chrome sync storage, but the parameters provided (title and/or track count) were invalid.");// TODO... what do you do when you need to return nothing/error out in an async func?
}

//TODO Duplicated due to Chromium Bug 824647
//TODO this would be good to put in a module that both background and options scripts can access, once Chrome 91 releases.
/**
 * Returns the user's preferences object, or a particular preference value if specified
 * @param {string} [preference] An optional preference to specify, if only one value is desired
 * @returns {Promise} A promise with either an object containing all the user's preferences, or the value of a single preference, if specified
 */
 export async function getPreferencesFromChromeSyncStorage(preference) {
    const preferencesKey = 'preferences';
    const storageItems = await chromeStorage.getKeyValuePairs('sync', preferencesKey);
    return (typeof preference === 'undefined')
    ? storageItems[preferencesKey]
    : storageItems[preferencesKey]?.[preference];
}
