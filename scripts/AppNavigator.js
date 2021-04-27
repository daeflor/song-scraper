import * as DebugController from './modules/DebugController.js';
import * as ViewRenderer from './modules/ViewRenderer.js';
import * as Model from './modules/Model.js';
import * as IO from './modules/Utilities/IO.js';

// window.Model = (function() {
//     // //TODO might want to freeze this once the values have been set
//     // //TODO should this be inside of or consolidated with TabManager?
//     //     //Could consolidate this into model
//     // const currentState = {
//     //     app: null,
//     //     tracklistType: null,
//     //     //tracklistTitle: null
//     // }
//     let tabId = null;
//     let app = null; //TODO might want to keep app and tracklistType together in one object to be set and passed around together more easily
//     let tracklistType = null;
//     let tracklistTitle = null;
//     let localStorageKey = null;
//     //const localStorageBackupKey = chrome.runtime.id + '_Backup';

//     return { 
//         GetTabId: function() {
//             return tabId; 
//         },
//         SetTabId: function(id){
//             tabId = id;
//         },
//         GetApp: function() {
//             return app;
//         },
//         SetApp: function(currentApp) {
//             app = currentApp;
//         },
//         GetTracklistType: function() {
//             return tracklistType;
//         },
//         SetTracklistType: function(type) {
//             tracklistType = type;
//         },
//         GetTracklistTitle: function() {
//             return tracklistTitle;
//         },
//         SetTracklistTitle: function(title) {
//             tracklistTitle = title;
//             //localStorageKey = chrome.runtime.id + '_Playlist_\'' + playlistName + '\'';
//             localStorageKey = title;
//             //console.log("Playlist name set to: " + playlistName + ". Key set to: " + key);
//         },
//         GetLocalStorageKey : function() {
//             return localStorageKey; 
//         },
//         // GetBackupKey : function()
//         // {
//         //     return localStorageBackupKey; 
//         // },
//     };
// })();


function init() {
    const _storagekey = 'currentTracklistMetadata';
    chrome.storage.local.get(_storagekey, storageResult => { //Get the cached metadata for the current tracklist from local storage
        const _tracklistMetadata = storageResult[_storagekey];

        //TODO Maybe Model should just grab these values itself, although it would need to be able to call ShowLandingPage or equivalent afterwards
        //TODO Or instead, maybe only the files that need certain variables should track those.

        if (typeof _tracklistMetadata.type === 'string') { //If the tracklist type has been set correctly, update it in the Model
            Model.tracklist.type = _tracklistMetadata.type;
        } else {
            console.error("The tracklist type could not be determined from the URL.");
            //TODO might be better to call TriggerUITransition here instead, to keep all ViewRenderer calls in one place
            ViewRenderer.showStatusMessage('The tracklist type could not be determined from the URL.');
            return;
        }

        if (typeof _tracklistMetadata.title === 'string') { //If the tracklist title has been set correctly, update it in the Model
            Model.tracklist.title = _tracklistMetadata.title;
        } else {
            console.error("The tracklist type could not be determined from the URL.");
            ViewRenderer.showStatusMessage('The tracklist type could not be determined from the URL.');
            return;
        }

        console.info("Retrieved tracklist metadata from local storage cache:");
        console.info(Model.tracklist);
        triggerUITransition('ShowLandingPage'); //If all the required metadata have been set correctly, show the extension landing page
    });
}

