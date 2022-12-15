import { ChromeStorageAccessor } from './chrome-storage.js'
import * as firestore from './firestore-storage.js';

//TODO maybe these should be in an init function that gets called when auth changes
const currentTracklistMetadata = new ChromeStorageAccessor('local', 'currentTracklistMetadata');
const trackCounts = new ChromeStorageAccessor('sync');

/**
 * Retrieves the specified piece of metadata for the current tracklist cached in Chrome storage
 * @param {string} metadatum The type of metadata to fetch from storage. (Valid parameters are 'type', 'title', and 'trackCount').
 * @returns the metadata value matching the key provided
 */
export async function getCachedMetadata(metadatum) {
    return await currentTracklistMetadata.getProperty(metadatum);
}

/**
 * Caches the metadata for the current tracklist in Chrome storage
 * @param {Object} metadata An object containing the tracklist metadata. (Should contain 'type' and 'title' keys and, optionally, a 'trackCount' key as well).
 */
export async function setCachedMetadata(metadata) {
    await currentTracklistMetadata.setProperty('type', metadata.type);
    await currentTracklistMetadata.setProperty('title', metadata.title);
    await currentTracklistMetadata.setProperty('trackCount', metadata.trackCount);
}

//TODO may want to consider splitting this up into two functions (e.g. storeTracklistMetadata, storeTrackCount)
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

//TODO is it still not possible for the background script to just get the track count from firestore and not have to store an extra copy in Chrome Storage?
//TODO the naming of the function is a bit confusing currently, when compared to getting cached metadata from Chrome storage (which can also include a track count).
/**
 * Gets the track count from Chrome sync storage for a given tracklist
 * @param {string} tracklistTitle The title of the tracklist, used to search storage
 * @returns {Promise} A promise with the track count matching the given tracklist title
 */
export async function getTrackCount(tracklistTitle) {
    if (typeof tracklistTitle === 'string') {
        trackCounts.storageItemKey = 'trackCounts_' + firebase.auth().currentUser.uid; //TODO would be nice if this could just be set once after authentication, instead of every time data is stored  
        return trackCounts.getProperty(tracklistTitle);
    } else throw TypeError("Tried to fetch a track count from Chrome Storage, but a valid tracklist title parameter was not provided.");
}
