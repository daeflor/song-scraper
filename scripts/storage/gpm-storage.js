import * as chromeStorage from '../modules/utilities/chrome-storage-promises.js'
import getGPMTracklistTitle from '/scripts/Configuration/tracklist-title-mapping.js'
import { filterOutTracklist, addTracklistMappingToTracks } from '/scripts/modules/tracklist-comparison-utilities.js'
import { getCommonPlaylistsGPM, getNonCommonPlaylistsGPM } from '../Configuration/custom-tracklists.js';

const SESSION_STATE = {
    gpmTracklists: {},
    tracksNotInCommon: undefined
}

/**
 * Retrieves the requested data related to a specific GPM tracklist
 * The GPM tracklist data is fetched from session state, if it already exists there. Otherwise it's fetched from Chrome local storage and saved in session state for future reference. 
 * @param {string} requestedData The type of data to return. Supported options are 'tracklist', 'tracksArray', and 'trackCount'. 
 * @param {string} tracklistTitle The title of the tracklist for which to fetch data.
 * @returns {Promise} A promise with the resulting data
 */
export async function getTracklistData(requestedData, tracklistTitle) { 
    if (Object.keys(SESSION_STATE.gpmTracklists).length === 0) {
        console.info("This list of GPM tracklists has not yet been saved in session state. Fetching the data from Chrome local storage instead.");
        await saveGpmTracklistsToSessionState();
    }

    switch(requestedData) {
    case 'tracklist': // Return the GPM tracklist data object that matches the provided tracklist title
        const gpmTracklistTitle = getGPMTracklistTitle(tracklistTitle); // Use the YTM to GPM tracklist title mapping to get the exact GPM tracklist title
        if (gpmTracklistTitle === 'Uploaded Songs') { // If the desired tracklist is the list of songs uploaded to GPM, some special steps need to be taken, since this specific tracklist wasn't stored in the exported GPM data
            return SESSION_STATE.gpmTracklists['Uploaded Songs'] || await retrieveUploadedGpmTracks(); // If the list of GPM Uploaded tracks has not already been saved in session state, either fetch it from local storage (if it exists) or generate it manually, and then save it for future reference
        } else if (typeof gpmTracklistTitle !== 'undefined') {
            return SESSION_STATE.gpmTracklists[gpmTracklistTitle];
        } else throw Error("Request received to get a GPM tracklist but no tracklist title was provided.");
    case 'tracksArray': // Return the tracks array for the GPM tracklist matching the provided tracklist title
        return (await getTracklistData('tracklist', tracklistTitle))?.tracks;
    case 'trackCount': // Return the track count for the GPM tracklist matching the provided tracklist title
        return (await getTracklistData('tracklist', tracklistTitle))?.tracks?.length;
    default:
        throw Error("An inavlid data category was provided when requesting GPM tracklist data.");
    }
}

/**
 * Retrieves the requested GPM Library data
 * The data is fetched from session state, if it already exists there. Otherwise it's fetched from Chrome local storage and saved in session state for future reference. 
 * @param {string} requestedData The type of data to return. Supported options are 'tracklists', 'allPlaylists', 'tracklistTitles', and 'tracksNotInCommon'.
 * @param {...string} [tracklistTitle] Any number of tracklist title strings. This parameter is only required for the 'tracklists' request, where it is used to indicate which tracklists should be returned.
 * @returns {Promise} A promise with the resulting data
 */
