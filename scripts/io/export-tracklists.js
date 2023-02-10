import * as session from '../session-state.js'
import * as io from '../modules/utilities/IO.js'
import * as gpmStorage from '../storage/gpm-storage.js';

const standardTrackProperties = ['title', 'artist', 'album', 'duration', 'unplayable']; // These are the standard track properties which should be used when generating a CSV string of tracks

//TODO make the exported fncs use this
function downloadTracksAsCsv(filename, tracks) {
    const csvData = io.convertArrayOfObjectsToCsv(tracks, standardTrackProperties);
    io.downloadTextFile(csvData, filename, 'csv');
}

/**
 * Triggers a download of a CSV file of the scraped tracks
 */
export function downloadScrapedTracks() {    
    const tracks = session.scrapedTracks;
    const csv = io.convertArrayOfObjectsToCsv(tracks, standardTrackProperties);
    const filename = 'Tracklist_Scraped_' + session.tracklistTitle;

    io.downloadTextFile(csv, filename, 'csv');
}

/**
 * Triggers a download of a CSV file of the stored tracks for the current tracklist
 * @returns {Promise} A promise with the value true if the corresponding tracklist was found in storage, otherwise false
 */
export async function downloadStoredTracks() {    
    const tracks = await session.fetchTracklist('stored');

    if (Array.isArray(tracks) === false) {
        return false;
    }

    const csv = io.convertArrayOfObjectsToCsv(tracks, standardTrackProperties);
    const filename = 'Tracklist_YTM_' + session.tracklistTitle;
    io.downloadTextFile(csv, filename, 'csv');
}

/**
 * Triggers a download of a CSV file of the stored GPM tracks for the current tracklist
 * @returns {Promise} A promise with the value true if the corresponding tracklist was found in storage, otherwise false
 */
export async function downloadGpmTracks() {
    //TODO should probably let session-state handle the gpm storage access, and then here access it from session-state.
    const tracks = await gpmStorage.getTracklistData('tracksArray', session.tracklistTitle);

    if (Array.isArray(tracks) === false) {
        return false;
    }

    const csv = io.convertArrayOfObjectsToCsv(tracks, standardTrackProperties);
    const filename = 'Tracklist_GPM_' + session.tracklistTitle;

    io.downloadTextFile(csv, filename, 'csv');
}