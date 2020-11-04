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

window.YouTubeMusicFlowController = (function() {

    function initializeYouTubeMusicFlow(currentTab) {
        //Store the current tab for future reference
        TabManager.SetTab(currentTab);

        //Once the tracklist name is acquired from a content script, prepare the popup's landing page
        const _onTracklistNameAcquired = function() {
            prepareLandingPageForYouTubeMusic();
        };

        //Get the tracklist name from a content script and then execute the passed callback function
        getTracklistNameForYouTubeMusic(_onTracklistNameAcquired);
    }

    function getTracklistNameForYouTubeMusic(callback) {
    
        //Assign the greeting that will be sent to the content script
        let _greeting = 'greeting_ytm_GetTracklistName_Playlist';

        //When a response is received from the content script, store the tracklist's name and execute the callback function
        const _onMessageResponseReceived = function(tracklistName) {
            console.log('Current playlist\'s name is %s.', tracklistName);
            TabManager.SetPlaylistName(tracklistName);
            callback();
        };

        //Send the message to the content script, passing along the greeting and callback
        window.Utilities.SendMessageToContentScripts(_greeting, _onMessageResponseReceived);
    }

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
			'greeting_ytm_GetTrackList',
			function(trackList)
			{
				if (trackList == null)
				{
					window.ViewRenderer.ShowStatusMessage('Failed to retrieve track list.');
					return;
                }
                else {
                    window.ViewRenderer.ShowStatusMessage('Tracklist retrieved. Wouldnt you like to see it?');
                    console.log("Here's the tracklist, maybe:");
                    console.log(trackList);
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
    
    function sendMessageToContentScripts(greeting, callback) {	
		chrome.tabs.sendMessage(
			TabManager.GetTab().id, 
			{greeting: greeting}, 
			function(response) {
				callback(response); 
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