export async function getLibraryData(requestedData, ...tracklistTitles) {
    if (Object.keys(SESSION_STATE.gpmTracklists).length === 0) {
        console.info("This list of GPM tracklists has not yet been saved in session state. Fetching the data from Chrome local storage instead.");
        await saveGpmTracklistsToSessionState();
    }

    switch(requestedData) {
    case 'tracklists': // Return an array of gpm tracklists where the tracklist title matches the list of titles provided
        //console.log(Object.values(SESSION_STATE.gpmTracklists).filter(tracklist => tracklistTitles.includes(tracklist.title)));
        return Object.values(SESSION_STATE.gpmTracklists).filter(tracklist => tracklistTitles.includes(tracklist.title));   
    case 'allPlaylists': // Return an array tracklist data objects that are of type playlist (i.e. excluding comprehensive lists like 'All Music')...
        return Object.values(SESSION_STATE.gpmTracklists).filter(tracklist => ['ADDED FROM MY SUBSCRIPTION', 'ALL MUSIC', 'Songs'].includes(tracklist.title) === false);
    case 'tracklistTitles': // Return a list of the titles of all the tracklists stored in the GPM Library data
        return Object.keys(SESSION_STATE.gpmTracklists); // Return a list of all the key names in the gpm tracklists array saved in session state
    case 'tracksNotInCommon': // Return an array of tracks from the GPM Library that aren't in the Common playlist
        // If the list of tracks has previously been calculated, return that array. Otherwise, calculate it, save it for future reference, and return it
        if (Array.isArray(SESSION_STATE.tracksNotInCommon) === false) {
            SESSION_STATE.tracksNotInCommon = await getFilteredTracksWithTracklistMappingGPM('ADDED FROM MY SUBSCRIPTION', ...getCommonPlaylistsGPM(), ...getNonCommonPlaylistsGPM());
        }

        return SESSION_STATE.tracksNotInCommon;
    default:
        throw Error("An inavlid data category was provided when requesting GPM Library data.");
    }
}

/**
 * Fetches the exported GPM Library data object from Chrome local storage and then traverses it to generate individual tracklist data objects (as opposed to simply tracks arrrays). 
 * These tracklist data objects are then saved in session state for future reference. 
 * This is done so that the GPM Library data is subsequently more easily accessible in a format similar to the YTM Library data.
 */
 async function saveGpmTracklistsToSessionState() {
    // Retrieve the GPM Library data from Chrome local storage and save it in session state for future reference
    const gpmLibraryKey = 'gpmLibraryData';
    const gpmLibraryStorageItem = await chromeStorage.getValueAtKey('local', gpmLibraryKey);

    typeof gpmLibraryStorageItem === 'undefined'
    ? console.warn("Tried to fetch the GPM library data from local storage but it wasn't found.")
    : console.log("Successfully fetched GPM library data from local storage.")

    for (const tracklistKey in gpmLibraryStorageItem) {
        if (tracklistKey.length >= 43) { // If the tracklist name is at least long enough to include the standard prefix used in the GPM storage format... (this excludes certain playlists like 'Backup' and legacy ones)
            const tracklistTitle = tracklistKey.substring(43, tracklistKey.length-1); // Extract the actual tracklist title from the key used in GPM storage
            //TODO could consider marking here the tracklists which are considered to be of type 'playlist'
            SESSION_STATE.gpmTracklists[tracklistTitle] = {title:tracklistTitle, tracks:gpmLibraryStorageItem[tracklistKey]}; // Create a new tracklist data object including the title and tracks array, and add it to session state
        }
    }
}

/**
 * Retrieves the list of tracks Uploaded to GPM from Chrome local storage, if it exists there. The list should be stored under the key 'gpmLibraryData_UploadedSongs'.
 * Otherwise, the list is generated by removing any tracks 'Added from Subscription' from the list of 'All Music'.
 * The list of tracks is then stored as part of a tracklist data object in session state for future reference
 * @returns {Promise} A promise with the tracklist data object which contains the array of Uploaded tracks
 */
