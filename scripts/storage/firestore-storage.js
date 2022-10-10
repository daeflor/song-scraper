//TODO might be good to have a single module that handles loading and initializing all necessary firebase libraries
    //Then, any files that have a dependency on firebase (e.g. Auth, Storage, etc.) can just import that module
import '/node_modules/firebase/firebase-app.js'; //Import the Firebase App before any other Firebase libraries
import '/node_modules/firebase/firebase-firestore.js'; //Import the Cloud Firestore library
import * as chromeStorage from '/scripts/modules/utilities/chrome-storage-promises.js'
import { getGPMLibraryData } from './gpm-storage.js'

/**
 * Get a reference to the tracklist collection for the currently signed-in user
 * @returns {Object} A reference to the tracklist collection for the currently signed-in user
 */
function getReferenceToUserTracklistCollection() {
    const userId = firebase.auth().currentUser.uid;
    return firebase.firestore().collection('users').doc(userId).collection('tracklists');
}

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
 * Retrives the current user's tracklists of the specified type from Firestore
 * @param {string[]} [tracklistTypes] An optional array of strings specifying the types of tracklists to retrieve from Firestore. Supported values are: playlist, auto, all, uploads. If not specified, all of the user's tracklists are retrieved.
 * @returns {Promise} A promise with an array of tracklist objects matching the given types
 */
 export async function retrieveTracklistDataFromFireStoreByType(tracklistTypes = ['all', 'auto', 'playlist', 'uploads']) {
    //TODO would it be better if this used Rest parameters
    //TODO the 'all' type name is confusing. Maybe 'subscription' or 'added' would be clearer.
    const playlistData = await getReferenceToUserTracklistCollection().where("type", "in", tracklistTypes).get();

    if (Array.isArray(playlistData?.docs) === true) {
        return playlistData.docs.map(doc => doc.data());
    } else throw Error("An error was encountered when trying to retrieve all playlists from Firestore.");
}

/**
 * Retrieves the tracklist data object or objects stored in Firestore matching the provided tracklist title(s), if they exist
 * @param {...string} tracklistTitles Any number of titles of tracklists to retrieve
 * @returns {Promise} A promise with the tracklist data object, or array of tracklist data objects, matching the provided tracklist title(s)
 */
 export async function retrieveTracklistDataFromFirestoreByTitle(...tracklistTitles) {
    if (tracklistTitles.length > 0) { // At least one tracklist title needs to be provided
        const querySnapshot = await getReferenceToUserTracklistCollection().where("title", "in", tracklistTitles).get();
        if (Array.isArray(querySnapshot?.docs) === true) {
            // Get an array of tracklist data objects from the array of documents in the query snapshot
            const tracklists = querySnapshot.docs.map(doc => doc.data());
            
            // If there is only a single tracklist in the results, return the tracklist object. Otherwise return the array of tracklist objects.
            if (tracklists.length === 1) {
                return tracklists[0];
            } else return tracklists;
        } else throw Error("An error was encountered when trying to retrieve tracklists from Firestore. No documents matched the given parameters.");
    } else throw Error("Tried to retrieve tracklist data from Firestore, but a valid string was not provided for the tracklist title.");
}

/**
 * Retrieves the tracks array stored in Firestore that matches the provided tracklist title, if it exists
 * @param {string} tracklistTitle The title of the tracklist to retrieve
 * @returns {Promise} A promise with the tracks array matching the provided tracklist title, if it exists
 */
 export async function retrieveTracksArrayFromFirestore(tracklistTitle) {
    if (typeof tracklistTitle === 'string') {
        const tracklistData = await retrieveTracklistDataFromFirestoreByTitle(tracklistTitle);
        return tracklistData.tracks;
    } else throw Error("Tried to retrieve a tracks array from Firestore, but a valid string was not provided for the tracklist title.");
}

/**
 * Generates GPM tracklist data object or objects from the tracks arrays stored in Chrome local storage matching the provided tracklist title(s), or for all playlists (i.e. excluding 'All Songs' lists) if no title parameters are provided.
 * @param  {...string} tracklistTitles Any number of titles of tracklists to retrieve. If no titles are provided, all stored playlists (i.e. excluding 'All Songs' lists) will be retrieved.
 * @returns {Promise} A promise with the tracklist data object, or array of tracklist data objects, matching the provided tracklist title(s)
 */
export async function retrieveGPMTracklistDataFromChromeLocalStorageByTitle(...tracklistTitles) {
    const gpmLibraryData = await getGPMLibraryData();
    const tracklists = [];

    //TODO should some of this logic be moved to new gpm utilities file?
    for (const tracklist in gpmLibraryData) {
        if (tracklist.length >= 43) { // If the tracklist name is at least long enough to include the standard prefix used in the GPM storage format... (this excludes certain playlists like 'Backup' and legacy ones)
            // Extract the actual tracklist title from the key used in GPM storage
            const tracklistTitle = tracklist.substring(43, tracklist.length-1); 

            // If either a provided title matches the current tracklist title, or no tracklist titles were provided and the current tracklist is a playlist (i.e. excluding comprehensive lists like 'All Music')...
            if (tracklistTitles.includes(tracklistTitle) === true || 
            (tracklistTitles.length === 0 && ['ADDED FROM MY SUBSCRIPTION', 'ALL MUSIC', 'Songs'].includes(tracklistTitle) === false)) { 
                // Create a new tracklist data object including the title and tracks array, and add it to the list
                tracklists.push({title:tracklistTitle, tracks:gpmLibraryData[tracklist]}); 
            }
        }
    }

    // If there is only a single tracklist in the results, return the tracklist object. Otherwise return the array of tracklist objects.
    if (tracklists.length === 1) {
        return tracklists[0];
    } else return tracklists;
}

//TODO could have a storage directory that contains multiple files, maybe:
    //One for Firebase related logic
    //One for chrome storage related logic
    //One for chrome storage utility/helper functions?
    //One for Legacy App Storage? (i.e. GPM)

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
