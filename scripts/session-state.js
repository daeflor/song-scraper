import * as appStorage from './storage/firestore-storage.js'
import * as gpmStorage from './storage/gpm-storage.js';
import * as options from './options/options-storage.js'
import * as tracklistComparisonUtils from './modules/tracklist-comparison-utilities.js';
import * as customTracklists from './Configuration/custom-tracklists.js';

// const tracklist = {
//     title: undefined,
//     type: undefined
// };

// const tracks = {
//     scraped: undefined,
//     stored: undefined
// }

const comparisonMethodTest = await options.comparisonMethod.getValue();
console.log("comp: " + comparisonMethodTest);


export let tracklistTitle;
export let tracklistType;
export let scrapedTracks; //TODO consider whether or not I should export this directly or just include it in the fetchTracklist function. The benefit of exporting directly is that this should never need to be async.

let storedTracks;

let deltaTracklists = undefined;
const tracksNotInCommon = {
    fromLibrary: undefined,
    fromPlaylists: undefined
}

//TODO should really consider a class or something for tracklist metadata, which could be used across both background and regular scripts
export function setTracklistMetadata(title, type) {
    if (typeof title === 'string' && typeof type === 'string') {
        tracklistTitle = title;
        tracklistType = type;
    } else throw TypeError("An invalid tracklist type and/or title was provided. Both must be strings.");
}

// async function getStoredTracks() {
//     return typeof storedTracks === 'undefined'
//     ? storedTracks = await appStorage.retrieveTracksArrayFromFirestore(tracklistTitle)
//     : storedTracks
// }

// function setStoredTracks(tracksArray) {
//     storedTracks = tracksArray;
// }

// function setScrapedTracks(tracksArray) {
//     scrapedTracks = tracksArray;
// }

//TODO using the terminology 'tracklist' in the functions below is inconsistent with usages elsewhere throughout the codebase
    //Would fetchData / updateData work?

/**
 * Updates the specified tracklist in the session cache
 * @param {string} name The name or type of tracklist to update in session cache. Valid options are: 'scraped', and 'stored'. 
 * @param {Object[]} tracksArray The array of tracks to save in session cache. 
 */
export async function updateTracklist(name, tracksArray) {
    //console.log(name.concat('Tracks'));
    if (name === 'scraped') {
        scrapedTracks = tracksArray;
    } else if (name === 'stored') {
        storedTracks = tracksArray;
    } else throw Error("An inavlid category was provided when requesting to update a tracklist in session cache.");
}

/**
 * Returns the specified list of tracks
 * @param {string} name The name or type of tracklist to fetch. Valid options are: 'stored', 'deltas', 'NotInCommonFromLibrary', and 'NotInCommonFromPlaylists'.
 * @returns The specified list of tracks, either as an array or map.
 */
export async function fetchTracklist(name) {
    switch(name) {
    // case 'scraped':
    //     return scrapedTracks;
    case 'stored':
        return typeof storedTracks === 'undefined'
        ? storedTracks = await appStorage.retrieveTracksArrayFromFirestore(tracklistTitle)
        : storedTracks
    case 'deltas':
        return deltaTracklists instanceof Map === false
        ? deltaTracklists = await generateDeltaMap()
        : deltaTracklists
    case 'NotInCommonFromLibrary':
        return typeof tracksNotInCommon.fromLibrary === 'undefined'
        ? tracksNotInCommon.fromLibrary = await tracklistComparisonUtils.getFilteredTracksWithTracklistMappingYTM('Added from YouTube Music', 'Common', ...customTracklists.getNonCommonPlaylists())
        : tracksNotInCommon.fromLibrary
    case 'NotInCommonFromPlaylists':
        return typeof tracksNotInCommon.fromPlaylists === 'undefined'
        ? tracksNotInCommon.fromPlaylists = await tracklistComparisonUtils.getTracksNotInCommonFromPlaylists()
        : tracksNotInCommon.fromPlaylists
    default:
        throw Error("An inavlid category was provided when requesting to fetch a tracklist from session cache.");
    }
}

/**
 * Get a map containing the delta tracklists
 * @returns {Promise} A promise with a map containing the various delta tracklists (Added, Removed, Unplayable)
 */
async function generateDeltaMap() {
    //TODO perhaps getting the comparison method is something that could be done when the app is first launched
        //comparison method and/or 'app used for delta' could be stored in session state at that point, since it shouldn't change mid-session
        //That way the UI can be updated earlier in the flow, and it may help avoid the problem of when to call the UI controller function

    const comparisonMethod = await options.comparisonMethod.getValue();
    console.info("Comparison method found in user's preferences: " + comparisonMethod);

    let tracksUsedForDelta = undefined;
    let appUsedForDelta = 'YTM';

    // If the selected comparison method is to use YouTube Music only or whenever possible, get the tracks from Firestore
    if (comparisonMethod === 'alwaysYTM' || comparisonMethod === 'preferYTM') {
        tracksUsedForDelta = await fetchTracklist('stored');
    }

    // If the selected comparison method is to use only Google Play Music, or to use GPM as a fallback and the tracklist was not found in the YTM stored tracks, get the tracks from the GPM data in Chrome local storage
    if (comparisonMethod === 'alwaysGPM' || (comparisonMethod === 'preferYTM' && typeof tracksUsedForDelta === 'undefined')) {
        tracksUsedForDelta = await gpmStorage.getTracklistData('tracksArray', tracklistTitle);
        appUsedForDelta = 'GPM';
    }

    // If a valid array of tracks was found in storage, use that to compare with the scraped tracks & generate the deltas, and update the deltas checkbox label accordingly
    if (Array.isArray(tracksUsedForDelta) === true) {
        return tracklistComparisonUtils.generateDeltaTracklists(scrapedTracks, tracksUsedForDelta); // Generate delta tracklists based on the scraped and stored tracklists
        
        //UIController.triggerUITransition('UpdateDeltaLabel', {appUsedForDelta: appUsedForDelta});
        //TODO how do we now include this call to UI Controller? it doesn't really make sense for session-state to handle that, but it only needs to be done the first time (when the delta map is generated)
        //TODO it would be nice to update the checkbox label earlier in the UX flow than this...
    }
}

// class CacheableTracklist {

//     #tracklist;

//     constructor(storageArea, ) {

//     }

//     async fetch() {

//     }

// }