async function retrieveUploadedGpmTracks() {
    const storageKey = 'gpmLibraryData_UploadedSongs';
    const uploadedTracksStorageItem = await chromeStorage.getValueAtKey('local', storageKey); // Try to retrieve the list of GPM Uploaded tracks from Chrome local storage 

    // If the array of Uploaded tracks was found in Chrome local storage, create a tracklist data object to contain it and and save it in session state for future reference
    if (typeof uploadedTracksStorageItem !== 'undefined') {
        console.info("Successfully fetched Uploaded GPM tracks from local storage.");
        SESSION_STATE.gpmTracklists['Uploaded Songs'] = {title: 'Uploaded Songs', tracks: uploadedTracksStorageItem};
    } else { // Else if the Uploaded tracks could not be found in Chrome local storage, generate the list by removing any tracks 'Added from Subscription' from the list of 'All Music'
        console.warn("Tried to fetch the list of GPM Uploaded Tracks from Chrome local storage but it wasn't found. Generating new list instead.");
        const allTracks = await getTracklistData('tracksArray', 'ALL MUSIC'); // Retrieve the array of all tracks in the GPM library
        const subscribedTracks = await getTracklistData('tracklist', 'ADDED FROM MY SUBSCRIPTION'); // Retrieve the tracklist of subscribed GPM tracks
        const tracksArray = filterOutTracklist(allTracks, subscribedTracks); // Generate a list of uploaded GPM tracks by starting with the list of all tracks and filtering out any that are in the list of subscribed tracks
        SESSION_STATE.gpmTracklists['Uploaded Songs'] = {title: 'Uploaded Songs', tracks: tracksArray};
    }

    return SESSION_STATE.gpmTracklists['Uploaded Songs'];
}

//TODO consider consolidating this with the YTM-related function and restructuring it a bit to be more flexible
/**
 * Generates a filtered GPM tracklist, with each track including a list of all the tracklists in which it appears
 * @param {string} initialTracklistTitle The title of the initial tracklist to fetch from storage
 * @param  {...string} tracklistTitlesToFilterOut Any number of titles of tracklists to use as filters. If a track appears in any of these tracklists, it will be filtered out from the original tracklist.
 * @returns {Promise} A promise with an array of track objects that have passed the filter criteria, each of which will include a new string property that lists all the tracklists in which the track appears
 */
async function getFilteredTracksWithTracklistMappingGPM(initialTracklistTitle, ...tracklistTitlesToFilterOut) {
    // Fetch the GPM tracklists from Chrome Local Storage which contain tracks that should be filtered out from the initial list
    const tracklistsToFilterOut = await getLibraryData('tracklists', ...tracklistTitlesToFilterOut);

    // Get a list of all tracklists which should be used to add tracklist data to the tracks. (i.e. Each of these tracklists' titles will appear alongside the track in the final table, if that track is included in the tracklist)
    const allTracklists = await getLibraryData('allPlaylists');

    // Fetch the initial tracks array from Chrome Local Storage
    let unmatchedTracks = await getTracklistData('tracksArray', initialTracklistTitle);

    // If a single tracklist to filter out was provided, use it to filter out any matching tracks from the original list of tracks. 
    // If there are multiple tracklists to filter out, do the same for each tracklist, each time paring the original list down further. 
    if (tracklistsToFilterOut.hasOwnProperty('tracks') === true) {
        unmatchedTracks = filterOutTracklist(unmatchedTracks, tracklist);
    } else if (Array.isArray(tracklistsToFilterOut) === true) { 
        tracklistsToFilterOut.forEach(tracklist => {
            unmatchedTracks = filterOutTracklist(unmatchedTracks, tracklist);
        });
    } else throw Error("Failed to retrieve a supported tracklist or tracklists to filter out. Expected either an array or an object with a 'tracks' property.");
    
    // Add a new property to each track, which is a string of all the tracklists in which the track appears, exluding the ones specified. The list of tracklist titles to omit should include the title of the original tracklist, otherwise this title would appear next to every track in the final track table, which is unnecessary info.
    addTracklistMappingToTracks(unmatchedTracks, allTracklists, initialTracklistTitle, ...tracklistTitlesToFilterOut); 

    return unmatchedTracks;
}
