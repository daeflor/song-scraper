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
            comparisonFunction = (track1, track2) => tracklistComparisonUtils.compareTracks(track1, track2, collator);
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

    // Return the final list of unmatched tracks that still remain after all filters have been applied
    return unmatchedTracks;
}