export function triggerUITransition(transition) {
    if (transition === 'UrlInvalid') {
        ViewRenderer.showStatusMessage('The current URL is not supported by this extension.');
    } else if (transition === 'ShowAuthPrompt') {
        ViewRenderer.hideElement(ViewRenderer.divs.status);
        ViewRenderer.unhideElement(ViewRenderer.divs.auth);
    } else if (transition === 'LogOut') {
        ViewRenderer.hideElement(ViewRenderer.divs.header);
        ViewRenderer.hideElement(ViewRenderer.divs.buttons);
        ViewRenderer.hideElement(ViewRenderer.divs.checkboxes);
        //ViewRenderer.hideElement(ViewRenderer.divs.tracktables);

        resetAllTrackTablesAndCheckboxes();

        ViewRenderer.disableElement(ViewRenderer.buttons.exportScrapedMetadata);
        ViewRenderer.updateElementTextContent(ViewRenderer.buttons.storeScrapedMetadata, 'Save Scraped Metadata to Storage');

        ViewRenderer.unhideElement(ViewRenderer.divs.auth);
    } else if (transition === 'ShowLandingPage') {
        ViewRenderer.hideElement(ViewRenderer.divs.status);
        ViewRenderer.hideElement(ViewRenderer.divs.auth);
        ViewRenderer.showHeader(Model.tracklist.title);
        ViewRenderer.showLandingPage();
    } else if (transition === 'StartScrape') {
        ViewRenderer.disableElement(ViewRenderer.buttons.scrape);
        ViewRenderer.hideElement(ViewRenderer.divs.buttons);
        ViewRenderer.hideElement(ViewRenderer.divs.checkboxes);
        ViewRenderer.hideElement(ViewRenderer.divs.tracktables);
        //ViewRenderer.hideLandingPage();

        ViewRenderer.showStatusMessage('Song list comparison in progress.');
    } else if (transition === 'ScrapeSuccessful') {
        ViewRenderer.hideElement(ViewRenderer.divs.status);
        ViewRenderer.unhideElement(ViewRenderer.divs.buttons);
        ViewRenderer.unhideElement(ViewRenderer.divs.checkboxes);
        ViewRenderer.unhideElement(ViewRenderer.divs.tracktables);
        ViewRenderer.enableElement(ViewRenderer.buttons.scrape);
        ViewRenderer.enableElement(ViewRenderer.buttons.storeScrapedMetadata);
        ViewRenderer.enableElement(ViewRenderer.buttons.exportScrapedMetadata);
        ViewRenderer.enableElement(ViewRenderer.checkboxes.scrapedTrackTable);
        ViewRenderer.enableElement(ViewRenderer.checkboxes.deltaTrackTables);
        ViewRenderer.updateElementTextContent(ViewRenderer.buttons.storeScrapedMetadata, 'Save Scraped Metadata to Storage');
    } else if (transition === 'ScrapeFailed') {
        ViewRenderer.showStatusMessage('Failed to retrieve track list.');
    } else if (transition === 'StorageInProgress') {
        ViewRenderer.disableElement(ViewRenderer.buttons.storeScrapedMetadata); //Disable the button to store the scraped data
        if (typeof ViewRenderer.tracktables.stored === 'object') { //If the track table for the stored tracklist exists...
            ViewRenderer.removeElement(ViewRenderer.tracktables.stored); //Remove the tracktable element from the DOM (since it may be out-of-date)
            ViewRenderer.tracktables.stored = undefined; //Clear the saved reference to the old track table
            ViewRenderer.uncheckBox(ViewRenderer.checkboxes.storedTrackTable); //Uncheck the checkbox
        }
    } else if (transition === 'ScrapedMetadataStored') {
        ViewRenderer.updateElementTextContent(ViewRenderer.buttons.storeScrapedMetadata, 'Data successfully stored!');
    }
}

function resetAllTrackTablesAndCheckboxes() {
    //For each potential track table...
    for (const key in ViewRenderer.tracktables) {
        //If the track table actually exists (i.e. was previously created)...
        if (typeof ViewRenderer.tracktables[key] === 'object') {
            //Hide the track table
            ViewRenderer.hideElement(ViewRenderer.tracktables[key]);
        } 
    }
    //For each track table checkbox...
    for (const key in ViewRenderer.checkboxes) {
        //Uncheck the checkbox
        ViewRenderer.uncheckBox(ViewRenderer.checkboxes[key]);
    }
    //Disable the 'scraped' and 'deltas' track table checkboxes
    ViewRenderer.disableElement(ViewRenderer.checkboxes.scrapedTrackTable);
    ViewRenderer.disableElement(ViewRenderer.checkboxes.deltaTrackTables);
}

