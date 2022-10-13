import * as chromeStorage from '/scripts/modules/utilities/chrome-storage-promises.js'
import getGPMTracklistTitle from '/scripts/Configuration/tracklist-title-mapping.js'
import { filterOutTracklist } from '/scripts/modules/tracklist-comparison-utilities.js'

const SESSION_STATE = {
    gpmLibrary: undefined, //TODO consider not saving this at all, and skipping right to the step of saving gpmTracklists
    gpmTracklists: {},
    gpmUploadedTracks: undefined
}

/**
 * Retrieves the requested GPM data. 
 * The first time this is called, the GPM Library data is retrived from Chrome local storage and saved in session state for future reference. 
 * @param {string} requestedData The type of data to return. Supported options are 'tracksArray', 'trackCount', 'tracklistTitles', 'allPlaylists', 'tracklist', 'tracklists', 'tracksNotInCommon'.
 * @param {string} [tracklistTitle] An opptional string indicating the title of the tracklist for which to fetch data, if applicable. This parameter is required if 'requestedData' is set to 'tracksArray', 'trackCount', 'tracklist', or 'tracklists'.
 * @returns {Promise} A promise with the resulting data
 */
export async function getGpmData(requestedData, tracklistTitle) { //TODO figure out how to most cleanly handle parameters for multiple tracklist title
        if (typeof SESSION_STATE.gpmLibrary === 'undefined') {
            console.log("GPM Library data has not yet been saved in sesstion state, so fetching it from Chrome local storage instead.");
            await saveGpmLibraryDataToSessionState();
        }

        // console.log(SESSION_STATE.gpmLibrary);
        // console.log(SESSION_STATE.gpmTracklists);

        switch(requestedData) {
        case 'tracksArray':
            if (tracklistTitle === 'Uploaded Songs') { // If the desired tracklist is the list of songs uploaded to GPM, some special steps need to be taken, since this specific tracklist wasn't stored in the exported GPM data
                return SESSION_STATE.gpmUploadedTracks || await retrieveUploadedGpmTracks(); // If the list of GPM Uploaded tracks has not already been saved in session state, either fetch it from local storage (if it exists) or calculate it now and save it for future reference
            } else if (typeof tracklistTitle !== 'undefined') { // Else, for any other tracklist, fetch the array of tracks from Chrome local storage
                const gpmTracklistTitle = getGPMTracklistTitle(tracklistTitle); // Use the YTM to GPM tracklist title mapping to get the exact GPM tracklist title
                return SESSION_STATE.gpmTracklists[gpmTracklistTitle]?.tracks;
                //return gpmLibrary[gpmTracklistTitle];
            } else throw Error("Request received to get a GPM tracks array but no tracklist title was provided.");
        case 'trackCount': // Returns the track count for the given tracklist stored in the GPM library data, if available
            return (await getGpmData('tracksArray', tracklistTitle))?.length;
        case 'tracklistTitles': // Returns a list of the titles of all the tracklists stored in the GPM Library data
            return Object.keys(SESSION_STATE.gpmTracklists); // Return a list of all the key names in the gpm tracklists array saved in session state
        case 'allPlaylists':
            return Object.values(SESSION_STATE.gpmTracklists).filter(tracklist => ['ADDED FROM MY SUBSCRIPTION', 'ALL MUSIC', 'Songs'].includes(tracklist.title) === false);

            // //return SESSION_STATE.gpmTracklists
            // console.log(SESSION_STATE);
            // console.log(Object.entries(SESSION_STATE.gpmTracklists));
            // console.log(Object.entries(SESSION_STATE.gpmTracklists).filter(tracklist => ['ADDED FROM MY SUBSCRIPTION', 'ALL MUSIC', 'Songs'].includes(tracklist[1].title) === false));
            // console.log(Object.entries(SESSION_STATE.gpmTracklists).flat().filter(tracklist => ['ADDED FROM MY SUBSCRIPTION', 'ALL MUSIC', 'Songs'].includes(tracklist.title) === false));
            // console.log(Object.entries(SESSION_STATE.gpmTracklists).flat().filter(tracklist => typeof tracklist.title !== 'undefined' && ['ADDED FROM MY SUBSCRIPTION', 'ALL MUSIC', 'Songs'].includes(tracklist.title) === false));
            // console.log(Object.entries(SESSION_STATE.gpmTracklists).flat().filter(tracklist => [undefined, 'ADDED FROM MY SUBSCRIPTION', 'ALL MUSIC', 'Songs'].includes(tracklist.title) === false));
        case 'tracklist':
            //TODO
        case 'tracklists':
            //TODO
        case 'tracksNotInCommon':
            //TODO
        default:
            throw Error("An inavlid data category was provided when requesting GPM data.");
        }
}

/**
 * Fetches the exported GPM Library data from Chrome local storage and then saves it in session state in a format that makes the data more easily acciessible for future reference. 
 */
