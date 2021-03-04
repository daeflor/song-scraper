import * as DebugController from './Modules/DebugController.js';
import * as ViewRenderer from './Modules/ViewRenderer.js';
import * as Model from './Modules/Model.js';
import * as IO from './Modules/Utilities/IO.js';
import * as Messenger from './Modules/MessageController.js';

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


//window.AppController = (function() {
    const supportedApps = Object.freeze({
        youTubeMusic: 'ytm',
        googlePlayMusic: 'gpm'
    });

    //TODO This isn't being used as much as it could be
    const supportedTracklistTypes = Object.freeze({
        playlist: 'playlist',
        autoPlaylist: 'auto',
        genreList: 'genre',
        allSongsList: 'all',
        uploadsList: 'uploads'
    });

    function init() {
        //Query for the Active Tab...
        chrome.tabs.query( 
            { active: true, currentWindow: true}, 
            function(tabs) {	
                //Make a record of the current/active tab for future reference
                //window.Model.SetTabId(tabs[0].id);
                Model.tab.id = tabs[0].id;

                validateUrlAndRecordTracklistInfo(tabs[0].url);

                //Send a message to the content script to make a record of the current app for future reference
                //sendMessage_RecordCurrentApp(Model.tab.app);

                //If the current app and tracklist type have been set...
                if (typeof(Model.tab.app) === 'string' && typeof(Model.tracklist.type) === 'string') {
                    //If the tracklist title has also already been set, proceed to prepare the extension's landing page
                    if (typeof(Model.tracklist.title) === 'string') { 
                        prepareLandingPage();
                    }
                    //Else, if the tracklist title has not yet been set, retrieve it from the content script before displaying the extension's landing page
                    else {
                        //Send a message to the content script to fetch the name of the current tracklist
                        Messenger.sendMessage('GetTracklistTitle');
                    }
                }
            }
        );
    }

    function validateUrlAndRecordTracklistInfo(url) {
        console.assert(typeof url == 'string', 'url should be a string');

        //If the URL indicates the current app/site is YouTube Music...
        if (url != null && url.includes('music.youtube.com') == true) {
            //Make a record of the current app for future reference
            Model.tab.app = supportedApps.youTubeMusic;

            //Make a record of the current tracklist type based on certain URL conditions
            if (url.includes('list=PL')) {
                Model.tracklist.type = supportedTracklistTypes.playlist;
            } 
            else if (url.includes('list=LM')) {
                Model.tracklist.type = supportedTracklistTypes.autoPlaylist;
                Model.tracklist.title = 'Liked Songs';
            }
            //TODO the options below are currently not supported due to how the manifest is setup
            else if (url.includes('library/songs')) {
                Model.tracklist.type = supportedTracklistTypes.allSongsList;
                Model.tracklist.title = 'Added from YouTube Music';
            }
            else if (url.includes('library/uploaded_songs')) {
                Model.tracklist.type = supportedTracklistTypes.allSongsList;
                Model.tracklist.title = 'Uploaded Songs';
                //Model.tracklist.type = supportedTracklistTypes.uploadsList;
            }
        }
        //Else, if the URL indicates the current app/site is Google Play Music...
        else if (url != null && url.includes('play.google.com/music') == true) {
            //Make a record of the current app for future reference
            Model.tab.app = supportedApps.googlePlayMusic;

            //Make a record of the current tracklist type based on certain URL conditions
            if (url.includes('#/pl')) {
                Model.tracklist.type = supportedTracklistTypes.playlist;
            } 
            else if (url.includes('#/ap')) {
                Model.tracklist.type = supportedTracklistTypes.autoPlaylist;
            }
            else if (url.includes('#/tgs')) {
                Model.tracklist.type = supportedTracklistTypes.genreList;
                const _splitUrl = url.split("/");
                const _genre = _splitUrl[_splitUrl.length-1];
                Model.tracklist.title = _genre; //Make a record of the tracklist title
            }
            else if (url.includes('#/all')) {
                Model.tracklist.type = supportedTracklistTypes.allSongsList;
            }
        }
        else {
            triggerUITransition('UrlInvalid');
        }
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
        ViewRenderer.showTitle(Model.tracklist.title);

        ViewRenderer.showLandingPage();
    }

    export function triggerUITransition(transition) {
        if (transition === 'UrlInvalid') {
            ViewRenderer.showStatusMessage('The current URL is not supported by this extension.');
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
            //ViewRenderer.showScrapeCompletedPage();
            ViewRenderer.hideElement(ViewRenderer.divs.status);
            ViewRenderer.unhideElement(ViewRenderer.divs.buttons);
            ViewRenderer.unhideElement(ViewRenderer.divs.checkboxes);
            ViewRenderer.unhideElement(ViewRenderer.divs.tracktables);
            ViewRenderer.enableElement(ViewRenderer.buttons.scrape);
            ViewRenderer.enableElement(ViewRenderer.buttons.exportScrapedMetadata);
            ViewRenderer.enableElement(ViewRenderer.checkboxes.scrapedTracklist);
            ViewRenderer.enableElement(ViewRenderer.checkboxes.deltaTracklists);
        }
        else if (transition === 'ScrapeFailed') {
            ViewRenderer.showStatusMessage('Failed to retrieve track list.');
        }
        else if (transition === 'ShowComparison') {
            ViewRenderer.hideScrapeCompletedPage();
            ViewRenderer.showComparisonPage();
        }
        else if (transition === 'screen_Tracklist') {
            ViewRenderer.hideScrapeCompletedPage();
            ViewRenderer.displayScreen_Tracklist();
        }
    }

    //TODO: Future note: If it's possible to go back and re-scrape, doing another scrape should remove (or replace?) any existing scraped tracklist tables, including from ViewRenderer's tracker object
    export function createTracklistTable(tracklist, parentElement, header, descriptionIfEmpty) {

        //TODO Should all or some of this be done in ViewRenderer instead?

        //TODO it seems that the parent element is always going to be the same. 
            //Is it really necessary to pass it as a parameter?
            //Could at least make it optional
                //Actually it's different for the delta track tables, but still, it *could* be an optional param.

        //TODO clean up tracklist/tracktable terminology
        const _columnsToIncludeInTrackTable = [
            'Title',
            'Artist',
            'Album',
            'Duration',
            'Unplayable' //TODO This is currently hard-coded. Should eventually be a param, probably. Although it would be good to have a default set of keys to fall back to.
        ];

        const _header = window.Utilities.CreateNewElement('p'/*, {attributes:{class:'trackTableWrapper'}}*/);
        _header.textContent = header;

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
                if (typeof tracklist[i] === 'object' && tracklist[i] !== null) { //TODO added this null check temporarily as a work-around, but would prefer a better long-term solution
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
                            if (typeof _trackMetadatum === 'string' || _trackMetadatum === true) {
                                //Create a new data cell for the track's metadatum
                                _td = document.createElement('td');
                                _td.textContent = _trackMetadatum;
                                //Add the new cell to the track's row
                                _tr.appendChild(_td);
                            }
                            else {
                                DebugController.logInfo("A piece of track metadata was encountered that is neither a string value nor equal to 'true' and so it was skipped over. This is normal in the case of the 'Unplayable' column, but otherwise could indicate that an issue was encountered. Current column is: " + _columnsToIncludeInTrackTable[j]);
                            }
                        }
                    }
                }
                else if (tracklist[i] === null) {
                    DebugController.logInfo("Encountered a null reference in the tracklist array. Skipping over it as this indicates it should be omitted from the track table.");
                }
                else {
                    DebugController.logError("Expected an object containing track metadata or null. Instead found: " + tracklist[i] + ". Current index in array: " + i + ". Tracklist: ");
                    console.table(tracklist);
                }
            }
        }

        const _tableWrapper = window.Utilities.CreateNewElement('div', {attributes:{class:'trackTableWrapper'}, children:[_table]});
        const _tableWithHeader = window.Utilities.CreateNewElement('div', {children:[_header, _tableWrapper]});
        //const _tracklistTablesDiv = document.getElementById('divTracklistsAndAnalysis');
        //_tracklistTablesDiv.appendChild(_tableWrapper);
        parentElement.appendChild(_tableWithHeader);
        return _tableWithHeader;
        //_tracklistTablesDiv.hidden = false;

        //const _numTracks = _table.childElementCount -1; //Exclude the header row to get the number of tracks

        // if (_numTracks > 0)
		// {
		// 	//_table.hidden = false;

		// 	const _header = document.getElementById(headerId);
		// 	const _description = document.getElementById(descriptionId);
			
		// 	if(typeof _header === 'object') { //TODO standardize usage of 'typeof' (i.e. typeof x vs typeof(x))
		// 		_header.textContent = _header.textContent.concat(" (" + count + ")");
		// 	}

		// 	if (typeof _description === 'object') {
		// 		_description.hidden = true;
		// 		//description.textContent = count + " Tracks";
		// 	}
		// }


    }

    function displayTracklistTable(list, tableId, headerId, descriptionId) {
		const _table = document.getElementById(tableId);
		var tr;
		var td;	

		var count = 0;
			
		for (var i = 0; i < list.length; i++)
		{
			if (list[i] == null)
			{
				continue;
			}

			count++;
			
			console.log(list[i].title);
			tr = document.createElement('TR');
			
			td = document.createElement('TD');
			td.textContent = i+1; 
			tr.appendChild(td);
			
			td = document.createElement('TD');
			td.textContent = list[i].title;
			tr.appendChild(td);
			
			td = document.createElement('TD');
			td.textContent = list[i].artist;
			tr.appendChild(td);
			
			td = document.createElement('TD');
			td.textContent = list[i].album;
			tr.appendChild(td);
			
			_table.appendChild(tr);
		}
		
		if (_table.childElementCount > 1)
		{
			_table.hidden = false;

			const _header = document.getElementById(headerId);
			const _description = document.getElementById(descriptionId);
			
			if(typeof _header === 'object') { //TODO standardize usage of 'typeof' (i.e. typeof x vs typeof(x))
				_header.textContent = _header.textContent.concat(" (" + count + ")");
			}

			if (typeof _description === 'object') {
				_description.hidden = true;
				//description.textContent = count + " Tracks";
			}
		}
	}

    export function createDeltaTracklistsGPM(scrapedTracklist) {
        //TODO why pass the parameter, when we can get the scraped tracklist from the Model right here?

        //Once the Google Play Music metadata for the current tracklist has been fetched...
        const _onGooglePlayMusicMetadataRetrieved = function(gpmTracklist) {
             
            // console.log("Here are the scraped and gpm tracklist arrays:");
            // console.table(scrapedTracklist);
            // console.table(gpmTracklist);

            for (var i = 0; i < scrapedTracklist.length; i++)
            {
                for (var j = 0; j < gpmTracklist.length; j++)
                {
                    if (scrapedTracklist[i] != null && gpmTracklist[j] != null && 
                        scrapedTracklist[i].title === gpmTracklist[j].title && scrapedTracklist[i].album === gpmTracklist[j].album && scrapedTracklist[i].duration === gpmTracklist[j].duration)
                    {
                        scrapedTracklist[i] = null;
                        gpmTracklist[j] = null;
                        break;
                    }
                }
            } //TODO OLD - removed track index wrong if there were duplicates

            //TODO need to pass appropriate class(es) to stylize the header (and maybe tracktable?)
            ViewRenderer.tracktables.deltas = window.Utilities.CreateNewElement('div');
            createTracklistTable(scrapedTracklist, ViewRenderer.tracktables.deltas, "Added Tracks");
            createTracklistTable(gpmTracklist, ViewRenderer.tracktables.deltas, "Removed Tracks");
            ViewRenderer.divs.tracktables.appendChild(ViewRenderer.tracktables.deltas);

            // ViewRenderer.tracktables.deltaAdded = createTracklistTable(scrapedTracklist, ViewRenderer.divs.tracktables, "Added Tracks");
            // ViewRenderer.tracktables.deltaRemoved = createTracklistTable(gpmTracklist, ViewRenderer.divs.tracktables, "Removed Tracks");
        };

        //Fetch the Google Play Music tracklist metadata from the Model and then execute the callback
        Model.getStoredMetadataGPM(_onGooglePlayMusicMetadataRetrieved);
    }

    function compareScrapedTracklistWithPreviousVersion(tracklist) {

        //Once the exported Google Play Music tracklist data has been loaded from a local file, convert it to a CSV file
        const _onGooglePlayMusicDataLoaded = function(tracklistsArray) {
            const _gpmTracklistKey = getTracklistKeyFromTracklistName(tracklistsArray, Model.tracklist.title);
            console.log('GPM Tracklist Key: ' + _gpmTracklistKey);
            console.log(tracklistsArray[_gpmTracklistKey]);

            //COMPARE DURATION OF TRACKS BEFORE AND AFTER
            //compareSecondsValuesBetweenTracklists(tracklistsArray[_gpmTracklistKey], tracklist);

            /* This code will output the total seconds as an integer instead of a duration string
            const _gpmTracklist = tracklistsArray[_gpmTracklistKey];
            for (let i = 0; i < _gpmTracklist.length; i++) { 
                _gpmTracklist[i].duration = convertDurationStringToSeconds(_gpmTracklist[i].duration);
            }

            for (let i = 0; i < tracklist.length; i++) { 
                tracklist[i].duration = convertDurationStringToSeconds(tracklist[i].duration);
            }

            downloadCurrentTracklistAsCSV(tracklist);

            const _keysToIncludeInExport = [
                'title',
                'artist',
                'album',
                'duration',
            ];

            convertArrayOfObjectsToCsv(_gpmTracklist, 'TracklistExport_Before', _keysToIncludeInExport);
            */

            //THEN, IF THE DIFFERENCE IS 0 or 1, don't include it in the 'keys to include? Hmm not sure how that would work
                //would have to have a dedicated "keys to include" per object, which seems really messy


            //convertArrayOfObjectsToCsv(tracklistsArray[_gpmTracklistKey], 'TracklistExport_Before', _keysToIncludeInExport);
        };

        //Send an XMLHttpRequest to load the exported GPM tracklist data from a local file, and then execute the callback
        sendRequest_LoadGooglePlayMusicExportData(_onGooglePlayMusicDataLoaded);
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



    //TODO NEW - Could consider only outputting the 'duration' if the difference between the before and after is more than 1 second. 
        //However, that would require us to do that comparison before hand, so would need quite a bit of extra logic. 
    // function convertDurationStringToSeconds(duration) {
    //     if (typeof(duration) == "string") {
    //         const _splitDurationString = duration.split(':');

    //         if (_splitDurationString.length == 1) {
    //             return parseInt(_splitDurationString[0]);
    //         }
    //         else if (_splitDurationString.length == 2) {
    //             return parseInt(_splitDurationString[0])*60+parseInt(_splitDurationString[1]);
    //         }
    //         else { //TODO Note that currently songs with a duration of an hour or longer may not be properly supported
    //             console.log("ERROR: Tried to convert a duration string into a seconds integer value, but the duration string was not in the correct MM:SS format");
    //         }
    //     }
    //     else {
    //         console.log("ERROR: Tried to convert a duration string into a seconds integer value, but the duration provided was not in string format.");
    //     }
    // }

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

    //TODO this could go in a GPM Utilities file or something like that
        //It doesn't make sense for a general utilities section
    /**
     * Gets the tracklist key that corresponds to the given tracklist name within the provided array
     * @param {array} tracklistArray The array within which to search
     * @param {string} tracklistName The name of the tracklist to search for
     */
     function getTracklistKeyFromTracklistName(tracklistArray, tracklistName) {
        for (let key in tracklistArray) {
            if (key.includes("'" + tracklistName + "'")) {
                return key;
            }
        }
        console.log("ERROR: Tried to get a tracklist key from its name, but no matching key could be found.");
    }

    //TODO Move this out of the general Utilities section and into somewhere more applicable
        //This one could maybe go into the storage manager?
    function sendRequest_LoadGooglePlayMusicExportData(callback) {
        const _filepath = "ExportedData/LocalStorageExport_2020-10-12-10-30PM_ThumbsUpDuplicatedAsYourLikes.txt";
        IO.loadTextFileViaXMLHttpRequest(_filepath, callback, true)
    }

    return {
        FadeIn: fadeIn,
        GetElement: getElement,
        CreateNewElement: createNewElement,
        GetTracklistKeyFromTracklistName: getTracklistKeyFromTracklistName,
        SendRequest_LoadGooglePlayMusicExportData: sendRequest_LoadGooglePlayMusicExportData
    };
})();

window.Utilities.FadeIn(document.body, init, 500);

export {prepareLandingPage, displayTracklistTable, downloadCurrentTracklistAsCSV, downloadGooglePlayMusicTracklistAsCSV};