import * as DebugController from './Modules/DebugController.js';
import * as ViewRenderer from './Modules/ViewRenderer.js';
import * as Model from './Modules/Model.js';
import * as IO from './Modules/Utilities/IO.js';

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
    chrome.tabs.query( { active: true, currentWindow: true}, tabs => { //Query for the Active Tab...
        Model.tab.id = tabs[0].id; //Make a record of the current/active tab for future reference
        //window.Model.SetTabId(tabs[0].id);

        const _storagekey = 'currentTracklistMetadata';
        chrome.storage.local.get(_storagekey, storageResult => { //Get the cached metadata for the current tracklist from local storage
            const _tracklistMetadata = storageResult[_storagekey];

            if (typeof _tracklistMetadata.app === 'string') { //If the app which the tracklist belongs to has been set correctly, update it in the Model
                Model.tab.app = _tracklistMetadata.app;
            } else {
                console.error("The current app could not be determined from the URL.");
                //TODO might be better to call TriggerUITransition here instead, to keep all ViewRenderer calls in one place
                ViewRenderer.showStatusMessage('The current app could not be determined from the URL.');
                return;
            }

            if (typeof _tracklistMetadata.type === 'string') { //If the tracklist type has been set correctly, update it in the Model
                Model.tracklist.type = _tracklistMetadata.type;
            } else {
                console.error("The tracklist type could not be determined from the URL.");
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

            //TODO There is a problem here that the metadata being accessed could be out-dated cached data from the previous playlist
                //For example, right now, if you navigate to Your Likes, it will think everything is working fine 
                //because it finds metadata in the cache, but this metadata is no longer accurate. Need a way to clear the cache perhaps. 

            console.info("Retrieved tracklist metadata from local storage cache:");
            console.info(Model.tracklist);
            prepareLandingPage(); //If all the required metadata have been set correctly, show the extension landing page
        });
    });
}

    // function initializeFlow(url) {
    //     //TODO could use some more error handling here to ensure the parameters are passed correclty, since the error is quite hard to track down if, for example, the tab isn't actually passed.
    //     console.assert(typeof url == 'string', 'url should be a string');
        
    //     validateUrlAndRecordTracklistInfo(url);

    //     //Send a message to the content script to make a record of the current app for future reference
    //     sendMessage_RecordCurrentApp(window.Model.GetApp());

    //     //If the current app and tracklist type have been set...
    //     if (window.Model.GetApp() != null && window.Model.GetTracklistType() != null) {
    //         //If the tracklist title has also already been set, proceed to prepare the extension's landing page
    //         if (window.Model.GetTracklistTitle() != null) {
    //             prepareLandingPage(); 
    //         }
    //         //Else, if the tracklist title has not yet been set, retrieve it from the content script before displaying the extension's landing page
    //         else {
    //             //Set up a callback function so that when the tracklist title is fetched, the popup landing page gets prepared and displayed
    //             const _onTracklistTitleReceived = function(response) {
    //                 window.Model.SetTracklistTitle(response.tracklistName); //Make a record of the tracklist title
    //                 //updateTracklistTitle(response.tracklistName); //Make a record of the tracklist title
    //                 prepareLandingPage(); //Prepare the extension' landing page
    //             }

    //             //Send a message to the content script to fetch the name of the current tracklist
    //             sendMessage_GetTracklistName(_onTracklistTitleReceived);
    //         }
    //     }
    // }

    // function sendMessage_RecordCurrentApp(currentApp) {
    //     //Send a message to the content script to make a record of the current app
    //     const _message = {greeting:'RecordCurrentApp', app:currentApp};
    //     window.Utilities.SendMessageToContentScripts(_message);
    //     //TODO pretty sure this results in an error because no response is sent, but not certain
    // }

    // function sendMessage_GetTracklistName(callback) {
    //     //Send a message to the content script to get the tracklist name
    //     const _message = {greeting:'GetTracklistName'};
    //     window.Utilities.SendMessageToContentScripts(_message, callback);
    // }

function prepareLandingPage() {
    ViewRenderer.hideElement(ViewRenderer.divs.status);
    ViewRenderer.showHeader(Model.tracklist.title);

    ViewRenderer.showLandingPage();
    ViewRenderer.hideElement(ViewRenderer.divs.auth);
}

