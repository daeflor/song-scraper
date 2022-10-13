import * as appStorage from '/scripts/storage/firestore-storage.js';
import * as customTracklists from '../Configuration/custom-tracklists.js'; //TODO would be nice to not have to import this here AND in EventController

export function generateDeltaTracklists(scrapedTracklist, storedTracklist) {
    if (Array.isArray(scrapedTracklist) === true && Array.isArray(storedTracklist) === true) {
        const collator = new Intl.Collator(undefined, {usage: 'search', sensitivity: 'accent'}); // Set up a collator to look for string differences, ignoring capitalization
        
        //TODO would it make sense to the compareTracks() and other helper functions be part of the Track class?
        //TODO or rather, would it make sense to have a new 'Tracklist' (or similar) class?
            //And in there, put compareTracks() and other helper functions

        //TODO it might not be a bad idea having an undefined check in the createTrackTable() fnc *regardless*, so may want to consider just going back to that.

        // TODO could be worth considering storing tracklists as maps instead of arrays. In Firebase's UI, storing tracklists as maps would look almost identical. Note that if the scraped tracks are originally set in a map, that map would have to be cloned before creating the delta lists (below).
            //An alternative is to just store the index as a property along with the rest of the track metadata. Then could continue to use arrays instead of maps. Unsure if this is actually better though, especially since we're removing elements from the lists below.
                //... I don't think the track index actually needs to be kept anywhere other than the delta tracklist arrays/maps. The scraped and stored lists will have the index regardless.
                //... However, doing this could lead to needing different logic to handle delta vs scraped/stored tracklists, in the createTrackTable function. This might be slight though.
            //One extra complication is that the logic to create csv files from tracklists would need to be updated to work with maps
        
        // Note: it's possible for a track's position/index listed in the delta track tables to be wrong if there are duplicate copies of the track in the tracklist, but this is unlikely. 
        const unmatchedScrapedTracks = new Map();
        const unmatchedStoredTracks = new Map();
        const unplayableTracks = new Map();
        scrapedTracklist.forEach( (track, index) => unmatchedScrapedTracks.set(index+1, track)); //Create a map from the stored tracks array, using the track position as the key
        storedTracklist.forEach( (track, index) => unmatchedStoredTracks.set(index+1, track)); //Create a map from the stored tracks array, using the track position as the key
        unmatchedScrapedTracks.forEach( (scrapedTrack, scrapedTrackKey) => { // For each unmatched scraped track...
            //unmatchedScrapedTracks.set(scrapedTrackIndex+1, scrapedTrack);
            for (const [storedTrackKey, storedTrack] of unmatchedStoredTracks) { // For each stored track that hasn't yet been matched with a scraped track...
                if (compareTracks(scrapedTrack, storedTrack, collator) === true) { // If the two tracks match...
                    unmatchedScrapedTracks.delete(scrapedTrackKey); // Delete the scraped track from the map of unmatched scraped tracks
                    unmatchedStoredTracks.delete(storedTrackKey); // Delete the stored track from the map of unmatched stored tracks, so that it can't be matched against any other scraped tracks
                    if (scrapedTrack.unplayable !== storedTrack.unplayable) { // If the 'unplayable' statuses of the scraped and stored tracks do not match...
                        unplayableTracks.set(scrapedTrackKey, scrapedTrack); // Add the scraped track to the map of unplayable tracks, using its position in the tracklist as the key
                    }
                    break;
                }
            }
        });

        return new Map([
            ['Added Tracks', unmatchedScrapedTracks], 
            ['Removed Tracks', unmatchedStoredTracks], 
            ['Unplayable Status', unplayableTracks]
        ]);
    } else console.error("Tried to get delta tracklists, but the parameters provided were invalid. Expected two tracklist arrays (scraped & stored).");
}

export function compareTracks(track1, track2, collator) {
    if (typeof(track1) === 'object' && typeof(track2) === 'object' && typeof collator === 'object') {
        return (collator.compare(track1.title, track2.title) === 0 &&
        collator.compare(track1.artist, track2.artist) === 0 &&
        collator.compare(track1.album, track2.album) === 0 &&
        compareDurationStrings(track1.duration, track2.duration) === true)
            ? true : false;
    } else throw Error("Tried to compare two tracks but the parameters provided are not valid. Parameters provided: " + [...arguments]);
}

