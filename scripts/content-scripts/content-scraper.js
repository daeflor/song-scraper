'use strict';
(function() {
    console.info("Content Scraper script initializing");
    
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

    const metadataNames = Object.freeze({
        title: 'tracklistTitle',
        trackCount: 'trackCount'
    });
    
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

    let currentApp = undefined;
    //TODO might rather have these (below) in an object with the other elements that need to be tracked (e.g track row container and scroll container)
    let headerElement = undefined; 
    let tracksContainer = undefined;
    let scrollContainer = undefined;

    /**
     * Records the current app based on the URL, and begins observing the YTM header element for DOM mutations
     */
    function init() {
        if (window.location.host === 'music.youtube.com') {
            currentApp = supportedApps.youTubeMusic; //Record the current app being used for future reference
            headerElement = document.getElementById('header'); //Note: there are typically at least two elements with ID 'header' in YTM pages, but the one containing tracklist metadata seems to consistently be the first one in the DOM, so this is the easiest/fastest way to fetch it.
            //TODO this isn't the tracks container...
            //tracksContainer = document.body.getElementsByTagName('ytmusic-section-list-renderer');
            scrollContainer = document.body;

            //let firstTrack = document.querySelector("ytmusic-responsive-list-item-renderer[should-render-subtitle-separators_]");
            //tracksContainer = firstTrack.parentElement;

            observeHeaderElementMutations(); //Begin observing the YTM Header element for DOM mutations
        } else console.error("Tried to initialize data in the content scraper script, but the host was not recognized.");        
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

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.greeting === 'GetTracklistMetadata') {
            console.info("Content Script: Received request to retrieve tracklist metadata.");
            processMessage_GetTracklistMetadata(currentApp, response => { //TODO rename to GetTracks or something like that
                message.response = response;
                sendResponse(message);
            });
        }
        
        return true; //Return true to keep the message channel open (so the callback can be called asynchronously)
    });

    // chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    //     if (message.greeting === 'GetTrackCount') {   
    //         console.info("Content Script: Received request to retrieve track count.");
    //         message.response = getPlaylistTrackCount(message.app);
    //         sendResponse(message);
    //     }
    // });

    /**
     * Scrolls the page such that the given element is in view
     * @param {object} element The DOM element to scroll into view
     */
    function scrollToElement(element) {
        if (typeof element === 'object')
            element.scrollIntoView(true);
        else
            console.error('There is no valid element to scroll to');
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
        const _expectedTrackCount = getMetadatum(metadataNames.trackCount); //Fetch the official track count of the tracklist, if one exists
        const _observerConfig = {childList: true}; //Set up the configuration options for the Mutation Observer

        let _trackMetadataArray = []; //Create an array to store the metadata for each scraped track in the tracklist
        let _lastScrapedElement = null; //Variable to track the last track row element from the most recent scrape
        let _scrollingTimeoutID = undefined; //Variable tracking the timeout to end the scroll & scrape process, in case no changes to the track row container element are observed for a while
        let _scrapeStartingIndex = (app === 'gpm') ? 1 : 0; //Variable to track the row index to begin each scrape with. Starts at 1 for GPM, 0 for other sites. 
        const _scrapeEndingIndexModifier = (app == 'gpm') ? -1 : 0; //Variable to track the modifier to the index to end each scrape with. Typically 0, but -1 for GPM due to how the DOM is laid out.
        
        //Set up the callback function to execute once the scraped has either been successfully completed or timed out
        const _endScrape = function() {  
            allowManualScrolling(app, true); //Allow the user to scroll manually again
            _observer.disconnect(); //Disconnect the mutation observer
            callback(_trackMetadataArray); //Execute the callback function, passing the tracks array as a parameter
        }

        const _scrapeTrackMetadataFromNodeList = function() {
            clearTimeout(_scrollingTimeoutID); //Clear the scrolling timeout. It will be reset if the scrape isn't complete after the upcoming scrape

            //If a previous scrape has been completed, set the starting index for the next scrape accordingly
            if (_lastScrapedElement != null) {
                //'Array.prototype.indexOf.call' is used here because '_trackRowContainer.children' is a NodeList, not an Array, and so it doesn't have the 'indexOf' function, but is set up similarly enough that calling it works
                //The starting index for the next scrape should be one greater than the index of the last child element from the previous scrape
                _scrapeStartingIndex = Array.prototype.indexOf.call(_trackRowContainer.children, _lastScrapedElement) + 1 ;
            }
            
            //For each new track row loaded in the DOM...
            for (let i = _scrapeStartingIndex; i < (_trackRowContainer.childElementCount + _scrapeEndingIndexModifier); i++) {
                //Scrape the track metadata from the track row and add it to the metadata array
                _trackMetadataArray.push(new TrackMetadata(app, _trackRowContainer.children[i])); 
            }

            //If there is an expected track count and it matches the length of the metadata array, end the scrape
            if (_expectedTrackCount === _trackMetadataArray.length) {
                _endScrape();
            }
            else {
                //Record the last available child element in the track row container for future reference
                _lastScrapedElement = _trackRowContainer.children[_trackRowContainer.childElementCount-1];
                
                //Scroll to the last available child element in the track row container
                scrollToElement(_lastScrapedElement);

                //Set a timeout to end the scrolling if no new changes to the container element have been observed for a while, to avoid infinite scrolling in edge cases
                _scrollingTimeoutID = setTimeout(_endScrape, 4000);
            }
        }

        //Set up the callback to execute whenever the track row container DOM element has its childList modified
        const _onTrackRowContainerChildListModified = function (mutationsList, observer) {
            //For each mutation observed on the target DOM element...
            for (const mutation of mutationsList) {
                //If the observed mutation is that the element's childList was modified...
                if (mutation.type === 'childList') {
                    //Wait a very short amount of time to allow all the elements in the DOM to load (e.g. the 'duration', which can take longer)
                        //And then scrape the track metadata from the next set of track rows, and continue with the process accordingly
                    setTimeout(_scrapeTrackMetadataFromNodeList, 100);
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

    //TODO something that hasn't been considered is that a tracklist could change in the time between...
        //...when the page is loaded and the extension is opened. i.e. a track could be added/removed manually to the list
        //This means the track count cached in storage could be out of date when the popup is opened
        //There should be something to account for this. Some examples:
            //A) Listen/Watch for DOM changes that indicate the track count has changed. 
                //Could watch for the metadata subtitle element (if available) or the track rows container perhaps. 
            //B) Check the track count again when the popup is opened. Maybe don't even cache it, only send it to background.js to update the icon
        //In any case, it's likely that the icon wouldn't be updated properly after such a change, but that's less important.
        //The more important part is that the 'expected' track count used for scraping tracks is accurate.

        //A possible approach is to only store the tracklist type when the mutation is observed...
            //...and then only fetch the tracklist title & track count on demand later (i.e. when the popup is opened)...
            //...using the pre-set type to dictate how and whether or not to try to get that info

    function observeHeaderElementMutations() {
        //const _elementToObserve = document.getElementById('header'); //Note: there are typically at least two elements with ID 'header' in YTM pages, but the one containing tracklist metadata seems to consistently be the first one in the DOM, so this is the easiest/fastest way to fetch it.

        //TODO the header element doesn't get modified when navigating between 'Library', 'Added from YTM', & 'Uploaded' pages...
            //background.js will need a history check to set the icon accordingly in these cases
            //And will probably have to set the tracklist type (and title maybe) itself too...
            //Either that, or I come up with a new approach to detect changes, but the All Songs lists use different elements than playlists,...
            //...so mutation observer may not be an option for that.

        //Set up the callback to execute whenever a mutation of the pre-specified type is observed (i.e. the observed element's childList is modified)
        const _onMutationObserved = (mutationsList, observer) => {    
            console.info("The header element's childList was modified. Looking for metadata.");

            if (currentApp === supportedApps.youTubeMusic) {
                //Create an object to store and transmit the current tracklist metadata so it can be easily accessed across the extension
                const _tracklistMetadata = {
                    type: undefined,
                    title: undefined,
                    trackCount: undefined
                };

                //TODO it would be possible to scrape the URL from the background script instead
                //TODO it may also be possible to get some of this data (e.g. for playlists) from the metadata element instead of the URL, but that isn't necessarily easier/better
                //Scrape and record the current tracklist metadata based on specific URL conditions and/or the metadata element
                /*if (window.location.pathname === '/library/songs') {
                    _tracklistMetadata.type = supportedTracklistTypes.allSongsList;
                    _tracklistMetadata.title = 'Added from YouTube Music';
                } else if (window.location.pathname === '/library/uploaded_songs') {
                    _tracklistMetadata.type = supportedTracklistTypes.uploadsList;
                    _tracklistMetadata.title = 'Uploaded Songs';
                } else*/ if (window.location.search.startsWith('?list=LM')) {
                    _tracklistMetadata.type = supportedTracklistTypes.autoPlaylist;
                    _tracklistMetadata.title = 'Your Likes';
                    _tracklistMetadata.trackCount = getMetadatum(metadataNames.trackCount);
                    //_tracklistMetadata.trackCount = getTrackCountFromElement(headerElement.getElementsByClassName('second-subtitle')[0]);
                } else if (window.location.search.startsWith('?list=PL')) {
                    _tracklistMetadata.type = supportedTracklistTypes.playlist;
                    _tracklistMetadata.title = getMetadatum(metadataNames.title);
                    _tracklistMetadata.trackCount = getMetadatum(metadataNames.trackCount); 
                    //_tracklistMetadata.title = getTracklistTitleFromElement(headerElement.getElementsByClassName('title')[0]);
                    //_tracklistMetadata.trackCount = getTrackCountFromElement(headerElement.getElementsByClassName('second-subtitle')[0]);
                }

                if (typeof _tracklistMetadata.type === 'string') { //If a valid tracklist type was set (i.e. the current page is a valid tracklist)...
                    //TODO would it be better to store each piece of metadata individually instead of in a single object?
                        //That way, if we want to just update partial data (e.g. type in background script) we can do that with just a set, without needing an initial get.            
                    chrome.storage.local.set ({currentTracklistMetadata: _tracklistMetadata}, () => { //Cache the metadata in local storage
                        if (typeof chrome.runtime.error === 'undefined') {
                            const _message = { greeting: 'TracklistMetadataUpdated', currentTracklistMetadata: _tracklistMetadata };
                            chrome.runtime.sendMessage(_message); //Send the metadata to the extension's service worker so it can update the icon accordingly
                        } else console.error("Error encountered while attempting to store metadata in local storage: " + chrome.runtime.lastError.message);
                    });
                }
            }
        };
    
        const _observer = new MutationObserver(_onMutationObserved); //Create a new mutation observer instance linked to the callback function defined above
        const _observerConfig = {childList: true, subtree: false}; //Set up the configuration options for the Mutation Observer
        if (typeof headerElement === 'object') { //If the element to observe actually exists in the DOM...
            _observer.observe(headerElement, _observerConfig); //Start observing the specified element for configured mutations (i.e. for any changes to its childList)
        } else console.error("Tried observing the YTM header element for DOM mutations, but the element doesn't exist.");
    }

    //TODO I'm not convinced it's more readable having this be a single function rather than two dedicated functions
    /**
     * Gets a piece of metadata based on the name provided
     * @param {string} name The name of the metadatum to look for. Supported names are included in the 'metadataNames' object.
     * @returns {*} The value of the piece of metadata requested 
     */
    function getMetadatum(name) {
        if (currentApp === supportedApps.youTubeMusic) {
            //const _element = getElement(name); //Get the DOM element based on the name provided
            switch(name) {
                case metadataNames.title: 
                    return getTracklistTitleFromElement(headerElement.getElementsByClassName('title')[0]);//(_element);
                case metadataNames.trackCount: 
                    return getTrackCountFromElement(headerElement.getElementsByClassName('second-subtitle')[0]);//getTrackCountFromElement(_element);
                default:
                    console.error("Tried to get a piece of metadata but an invalid metadatum name was provided. Name provided: " + name);
            }
        }
    }

    //TODO this extra step seems unnecessary now, since the other elements are 'static'
        //...(i.e. header, tracksContainer, & scrollContainer don't change, so we can just fetch then once on script load)
    // /**
    //  * Gets a DOM element from the name provided
    //  * @param {string} name The name of the DOM element to look for. Supported names are included in the 'metadataNames' object.
    //  * @returns {object} The element matching the name provided
    //  */
    // function getElement(name) {
    //     if (currentApp === supportedApps.youTubeMusic) {
    //         switch(name) {
    //             case metadataNames.title: 
    //                 return headerElement.getElementsByClassName('title')[0];
    //             case metadataNames.trackCount: 
    //                 return headerElement.getElementsByClassName('second-subtitle')[0];
    //             default:
    //                 console.error("Tried to get a DOM element but an invalid element name was provided. Name provided: " + name);
    //         }
    //     }
    // }

    // function getTracklistTitle() {
    //     if (currentApp === supportedApps.youTubeMusic) {
    //         return getTracklistTitleFromElement(headerElement.getElementsByClassName('title')[0]);
    //     } else console.error("Tried to get the tracklist title element, but the current app isn't valid.");
    // }

    /**
     * Extracts and returns the tracklist title string from the title element
     * @param {object} element The DOM element containing the tracklist title
     * @returns {string} The tracklist title as a string
     */
     function getTracklistTitleFromElement(element) {
        if (typeof element === 'object') {
            return element.textContent;
        } else console.error("Tried to extract the tracklist title string from the title element, but no valid element was provided.");
    }

    // function getTrackCount() {
    //     if (currentApp === supportedApps.youTubeMusic) {
    //         return getTrackCountFromElement(headerElement.getElementsByClassName('second-subtitle')[0]);
    //     } else console.error("Tried to get the track count element, but the current app isn't valid.");
    // }

    //TODO could check if YouTube API reports correct track count value for "Your Likes"
        //Could even consider ONLY using the API to get track counts, though it does seem like a lot of extra work that shouldn't be necessary
    /**
     * Extracts the track count string from the track count element and then returns the track count number
     * @param {object} element The DOM element containing the track count string
     * @returns {number} The tracklist's track count, as a number
     */
    function getTrackCountFromElement(element) {
        if (typeof element === 'object') {
            return getTrackCountNumberFromString(element.textContent);
        } else console.error("Tried to extract the track count string from the track count element, but no valid element was provided.");
    }

    /**
     * Parses a track count string and returns an integer value
     * @param {string} trackCountString The string containing the track count information
     * @returns {number} The track count as an integer
     */
    function getTrackCountNumberFromString(trackCountString) {
        if (typeof trackCountString === 'string') {
            trackCountString = trackCountString.split(" ")[0]; //Split off any trailing text after the actual number
            trackCountString = trackCountString.replace(/,/g, ""); //Remove any commas from the string (e.g. for counts > 999)
            return parseInt(trackCountString, 10); //Parse the string to get the track count value as an integer and return it
        } else console.error("Tried to convert a track count string to a number, but the value provided was not a string.");
    }

    init();
})();