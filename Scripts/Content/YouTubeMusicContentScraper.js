'use strict';
(function() {
    let currentApp = null;

    const elementsInDOM = {
        scrollContainer: {
            ytm: document.body
        },
        playlistName: {
            ytm: document.querySelector('#header .metadata yt-formatted-string.title')
        },
        playlistTrackCount: {
            ytm: document.querySelector('#header .metadata .second-subtitle span')
        },
        trackRowContainer: {
            ytm: document.querySelector("[main-page-type='MUSIC_PAGE_TYPE_PLAYLIST'] div#contents ytmusic-playlist-shelf-renderer div#contents")
        }
    };

    function TrackMetadata(trackRowElement) {
        const _trackTitleElement = trackRowElement.querySelector('div.title-column yt-formatted-string.title');
        if (_trackTitleElement != null) {
            this.title = _trackTitleElement.title;
        }
        else {
            console.log("ERROR: Track title could not be retrieved from DOM.");
        }

        const _trackArtistElement = trackRowElement.querySelectorAll('div.secondary-flex-columns yt-formatted-string')[0];
        if (_trackArtistElement != null) {
            this.artist = _trackArtistElement.title;
        }
        else {
            console.log("ERROR: Track artist could not be retrieved from DOM.");
        }

        const _trackAlbumElement = trackRowElement.querySelectorAll('div.secondary-flex-columns yt-formatted-string')[1];
        if (_trackAlbumElement != null) {
            this.album = _trackAlbumElement.title;
        }
        else {
            console.log("ERROR: Track album could not be retrieved from DOM.");
        }

        const _trackDurationElement = trackRowElement.querySelector('div.fixed-columns yt-formatted-string');
        if (_trackDurationElement != null) {
            this.duration = _trackDurationElement.title;
        }
        else {
            console.log("ERROR: Track duration could not be retrieved from DOM.");
        }

        //If the track row element has an unplayable flag, record the track as being unplayable
        if (trackRowElement.attributes.unplayable_ != undefined) { //Note: <if (trackRowElement.unplayable_ == true)> should work but it doesn't for some reason
            this.unplayable = true;
            console.log("Found an unplayable track called: " + this.title);
        }
    }

    chrome.runtime.onMessage.addListener(
        function(message, sender, sendResponse) {
            console.log(sender.tab ? 'Message received from a content script:' + sender.tab.url : 'Message received from the extension: ' + message.greeting); 

            if (message.greeting == 'RecordCurrentApp') {
                processMessage_RecordCurrentApp(message.app, sendResponse);
            }
            if (message.greeting == 'GetTracklistName') {   
                processMessage_GetTracklistName(sendResponse);
            }
            else if (message.greeting == 'GetTrackList') {
                processMessage_GetTracklist(sendResponse);
            }
            
            //Return true to keep the message channel open
            return true;
        }
    );

    /**
     * Sets the current app to the parameter provided and then executes the provided callback function
     * @param {string} app The reference string for the current app being used
     * @param {function} sendResponse The function to execute once the current app has been recorded
     */
    function processMessage_RecordCurrentApp(app, sendResponse) {
        if (app != null) {
            currentApp = app;
            sendResponse();
        }
        else {
            console.log("ERROR: Received request to record the current app, but no valid app parameter was provided.");
        }
    }

    /**
     * Gets the current tracklist name from the DOM and then executes the provided callback function
     * @param {function} sendResponse The function to execute once the tracklist name has been retrieved
     */
    function processMessage_GetTracklistName(sendResponse) {
        const _tracklistNameElement = elementsInDOM.playlistName[currentApp];
        
        if (_tracklistNameElement != null) {
            console.log("Tracklist name is: " + _tracklistNameElement.textContent)
            sendResponse({tracklistName:_tracklistNameElement.textContent});
        }
        else {
            console.log("ERROR: Received request to get the tracklist name, but it failed to be retrieved from the DOM.");
        }
    }

    //TODO NEW - Much of this logic (and the TrackMetadata constructor) could be handled in a logic script instead of in the content script
        //That would probably make more sense, to limit the content script to really just extracting the raw data required
    /**
     * Perform the scroll and scrape process to get the current tracklist and then execute the provided callback function
     * @param {function} sendResponse The function to execute once the tracklist has been retrieved
     */
    function processMessage_GetTracklist(sendResponse)
    {
        //Scroll to the top of the tracklist, as an extra safety measure just to be certain that no tracks are missed in the scrape
        scrollToElement(elementsInDOM.playlistName[currentApp]);
        
        const _trackRowContainer = elementsInDOM.trackRowContainer[currentApp];
        const _trackCount = getPlaylistTrackCount();
        let _tracklist = [];

        const _onScrollComplete = function() {
            //For each track row loaded in the DOM...
            for (let i = 0; i < _trackRowContainer.childElementCount; i++) {                
                _tracklist.push(new TrackMetadata(_trackRowContainer.children[i])); 
            }

            sendResponse({tracklist:_tracklist});
        };
        
        //Wait a short amount of time to allow the page to scroll to the top of the tracklist, and then start the scroll and scrape process
        setTimeout(scrollToEndOfTracklist(_trackRowContainer, _trackCount, _onScrollComplete), 500);
    }

    function getPlaylistTrackCount() {
        //Get the track count string from the DOM element and split off the trailing text after the actual number
        const _trackCountString = elementsInDOM.playlistTrackCount[currentApp].textContent.split(" ")[0];

        //Remove any commas from the track count string (e.g. for counts > 999), and then get the count value as an integer
        const _trackCount = parseInt(_trackCountString.replace(/,/g, ""));
        
        console.log('Current playlist\'s track count is %s.', _trackCount);
        return _trackCount;
    }

    /**
     * Scrolls the page such that the given element is in view
     * @param {element} element The DOM element to scroll to
     */
    function scrollToElement(element) {
        if (element != null) {
            element.scrollIntoView(true);
        }
        else {
            //TODO would be good to set up a DebugController to better handle warnings, errors, etc.
            console.log('There is no element to scroll to');
        }
    }

    /*
    function zoomOut(enabled) {
        //TODO style.zoom is deprecated (but still works). Could switch to using style.transform = 'scale(.x,.x)', but this actually seems to work less well.
        if (enabled == true) {
            document.body.style.zoom= '.25';
            //toggleScrolling(false);
        }
        else {
            document.body.style.zoom= '1';
            //toggleScrolling(true);
        }
    }
    */

    /**
     * Sets whether or not the user should be able to scroll manually in the page
     * @param {boolean} enabled Indicates whether or not manual scrolling should be allowed. Defaults to true, meaning the user can scroll manually.
     */
    function allowManualScrolling(enabled=true) {
        const _container = elementsInDOM.scrollContainer[currentApp];

        //If a valid container element was found...
        if (_container != null) {
            //If manual scrolling should be enabled (which is the default), set to 'auto', otherwise set to 'hidden'
            if (enabled == true) {
                _container.style.overflowY = 'auto';
            }
            else {
                _container.style.overflowY = 'hidden';
            }
        }
        else {
            console.log('Error: The scroll container for the page could not be found.');
        }
    }

    /**
     * Initiates an automatic scrolling process which will complete once the end of the current tracklist is reached
     * @param {element} trackRowContainer The DOM element that contains all the track row elements
     * @param {number} trackCount The official track count of the tracklist, used to know when the end of the list has been reached
     * @param {function} callback The function to execute once the end of the tracklist has been reached
     */
    function scrollToEndOfTracklist(trackRowContainer, trackCount, callback)
    {  
        //Temporarily disable manual scrolling to avoid any interference from the user during the scrape process
        allowManualScrolling(false);

        const _scrollInterval = setInterval(
            function() {
                //If the number of child elements in the track row container matches the track count of the list...
                if (trackRowContainer.childElementCount == trackCount) {
                    console.log('Finished scrolling to the end of the track list');
                   
                    //Stop the scrolling process
                    clearInterval(_scrollInterval);

                    //Allow the user to scroll manually again
                    allowManualScrolling(true);

                    //Execute the provided callback function
                    callback();
                }
                //Otherwise, scroll to the last child element in the track row container
                else {
                    console.log("Still Srolling. Track Row Container Child Count: " + trackRowContainer.childElementCount);
                    scrollToElement(trackRowContainer.children[trackRowContainer.childElementCount-1]);
                }
            },
            1500
        );
    }
})();