/**
 * Creates a track table from the provided tracklist and other inputs
 * @param {array} tracklist The tracklist array for which to create a table element
 * @param {string} headerText The name of the track table to display above it
 * @param {object} [options] An object to provide the following optional parameters: parentElement (object); headerElement (object); descriptionIfEmpty (string);
 * @returns The container element for the track table and all associated elements
 */
export function createTrackTable(tracklist, headerText, options/*parentElement, header, descriptionIfEmpty*/) {
//TODO: Future note: If it's possible to go back and re-scrape, doing another scrape should remove (or replace?) any existing scraped tracklist tables, including from ViewRenderer's tracker object
    const _parentElement      = (typeof options === 'object' && typeof options.parentElement === 'object')      ? options.parentElement      : ViewRenderer.divs.tracktables;
    const _descriptionIfEmpty = (typeof options === 'object' && typeof options.descriptionIfEmpty === 'string') ? options.descriptionIfEmpty : 'No tracks to display'; //TODO Not sure it's ever going to be necessary to pass this as a parameter instead of just using the default value.
    const _headerElement      = (typeof options === 'object' && typeof options.headerElement === 'object')      ? options.headerElement      : window.Utilities.CreateNewElement('p', {attributes:{class:'noVerticalMargins'}});
    
    //TODO Should all or some of this be done in ViewRenderer instead?

    //TODO A nice-to-have in the future would be to omit any header/column (e.g. 'Unplayable') if there are zero displayable values for that metadatum
    const _columnsToIncludeInTrackTable = [
        'Title',
        'Artist',
        'Album',
        'Duration',
        'Unplayable' 
    ]; //TODO This is currently hard-coded. Should eventually be a param, probably. Although it would be good to have a default set of keys to fall back to.

    let _tr = document.createElement('tr');

    //Added a header column to the track table for the track index
    let _th = document.createElement('th');
    _th.textContent = 'Index';
    _tr.appendChild(_th);

    //For each additional column that should be included in the Track Table...
    for (let i = 0; i < _columnsToIncludeInTrackTable.length; i++) { 
        //If the key's value is a string, use it to add a header column to the track table
        if (typeof _columnsToIncludeInTrackTable[i] === 'string') {
            _th = document.createElement('th');
            _th.textContent = _columnsToIncludeInTrackTable[i];
            _tr.appendChild(_th);
        }
    }

    //Create a new table element, with the header row as a child
    const _table = window.Utilities.CreateNewElement('table', {attributes:{class:'trackTable'}, children:[_tr]});

    //TODO if we keep scraped tracklist as an array but deltas as a map, we will need separate looping logic for each one...
        //Right now this is BROKEN for scraped/stored lists 
    if (typeof tracklist === 'object') { // If the tracklist parameter provided is a valid object...       
        for (const [index, track] of tracklist) { // For each track in the tracklist...
            let _td = window.Utilities.CreateNewElement('td', {textContent:index}); // Create a new data cell for the track's index
            _tr = window.Utilities.CreateNewElement('tr', {children:[_td]}); // Create a new row for the track, adding the index cell to the new row     
            
            _table.appendChild(_tr); // Add the new row to the table

            for (const column of _columnsToIncludeInTrackTable) { // For each additional column in the Track Table...
                if (typeof column === 'string') { // If the current column's name is a valid string...
                    const trackMetadatum = track[column.toLowerCase()]; // Convert the column name string to lower case and use that value to extract the corresponding metadatum value for the track
                    if (typeof trackMetadatum !== 'undefined') { // If the track's metadatum for the current column exists
                        _tr.append(window.Utilities.CreateNewElement('td', {textContent:trackMetadatum})); // Append to the row a new cell containing the metadatum value
                    } else if (column !== 'Unplayable') { //Print a warning log if the metadata is undefined, except for the 'Unplayable' value, where this is expected.
                        console.warn("A piece of track metadata was encountered that is blank, false, or undefined, and so it was skipped over. This does not include the 'Unplayable' column. This likley indicates that an issue was encountered. Current column is: " + column);
                    }
                }
            }
        }
    } else console.error("Tried to create a track table but a valid tracklist object was not provided.");
    //TODO could probably separate creating the track table itself from all the various other elements (e.g. header, description) that go along with it, to have smaller and easier-to-read functions

    let _tableBody = undefined;
    if (_table.childElementCount === 1) //If the table has no tracks in it (i.e. the child count is 1, because of the header row)...
    {
        //Create a new element for a description of the empty track table
        _tableBody = window.Utilities.CreateNewElement('p', {attributes:{class:'indent'}});
        _tableBody.textContent = _descriptionIfEmpty;
    }
    else { //Else, if the table does have tracks in it, create a scroll area to contain the table
        _tableBody = window.Utilities.CreateNewElement('div', {attributes:{class:'trackTableScrollArea'}, children:[_table]});
    }
    _headerElement.textContent = headerText.concat(' (' + (_table.childElementCount -1) + ')'); //Set the header text, including the number of tracks in the table
    const _tableContainer = window.Utilities.CreateNewElement('div', {children:[_headerElement, _tableBody]}); //Create a new element to contain the various table elements
    _parentElement.appendChild(_tableContainer); //Add the new container element (and its children) to the DOM
    return _tableContainer; // TODO it's confusing that sometimes I used this return value and sometimes I don't. Would be better to be more consistent.
                            // Maybe just always have the extra div layer like the deltas uses/needs, for consistency. Then, always pass the parent element which the final table should be placed under.
                            // This way, the top level divs under the 'tracktables' div can all be pre-set in HTML and can be referenced easily via ViewRenderer, and this function doesn't have to return anything. 
}

