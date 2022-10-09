import * as chromeStorage from '/scripts/modules/utilities/chrome-storage-promises.js'
import getGPMTracklistTitle from '/scripts/Configuration/tracklist-title-mapping.js'
import { filterOutTracklist } from '/scripts/modules/tracklist-comparison-utilities.js'

//TODO should use a session state like in event-controller so that we don't have to access the chrome local storage every time.
    //All the logic that isn't slow could even be done the first time the data is accessed (such as generating a list of all playlist names), but probably not as necessary
const SESSION_STATE = {
    gpmLibrary: undefined
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

        SESSION_STATE.gpmLibrary = storageItems[gpmLibraryKey];
    }

    return SESSION_STATE.gpmLibrary;
    //return storageItems[gpmLibraryKey];
}

//retrieveGPMTracksArrayFromChromeLocalStorage from StorageManager.js
/**
 * Retrieves the GPM tracks array from chrome local storage that matches the provided tracklist title
 * @param {string} tracklistTitle The title of the tracklist to retrieve
 * @returns {Promise} A promise with the tracks array, if it's found
 */
export async function getTracksArray(tracklistTitle){
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

