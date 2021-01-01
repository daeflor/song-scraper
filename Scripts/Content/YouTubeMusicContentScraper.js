//TODO should rename this file to remove YouTubeMusic from it

'use strict';
(function() {
    //let currentApp = null; //TODO maybe just pass this as a param after all

    const elementsInDOM = {
        scrollContainer: {
            ytm: function() {return document.body;},
            gpm: function() {return document.querySelectorAll('.paper-header-panel')[1]}
        },
        playlistName: {
            ytm: function() {return document.querySelector('#header .metadata yt-formatted-string.title');},
            gpm: function() {return document.querySelector('div.title-row h2');}
        },
        playlistTrackCount: { //TODO There was a typo here, in the attribute check
            ytm: function() {return document.querySelector('div#header div.metadata yt-formatted-string.second-subtitle span');},
            gpm: function() {return document.querySelector('span[slot="metadata"]').children[0];}
        },
        yourLikesTrackCount: {
            ytm: function() {return document.querySelector('div#header div.metadata yt-formatted-string.second-subtitle');},
            gpm: function() {return document.querySelector('span[slot="metadata"]').children[0];}
        },
        trackRowContainer: {
            ytm: function() {return document.querySelector("ytmusic-section-list-renderer[main-page-type='MUSIC_PAGE_TYPE_PLAYLIST'] div#contents ytmusic-playlist-shelf-renderer div#contents");},
            gpm: function() {return document.querySelector('tbody');}
        }
    };

    //TODO this seems duplicated with the tracklist.type in AppNavigator. They seem reduntant.
    //TODO the urlPart could probably be omitted without issue
    const urlProperties = {
        ytm: {
            urlPart: 'search',
            playlistUrlCondition: '?list=PL',
            yourLikesUrlCondition: '?list=LM'
        },
        gpm: {
            urlPart: 'hash',
            playlistUrlCondition: '#/pl/',
            yourLikesUrlCondition: '#/ap/'
        }
    }

    // const urlProperties = {
    //     playlistUrlParameters: {
    //         ytm: {
    //             urlPart: 'search',
    //             condition: '?list=PL'
    //         }
    //     },
    //     yourLikesUrlParameters: {
    //         ytm: {
    //             urlPart: 'search',
    //             condition: '?list=LM'
    //         }
    //     }
    // }

    // const urlParts = {
    //     playlistUrlParameters: {
    //         ytm: '?list=PL',
    //         gpm: 'music/listen?u=0#/pl/'
    //     },
    //     yourLikesUrlParameters: { //TODO Maybe this should be renamed to autoPlaylistUrlParameters
    //         ytm: '?list=LM',
    //         gpm: 'music/listen?u=0#/ap/'
    //     }
    // }

//TODO perhaps individual scrapeTrackMetadatum_XX functions

    //TODO could/should probably just make this return an object
    //TODO should think of a more concise or clearer way of doing this while supporting multiple apps
    function TrackMetadata(app, trackRowElement) { //TODO maybe split this up into multiple TrackMetaData classes per app, and possibly move to a separate module?
        if (app === 'ytm') {
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

            //TODO for some reason this isn't working (the error message is printing), although it looks like it should work
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
        else if (app === 'gpm') {
            const _trackTitleElement = trackRowElement.querySelector('td[data-col="title"] span');
            if (_trackTitleElement != null) {
                this.title = _trackTitleElement.textContent;
            }
            else {
                console.log("ERROR: Track title could not be retrieved from DOM.");
            }

            const _trackArtistElement = trackRowElement.querySelector('td[data-col="artist"] .text');
            if (_trackArtistElement != null) {
                this.artist = _trackArtistElement.textContent;
            }
            else {
                console.log("ERROR: Track artist could not be retrieved from DOM.");
            }

            const _trackAlbumElement = trackRowElement.querySelector('td[data-col="album"] .text');
            if (_trackAlbumElement != null) {
                this.album = _trackAlbumElement.textContent;
            }
            else {
                console.log("ERROR: Track album could not be retrieved from DOM.");
            }

            const _trackDurationElement = trackRowElement.querySelector('td[data-col="duration"]');
            if (_trackDurationElement != null) {
                this.duration = _trackDurationElement.textContent;
            }
            else {
                console.log("ERROR: Track duration could not be retrieved from DOM.");
            } 
        }
    }

    chrome.runtime.onMessage.addListener(
        function(message, sender, sendResponse) {
            console.log(sender.tab ? 'Message received from a content script:' + sender.tab.url : 'Message received from the extension: ' + message.greeting); 

            const _onRequestComplete = function(response) {
                message.response = response;
                sendResponse(message);
            }

            if (message.greeting == 'GetTracklistTitle') {   
                processMessage_GetTracklistName(message.app, _onRequestComplete);
            }
            else if (message.greeting == 'GetTracklistMetadata') {
                processMessage_GetTracklistMetadata(message.app, _onRequestComplete);
            }
            
            //Return true to keep the message channel open
            return true;
        }
    );

    // /**
    //  * Sets the current app to the parameter provided and then executes the provided callback function
    //  * @param {string} app The reference string for the current app being used
    //  * @param {function} sendResponse The function to execute once the current app has been recorded
    //  */
    // function processMessage_RecordCurrentApp(app) {
    //     if (app != null) {
    //         currentApp = app;
    //     }
    //     else {
    //         console.log("ERROR: Received request to record the current app, but no valid app parameter was provided.");
    //     }
    // }

    /**
     * Gets the current tracklist name from the DOM and then executes the provided callback function
     * @param {string} app the current app that the extension is running on
     * @param {function} sendResponse The function to execute once the tracklist name has been retrieved
     */
    function processMessage_GetTracklistName(app, callback) {
        const _tracklistNameElement = elementsInDOM.playlistName[app]();
        
        if (_tracklistNameElement != null) {
            console.log("Tracklist name is: " + _tracklistNameElement.textContent)
            callback(_tracklistNameElement.textContent); //TODO this could be a return instead of a callback
        }
        else {
            console.log("ERROR: Received request to get the tracklist name, but it failed to be retrieved from the DOM.");
        }
    }

    //TODO could check if YouTube API reports correct track count value for "Your Likes"
        //Could even consider ONLY using the API to get track counts, though it does seem like a lot of extra work that shouldn't be necessary
    function getPlaylistTrackCount(app) {
        let _trackCountElement = null;

        //TODO this logic is overly convoluted
        //If the url matches those of standard playlists for the current app, use the corresponding track count element
        if (window.location[urlProperties[app].urlPart].includes(urlProperties[app].playlistUrlCondition) == true) {
            _trackCountElement = elementsInDOM.playlistTrackCount[app]();
        }
        //Else, if the url matches the 'Your Likes' list for the current app, use the corresponding track count element
        else if (window.location[urlProperties[app].urlPart].includes(urlProperties[app].yourLikesUrlCondition) == true) {
            _trackCountElement = elementsInDOM.yourLikesTrackCount[app]();
        }


        // //If the url parameters exactly match those of the "Your Likes" list, use the corresponding track count element
        // if (window.location.search == urlParts.yourLikesUrlParameters[currentApp]) {
        //     _trackCountElement = elementsInDOM.yourLikesTrackCount[currentApp]();
        // }
        // //Else, if the url parameters match those for standard playists, use the corresponding track count element
        // else if (window.location.search.includes(urlParts.playlistUrlParameters[currentApp])) {
        //     _trackCountElement = elementsInDOM.playlistTrackCount[currentApp]();
        // }

        if (_trackCountElement != null) {
            //Get the track count string from the DOM element and split off the trailing text after the actual number
            const _trackCountString = _trackCountElement.textContent.split(" ")[0];

            //Remove any commas from the track count string (e.g. for counts > 999), and then get the count value as an integer
            const _trackCountValue = parseInt(_trackCountString.replace(/,/g, ""));
            
            console.log('Current playlist\'s track count is %s.', _trackCountValue);
            return _trackCountValue;
        }
        else {
            console.log('ERROR: Could not find the Track Count DOM element.');
        }
    }

    /**
     * Scrolls the page such that the given element is in view
     * @param {object} element The DOM element to scroll into view
     */
    function scrollToElement(element) {
        if (typeof element === 'object') {
            element.scrollIntoView(true);
        }
        else {
            //TODO would be good to set up a DebugController to better handle warnings, errors, asserts, etc.
            console.log('There is no element to scroll to');
        }
    }

    /**
     * Scrolls to the top of the current tracklist
     * @param {string} app The current app being used (e.g. YouTube Music, Google Play Music, etc.)
     */
    function scrollToTopOfTracklist(app) {
        //console.assert(typeof app == 'string', 'Parameter [app] should be a string');
        //console.assert(typeof scrollContainer == 'object', 'Parameter [scrollContainer] should be an object');

        //Get the scroll container element for the current app being used
        const _container = elementsInDOM.scrollContainer[app]();

        //If the current app is YouTube Music, trigger a scroll such that the scroll container is in view...
        if (app == 'ytm') {
            scrollToElement(_container);
        }
        //Else if the app is Google Play Music, modify the scrollTop property to scroll to the top of the scroll container
        else if (app == 'gpm' && typeof _container === 'object') {
            _container.scrollTop = 0;
        }
        else {
            console.log("ERROR: Tried to scroll to the top of the tracklist, but the given inputs were invalid. app: " + app + ". scroll container: " + _container);
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
    function allowManualScrolling(app, enabled=true) {
        const _container = elementsInDOM.scrollContainer[app]();

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

    //TODO maybe take the bulk of the logic outside of the processMessage function, for better readability?

    //TODO NEW - Some of this logic (and the TrackMetadata constructor) could be handled in a logic script instead of in the content script
        //That mightmake more sense, to limit the content script to really just extracting the raw data required
    /**
     * Runs through a process that scrolls through the current tracklist and scrapes the metadata out of all the track rows
     * @param {string} app the current app that the extension is running on
     * @param {function} callback The function to execute once the scrape process has ended, either due to successful completion or timeout. Expects an object with a 'tracklist' key as a parameter
     */
    function processMessage_GetTracklistMetadata(app, callback) {
        const _trackRowContainer = elementsInDOM.trackRowContainer[app](); //Fetch the DOM element that contains all the track row elements
        const _trackCount = getPlaylistTrackCount(app); //Fetch the official track count of the tracklist, if one exists
        const _observerConfig = {childList: true}; //Set up the configuration options for the Mutation Observer

        let _trackMetadataArray = []; //Create an array to store the metadata for each scraped track in the tracklist
        let _lastScrapedElement = null; //Variable to track the last track row element from the most recent scrape
        let _scrollingTimeout = null; //Variable tracking the timeout to end the scroll & scrape process, in case no changes to the track row container element are observed for a while
        let _scrapeStartingIndex = (app == 'gpm') ? 1 : 0; //Variable to track the row index to begin each scrape with. Starts at 1 for GPM, 0 for other sites. 
        const _scrapeEndingIndexModifier = (app == 'gpm') ? -1 : 0; //Variable to track the modifier to the index to end each scrape with. Typically 0, but -1 for GPM due to how the DOM is laid out.

        //Set up the callback function to execute once the scraped has either been successfully completed or timed out
        const _endScrape = function() {
            //Allow the user to scroll manually again
            allowManualScrolling(app, true);

            //Disconnect the mutation observer
            _observer.disconnect();

            //Execute the provided callback function, passing the track metadata array as a parameter
            callback(_trackMetadataArray);
        }

        const _scrapeTrackMetadataFromNodeList = function() {
            //If the scrolling timeout has been set...
            if (_scrollingTimeout != null) {
                //Clear the timeout. If the scrape is not yet complete after the current iteration, a new timeout will be set for the next one later.
                clearTimeout(_scrollingTimeout);
            }

            //If a previous scrape has been completed, set the starting index for the next scrape accordingly
            if (_lastScrapedElement != null) {
                //'Array.prototype.indexOf.call' is used here because '_trackRowContainer.children' is a NodeList, not an Array, and so it doesn't have the 'indexOf' function, but is set up similarly enough that calling it works
                //The starting index for the next scrape should be one greater than then index of the last child element from the previous scrape
                _scrapeStartingIndex = Array.prototype.indexOf.call(_trackRowContainer.children, _lastScrapedElement) + 1 ;
            }
            
            //For each new track row loaded in the DOM...
            for (let i = _scrapeStartingIndex; i < (_trackRowContainer.childElementCount + _scrapeEndingIndexModifier); i++) {
                //Scrape the track metadata from the track row and add it to the metadata array
                _trackMetadataArray.push(new TrackMetadata(app, _trackRowContainer.children[i])); 
            }

            //If a valid target track count was provided and it matches the length of the metadata array, end the scrape
            if (_trackCount != null && _trackCount == _trackMetadataArray.length) {
                _endScrape();
            }
            else {
                //Record the last available child element in the track row container for future reference
                _lastScrapedElement = _trackRowContainer.children[_trackRowContainer.childElementCount-1];
                
                //Scroll to the last available child element in the track row container
                scrollToElement(_lastScrapedElement);

                //Set a timeout to end the scrolling if no new changes to the container element have been observed for a while, to avoid infinite scrolling in edge cases
                _scrollingTimeout = setTimeout(_endScrape, 4000);
            }
        }

        //Set up the callback to execute whenever the track row container DOM element has its childList modified
        const _onTrackRowContainerChildListModified = function (mutationsList, observer) {
            //For each mutation observed on the target DOM element...
            for (const mutation of mutationsList) {
                //If the observed mutation is that the element's childList was modified...
                if (mutation.type === 'childList') {
                    //Scrape the track metadata from the next set of track rows, and continue with the process accordingly
                    _scrapeTrackMetadataFromNodeList();
                }
            }
        };

        //Create a new mutation observer instance linked to the callback function defined above
        const _observer = new MutationObserver(_onTrackRowContainerChildListModified);

        //Temporarily disable manual scrolling to avoid any interference from the user during the scrape process
        allowManualScrolling(app, false);

        //Scroll to the top of the tracklist, as an extra safety measure just to be certain that no tracks are missed in the scrape
        scrollToTopOfTracklist(app);

        //Start observing the track row container element for configured mutations (i.e. for any changes to its childList)
        _observer.observe(_trackRowContainer, _observerConfig);

        //Wait a short amount of time to allow the page to scroll to the top of the tracklist, and then begin the scroll & scrape process
        setTimeout(_scrapeTrackMetadataFromNodeList, 1000);
    }
})();