function compareDurationStrings(duration1, duration2) {
    if (typeof duration1 === 'string' && typeof duration2 === 'string') {
        const differenceInSeconds = convertDurationStringToSeconds(duration1) - convertDurationStringToSeconds(duration2);
        return (differenceInSeconds >= -2 && differenceInSeconds <= 2) ? true : false;
    } else console.error("Tried to compare two duration strings, but the parameters provided were not both of type string.");
}

function compareTracks(track1, track2, collator) {
    if (typeof(track1) === 'object' && typeof(track2) === 'object' && typeof collator === 'object') {
        return (collator.compare(track1.title, track2.title) === 0 &&
        collator.compare(track1.artist, track2.artist) === 0 &&
        collator.compare(track1.album, track2.album) === 0 &&
        compareDurationStrings(track1.duration, track2.duration) === true)
            ? true : false;
    } else console.error("Tried to compare two tracks but the parameters provided are not valid.");
}

function getDeltaTracklists(scrapedTracklist, storedTracklist) {
    if (Array.isArray(scrapedTracklist) === true && Array.isArray(storedTracklist) === true) {
        const collator = new Intl.Collator(undefined, {usage: 'search', sensitivity: 'accent'}); // Set up a collator to look for string differences, ignoring capitalization
        
        // TODO could be worth considering storing tracklists as maps instead of arrays. In Firebase's UI, storing tracklists as maps would look almost identical. Note that if the scraped tracks are originally set in a map, that map would have to be cloned before creating the delta lists (below).
            //An alternative is to just store the index as a property along with the rest of the track metadata. Then could continue to use arrays instead of maps. Unsure if this is actually better though, especially since we're removing elements from the lists below.
                //... I don't think the track index actually needs to be kept anywhere other than the delta tracklist arrays/maps. The scraped and stored lists will have the index regardless.
                //... However, doing this could lead to needing different logic to handle delta vs scraped/stored tracklists, in the createTrackTable function. This might be slight though.
        //Note: it's possible for a track's position/index listed in the delta track tables to be wrong if there are duplicate copies of the track in the tracklist, but this is unlikely. 
        const unmatchedScrapedTracks = new Map();
        const unmatchedStoredTracks = new Map();
        const unplayableTracks = new Map();
        for (let i = 0; i < scrapedTracklist.length; i++) { // For each scraped track...
            unmatchedScrapedTracks.set(i+1, scrapedTracklist[i]); // Add it to the unmatched scraped tracks map, using its position in the tracklist as the key
        }
        for (let i = 0; i < storedTracklist.length; i++) { // For each stored track...
            unmatchedStoredTracks.set(i+1, storedTracklist[i]); // Add it to the unmatched stored tracks map, using its position in the tracklist as the key
        }
        for (const [scrapedTrackIndex, scrapedTrack] of unmatchedScrapedTracks) { // For each scraped track that hasn't yet been matched with a stored track...
            for (const [storedTrackIndex, storedTrack] of unmatchedStoredTracks) { // For each stored track that hasn't yet been matched with a scraped track...
                if (compareTracks(scrapedTrack, storedTrack, collator) === true) { // If the two tracks match...
                    unmatchedScrapedTracks.delete(scrapedTrackIndex); // Delete the scraped track from the map of unmatched scraped tracks, so that it can't be matched against any other stored tracks
                    unmatchedStoredTracks.delete(storedTrackIndex); // Delete the stored track from the map of unmatched stored tracks, so that it can't be matched against any other scraped tracks
                    if (scrapedTrack.unplayable === true && storedTrack.unplayable !== true) { // If the scraped track is listed as unplayable but the stored track wasn't...
                        unplayableTracks.set(scrapedTrackIndex, scrapedTrack); // Add the scraped track to the map of unplayable tracks, using its position in the tracklist as the key
                    }
                    break;
                }
            }
        }

        console.table([...unmatchedScrapedTracks.values()]);
        console.table([...unmatchedStoredTracks.values()]);
    
        return {added:unmatchedScrapedTracks, removed:unmatchedStoredTracks, unplayable:unplayableTracks};
    } else console.error("Tried to get delta tracklists, but the parameters provided were invalid. Expected two tracklist arrays (scraped & stored).");
}

