//import * as appStorage from './StorageManager.js';
import * as chromeStorage from './utilities/chrome-storage-promises.js'

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

/**
 * Filters the provided tracklist based on the criteria provided
 * @param {Object[]} tracklist The array of track objects on which to apply the filters 
 * @param {Object[]} filters An array of tracklist filter objects, each of which should include an array of tracks to filter out. An optional 'matchAlbumOnly' property can be set to indicate whether or not a matching album name is sufficient to filter out the tracks in the corresponding tracks array. If false, all track metadata will be checked when matching the tracks in the corresponding filter array with those in the original tracklist.
 * @param {Object[]} filters.tracks An array of tracks to filter out
 * @param {boolean} filters.matchAlbumOnly Indicates whether or not a matching album name is sufficient to filter out the tracks in the corresponding tracks array. If false, all track metadata will be checked when matching.
 * @returns {Object[]} An array of the remaining tracks from the original tracklist that didn't get filtered out
 */
 export function filterTracklist(tracklist, filters) {    
    // Declare a variable to keep track of the songs from the original tracklist that don't get matched when a filter is applied
    let unmatchedTracks = undefined;

    if (Array.isArray(tracklist) === true && Array.isArray(filters) === true) {
        // For each filter provided, set up the corresponding comparison function and use it to test every track in the filter against every track from the original tracklist that has not yet been filtered out.
        for (const filter of filters) {
            // If this is the first filter being applied, it should be applied to the original full tracklist. Otherwise, it should be applied to the list of tracks that have not yet been matched after applying the previous filters.
            const tracksToBeFiltered = unmatchedTracks ?? tracklist;

            // Set the unmatchedTracks variable to a new array, so that it will only include the tracks that make it through the upcoming filter
            unmatchedTracks = [];

            // Set up the function that should be used to compare tracks in the tracklist with those that are part of the current filter. The comparison function will either only check for matching albums, or it will check all of a track's metadata when looking for a match.
            let comparisonFunction = undefined;

            if (filter.matchAlbumOnly === true) {
                console.log("Only matching album data.");
                comparisonFunction = (track1, track2) => (track1.album === track2.album);
            } else {
                console.log("Using all track metadata to find a match.");
                const collator = new Intl.Collator(undefined, {usage: 'search', sensitivity: 'accent'}); // Set up a collator to look for string differences, ignoring capitalization
                comparisonFunction = (track1, track2) => compareTracks(track1, track2, collator);
            }

            // Check every track that has yet to be filtered out against every track in the current filter. If there is no match, add the track (former) to the array of unmatched tracks.
            for (const track of tracksToBeFiltered) {
                let trackMatched = false;

                for (const trackToFilterOut of filter.tracks) {
                    if (comparisonFunction(track, trackToFilterOut) === true) {
                        trackMatched = true;
                        break;
                    }
                }

                if (trackMatched === false) {
                    unmatchedTracks.push(track);
                }
            }
        }
    } else throw Error("One of the provided parameters is invalid. The 'tracklist' and 'filters' parameters should both be arrays of objects.");

    // Return the final list of unmatched tracks that still remain after all filters have been applied
    return unmatchedTracks;
}

//TODO the functions below aren't exactly 'comparison' utilities. Do they still belong here?

/**
 * Generate a list of tracks uploaded to GPM by removing any 'Added from Subscription' from the list of 'All Music'.
 * Note that this list of tracks is now/currently stored in Chrome local storage as well, under the key 'gpmLibraryData_UploadedSongs'.
 * @returns {Promise} A promise with the array of uploaded track objects
 */