function compareDurationStrings(duration1, duration2) {
    if (typeof duration1 === 'string' && typeof duration2 === 'string') {
        const differenceInSeconds = convertDurationStringToSeconds(duration1) - convertDurationStringToSeconds(duration2);
        return (differenceInSeconds >= -2 && differenceInSeconds <= 2) ? true : false;
    } else {
        console.warn("Tried to compare two duration strings, but the parameters provided were not both of type string. This could indicate that an issue was encountered, or that the track doesn't have a duration specified in its metadata.");
        return (duration1 === duration2) // Return true if the non-string duration values match (e.g. they are both undefined), otherwise return false
    }
}

function convertDurationStringToSeconds(duration) {
    if (typeof duration === 'string') {
        //Split the duration string, then convert each split portion into an integer and return a new array of split integer values
        const _splitDurationIntegers = duration.split(':').map(durationString => parseInt(durationString, 10));

        switch(_splitDurationIntegers.length) {
            case 1: //Track is less than a minute long
                return _splitDurationIntegers[0];
            case 2: //Track is more than a minute but less than an hour long
                return _splitDurationIntegers[0]*60 + _splitDurationIntegers[1];
            case 3: //Track is more than an hour but less than a day long
                return _splitDurationIntegers[0]*3600 + _splitDurationIntegers[1]*60 + _splitDurationIntegers[2];
            default:
                throw Error("Tried to extract a seconds integer value from a duration string, but the duration is not in a supported format (e.g. the duration may be longer than 24 hours).");
        }
    } else throw Error("Tried to convert a duration string into a seconds integer value, but the duration provided was not in string format.");
}

//TODO would it be better if this didn't return the unmatched tracks array and instead just modified the original?
    //I think it might be neater, but would need some param/variable renaming to make it clear what's going on.
/**
 * Generates a pared down list of tracks, with those from the original tracks array only included if they don't match any in the provided tracklist.
 * @param {Object[]} unfilteredTracks The initial/unfiltered array of track objects before applying any filter
 * @param {Object} tracklist The tracklist object which contains tracks that should be filtered out of the original tracklist
 * @returns {Object[]} An array of the remaining tracks from the original tracklist that didn't get filtered out
 */
export function filterOutTracklist(unfilteredTracks, tracklist) {
    let comparisonFunction = undefined; // The function that should be used to compare tracks in the unfiltered list to those that are part of the specified tracklist. The comparison function will either only check for matching albums, or it will check all of a track's metadata when looking for a match.
    let unmatchedTracks = [];

    if (tracklist?.sampler === true) {
        // If the tracklist is a 'sampler', only use the tracks' album metadatum when comparing tracks
        comparisonFunction = (track1, track2) => (track1.album === track2.album);
    } else {
        // Set up a collator to look for string differences, ignoring capitalization, to run a comparison between tracks that checks all of their respective metadata 
        const collator = new Intl.Collator(undefined, {usage: 'search', sensitivity: 'accent'}); 
        comparisonFunction = (track1, track2) => compareTracks(track1, track2, collator);
    }

    // Check every unfiltered track against every track in the specified tracklist. If there is no match, add the track (former) to the array of unmatched tracks.
    if (Array.isArray(unfilteredTracks) === true && Array.isArray(tracklist?.tracks) === true) {
        for (const track of unfilteredTracks) {
            let trackMatched = false;

            for (const trackToFilterOut of tracklist.tracks) {
                if (comparisonFunction(track, trackToFilterOut) === true) {
                    trackMatched = true;
                    break;
                }
            }

            if (trackMatched === false) {
                unmatchedTracks.push(track);
            }
        }
    } else throw TypeError (`Invalid parameters provided. Expected an array of tracks and a tracklist object. The parameters provided were: unfilteredTracks: ${unfilteredTracks} ; tracklist: ${tracklist}`);

    return unmatchedTracks;
}

//TODO the functions below aren't exactly 'comparison' utilities. Do they still belong here?

