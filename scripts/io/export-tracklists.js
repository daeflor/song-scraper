//import { scrapedTracks, fetchTracklist } from '../session-state';
import * as session from '../session-state.js'
import * as io from '../modules/utilities/IO.js'
import * as gpmStorage from '../storage/gpm-storage.js';

const standardTrackProperties = ['title', 'artist', 'album', 'duration', 'unplayable']; // These are the standard track properties which should be used when generating a CSV string of tracks

/**
 * Triggers a download of a CSV file of the scraped tracks
 */
export function downloadScrapedTracks() {    
    //const includedProperties = ['title', 'artist', 'album', 'duration', 'unplayable']; // Set the track properties which should be used when generating the CSV
    const tracks = session.scrapedTracks;
    const csv = io.convertArrayOfObjectsToCsv(tracks, standardTrackProperties);
    const filename = 'Tracklist_Scraped_' + session.tracklistTitle;

    io.downloadTextFile(csv, filename, 'csv');
}

/**
 * Triggers a download of a CSV file of the stored tracks for the current tracklist
 */
export async function downloadStoredTracks() {    
    //const includedProperties = ['title', 'artist', 'album', 'duration', 'unplayable']; // Set the track properties which should be used when generating the CSV
    const tracks = await session.fetchTracklist('stored');
    const csv = io.convertArrayOfObjectsToCsv(tracks, standardTrackProperties);
    const filename = 'Tracklist_YTM_' + session.tracklistTitle;

    io.downloadTextFile(csv, filename, 'csv');
    //TODO maybe update the UI (e.g. button icon) if the tracklist couldn't be found in storage
    //Could return true if the tracks were found, false otherwise, so that eventcontroller can update the UI accordingly. 
        //We anyway need to put that error checking back (to ensure it's a valid array, because it's an expected scenario where the stored tracklist does not exist)
}

/**
 * Triggers a download of a CSV file of the stored GPM tracks for the current tracklist
 */
export async function downloadGpmTracks() {
    //TODO should probably let session-state handle the gpm storage access, and then here access it from session-state.
    const tracks = await gpmStorage.getTracklistData('tracksArray', session.tracklistTitle);
    const csv = io.convertArrayOfObjectsToCsv(tracks, standardTrackProperties);
    const filename = 'Tracklist_GPM_' + session.tracklistTitle;

    io.downloadTextFile(csv, filename, 'csv');
    //TODO maybe update the UI (e.g. button icon) if the tracklist couldn't be found in storage
}