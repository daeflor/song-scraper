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

//TODO: Rename the 'initialTracklist' parameter to more clearly indicate that it should be an array of tracks, not a tracklist object
//Required properties for each object are: 'tracks' (an array of track objects), 'title' 
/**
 * Filters the provided tracklist based on the criteria provided
 * @param {Object[]} initialTracklist The starting array of track objects on which to apply the filters 
 * @param {Object[]} tracklistsToFilterOut An array of tracklist objects, each of which should include an array of tracks to filter out. An optional 'sampler' property set to true indicates that a matching album name is sufficient to filter out the tracks in the corresponding tracks array. If false or unspecified, all track metadata will be checked when matching the tracks.
 * @returns {Object[]} An array of the remaining tracks from the original tracklist that didn't get filtered out
 */
 export function filterTracklist(initialTracklist, tracklistsToFilterOut) {     //TODO this should probably use rest params
    // Declare a variable to keep track of the songs from the original tracklist that don't get matched when a filter is applied
    let unmatchedTracks = undefined;

    if (Array.isArray(initialTracklist) === true && Array.isArray(tracklistsToFilterOut) === true) {
        // For each filter provided, set up the corresponding comparison function and use it to test every track in the filter against every track from the original tracklist that has not yet been filtered out.
        for (const filter of tracklistsToFilterOut) {
            // If this is the first filter being applied, it should be applied to the original full tracklist. Otherwise, it should be applied to the list of tracks that have not yet been matched after applying the previous filters.
            const tracksToBeFiltered = unmatchedTracks ?? initialTracklist;

            // Set the unmatchedTracks variable to a new array, so that it will only include the tracks that make it through the upcoming filter
            unmatchedTracks = [];

            // Set up the function that should be used to compare tracks in the tracklist with those that are part of the current filter. The comparison function will either only check for matching albums, or it will check all of a track's metadata when looking for a match.
            let comparisonFunction = undefined;

            if (filter.sampler === true) {
                // Only use the tracks' album metadatum when comparing tracks
                comparisonFunction = (track1, track2) => (track1.album === track2.album);
            } else {
                // Set up a collator to look for string differences, ignoring capitalization, to run the comparison between tracks
                console.info("Using all track metadata to find a match.");
                const collator = new Intl.Collator(undefined, {usage: 'search', sensitivity: 'accent'}); 
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
    } else throw Error("One of the provided parameters is invalid. The 'initialTracklist' and 'tracklistsToFilterOut' parameters should both be arrays of objects.");

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

    //TODO could use new function(s) in Storage Manager here
        //As well as addValueToArrayIfUnique
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
 * Returns an array of filter objects, based on the given parameters, which can then be applied to other tracklists to filter out the specified tracks as applicable.
 * @param {string} app Indicates which app the filters should be created for. Accepted values are 'ytm' and 'gpm'.
 * @param  {...any} filterOptions Any number of filter options, each of which should either be a string representing a tracklist title (in YTM) or be an object with a 'tracklist' property that contains such a string. If the latter is used, an optional 'matchAlbumOnly' property can also be provided, indicating that a matching album name is sufficient to filter out the tracks in the corresponding tracklist.
 * @returns {Promise} A promise with the resulting array of filter objects
 */
export async function createTracklistFilters(app, ...filterOptions) {
    const tracklistFilters = []; // Create a new array to contain the various filter objects that will be created based on the given parameters

    for (const filterOption of filterOptions) {
        const filterObject = {}; // For each filter option provided, create a new filter object
        let tracklistTitle = undefined;

        if (typeof filterOption === 'string') { // If the filter option is a string (i.e. the name of a tracklist)...
            tracklistTitle = filterOption; // Use the filter option as the tracklist title, which will later be used to fetch the tracks array from storage
            //filterObject.tracks = await appStorage.retrieveTracksFromFirestore(filterOption); // Retrieve the corresponding tracks array from firestore & add it to the filter object
        } else if (filterOption.hasOwnProperty('tracklistTitle') === true) { // If the filter option is an object with a 'tracklistTitle' property
            tracklistTitle = filterOption.tracklistTitle; // Use the filter option's 'tracklistTitle' property as the tracklist title, which will later be used to fetch the tracks array from storage
            //filterObject.tracks = await appStorage.retrieveTracksFromFirestore(filterOption.tracklist); // Retrieve the corresponding tracks array from firestore & add it to the filter object
            //filterObject.matchAlbumOnly = filterOption.matchAlbumOnly; // Assume the 'matchAlbumOnly' property was set on the filter option, and add it to the new filter object
        } else throw Error("One of the filter options provided was not in a supported format. Expected either a string or an object with a 'tracklist' property.");

        //TODO there should be a slightly more concise way to do this, perhaps by abstracting the 'retrieval' of tracklists to a helper function, and just passing along the 'app' parameter value.
        if (app === 'ytm') {
            filterObject.tracks = await appStorage.retrieveTracksArrayFromFirestore(tracklistTitle); // Retrieve the tracks array from firestore & add it to the filter object
        } else if (app === 'gpm') {
            filterObject.tracks = await appStorage.retrieveGPMTracklistFromLocalStorage(tracklistTitle); // Retrieve the tracks array from local storage & add it to the filter object
        } else throw Error("An invalid app type was provided. Accepted values are 'ytm' and 'gpm'.");

        filterObject.matchAlbumOnly = filterOption.matchAlbumOnly; // Apply the 'matchAlbumOnly' property value from the provided filter option to the new filter object. If no value was provided, then it will be undefined and ignored later.

        tracklistFilters.push(filterObject); // Add the new filter object to the array of filter objects.
    }

    return tracklistFilters;
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
    const filteredTracks = filterTracklist(unfilteredTracks, tracklistsToFilterOut); 

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