/**
 * Adds playlist data to each track in the list provided. The playlist value will be a comma-separated string of playlist names in which the track appears.
 * @param {Object[]} tracks An array of track objects, each of which will have playlist data added to it
 * @param {Objet[]} tracklists A list of tracklist objects, each of which should contain at least a 'title' string and a 'tracks' array. Each track in the 'tracks' parameter will be checked to see if it is included in any of these tracklists.
 * @param {...string} excludedTracklistTitles Any number of tracklist titles that can be skipped when adding tracklist data to each track
 */
export function addTracklistMappingToTracks(tracks, tracklists, ...excludedTracklistTitles) {   
    // Set up a collator to look for string differences, ignoring capitalization, to run a comparison between tracks that checks all of their respective metadata 
    const collator = new Intl.Collator(undefined, {usage: 'search', sensitivity: 'accent'}); 

    if (Array.isArray(tracks) === true && Array.isArray(tracklists) === true) {
        for (const track of tracks) {
            for (const tracklist of tracklists) {
                if (/*tracklist.type !== 'legacy' && */excludedTracklistTitles.includes(tracklist.title) !== true) {
                    if (Array.isArray(tracklist.tracks) === true) {
                        for (const currentTrack of tracklist.tracks) {
                            if (compareTracks(track, currentTrack, collator) === true) {
                                (typeof track.playlists === 'undefined')
                                ? track.playlists = tracklist.title
                                : track.playlists += (', ' + tracklist.title);
                                break;
                            }
                        }
                    } else throw Error("Tried to iterate through a tracklist's tracks, but it doesn't have a valid 'tracks' array property.");
                }
            }
        }
    } else throw Error("Tried to add a tracklist mapping to a list of tracks, but the parameters provided were invalid. Expected an array of tracks and an array of tracklist objects.");

    console.info("There are " + tracks.length + " songs in the list provided.");
}

/**
 * Generates a filtered YTM tracklist, with each track including a list of all the tracklists in which it appears
 * @param {string} initialTracklistTitle The title of the initial tracklist to fetch from storage
 * @param  {...string} tracklistTitlesToFilterOut Any number of titles of tracklists to use as filters. If a track appears in any of these tracklists, it will be filtered out from the original tracklist.
 * @returns {Promise} A promise with an array of track objects that have passed the filter criteria, each of which will include a new string property that lists all the tracklists in which the track appears
 */
export async function getFilteredTracksWithTracklistMappingYTM(initialTracklistTitle, ...tracklistTitlesToFilterOut) {
    // Fetch the tracklists from Firestore which contain tracks that should be filtered out from the initial list
    const tracklistsToFilterOut = await appStorage.retrieveTracklistDataFromFirestoreByTitle(...tracklistTitlesToFilterOut);

    // Get a list of all tracklists which should be used to add tracklist data to the tracks. (i.e. Each of these tracklists' titles will appear alongside the track in the final table, if that track is included in the tracklist)
    const allTracklists = await appStorage.retrieveTracklistDataFromFireStoreByType(['playlist', 'auto']);

    // Fetch the initial tracks array from Firestore
    let unmatchedTracks = await appStorage.retrieveTracksArrayFromFirestore(initialTracklistTitle);

    // If a single tracklist to filter out was provided, use it to filter out any matching tracks from the original list of tracks. 
    // If there are multiple tracklists to filter out, do the same for each tracklist, each time paring the original list down further. 
    if (tracklistsToFilterOut.hasOwnProperty('tracks') === true) {
        unmatchedTracks = filterOutTracklist(unmatchedTracks, tracklistsToFilterOut);
    } else if (Array.isArray(tracklistsToFilterOut) === true) { 
        tracklistsToFilterOut.forEach(tracklist => {
            unmatchedTracks = filterOutTracklist(unmatchedTracks, tracklist);
        });
    } else throw Error("Failed to retrieve a supported tracklist or tracklists to filter out. Expected either an array or an object with a 'tracks' property.");
    
    //TODO could use map() to turn an array of tracklist data to an array of tracklist titles, to pass as the last parameter here, if we end up receiving tracklist data in this function (above) instead of tracklist titles
    // Add a new property to each track, which is a string of all the tracklists in which the track appears, exluding the ones specified. The list of tracklist titles to omit should include the title of the original tracklist, otherwise this title would appear next to every track in the final track table, which is unnecessary info.
    addTracklistMappingToTracks(unmatchedTracks, allTracklists, initialTracklistTitle, ...tracklistTitlesToFilterOut); 

    return unmatchedTracks;
}

