import * as appStorage from './StorageManager.js';
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
 * @param {Object[]} unfilteredTracks The starting/unfiltered array of track objects on which to apply the filters 
 * @param {Object[]} tracklistsToFilterOut An array of tracklist objects, each of which should include an array of tracks to filter out. An optional 'sampler' property set to true indicates that a matching album name is sufficient to filter out the tracks in the corresponding tracks array. If false or unspecified, all track metadata will be checked when matching the tracks.
 * @returns {Object[]} An array of the remaining tracks from the original tracklist that didn't get filtered out
 */
function filterOutTracklists(unfilteredTracks, tracklistsToFilterOut) {
     // The array of tracks that have not been matched with any from the provided tracklists. Initially set to the original list of tracks provided.
    let unmatchedTracks = unfilteredTracks; 

    if (Array.isArray(unfilteredTracks) === true && Array.isArray(tracklistsToFilterOut) === true) {
        // For each tracklist provided, filter out any tracks that match any from the list of so-far unmatched tracks.
        for (const tracklist of tracklistsToFilterOut) {
            // After filtering out the current tracklist, the resulting array will become the new list of pared down, unmatched tracks, which will be used when applying any further filters.
            unmatchedTracks = filterOutTracklist(unmatchedTracks, tracklist);
        }
    } else throw Error("One of the provided parameters is invalid. The 'unfilteredTracks' and 'tracklistsToFilterOut' parameters should both be arrays of objects.");

    // Return the final list of unmatched tracks that still remain after all filters have been applied
    return unmatchedTracks;
}

//TODO JSDOC
//TODO would it make more sense to have both params be a tracklist, rather than one a tracks array and one a tracklist.
//TODO would it be better if this didn't return the unmatched tracks array and instead just modified the original?
    //I think it would be neater, but would need some param/variable renaming to make it clear what's going on.
function filterOutTracklist(unfilteredTracks, tracklist) {
    let comparisonFunction = undefined; // The function that should be used to compare tracks in the unfiltered list to those that are part of the specified tracklist. The comparison function will either only check for matching albums, or it will check all of a track's metadata when looking for a match.
    let unmatchedTracks = [];

    if (tracklist.sampler === true) {
        // If the tracklist is a 'sampler', only use the tracks' album metadatum when comparing tracks
        comparisonFunction = (track1, track2) => (track1.album === track2.album);
    } else {
        // Set up a collator to look for string differences, ignoring capitalization, to run a comparison between tracks that checks all of their respective metadata 
        const collator = new Intl.Collator(undefined, {usage: 'search', sensitivity: 'accent'}); 
        comparisonFunction = (track1, track2) => compareTracks(track1, track2, collator);
    }

    // Check every unfiltered track against every track in the specified tracklist. If there is no match, add the track (former) to the array of unmatched tracks.
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

    return unmatchedTracks;
}

//TODO the functions below aren't exactly 'comparison' utilities. Do they still belong here?

/**
 * Generate a list of tracks uploaded to GPM by removing any 'Added from Subscription' from the list of 'All Music'.
 * Note that this list of tracks is now/currently stored in Chrome local storage as well, under the key 'gpmLibraryData_UploadedSongs'.
 * @returns {Promise} A promise with the array of uploaded track objects
 */
//TODO it may make the most sense to just add this data to the 'gpmLibraryData' object in Local Storage, and avoid any special steps moving forward.
export async function generateListOfUploadedGPMTracks() {
    const allTracks = await appStorage.retrieveGPMTracksArrayFromChromeLocalStorage('ALL MUSIC'); // Retrieve the array of all tracks in the GPM library
    const subscribedTracks = await appStorage.retrieveGPMTracklistDataFromChromeLocalStorageByTitle('ADDED FROM MY SUBSCRIPTION'); // Retrieve the tracklist of subscribed GPM tracks
    const uploadedTracks = filterOutTracklist(allTracks, subscribedTracks); // Generate a list of uploaded GPM tracks by starting with the list of all tracks and filtering out any that are in the list of subscribed tracks

    return uploadedTracks;
}

/**
 * Adds playlist data to each track in the list provided. The playlist value will be a comma-separated string of playlist names in which the track appears.
 * @param {Object[]} tracks An array of track objects
 * @param {Objet[]} playlists A list of playlist data objects, each of which should contain a 'title' string and a 'tracks' array
 * @param {...string} excludedTracklistTitles Any number of tracklist titles that can be skipped when adding tracklist data to each track
 */