// TODO why pass the parameter, when we can get the scraped tracklist from the Model right here?
export function createDeltaTracklistsGPM(scrapedTracklist) {
    Model.getStoredMetadataGPM(storedTracklist => { // Fetch the stored version of the current tracklist...
        const deltaTracklists = getDeltaTracklists(scrapedTracklist, storedTracklist);
        //TODO could start to decouple this from GPM. Instead of doing this, maybe pass the storedTracklist as a param?

        if (typeof deltaTracklists === 'object') {
            // Create a new container div element for all the track tables used to show the deltas (e.g. Added, Removed, Disabled)
            //ViewRenderer.tracktables.deltas = window.Utilities.CreateNewElement('div'); //TODO why isn't this created in advance? Or just in the html file already. Is there a reason to create it here?

            // Create a header element and track table for the list of 'Added Tracks'
            let headerElement = window.Utilities.CreateNewElement('p', {attributes:{class:'greenFont noVerticalMargins'}});
            createTrackTable(deltaTracklists.added, 'Added Tracks', {parentElement:ViewRenderer.tracktables.deltas, headerElement:headerElement,});
            
            // Create a header element and track table for the list of 'Removed Tracks'
            headerElement = window.Utilities.CreateNewElement('p', {attributes:{class:'redFont noVerticalMargins'}});
            createTrackTable(deltaTracklists.removed, 'Removed Tracks', {parentElement:ViewRenderer.tracktables.deltas, headerElement:headerElement});

            // If there a list of 'Unplayable Tracks' exits, create a header element and track table for it
            if (typeof deltaTracklists.unplayable === 'object' && deltaTracklists.unplayable.size > 0) {
                headerElement = window.Utilities.CreateNewElement('p', {attributes:{class:'orangeFont noVerticalMargins'}});
                createTrackTable(deltaTracklists.unplayable, 'Unplayable Tracks', {parentElement:ViewRenderer.tracktables.deltas, headerElement:headerElement});
            
                //TODO maybe put a flag here indicating whether or not the 'Unplayable' column should be included, and then send that when creating the 'Added' & 'Removed' track tables.
            }

            // Add the new container div for all the delta track tables to the DOM, within the general track tables div
            //ViewRenderer.divs.tracktables.appendChild(ViewRenderer.tracktables.deltas);
        }
    });
}

