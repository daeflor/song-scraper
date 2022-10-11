import * as chromeStorage from '/scripts/modules/utilities/chrome-storage-promises.js'
import getGPMTracklistTitle from '/scripts/Configuration/tracklist-title-mapping.js'
import { filterOutTracklist, generateListOfUploadedGPMTracks } from '/scripts/modules/tracklist-comparison-utilities.js'

const SESSION_STATE = {
    gpmLibrary: undefined,
    gpmUploadedTracks: undefined,
    gpmTracklists: {}
}

/**
 * Returns an object containing the the exported GPM library data
 * @returns {Promise} A promise with the resulting GPM library data object
 */
export async function getGPMLibraryData(){ //TODO getLibraryData

    //console.log(typeof SESSION_STATE.gpmLibrary);

    // If the GPM Library data has not yet been fetched in this session, retrieve it from Chrome local storage, save it for future reference, and return it
    if (typeof SESSION_STATE.gpmLibrary === 'undefined') {
        const gpmLibraryKey = 'gpmLibraryData';
        const storageItems = await chromeStorage.getKeyValuePairs('local', gpmLibraryKey);

        typeof storageItems[gpmLibraryKey] === 'undefined'
        ? console.warn("Tried to fetch the GPM library data from local storage but it wasn't found.")
        : console.log("Successfully fetched GPM library data from local storage.")

        //console.log(storageItems[gpmLibraryKey]);
        SESSION_STATE.gpmLibrary = storageItems[gpmLibraryKey];

        saveGPMTracklistsToSessionStorage(storageItems[gpmLibraryKey]);
    }

    //console.log(SESSION_STATE);

    return SESSION_STATE.gpmLibrary;
}

/**
 * Retrieves the GPM tracks array from chrome local storage that matches the provided tracklist title
 * @param {string} tracklistTitle The title of the tracklist to retrieve
 * @returns {Promise} A promise with the tracks array, if it's found
 */
export async function getTracksArray(tracklistTitle){
    // If the desired tracklist is the list of songs uploaded to GPM, some special steps need to be taken, since this specific tracklist wasn't stored in the exported GPM data
    if (tracklistTitle === 'Uploaded Songs') {
        if (Array.isArray(SESSION_STATE.gpmUploadedTracks) === false) { // If the list of GPM Uploaded tracks has not already been calculated, calculate it now and save it for future reference
            SESSION_STATE.gpmUploadedTracks = await generateListOfUploadedGPMTracks();
        }
        return SESSION_STATE.gpmUploadedTracks;
    } else { // Else, for any other tracklist, fetch the array of tracks from Chrome local storage
        const gpmLibraryData = await getGPMLibraryData();
        const gpmTracklistTitle = getGPMTracklistTitle(tracklistTitle); // Use the YTM to GPM tracklist title mapping to get the exact GPM tracklist title
            
        for (const tracklistKey in gpmLibraryData) {
            if (tracklistKey.includes("'" + gpmTracklistTitle + "'") === true) {
                console.info("Retrieved tracklist metadata from GPM exported data. Tracklist title: " + gpmTracklistTitle);
                return gpmLibraryData[tracklistKey];
            }
        }
        console.warn("Tried retrieving GPM tracklist data but no tracklist with the provided title was found in storage. Tracklist Title: " + gpmTracklistTitle);
    }
}

/**
 * Returns the track count for the given tracklist stored in the GPM library data, if available
 * @param {string} tracklistTitle The title of the tracklist
 * @returns {Promise} A promise with the resulting track count
 */
export async function getTrackCount(tracklistTitle){
    const tracksArray = await getTracksArray(tracklistTitle);
    return tracksArray?.length;
}

/**
 * Returns a list of the titles of all the tracklists stored in the exported GPM library data
 * @returns {Promise} A promise with the resulting array of tracklist titles
 */
 export async function getTracklistTitles(){
    const gpmLibraryData = await getGPMLibraryData();
    if (typeof gpmLibraryData !== 'undefined') {
        return Object.keys(gpmLibraryData).map(name => name.replace('ohimkbjkjoaiaddaehpiaboeocgccgmj_Playlist_', '')); // Return a list of all the key names in the gpm library data object, but removing the prefix for better readability
    } else console.warn("Tried to fetch a list of GPM tracklist names from Chrome local storage, but the GPM library data couldn't be found.");
}

/**
 * Traverses a GPM Library data object as retrieved from Chrome Local Storage and uses it to generate individual tracklist data objects (as opposed to simply tracks arrrays). 
 * These tracklist data objects are then saved in session state for future access. 
 * This is done so that the GPM Library data is subsequently quickly accessible in a format similar to the YTM Library data.
 * @param {object} gpmLibraryDataObject the GPM Library data object, as retrieved from Chrome Local Storage
 */
 function saveGPMTracklistsToSessionStorage(gpmLibraryDataObject){
    for (const tracklistKey in gpmLibraryDataObject) {
        if (tracklistKey.length >= 43) { // If the tracklist name is at least long enough to include the standard prefix used in the GPM storage format... (this excludes certain playlists like 'Backup' and legacy ones)
            const tracklistTitle = tracklistKey.substring(43, tracklistKey.length-1); // Extract the actual tracklist title from the key used in GPM storage
            SESSION_STATE.gpmTracklists[tracklistTitle] = {title:tracklistTitle, tracks:gpmLibraryDataObject[tracklistKey]}; // Create a new tracklist data object including the title and tracks array, and add it to session state
        }
    }
}

