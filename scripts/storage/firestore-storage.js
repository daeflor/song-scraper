//TODO might be good to have a single module that handles loading and initializing all necessary firebase libraries
    //Then, any files that have a dependency on firebase (e.g. Auth, Storage, etc.) can just import that module
import '/node_modules/firebase/firebase-app.js'; //Import the Firebase App before any other Firebase libraries
import '/node_modules/firebase/firebase-firestore.js'; //Import the Cloud Firestore library
import * as sessionState from '../session-state.js'

/**
 * Get a reference to the tracklist collection for the currently signed-in user
 * @returns {Object} A reference to the tracklist collection for the currently signed-in user
 */
function getReferenceToUserTracklistCollection() {
    const userId = firebase.auth().currentUser.uid;
    try {
        return firebase.firestore().collection('users').doc(userId).collection('tracklists');
    } catch (error) {
        console.error(error);
    }
}

/**
 * Stores the scraped tracklist data - currently saved in session state - into the Firestore database
 */
export async function storeScrapedTracks() {
    const tracklistTitle = sessionState.tracklistTitle;
    const tracklistType = sessionState.tracklistType;
    const tracksArray = sessionState.scrapedTracks;
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

//TODO could have a storage directory that contains multiple files, maybe:
    //One for Firebase related logic (This file)
    //One for chrome storage related logic (incl. Chrome sync storage)
    //One for chrome storage utility/helper functions? - These are actually already separate and in the utilities directory, since they are more general utiitites that don't include any code specific to this app's functionality
    //One for Legacy App Storage? (i.e. GPM) - This part has now been sectioned off and completed