export function triggerUITransition(transition) {
    if (transition === 'UrlInvalid') {
        ViewRenderer.showStatusMessage('The current URL is not supported by this extension.');
    }
    else if (transition === 'ShowAuthPrompt') {
        ViewRenderer.hideElement(ViewRenderer.divs.status);
        ViewRenderer.unhideElement(ViewRenderer.divs.auth);
    }
    else if (transition === 'LogOut') {
        ViewRenderer.hideElement(ViewRenderer.divs.header);
        ViewRenderer.hideElement(ViewRenderer.divs.buttons);
        ViewRenderer.hideElement(ViewRenderer.divs.checkboxes);
        //ViewRenderer.hideElement(ViewRenderer.divs.tracktables);

        resetAllTrackTablesAndCheckboxes();

        //TODO might want a for loop to uncheck all checkboxes and hide all the track tables
            //If a for loop is used, it could also check for the elements not being undefined.
        // ViewRenderer.uncheckBox(ViewRenderer.checkboxes.storedTrackTable);
        // ViewRenderer.uncheckBox(ViewRenderer.checkboxes.scrapedTrackTable);
        // ViewRenderer.uncheckBox(ViewRenderer.checkboxes.deltaTrackTables);
        // ViewRenderer.hideElement(ViewRenderer.tracktables.stored);
        // ViewRenderer.hideElement(ViewRenderer.tracktables.scraped);
        // ViewRenderer.hideElement(ViewRenderer.tracktables.deltas);

        ViewRenderer.disableElement(ViewRenderer.buttons.exportScrapedMetadata);
        // ViewRenderer.disableElement(ViewRenderer.checkboxes.scrapedTrackTable);
        // ViewRenderer.disableElement(ViewRenderer.checkboxes.deltaTrackTables);
        
        ViewRenderer.unhideElement(ViewRenderer.divs.auth);
    }
    else if (transition === 'StartScrape') {
        ViewRenderer.disableElement(ViewRenderer.buttons.scrape);
        ViewRenderer.hideElement(ViewRenderer.divs.buttons);
        ViewRenderer.hideElement(ViewRenderer.divs.checkboxes);
        ViewRenderer.hideElement(ViewRenderer.divs.tracktables);
        //ViewRenderer.hideLandingPage();

        ViewRenderer.showStatusMessage('Song list comparison in progress.');
    } 
    else if (transition === 'ScrapeSuccessful') {
        ViewRenderer.hideElement(ViewRenderer.divs.status);
        ViewRenderer.unhideElement(ViewRenderer.divs.buttons);
        ViewRenderer.unhideElement(ViewRenderer.divs.checkboxes);
        ViewRenderer.unhideElement(ViewRenderer.divs.tracktables);
        ViewRenderer.enableElement(ViewRenderer.buttons.scrape);
        ViewRenderer.enableElement(ViewRenderer.buttons.storeScrapedMetadata);
        ViewRenderer.enableElement(ViewRenderer.buttons.exportScrapedMetadata);
        ViewRenderer.enableElement(ViewRenderer.checkboxes.scrapedTrackTable);
        ViewRenderer.enableElement(ViewRenderer.checkboxes.deltaTrackTables);
    }
    else if (transition === 'ScrapeFailed') {
        ViewRenderer.showStatusMessage('Failed to retrieve track list.');
    }
    else if (transition === 'ScrapedMetadataStored') {
        ViewRenderer.disableElement(ViewRenderer.buttons.storeScrapedMetadata); //Disable the button to store the scraped data
        if (typeof ViewRenderer.tracktables.stored === 'object') { //If the track table for the stored tracklist exists...
            ViewRenderer.removeElement(ViewRenderer.tracktables.stored); //Remove the tracktable element from the DOM (since it may be out-of-date)
            ViewRenderer.tracktables.stored = undefined; //Clear the saved reference to the old track table
            ViewRenderer.uncheckBox(ViewRenderer.checkboxes.storedTrackTable); //Uncheck the checkbox
        }
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
 * @param {object} [options] An object to provide the following optional parameters: parentElement (object); headerElement (object); descriptionIfEmpty (string); skipMatchedTracks (boolean);
 * @returns The container element for the track table and all associated elements
 */
export function createTrackTable(tracklist, headerText, options/*parentElement, header, descriptionIfEmpty*/) {
//TODO: Future note: If it's possible to go back and re-scrape, doing another scrape should remove (or replace?) any existing scraped tracklist tables, including from ViewRenderer's tracker object
    const _skipMatchedTracks  = (typeof options === 'object' && typeof options.skipMatchedTracks === 'boolean') ? options.skipMatchedTracks  : false;
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
        //'Seconds',
        //'Matched'
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

    //If the tracklist parameter provided is a valid array...
    if (Array.isArray(tracklist) === true) {
        //For each track in the tracklist...
        for (let i = 0; i < tracklist.length; i++) {
            //If the current value in the array is a valid object...
            if (typeof tracklist[i] === 'object') {
                //If 'matched' tracks are purposefully being skipped for this track table, and the current track is 'matched', skip over it.
                if (_skipMatchedTracks === true && tracklist[i].matched === true) {
                    //DebugController.logInfo("Track at index " + i + " will be skipped over because it is listed as 'matched' and matched tracks are being skipped for this track table.");
                    continue;
                }

                //Create a new data cell for the track's index
                let _td = document.createElement('td'); 
                _td.textContent = i+1; 
                //Create a new row for the track, adding the index cell to the new row
                _tr = window.Utilities.CreateNewElement('tr', {children:[_td]}); 
                //Add the new row to the table
                _table.appendChild(_tr);

                //For each additional column in the Track Table...
                for (let j = 0; j < _columnsToIncludeInTrackTable.length; j++) { 
                    //If the current column's name is a valid string...
                    if (typeof _columnsToIncludeInTrackTable[j] === 'string') {  
                        //Force the column name string to lower case and use that value to extract the corresponding metadatum value for the track
                        const _trackMetadatum = tracklist[i][_columnsToIncludeInTrackTable[j].toLowerCase()];
                        //If the track's metadatum for the current column is a valid string or has a value of true
                        //if (typeof _trackMetadatum === 'string' || _trackMetadatum === true || typeof _trackMetadatum === 'number') {
                        if (typeof _trackMetadatum !== 'undefined' && _trackMetadatum != false) {
                            //Create a new data cell for the track's metadatum
                            _td = document.createElement('td');
                            _td.textContent = _trackMetadatum;
                            //Add the new cell to the track's row
                            _tr.appendChild(_td);
                        }
                        else {
                            DebugController.logInfo("A piece of track metadata was encountered that is blank, false, or undefined, and so it was skipped over. This is typical in the case of the 'Unplayable' column, but otherwise could indicate that an issue was encountered. Current column is: " + _columnsToIncludeInTrackTable[j]);
                        }
                    }
                }
            }
            else {
                DebugController.logError("Expected an object containing track metadata or null. Instead found: " + tracklist[i] + ". Current index in array: " + i + ". Tracklist: ");
                console.table(tracklist);
            }
        }
    } //TODO could probably separate creating the track table itself from all the various other elements (e.g. header, description) that go along with it, to have smaller and easier-to-read functions

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
    return _tableContainer; 
}

function checkIfDurationValuesMatch(durationA, durationB) {
    if (typeof durationA === 'number' && typeof durationB === 'number') {
        const _differenceInSeconds = durationA - durationB;
        return (_differenceInSeconds > -2 && _differenceInSeconds < 2) ? true : false;
    }
    else {
        DebugController.logError("Error: Expected two parameters of type 'number' but instead received a) " + durationA + "; b) " + durationB);
    }
}

function markMatchingTracks(tracklistCurrent, tracklistPrevious) {
    for (let i = 0; i < tracklistCurrent.length; i++) {
        const _scrapedTrack = tracklistCurrent[i];
        
        for (let j = 0; j < tracklistPrevious.length; j++) {
            const _storedTrack = tracklistPrevious[j];

            //If both the scraped and stored tracks have valid values...
            if (_scrapedTrack != null && _storedTrack != null) {
                //If the stored track hasn't already been marked as 'matched'...
                if (_storedTrack.matched !== true) {
                    //If the scraped and stored tracks match...
                    if (_scrapedTrack.title === _storedTrack.title && _scrapedTrack.artist === _storedTrack.artist &&
                        _scrapedTrack.album === _storedTrack.album && checkIfDurationValuesMatch(_scrapedTrack.seconds, _storedTrack.seconds) === true ) {
                        
                            //Mark the scraped and stored tracks both as 'matched' and move onto the next scraped track
                            _scrapedTrack.matched = true;
                            _storedTrack.matched = true;
                            break;
                    }
                }
            } //TODO OLD - removed track index wrong if there were duplicates

            //TODO would it work to start at the same j position that was last matched + 1, as opposed to always starting at j=0?
                //Probably more hassle and room for error than it's worth

            else {
                DebugController.logError("Attempted to compare two tracks but at least one of them was null.");
            }  
        }
    }
}

export function createDeltaTracklistsGPM(scrapedTracklist) {
    //TODO why pass the parameter, when we can get the scraped tracklist from the Model right here?

    //Once the Google Play Music metadata for the current tracklist has been fetched...
    const _onGooglePlayMusicMetadataRetrieved = function(gpmTracklist) {

        for (let i = 0; i < gpmTracklist.length; i++) { 
            gpmTracklist[i].seconds = convertDurationStringToSeconds(gpmTracklist[i].duration);
        }
        for (let i = 0; i < scrapedTracklist.length; i++) { 
            scrapedTracklist[i].seconds = convertDurationStringToSeconds(scrapedTracklist[i].duration);
        }

        markMatchingTracks(scrapedTracklist, gpmTracklist);

        //Create a new container div element for all the track tables used to show the deltas (e.g. Added, Removed, Disabled)
        ViewRenderer.tracktables.deltas = window.Utilities.CreateNewElement('div');
        
        //Create a header element and track table for the list of 'Added Tracks'
        let _headerElement = window.Utilities.CreateNewElement('p', {attributes:{class:'greenFont noVerticalMargins'}});
        createTrackTable(scrapedTracklist, 'Added Tracks', {parentElement:ViewRenderer.tracktables.deltas, headerElement:_headerElement, skipMatchedTracks:true});
        
        //Create a header element and track table for the list of 'Removed Tracks'
        _headerElement = window.Utilities.CreateNewElement('p', {attributes:{class:'redFont noVerticalMargins'}});
        createTrackTable(gpmTracklist, 'Removed Tracks', {parentElement:ViewRenderer.tracktables.deltas, headerElement:_headerElement, skipMatchedTracks:true});

        //Add the new container div for all the delta track tables to the DOM, within the general track tables div
        ViewRenderer.divs.tracktables.appendChild(ViewRenderer.tracktables.deltas);
    };

    //Fetch the Google Play Music tracklist metadata from the Model and then execute the callback
    Model.getStoredMetadataGPM(_onGooglePlayMusicMetadataRetrieved);
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

        switch(_splitDurationIntegers.length) {
            case 1: //Track is less than a minute long
                return _splitDurationIntegers[0];
            case 2: //Track is more than a minute but less than an hour long
                return _splitDurationIntegers[0]*60 + _splitDurationIntegers[1];
            case 3: //Track is more than an hour but less than a day long
                return _splitDurationIntegers[0]*3600 + _splitDurationIntegers[1]*60 + _splitDurationIntegers[2];
            default:
                DebugController.logWarning("Tried to extract a seconds integer value from a duration string, but the duration is not in a supported format (e.g. the duration may be longer than 24 hours).");
        }
    }
    else {
        DebugController.LogError("ERROR: Tried to convert a duration string into a seconds integer value, but the duration provided was not in string format.");
    }
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
                if (typeof options.attributes === 'object') { //If an attributes object was provided...                    
                    // for (let i = 0; i < options.attributes.length; i++) {
                    //     _element.setAttribute(options.attributes[i].key, attributes[i].value);
                    // }
                    for (const [key, value] of Object.entries(options.attributes)) {
                        _element.setAttribute(key, value);
                    }
                }

                if (Array.isArray(options.children) === true) { //If a valid array of children was provided...                    
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
        FadeIn: fadeIn,
        GetElement: getElement,
        CreateNewElement: createNewElement,
        SendRequest_LoadGooglePlayMusicExportData: sendRequest_LoadGooglePlayMusicExportData
    };
})();

//window.Utilities.FadeIn(document.body, init, 500);

export {init, prepareLandingPage, downloadCurrentTracklistAsCSV, downloadGooglePlayMusicTracklistAsCSV};