async function saveGpmLibraryDataToSessionState() {
    // Retrieve the GPM Library data from Chrome local storage and save it in session state for future reference
    const gpmLibraryKey = 'gpmLibraryData';
    const storageItems = await chromeStorage.getKeyValuePairs('local', gpmLibraryKey);

    typeof storageItems[gpmLibraryKey] === 'undefined'
    ? console.warn("Tried to fetch the GPM library data from local storage but it wasn't found.")
    : console.log("Successfully fetched GPM library data from local storage.")

    SESSION_STATE.gpmLibrary = storageItems[gpmLibraryKey];

    saveGPMTracklistsToSessionState(storageItems[gpmLibraryKey]);
}

/**
 * Traverses a GPM Library data object as retrieved from Chrome Local Storage and uses it to generate individual tracklist data objects (as opposed to simply tracks arrrays). 
 * These tracklist data objects are then saved in session state for future access. 
 * This is done so that the GPM Library data is subsequently quickly accessible in a format similar to the YTM Library data.
 * @param {object} gpmLibraryDataObject the GPM Library data object, as retrieved from Chrome Local Storage
 */
 function saveGPMTracklistsToSessionState(gpmLibraryDataObject) {
    for (const tracklistKey in gpmLibraryDataObject) {
        if (tracklistKey.length >= 43) { // If the tracklist name is at least long enough to include the standard prefix used in the GPM storage format... (this excludes certain playlists like 'Backup' and legacy ones)
            const tracklistTitle = tracklistKey.substring(43, tracklistKey.length-1); // Extract the actual tracklist title from the key used in GPM storage
            //TODO could consider marking here the tracklists which are considered to be of type 'playlist'
            SESSION_STATE.gpmTracklists[tracklistTitle] = {title:tracklistTitle, tracks:gpmLibraryDataObject[tracklistKey]}; // Create a new tracklist data object including the title and tracks array, and add it to session state
        }
    }
}

/**
 * Retrieves the list of tracks Uploaded to GPM from Chrome local storage, if it exists there. The list should be stored under the key 'gpmLibraryData_UploadedSongs'.
 * Otherwise, the list is generated by removing any tracks 'Added from Subscription' from the list of 'All Music'.
 * @returns {Promise} A promise with the array of uploaded track objects
 */
//TODO it may make the most sense to just add this data to the 'gpmLibraryData' object in Local Storage, and avoid any special steps moving forward.
export async function retrieveUploadedGpmTracks() {
    // Retrieve the GPM Library data from Chrome local storage and save it in session state for future reference
    const storageKey = 'gpmLibraryData_UploadedSongs';
    const storageItems = await chromeStorage.getKeyValuePairs('local', storageKey);

    if (typeof storageItems[storageKey] !== 'undefined') {
        console.log("Successfully fetched Uploaded GPM tracks from local storage.");
        SESSION_STATE.gpmUploadedTracks = storageItems[storageKey];
    } else {
        console.warn("Tried to fetch the list of GPM Uploaded Tracks from Chrome local storage but it wasn't found. Generating new list instead.");
        const allTracks = getGpmData('tracksArray', 'ALL MUSIC'); // Retrieve the array of all tracks in the GPM library
        const subscribedTracks = await retrieveGPMTracklistDataFromChromeLocalStorageByTitle('ADDED FROM MY SUBSCRIPTION'); // Retrieve the tracklist of subscribed GPM tracks
        SESSION_STATE.gpmUploadedTracks = filterOutTracklist(allTracks, subscribedTracks); // Generate a list of uploaded GPM tracks by starting with the list of all tracks and filtering out any that are in the list of subscribed tracks
    }

    return SESSION_STATE.gpmUploadedTracks;
}

/**
 * Returns an object containing the the exported GPM library data
 * @returns {Promise} A promise with the resulting GPM library data object
 */
export async function getGPMLibraryData() {

    // let snack = mySnack || await myF();
    // console.log(snack);

    //console.log(typeof SESSION_STATE.gpmLibrary);

    // If the GPM Library data has not yet been fetched in this session, retrieve it from Chrome local storage, save it for future reference, and return it
    if (typeof SESSION_STATE.gpmLibrary === 'undefined') {
        const gpmLibraryKey = 'gpmLibraryData';
        const storageItems = await chromeStorage.getKeyValuePairs('local', gpmLibraryKey);

        typeof storageItems[gpmLibraryKey] === 'undefined'
        ? console.warn("Tried to fetch the GPM library data from local storage but it wasn't found.")
        : console.log("Successfully fetched GPM library data from local storage.")

        console.log(storageItems[gpmLibraryKey]);
        SESSION_STATE.gpmLibrary = storageItems[gpmLibraryKey];

        saveGPMTracklistsToSessionState(storageItems[gpmLibraryKey]);
    }

    console.log(SESSION_STATE);

    return SESSION_STATE.gpmLibrary;
}