export function addTracklistMappingToTracks(tracks, playlists, ...excludedTracklistTitles) {
    const collator = new Intl.Collator(undefined, {usage: 'search', sensitivity: 'accent'}); // Set up a collator to look for string differences, ignoring capitalization

    for (const track of tracks) {
        track.playlists = '';

        for (const playlist of playlists) {
            if (playlist.legacy !== true && excludedTracklistTitles.includes(playlist.title) !== true) {
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
}

/**
 * Generates a filtered tracklist, with each track including a list of all the tracklists in which it appears
 * @param {string} app The app to which the initial tracklist belongs. Accepted values are 'ytm' and 'gpm'.
 * @param {string} initialTracklistTitle The title of the initial tracklist to fetch from storage
 * @param  {...string} tracklistTitlesToFilterOut Any number of titles of tracklists to use as filters. If a track appears in any of these tracklists, it will be filtered out. 
 * @returns {Promise} A promise with an array of track objects that have passed the filter criteria, each of which will include a new string property that lists all the tracklists in which the track appears
 */
export async function getFilteredTracksWithTracklistMapping(app, initialTracklistTitle, ...tracklistTitlesToFilterOut) {
    let unfilteredTracks = undefined; // The initial tracks array before having any filters applied on it
    let tracklistsToFilterOut = undefined; // The list of tracklists whose tracks should all be filtered out of the initial tracklist
    let allTracklists = undefined; // A list of all tracklists, which will be used when adding tracklist data to the filtered tracklist. Each track object will include a list of all tracklists in which that track appears.
    
    if (app === 'ytm') {
        // Fetch the initial tracks array from Firestore
        unfilteredTracks = await appStorage.retrieveTracksArrayFromFirestore(initialTracklistTitle);

        // Fetch the tracklists from Firestore which contain tracks that should be filtered out from the initial list
        tracklistsToFilterOut = await appStorage.retrieveTracklistDataFromFirestoreByTitle(...tracklistTitlesToFilterOut);

        // Get a list of all tracklists which should be used to add tracklist data to the tracks. (i.e. Each of these tracklists' titles will appear alongside the track in the final table, if that track is included in the tracklist)
        allTracklists = await appStorage.retrieveTracklistDataFromFireStoreByType(['playlist', 'auto']);
    } else if (app === 'gpm') {
        // Fetch the initial tracks array from Chrome Local Storage
        unfilteredTracks = await appStorage.retrieveGPMTracksArrayFromChromeLocalStorage(initialTracklistTitle);

        // Fetch the GPM tracklists from Chrome Local Storage which contain tracks that should be filtered out from the initial list
        tracklistsToFilterOut = await appStorage.retrieveGPMTracklistDataFromChromeLocalStorageByTitle(...tracklistTitlesToFilterOut);

        // Get a list of all tracklists which should be used to add tracklist data to the tracks. (i.e. Each of these tracklists' titles will appear alongside the track in the final table, if that track is included in the tracklist)
        allTracklists = await appStorage.retrieveGPMTracklistDataFromChromeLocalStorageByTitle();
    } else throw Error("An invalid app parameter was specified. Accepted values are 'ytm' and 'gpm'.");

    // Filter all the tracks from the specified tracklists out of the initial tracklist
    const filteredTracks = filterOutTracklists(unfilteredTracks, tracklistsToFilterOut); 

    //TODO One flaw here is that the initialTracklist should also always get excluded from the new 'playlist' mapping property, but currently 
        //this isn't explicitly done. It works in the YTM 'added from subscription' case, because that list is not a 'playlist'. But if in the future, 
        //there is a desire to use an actual playlist as the initial tracklist, every track in the final list would include that playlist in its 'playlist' property/column.
        //Should be solvable by just pushing the initialTracklistTitle into ...tracklistTitlesToFilterOut

    // Add a new property to each track, which is string of all the tracklists in which the track appears, exluding the ones specified
    addTracklistMappingToTracks(filteredTracks, allTracklists, ...tracklistTitlesToFilterOut); 
    //TODO Maybe this step should not be handled in this function and should just be called separately instead.

    return filteredTracks;
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