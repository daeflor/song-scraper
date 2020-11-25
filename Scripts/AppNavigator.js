'use strict';
document.addEventListener('DOMContentLoaded', function() { window.Utilities.FadeIn(document.getElementById('popup'), init, 500) } );					

function init() {
	//Query for the Active Tab...
	chrome.tabs.query(
		{ 
			active: true, 
			currentWindow: true
		}, 
		function(tabs) {	
			//Get the URL from the active tab
			const url = tabs[0].url;
			console.assert(typeof url == 'string', 'tab.url should be a string');

			//If the URL matches a YouTube Music playlist URL...
			if (url.indexOf('https://music.youtube.com/playlist?list=') > -1) {
                //Go through the YouTube Music flow    
                console.log('Initiating YTM Flow');
                YouTubeMusicFlowController.InitializeYouTubeMusicFlow(tabs[0]);
			}
			else {
                //Go through the legacy Google Play Music flow
                console.log('Initiating GPM Flow');
				GooglePlayMusicFlowController.PreparePopup();
			}
		}
	);
}

//TODO NEW - currently, if you switch to a different tracklist without refreshing the page, it won't recognize that the tracklist has changed
window.YouTubeMusicFlowController = (function() {

    const supportedApps = {
        youtubeMusic: 'ytm'
    };

    function initializeYouTubeMusicFlow(currentTab) {
        //Store the current tab for future reference
        TabManager.SetTab(currentTab);

        //Send a message to the content script to make a record of the current app 
        sendMessage_RecordCurrentApp();


        //sendMessage_RecordCurrentApp(sendMessage_GetTracklistName.bind(null, prepareLandingPageForYouTubeMusic));

        // //Once the tracklist name is acquired from a content script, prepare the popup's landing page
        // const _onTracklistNameAcquired = function() {
        //     prepareLandingPageForYouTubeMusic();
        // };

        // //Get the tracklist name from a content script and then execute the passed callback function
        // getTracklistNameForYouTubeMusic(_onTracklistNameAcquired);
    }

    function sendMessage_RecordCurrentApp() {
        //Send a message to the content script to make a record of the current app
        const _message = {greeting:'RecordCurrentApp', app:supportedApps.youtubeMusic};
        window.Utilities.SendMessageToContentScripts(_message, processResponse_RecordCurrentApp);
    }

    function processResponse_RecordCurrentApp() {
        //Send a message to the content script to get the name of the current tracklist
        sendMessage_GetTracklistName();
        //TODO NEW - Does it make sense to call a sendMessage here?
    }

    function sendMessage_GetTracklistName() {
        //Send a message to the content script to get the tracklist name
        let _message = {greeting:'GetTracklistName'};
        window.Utilities.SendMessageToContentScripts(_message, processResponse_GetTracklistName);
    }

    function processResponse_GetTracklistName(response) {
        //Store the tracklist's name
        console.log('Current playlist\'s name is %s.', response.tracklistName);
        TabManager.SetPlaylistName(response.tracklistName);

        //Prepare the YouTube Music extension popup landing page
        prepareLandingPageForYouTubeMusic();
    }

    // function getTracklistNameForYouTubeMusic(callback) {
    
    //     //Assign the greeting that will be sent to the content script
    //     let _greeting = 'greeting_ytm_GetTracklistName_Playlist';

    //     //When a response is received from the content script, store the tracklist's name and execute the callback function
    //     const _onMessageResponseReceived = function(tracklistName) {
    //         console.log('Current playlist\'s name is %s.', tracklistName);
    //         TabManager.SetPlaylistName(tracklistName);
    //         callback();
    //     };

    //     //Send the message to the content script, passing along the greeting and callback
    //     window.Utilities.SendMessageToContentScripts(_greeting, _onMessageResponseReceived);
    // }

    function prepareLandingPageForYouTubeMusic()
    {
        window.ViewRenderer.HideStatusMessage();
        window.ViewRenderer.ShowTitle(TabManager.GetPlaylistName());

        document.getElementById('buttonComparePlaylist').textContent = "Scrub!";
        document.getElementById('buttonComparePlaylist').onclick = initiateTrackScraper;

        window.ViewRenderer.ShowLandingPage();
    }

    function initiateTrackScraper()
	{		
        window.ViewRenderer.DisableElement('buttonComparePlaylist');
		window.ViewRenderer.HideLandingPage();
		window.ViewRenderer.ShowStatusMessage('Song list comparison in progress.');

		window.Utilities.SendMessageToContentScripts(
			{greeting:'GetTrackList'},
			function(response)
			{
				if (response.tracklist == null)
				{
					window.ViewRenderer.ShowStatusMessage('Failed to retrieve track list.');
					return;
                }
                else {
                    window.ViewRenderer.ShowStatusMessage('Tracklist retrieved. Wouldnt you like to see it?');
                    console.log("Here's the tracklist, maybe:");
                    console.log(response.tracklist);

                    downloadGooglePlayMusicTracklistAsCSV();
                    downloadCurrentTracklistAsCSV(response.tracklist);

                    //compareScrapedTracklistWithPreviousVersion(response.tracklist);

					return;
                }

				// FadeTransition //when the tracklist has been collected, begin the fade transition
				// (
				// 	function() //when the fade transition has completed...
				// 	{
				// 		HideStatusMessage();
				// 		ShowComparisonPage();
				// 		ShowTrackLists();
				// 		ShowBackButton();
				// 		StoreObjectInLocalNamespace(TabManager.GetKey(), trackList);
				// 	}
				// );
			}
		);
    }

    function compareScrapedTracklistWithPreviousVersion(tracklist) {

        //Once the exported Google Play Music tracklist data has been loaded from a local file, convert it to a CSV file
        const _onGooglePlayMusicDataLoaded = function(tracklistsArray) {
            const _gpmTracklistKey = getTracklistKeyFromTracklistName(tracklistsArray, TabManager.GetPlaylistName());
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

        const _filename = 'TracklistExport_After_' + TabManager.GetPlaylistName();

        convertArrayOfObjectsToCsv(tracklist, _filename, _keysToIncludeInExport);
    }

    function downloadGooglePlayMusicTracklistAsCSV() {
        //The object keys to include when outputting the GPM track data to CSV
        const _keysToIncludeInExport = [
            'title',
            'artist',
            'album',
            'duration',
            'unplayable' //TODO This is currently hard-coded. We probably should only pass one copy of _keysToIncludeInExport per 'comparison' so that the two csv files match
        ];

        //Once the exported Google Play Music tracklist data has been loaded from a local file, convert it to a CSV file
        const _onGooglePlayMusicDataLoaded = function(tracklistsArray) {
            const _gpmTracklistKey = getTracklistKeyFromTracklistName(tracklistsArray, TabManager.GetPlaylistName());
            console.log('GPM Tracklist Key: ' + _gpmTracklistKey);
            console.log(tracklistsArray[_gpmTracklistKey]);

            const _filename = 'TracklistExport_Before_' + TabManager.GetPlaylistName();

            convertArrayOfObjectsToCsv(tracklistsArray[_gpmTracklistKey], _filename, _keysToIncludeInExport);
        };

        //Send an XMLHttpRequest to load the exported GPM tracklist data from a local file, and then execute the callback
        sendRequest_LoadGooglePlayMusicExportData(_onGooglePlayMusicDataLoaded);
    }

    function sendRequest_LoadGooglePlayMusicExportData(callback) {
        const _filepath = "ExportedData/LocalStorageExport_2020-10-12-10-30PM.txt";
        loadTextFileViaXMLHttpRequest(_filepath, callback, true)
    }

    //TODO NEW - this should take a tracklist key to be more general. Right now it only works for the current playlist which is unclear
    // function downloadTracklistAsCsv(tracklistArray)
    // {
    //     const _gpmTracklistKey = getTracklistKeyFromTracklistName(tracklistArray, TabManager.GetPlaylistName());
    //     console.log('GPM Tracklist Key: ' + _gpmTracklistKey);
    //     console.log(tracklistArray[_gpmTracklistKey]);

    //     convertArrayOfObjectsToCsv(tracklistArray[_gpmTracklistKey]);
    // }

    /**
     * Loads text data from a file via XMLHttpRequest and then executes the provided callback function
     * @param {string} filepath The path of the file to load
     * @param {function} callback The function to execute once the data has been successfully loaded from the file
     * @param {boolean} [parseJSON] Indicates whether or not the loaded text data should be parsed into JSON before being returned. Defaults to true.
     */
    function loadTextFileViaXMLHttpRequest(filepath, callback, parseJSON=true) {
        const xmlhttp = new XMLHttpRequest();

        //Once the data has been succssfully loaded from the file, either return the raw text data or the parsed JSON
        xmlhttp.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                const _result = (parseJSON == true) ? JSON.parse(this.responseText) : this.responseText;
                callback(_result);
            }
        };
        xmlhttp.open("GET", filepath, true);
        xmlhttp.send();
    }

    //TODO this could go in a GPM Utilities file or something like that
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
    }

     /**
     * Creates a row of comma-separated strings from the provided array
     * @param {array} columnValues An array of the column values to use to create a row for a CSV file
     */
    function createCsvRow(columnValues) {
        if (columnValues != null) { 
            let _row = ''; //Start with a blank string for the row

            //For each column except for the last one...
            for (let i = 0; i < columnValues.length-1; i++) {
                //If the value type for this column is a string...
                if (typeof(columnValues[i]) == 'string') {
                    //Include double-quotes around the output string, followed by a comma to indicate the end of the column
                    _row += '"' + columnValues[i] + '",';
                }
                //Otherwise, output the value without quotes, followed by a comma to indicate the end of the column
                else {
                    _row += columnValues[i] + ',';
                }
            }

            //Add the last column value to the row, followed by a newline character to indicate the end of the row
            _row += columnValues[columnValues.length-1] + '\r\n';

            return _row;
        }
        else {
            console.log("ERROR: Request received to create a CSV row but an array of column values was not provided.");
        }
    }
    
    /**
     * Converts an array of objects to a CSV file and then downloads the file locally
     * @param {array} array An array of object to convert to CSV
     * @param {string} filename The name of the file to download
     * @param {array} [objectKeysToInclude] An optional array to indicate the specific object keys which should be included in the CSV, and the order in which to output them. If none is provided, all keys for every object will be outputted.
     */
    function convertArrayOfObjectsToCsv(array, filename, objectKeysToInclude=null) {
        let _csv = ''; //Begin with a blank string for the CSV
        
        //If a list of object keys to include was provided, use that to set up a header row for the CSV file
        if (objectKeysToInclude != null) {
            _csv += createCsvRow(objectKeysToInclude);
        }

        //For each object in the array...
        for (let i = 0; i < array.length; i++) {
            const _currentObject = array[i]; //For better readability, track the current object in the objects array
            let _valuesInCurrentObject = []; //Create an array to contain all the values for the current object that are going to be included in the CSV

            //If a list of specific keys to use wasn't provided, use all of the object's keys
            objectKeysToInclude = objectKeysToInclude || Object.keys(_currentObject);

            //For each key that should be included in the CSV output...
            for (let j = 0; j < objectKeysToInclude.length; j++) { 
                //If the value that matches the current key isn't falsy (e.g. undefined), use that value, otherwise set it to a blank string so that the column is still included in the CSV row later
                const _currentValue = _currentObject[objectKeysToInclude[j]] || '';
                //Add the key's value to the array of values to include in the CSV row later
                _valuesInCurrentObject.push(_currentValue);      
            }

            //Create a CSV row from the array of recorded values and append the resulting string to the CSV string
            _csv += createCsvRow(_valuesInCurrentObject);
        }

        //Once the CSV is prepared, create a new link DOM element to use to trigger a download of the file locally
        const _link = document.createElement('a');
        _link.id = 'download-csv';
        _link.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(_csv));
        _link.setAttribute('download', filename+'.csv');
        document.body.appendChild(_link); //Add the link element to the DOM
        _link.click(); //Trigger an automated click of the link to download the CSV file
        _link.remove(); //Remove the temporary link element from the DOM
    }

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

    return {
        InitializeYouTubeMusicFlow: initializeYouTubeMusicFlow
    };
})();

