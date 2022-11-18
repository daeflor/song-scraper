import { ChromeStorageAccessor } from './chrome-storage.js'
import * as firestore from './firestore-storage.js';

//TODO maybe these should be in an init function that gets called when auth changes
const currentTracklistMetadata = new ChromeStorageAccessor('local', 'currentTracklistMetadata');
const trackCounts = new ChromeStorageAccessor('sync');

export async function getCurrentTracklistType() {
    return await currentTracklistMetadata.getProperty('type');
}

export async function getCurrentTracklistTitle() {
    return await currentTracklistMetadata.getProperty('title');
}

/**
 * Stores the provided tracklist data in Firestore, and the track count in Chrome Storage
 * @param {string} tracklistTitle The title of the tracklist
 * @param {string} tracklistType The tracklist type
 * @param {Object[]} tracksArray The array of track objects
 */
export async function storeTracklistData(tracklistTitle, tracklistType, tracksArray) {
    //TODO tbd on if this check should be here or rely on a deeper one
    if (typeof tracklistTitle === 'string' && typeof tracklistType === 'string' && Array.isArray(tracksArray) === true) {
        await firestore.storeTracklistInFirestore(tracklistTitle, tracklistType, tracksArray);
        trackCounts.storageItemKey = 'trackCounts_' + firebase.auth().currentUser.uid; //TODO would be nice if this could just be set once after authentication, instead of every time data is stored
        await trackCounts.setProperty(tracklistTitle, tracksArray.length);
    } else throw TypeError("Tried to store the tracklist data, but the parameters provided (title, type, or tracks array) were invalid.");
}
