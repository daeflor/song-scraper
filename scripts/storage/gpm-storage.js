import * as chromeStorage from '/scripts/modules/utilities/chrome-storage-promises.js'
import getGPMTracklistTitle from '/scripts/Configuration/tracklist-title-mapping.js'
import { filterOutTracklist, generateListOfUploadedGPMTracks } from '/scripts/modules/tracklist-comparison-utilities.js'

const SESSION_STATE = {
    gpmLibrary: undefined,
    gpmUploadedTracks: undefined
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
}

//retrieveGPMTracksArrayFromChromeLocalStorage from StorageManager.js
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
        //TODO should I save this in SESSION STATE? If it's safe to assume we're only asking for the tracklist title of the 'current' tracklist, then it may be worth it 
            //I believe this is what we used to do. But right now that seems like a flawed assumption to me. Needs a bit of investigation.
            //Update: No, it wouldn't make sense to do that here, not in the same way it was done before in event-controller.
                //In event-controller, the array accessed WAS only ever for the current tracklist. But this function here is now consolidated to work for both the needs of
                //event-controller as well as the comparison/filter utilities, and so the tracklist requested could be any.
                //It may still make sense to store the 'current' tracks array in session state, but would need to rethink how. Also may not be worth it at this point. Storing the gpm library object in session state should provide enough value already.
                    //Potentially could do a check based on whether or not SESSION STATE has a key matching the tracklistTitle param, but may not be worth it
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