export async function generateListOfUploadedGPMTracks() {
    //TODO it may make the most sense to just add this data to the 'gpmLibraryData' object in Local Storage, and avoid any special steps moving forward.
    const gpmLibraryData = await getGPMLibraryData();
    
    const collator = new Intl.Collator(undefined, {usage: 'search', sensitivity: 'accent'}); // Set up a collator to look for string differences, ignoring capitalization
    const comparisonFunction = (track1, track2) => compareTracks(track1, track2, collator);
    const uploadedTracks = []

    for (const trackInLibrary of gpmLibraryData["ohimkbjkjoaiaddaehpiaboeocgccgmj_Playlist_'ALL MUSIC'"]) {
        
        let trackMatched = false;
        
        for (const trackFromSubscription of gpmLibraryData["ohimkbjkjoaiaddaehpiaboeocgccgmj_Playlist_'ADDED FROM MY SUBSCRIPTION'"]) {
            if (comparisonFunction(trackInLibrary, trackFromSubscription) === true) {
                trackMatched = true;
                break;
            }
        }

        if (trackMatched === false) {
            uploadedTracks.push(trackInLibrary);
        }
    }
    
    // const objectToStore = {'gpmLibraryData_UploadedSongs': uploadedTracks};
    // await chromeStorage.set('local', objectToStore);

    return uploadedTracks;
}

/**
 * Adds playlist data to each track in the list provided. The playlist value will be a comma-separated string of playlist names in which the track appears.
 * @param {Object[]} tracks An array of track objects
 * @param {Objet[]} playlists A list of playlist data objects, each of which should contain a 'title' string and a 'tracks' array
 * @param {string[]} excludedPlaylistTitles An array of playlist names which should be ignored when adding playlist data to each track
 * @returns 
 */
export async function addPlaylistDataToTracks(tracks, playlists, excludedPlaylistTitles) {
    const collator = new Intl.Collator(undefined, {usage: 'search', sensitivity: 'accent'}); // Set up a collator to look for string differences, ignoring capitalization

    for (const track of tracks) {
        track.playlists = '';

        for (const playlist of playlists) {
            if (playlist.legacy !== true && excludedPlaylistTitles.includes(playlist.title) !== true) {
                for (const currentTrack of playlist.tracks) {
                    if (compareTracks(track, currentTrack, collator) === true) {  
                        (track.playlists.length == 0)
                        ? track.playlists += ('"' + playlist.title)
                        : track.playlists += (', ' + playlist.title);
                        break;
                    }
                }
            }
        }

        if (track.playlists.length > 0) {
            track.playlists += '"';
        }
    }

    console.info("There are " + tracks.length + " songs in the list provided.");
    console.table(tracks);
}

/**
 * Returns an array of filter objects, based on the given parameters, which can then be applied to other tracklists to filter out the specified tracks as applicable.
 * @param  {...any} filterOptions Any number of filter options, each of which should either be a string representing a tracklist title (in YTM) or be an object with a 'tracklist' property that contains such a string. If the latter is used, an optional 'matchAlbumOnly' property can also be provided, indicating that a matching album name is sufficient to filter out the tracks in the corresponding tracklist.
 * @returns {Promise} A promise with the resulting array of filter objects
 */
export async function createTracklistFilters(...filterOptions) {
    const tracklistFilters = []; // Create a new array to contain the various filter objects that will be created based on the given parameters

    for (const filterOption of filterOptions) {
        const filterObject = {}; // For each filter option provided, create a new filter object

        if (typeof filterOption === 'string') { // If the filter option is a string (i.e. the name of a tracklist)...
            filterObject.tracks = await appStorage.retrieveTracksFromFirestore(filterOption); // Retrieve the corresponding tracks array from firestore & add it to the filter object
        } else if (filterOption.hasOwnProperty('tracklist') === true) { // If the filter option is an object...
            filterObject.tracks = await appStorage.retrieveTracksFromFirestore(filterOption.tracklist); // Retrieve the corresponding tracks array from firestore & add it to the filter object
            filterObject.matchAlbumOnly = filterOption.matchAlbumOnly; // Assume the 'matchAlbumOnly' property was set on the filter option, and add it to the new filter object
        } else throw Error("One of the filter options provided was not in a supported format. Expecting either a string or an object with a 'tracklist' property.");

        tracklistFilters.push(filterObject); // Add the new filter object to the array of filter objects.
    }

    return tracklistFilters;
}

//TODO this is duplicated here because of Chromium bug 1194681
/**
 * Returns an object containing the the exported GPM library data
 * @returns {Promise} A promise with the resulting GPM library data object
 */
 async function getGPMLibraryData(){
    const gpmLibraryKey = 'gpmLibraryData';
    const storageItems = await chromeStorage.getKeyValuePairs('local', gpmLibraryKey);
    return storageItems[gpmLibraryKey];
}