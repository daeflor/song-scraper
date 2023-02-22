import * as session from '../session-state.js'
import * as io from '../modules/utilities/IO.js'

const standardTrackProperties = ['title', 'artist', 'album', 'duration', 'unplayable']; // These are the standard track properties which should be used when generating a CSV string of tracks

function downloadTracksAsCsv(filename, tracks) {
    const csvData = io.convertArrayOfObjectsToCsv(tracks, standardTrackProperties);
    io.downloadTextFile(csvData, filename, 'csv');
}

/**
 * Triggers a download of a CSV file of the scraped tracks
 */
export function downloadScrapedTracks() {    
    const tracks = session.scrapedTracks;
    downloadTracksAsCsv('Tracklist_Scraped_' + session.tracklistTitle, tracks);
}

/**
 * Triggers a download of a CSV file of the stored tracks for the current tracklist
 * @returns {Promise} A promise with the value false if the corresponding tracklist was not found in storage, otherwise undefined
 */
export async function downloadStoredTracks() {    
    const tracks = await session.fetchData('stored');

    if (Array.isArray(tracks) === true) {
        downloadTracksAsCsv('Tracklist_YTM_' + session.tracklistTitle, tracks);
    } else return false;
}

/**
 * Triggers a download of a CSV file of the stored GPM tracks for the current tracklist
 * @returns {Promise} A promise with the value false if the corresponding tracklist was not found in storage, otherwise undefined
 */
export async function downloadGpmTracks() {
    const tracks = await session.fetchData('gpmTracks');

    if (Array.isArray(tracks) === true) {
        downloadTracksAsCsv('Tracklist_GPM_' + session.tracklistTitle, tracks);
    } else return false;
}