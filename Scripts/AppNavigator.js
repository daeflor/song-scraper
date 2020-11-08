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

    function downloadCurrentTracklistAsCSV(tracklist) {
        //The object keys to include when outputting the tracklist data to CSV
        const _keysToIncludeInExport = [
            'title',
            'artist',
            'album',
            'duration',
            'unplayable'
        ];

        convertArrayOfObjectsToCsv(tracklist, 'TracklistExport_After', _keysToIncludeInExport);
    }

    function downloadGooglePlayMusicTracklistAsCSV() {
        //The object keys to include when outputting the GPM track data to CSV
        const _keysToIncludeInExport = [
            'title',
            'artist',
            'album',
            'duration',
        ];

        //Once the exported Google Play Music tracklist data has been loaded from a local file, convert it to a CSV file
        const _onGooglePlayMusicDataLoaded = function(tracklistsArray) {
            const _gpmTracklistKey = getTracklistKeyFromTracklistName(tracklistsArray, TabManager.GetPlaylistName());
            console.log('GPM Tracklist Key: ' + _gpmTracklistKey);
            console.log(tracklistsArray[_gpmTracklistKey]);

            convertArrayOfObjectsToCsv(tracklistsArray[_gpmTracklistKey], 'TracklistExport_Before', _keysToIncludeInExport);
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
            //TODO NEW - This might not always work, or at least isn't reliable. For example Jams & Jams in Library
            if (key.includes(tracklistName)) {
                return key;
            }
        }
    }
    
    /**
     * Converts an array of objects to a CSV file and then downloads the file locally
     * @param {array} array An array of object to convert to CSV
     * @param {string} filename The name of the file to download
     * @param {array} [objectKeysToInclude] An optional array to indicate the specific object keys which should be included in the CSV, and the order in which to output them. If none is provided, all keys for every object will be outputted.
     */
    function convertArrayOfObjectsToCsv(array, filename, objectKeysToInclude=null) {
        //Begin with a blank string for the CSV
        let _csv = '';

        //For each object in the array...
        for (let i = 0; i < array.length; i++) {
            const _currentObject = array[i];

            //If a list of specific keys to use wasn't provided, use all of the object's keys
            objectKeysToInclude = objectKeysToInclude || Object.keys(_currentObject);

            //For each object key in the 'include' list...
            for (let j = 0; j < objectKeysToInclude.length; j++) {
                
                //If this isn't the first key in the list
                if (j > 0) {
                    //If this isn't the the last key in the list, or if the value for the key exists...
                    if (j < objectKeysToInclude.length-1 || (typeof(_currentObject[objectKeysToInclude[j]]) != 'undefined')) {
                        //Append a comma to the CSV before adding the next value (i.e. don't append a comma if this is the last key AND the value is undefined)
                        _csv += ',';
                    }
                }
                    
                //If the value type for this key is a string, include double-quotes around the output
                if (typeof(_currentObject[objectKeysToInclude[j]]) == 'string') {
                    _csv += '"' + _currentObject[objectKeysToInclude[j]] + '"';
                }
                //Otherwise, assuming he value type for this key is not undefined, output the value without quotes
                else if (typeof(_currentObject[objectKeysToInclude[j]]) != 'undefined'){
                    _csv += _currentObject[objectKeysToInclude[j]];
                }
            }

            //Once all the values for the current object have been added to the CSV, append a newline character
            _csv += '\r\n';

            //TODO NEW - Could consider only outputting the 'duration' if the difference between the before and after is more than 1 second. 
                //However, that would require us to do that comparison before hand, so would need quite a bit of extra logic. 
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