window.Utilities = (function() {

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
                window.ViewRenderer.SetElementOpacity(element, _currentOpacityLevel);
                
                //If the current opacity level is 1 then the fade-in is complete, so clear the interval/timer and execute the provided callback function
				if (_currentOpacityLevel == 1) {
					window.clearInterval(_fadeInterval);
                    
                    //TODO can we abstract all the null checks for all the callbacks? 
					if(typeof callback !== "undefined") { 
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
    
    /**
     * Sends a message to content scripts and then handles the provided callback response
     * @param {object} message  A JSON-ifiable object to send as a message
     * @param {function} callback The function to call when a response has been received
     */
    function sendMessageToContentScripts(message, callback) {	
		chrome.tabs.sendMessage(
			TabManager.GetTab().id, 
			message, 
			function(response) {
                //If an error occurred during the message connection, print an error
                if(chrome.runtime.lastError) {
                    console.log('ERROR: An error occurred during the message connection: ' + chrome.runtime.lastError);
                    return;
                }
                //Otherwise excute the provided callback function
                else {
                    callback(response); 
                }
			}
		);
	}

    return {
        FadeIn: fadeIn,
        SendMessageToContentScripts: sendMessageToContentScripts
    };
})();

window.ViewRenderer = (function() {

    function disableElement(id) {
        document.getElementById(id).disabled = true;
    }
    
    function hideStatusMessage() {
        document.getElementById('status').hidden = true;
    }

    function setElementOpacity(element, targetOpacity)
    {
        element.style.opacity = targetOpacity;
    }

    function showLandingPage() {
		//document.getElementById('popup').style.minHeight = '250px';
		document.getElementById('landingPage').hidden = false;
    }
    
    function hideLandingPage() {
		document.getElementById('landingPage').hidden = true;
    }
    
    function showStatusMessage(text) {
		document.getElementById('status').textContent = text;
		document.getElementById('status').hidden = false;
	}

    function showTitle(title) {
		document.getElementById('title').textContent = title;
		document.getElementById('title').hidden = false;
	}

    return {
        DisableElement: disableElement,
        HideStatusMessage: hideStatusMessage,
        SetElementOpacity: setElementOpacity,
        ShowLandingPage: showLandingPage,
        HideLandingPage: hideLandingPage,
        ShowStatusMessage: showStatusMessage,
        ShowTitle: showTitle
    };
})();