function downloadCurrentTracklistAsCSV(tracklist) {
    //The object keys to include when outputting the tracklist data to CSV
    const _keysToIncludeInExport = [
        'title',
        'artist',
        'album',
        'duration',
        'unplayable'
    ];

    const _filename = 'TracklistExport_After_' + Model.tracklist.title;

    IO.convertArrayOfObjectsToCsv(tracklist, _filename, _keysToIncludeInExport);
}

//TODO Should I have an IOController?
function downloadGooglePlayMusicTracklistAsCSV() {
    //The object keys to include when outputting the GPM track data to CSV
    const _keysToIncludeInExport = [
        'title',
        'artist',
        'album',
        'duration',
        'unplayable' //TODO This is currently hard-coded. We probably should only pass one copy of _keysToIncludeInExport per 'comparison' so that the two csv files match
    ];

    //Once the Google Play Music metadata for the current tracklist has been fetched, convert it to a CSV file
    const _onGooglePlayMusicMetadataRetrieved = function(tracklistsArray) {
        const _filename = 'TracklistExport_Before_' + Model.tracklist.title;
        IO.convertArrayOfObjectsToCsv(tracklistsArray, _filename, _keysToIncludeInExport);
    };

    //Fetch the Google Play Music tracklist metadata from the Model and then execute the callback
    Model.getStoredMetadataGPM(_onGooglePlayMusicMetadataRetrieved);
}

    //TODO NEW - this should take a tracklist key to be more general. Right now it only works for the current playlist which is unclear
    // function downloadTracklistAsCsv(tracklistArray)
    // {
    //     const _gpmTracklistKey = getTracklistKeyFromTracklistName(tracklistArray, TabManager.GetPlaylistName());
    //     console.log('GPM Tracklist Key: ' + _gpmTracklistKey);
    //     console.log(tracklistArray[_gpmTracklistKey]);

    //     convertArrayOfObjectsToCsv(tracklistArray[_gpmTracklistKey]);
    // }

function convertDurationStringToSeconds(duration) {
    if (typeof duration === 'string') {
        //Split the duration string, then convert each split portion into an integer and return a new array of split integer values
        const _splitDurationIntegers = duration.split(':').map(durationString => parseInt(durationString, 10));
        //TODO technically I don't think it's necessary to convert these to numbers because I think JS supports arithmatic with 'string versions' of numbers
            //maybe NVM. The multiplication does work, but the addition does not
            //A way around this would be to always multiply the last array index by 1, but at that point, is it worth it?

        switch(_splitDurationIntegers.length) {
            case 1: //Track is less than a minute long
                return _splitDurationIntegers[0];
            case 2: //Track is more than a minute but less than an hour long
                return _splitDurationIntegers[0]*60 + _splitDurationIntegers[1];
            case 3: //Track is more than an hour but less than a day long
                return _splitDurationIntegers[0]*3600 + _splitDurationIntegers[1]*60 + _splitDurationIntegers[2];
            default:
                console.warn("Tried to extract a seconds integer value from a duration string, but the duration is not in a supported format (e.g. the duration may be longer than 24 hours).");
        }
    } else console.error ("Tried to convert a duration string into a seconds integer value, but the duration provided was not in string format.");
}