/**
 * Generates a filtered list of tracks from YTM playlists which are missing from Common, with each track including a list of all the playlists in which it appears
 * @returns {Promise} A promise with an array of track objects that have passed the filter criteria, each of which will include a new string property that lists all the tracklists in which the track appears
 */
export async function getTracksNotInCommonFromPlaylists() {
    // Get all tracklist objects where the tracklist type is 'playlist'
    const allPlaylists = await appStorage.retrieveTracklistDataFromFireStoreByType(['playlist']);

    // Get a list of all playlist names that should not be used when generating the list of tracks that needs to be filtered down further
    //TODO tmi. Can more of this be moved into custom-tracklists.js?
    const playlistTitlesToExclude = ['Common', 'Hot Jams', ...customTracklists.getAllNonCommonPlaylists()];

    // Begin with an empty array for the list of tracks that need to be filtered
    let tracksToBeFiltered = [];

    // For each playlist object, excluding the ones which should be omitted (as specified above), add all of the playlist's tracks to the overall list of tracks that needs to be filtered down further
    for (const playlist of allPlaylists) {
        if (playlistTitlesToExclude.includes(playlist.title) !== true) {
            tracksToBeFiltered.push(...(playlist.tracks));
        }
    }

    // Get all tracklist objects that are known to contain tracks which need to be filtered out of the list of tracks generated above
    const tracklistsToFilterOut = await appStorage.retrieveTracklistDataFromFirestoreByTitle('Common', ...customTracklists.getNonCommonSamplerPlaylists());

    // For each tracklist to filter out, use it to filter out any matching tracks from the original list of tracks, each time paring the original list down further. 
    if (Array.isArray(tracklistsToFilterOut) === true) { 
        tracklistsToFilterOut.forEach(tracklist => {
            tracksToBeFiltered = filterOutTracklist(tracksToBeFiltered, tracklist);
        });
    } else throw Error("Failed to retrieve an array of tracklists to filter out. Expected an array of tracklist objects.");
    
    // Add a new property to each track, which is a string of all the tracklists in which the track appears, exluding the ones specified. The list of tracklist titles to omit should include the title of the original tracklist, otherwise this title would appear next to every track in the final track table, which is unnecessary info.
    addTracklistMappingToTracks(tracksToBeFiltered, allPlaylists, playlistTitlesToExclude); 

    return tracksToBeFiltered;
}

/**
 * Generates a filtered GPM tracklist, with each track including a list of all the tracklists in which it appears
 * @param {string} initialTracklistTitle The title of the initial tracklist to fetch from storage
 * @param  {...string} tracklistTitlesToFilterOut Any number of titles of tracklists to use as filters. If a track appears in any of these tracklists, it will be filtered out from the original tracklist.
 * @returns {Promise} A promise with an array of track objects that have passed the filter criteria, each of which will include a new string property that lists all the tracklists in which the track appears
 */
 export async function getFilteredTracksWithTracklistMappingGPM(initialTracklistTitle, ...tracklistTitlesToFilterOut) {
    // Fetch the GPM tracklists from Chrome Local Storage which contain tracks that should be filtered out from the initial list
    const tracklistsToFilterOut = await appStorage.retrieveGPMTracklistDataFromChromeLocalStorageByTitle(...tracklistTitlesToFilterOut);

    // Get a list of all tracklists which should be used to add tracklist data to the tracks. (i.e. Each of these tracklists' titles will appear alongside the track in the final table, if that track is included in the tracklist)
    const allTracklists = await appStorage.retrieveGPMTracklistDataFromChromeLocalStorageByTitle();

    // Fetch the initial tracks array from Chrome Local Storage
    let unmatchedTracks = await getTracksArray(initialTracklistTitle);

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