//TODO this should be a module instead (or move the few different remaining helper functions here into other already-existing modules as applicable)
window.Utilities = (function() {
    /**
     * Creates and returns an element of the specified type and with the specified attributes and/or children
     * @param {string} type The type of element to create
     * @param {object} [options] An optional object to provide attributes or children to the new element (using the 'attributes' and 'children' properties) 
     * @returns the new element object
     */
    function createNewElement(type, options) {
        if (typeof type === 'string') { //If a valid element type was provided...
            const _element = document.createElement(type); //Create a new element of the specified type

            if (typeof options === 'object') { //If an options object was provided...
                if (typeof options.attributes === 'object') { //If an attributes property was provided...                    
                    // for (let i = 0; i < options.attributes.length; i++) {
                    //     _element.setAttribute(options.attributes[i].key, attributes[i].value);
                    // }
                    for (const [key, value] of Object.entries(options.attributes)) {
                        _element.setAttribute(key, value);
                    }
                }
                if (typeof options.textContent !== 'undefined') { //If a textContent property was provided...                    
                    _element.textContent = options.textContent;
                }
                if (Array.isArray(options.children) === true) { //If a valid array of children was provided as a property...                    
                    for (let i = 0; i < options.children.length; i++) {
                        _element.appendChild(options.children[i]);
                    }
                }
            }

            return _element;
        }
        else {
            DebugController.LogError("ERROR: Could not create new element as the element type was not provided.");
        }
    }

    /**
     * 
     * @param {element} element The element to fade in
     * @param {function} callback The callback function to execute once the fade-in is complete
     * @param {number} [increment=1000] The length that the fade-in should last, in milliseconds. Defaults to 1000ms. Minimum value supported is 100ms.
     */
    function fadeIn(element, callback, fadeLength=1000) {
		console.log("Element \'%s\' is beginning to Fade In.", element);

        //If the fade length provided is less than 100ms, set it to 100ms.
        if (fadeLength < 100) {
            fadeLength = 100;
        }

        //The opacity will be re-calculated every 50ms
        const _intervalPeriod = 50;

        //The opacity will be incremented by this value with every interval period 
        const _opacityIncrementPerInterval = _intervalPeriod/fadeLength;
        
        //At the beginning of the fade-in, the current (i.e first) opacity level to use should be 0 (fully transparent)
        let _currentOpacityLevel = 0;
        
        //Every 60 milliseconds, increment the opacity level by the specified amount and then apply it to the element
		const _fadeInterval = setInterval(
			function() {
                
                //Apply the current opacity level to the element
                ViewRenderer.setElementOpacity(element, _currentOpacityLevel);
                
                //If the current opacity level is 1 then the fade-in is complete, so clear the interval/timer and execute the provided callback function
				if (_currentOpacityLevel == 1) {
					window.clearInterval(_fadeInterval);
                    
                    //TODO can we abstract all the null checks for all the callbacks? 
					if (typeof callback !== "undefined") { 
						callback();
					}
                }	
                //If the current opacity level has exceeded one for any reason, set it to 1 so the fade-in will be completed in the next interval
				else if (_currentOpacityLevel > 1) {
					_currentOpacityLevel = 1;
                }
                //Else, increment the current opacity level
				else {
					_currentOpacityLevel += _opacityIncrementPerInterval;
				}
			},
			_intervalPeriod
		);
    }

    function getElement(id) {
        let element = document.getElementById(id);

        if (element != null) {
            return element
        }
        else {
            DebugController.logError("ERROR: Failed to get element with an ID of: " + id);
        }
    }

    //TODO Move this out of the general Utilities section and into somewhere more applicable
        //This one could maybe go into the storage manager?
    function sendRequest_LoadGooglePlayMusicExportData(callback) {
        const _filepath = "ExportedData/LocalStorageExport_2020-10-12-10-30PM_ThumbsUpDuplicatedAsYourLikes.txt";
        IO.loadTextFileViaXMLHttpRequest(_filepath, callback, true);
    }

    return {
        // FadeIn: fadeIn,
        // GetElement: getElement,
        CreateNewElement: createNewElement
        //SendRequest_LoadGooglePlayMusicExportData: sendRequest_LoadGooglePlayMusicExportData
    };
})();

//window.Utilities.FadeIn(document.body, init, 500);

export {init, downloadCurrentTracklistAsCSV, downloadGooglePlayMusicTracklistAsCSV};