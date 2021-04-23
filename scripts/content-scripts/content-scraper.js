'use strict';
(function() {    
    /**
     * Creates a track object that contains properties for each piece of metadata scraped from the DOM
     */
     class Track {
        constructor(trackContainerElement) {
            if (currentApp === supportedApps.youTubeMusic) {
                const _metadataElements = trackContainerElement.getElementsByTagName('yt-formatted-string');

                if (typeof _metadataElements[0] === 'object') {
                    this.title = _metadataElements[0].title;
                } else console.error("Track title could not be retrieved from DOM.");
                if (typeof _metadataElements[1] === 'object') {
                    this.artist = _metadataElements[1].title;
                } else console.error("Artist could not be retrieved from DOM.");
                if (typeof _metadataElements[2] === 'object') {
                    this.album = _metadataElements[2].title;
                } else console.error("Album could not be retrieved from DOM.");
                if (typeof _metadataElements[3] === 'object') {
                    this.duration = _metadataElements[3].title;
                } else console.error("Duration could not be retrieved from DOM.");
                if (trackContainerElement.hasAttribute('unplayable_')) { //Note: <if (trackContainerElement.unplayable_ === true)> should work but it doesn't for some reason
                    this.unplayable = true;
                    console.info("Encountered an unplayable track with title: " + this.title);
                }
            }
        }
    }
    
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

    //TODO I don't really like this... at some point it just makes it less readable
    const metadataNames = Object.freeze({
        title: 'tracklistTitle',
        trackCount: 'trackCount'
    });
    
    // const persistentElements = Object.freeze({
    //     header: {
    //         ytm: document.getElementById('header')
    //     },
    //     scrollContainer: {
    //         ytm: document.body
    //     }
    // });

    const persistentElements = {
        header: undefined,
        scrollContainer: undefined
    }

    let currentApp = undefined;

    /**
     * Records the current app based on the URL, and begins observing the YTM header element for DOM mutations
     */
    function init() {
        console.info("Content Scraper script initializing");
        if (window.location.host === 'music.youtube.com') {
            currentApp = supportedApps.youTubeMusic; //Record the current app being used for future reference
            persistentElements.header = document.getElementById('header'); //Note: there are typically at least two elements with ID 'header' in YTM pages, but the one containing tracklist metadata seems to consistently be the first one in the DOM, so this is the easiest/fastest way to fetch it.
            persistentElements.scrollContainer = document.body; //Set the scroll container element as applicable, for future reference
            observeHeaderElementMutations(); //Begin observing the YTM Header element for DOM mutations
        } else console.error("Tried to initialize data in the content scraper script, but the host was not recognized.");        
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.greeting === 'GetTracks') {
            console.info("Content Script: Received request to retrieve tracklist metadata.");
            GetTracks(tracksArray => {
                message.response = tracksArray;
                sendResponse(message);
            });
        }
        
        return true; //Return true to keep the message channel open (so the callback can be called asynchronously)
    });

    //TODO something that hasn't been considered is that a tracklist could change in the time between...
        //...when the page is loaded and the extension is opened. i.e. a track could be added/removed manually to the list
        //This means the track count cached in storage could be out of date when the popup is opened
        //There should be something to account for this. Some examples:
            //A) Listen/Watch for DOM changes that indicate the track count has changed. 
                //Could watch for the metadata subtitle element (if available) or the track rows container perhaps. 
                //It appears that in YTM, when you remove a track both the track count metadata & the track row container are updated right away...
                    //...But when adding a track, only the track count metadata is updated right away (w/out a refresh). So that would be the preferred element to observe.
            //B) Check the track count again when the popup is opened. Maybe don't even cache it, only send it to background.js to update the icon
                    //There's no real reason to do this though, unless I'm going to show the track count in the popup, which I currently do not. 
        //In any case, it's likely that the icon wouldn't be updated properly after such a change, but that's less important.
        //The more important part is that the 'expected' track count used for scraping tracks is accurate.
            //...And currently it is, because we're not using the cached track count at all.

        //A possible approach is to only store the tracklist type when the mutation is observed...
            //...and then only fetch the tracklist title & track count on demand later (i.e. when the popup is opened)...
            //...using the pre-set type to dictate how and whether or not to try to get that info

    function observeHeaderElementMutations() {
        //const _elementToObserve = document.getElementById('header'); //Note: there are typically at least two elements with ID 'header' in YTM pages, but the one containing tracklist metadata seems to consistently be the first one in the DOM, so this is the easiest/fastest way to fetch it.

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

                //Scrape and record the current tracklist metadata based on specific URL conditions and the metadata element
                if (window.location.search.startsWith('?list=LM')) {
                    _tracklistMetadata.type = supportedTracklistTypes.autoPlaylist;
                    _tracklistMetadata.title = 'Your Likes';
                    _tracklistMetadata.trackCount = getMetadatum(metadataNames.trackCount);
                } else if (window.location.search.startsWith('?list=PL')) {
                    _tracklistMetadata.type = supportedTracklistTypes.playlist;
                    _tracklistMetadata.title = getMetadatum(metadataNames.title);
                    _tracklistMetadata.trackCount = getMetadatum(metadataNames.trackCount); 
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
        if (typeof persistentElements.header === 'object') { //If the element to observe actually exists in the DOM...
            _observer.observe(persistentElements.header, _observerConfig); //Start observing the specified element for configured mutations (i.e. for any changes to its childList)
        } else console.error("Tried observing the YTM header element for DOM mutations, but the element doesn't exist.");
    }

    function GetTracks(callback) {
        const _firstTrack = document.querySelector("ytmusic-responsive-list-item-renderer[should-render-subtitle-separators_]"); //Find the first track element using query selector. This selector is used because it currently works across all valid tracklists.
        if (typeof _firstTrack === 'object') {
            const _tracksContainer = _firstTrack.parentElement; //Get the tracks container element
            const _expectedTrackCount = getMetadatum(metadataNames.trackCount); //Fetch the official track count of the tracklist, if one exists. This will be undefined otherwise. 
            let _scrapeStartingIndex = getIndexOfElement(_firstTrack); //Get the index of the first track element at which to begin the scrape, since it isn't always necessarily the first element in the track row container (i.e. can't assume it's 0)  
            scrapeTracks(_tracksContainer, _scrapeStartingIndex, callback, _expectedTrackCount); //Initiate the scrape & scroll process
        } else console.error("Tried to get scrape the tracks in the current tracklist, but the first track in the list couldn't be identified.");
    }

    /**
     * Runs through a process that scrolls through the current tracklist and scrapes the metadata out of all the track rows
     * @param {object} tracksContainer The element containing all the rows of track elements
     * @param {number} scrapeStartingIndex The index within the tracks container at which to begin the initial scrape
     * @param {function} callback The function to execute once the scrape process has ended, either due to successful completion or timeout
     * @param {number} [expectedTrackCount] An optional parameter indicating the expected track count for the tracklist, if available
     */
    function scrapeTracks(tracksContainer, scrapeStartingIndex, callback, expectedTrackCount) {
        const _trackElementCollection = tracksContainer.children;
        const _trackMetadataArray = []; //Create an array to store the metadata for each scraped track in the tracklist
        let _scrollingTimeoutID = undefined; //Variable tracking the timeout to end the scroll & scrape process, in case no changes to the track row container element are observed for a while
        
        // const t0 = performance.now();
        // let tScrolled = undefined;
        // let tLoaded = undefined;

        const _scrapeLoadedTracks = function() { //Set up the function to scrape the set of tracks most recently loaded in the DOM
            // tLoaded = performance.now();
            // if (typeof tScrolled === 'number') {
            //     console.log("Loading tracks from YTM took " + (tLoaded - tScrolled - 100) + " milliseconds");
            // }

            clearTimeout(_scrollingTimeoutID); //Since there are still track elements available to scrape, clear the timeout that would otherwise end the scrolling process after a few seconds. The timeout will be reset if the scrape isn't complete after the upcoming scrape.        
            
            for (let i = scrapeStartingIndex; i < (_trackElementCollection.length); i++) { //For each new track row loaded in the DOM...
                _trackMetadataArray.push(new Track(_trackElementCollection[i])); //Scrape the metadata from the track element and add it to the metadata array
            }

            if (expectedTrackCount === _trackMetadataArray.length) { //If there is an expected track count and it matches the length of the metadata array...
                _endScrape(); //End the scrape
            } else { //Else, if the scrape isn't complete or the expected track count is unknown...
                //const tScraped = performance.now();
                //console.log("Scrape round took " + (tScraped - tLoaded) + " milliseconds + 100ms from timeout.");
                
                scrollToElement(_trackElementCollection[_trackElementCollection.length-1]); //Scroll to the last available child element in the tracks container
                //tScrolled = performance.now();
                scrapeStartingIndex = _trackElementCollection.length; //Set the starting index for the next scrape to be one greater than the index of the last child element from the previous scrape
                _scrollingTimeoutID = setTimeout(_endScrape, 4000); //Set a timeout to end the scrolling if no new changes to the container element have been observed for a while. This avoids infinite scrolling when the expected track count is unknown, or if an unexpected issue is encountered.
            }
        }

        const _endScrape = function() { //Set up the function to execute once the scrape & scroll process has either been successfully completed or timed out
            allowManualScrolling(persistentElements.scrollContainer, true); //Allow the user to scroll manually again
            _observer.disconnect(); //Disconnect the mutation observer
            //const t1 = performance.now();
            //console.log("Scrape took " + (t1 - t0) + " milliseconds.");
            callback(_trackMetadataArray); //Execute the callback function, passing the tracks array as a parameter
        }

        allowManualScrolling(persistentElements.scrollContainer, false); //Temporarily disable manual scrolling to avoid any interference from the user during the scrape process
        scrollToTopOfContainer(persistentElements.scrollContainer); //Scroll to the top of the tracklist, as an extra safety measure just to be certain that no tracks are missed in the scrape. (Note: This step likely isn't necessary in YTM since it appears the track row elements never get removed from the DOM no matter how far down a list you scroll).

        //const _observer = new MutationObserver(_onTrackElementsLoaded); //Create a new mutation observer instance linked to the callback function defined above
        const _observer = new MutationObserver(setTimeout.bind(null, _scrapeLoadedTracks, 100)); //Create a new mutation observer instance which triggers a scrape of the loaded track elements after a brief delay (which allows time all the elements (e.g. 'duration' metadata) in the DOM to load).
        const _observerConfig = {childList: true}; //Set up the configuration options for the Mutation Observer to watch for changes to the element's childList
        _observer.observe(tracksContainer, _observerConfig); //Start observing the tracks container element for configured mutations (i.e. for any changes to its childList)
        
        setTimeout(_scrapeLoadedTracks, 100); //Wait a short amount of time to allow the page to scroll to the top of the tracklist, and then begin the scrape & scroll process
    }

    // //

    // //This approach scrapes all available track elements and then removes them from the DOM.
    // //This automatically triggers a new set of tracks to be loaded in without any extra work (it's as if the user scrolled to the bottom of the tracklist manually)
    // //Brief testing determined that this approach is slightly faster, but it requires the user to refresh the page to get their tracklist back to normal.
    // function scrapeAndRemoveTracks(tracksContainer, scrapeStartingIndex, callback, expectedTrackCount) {
    //     const _trackElementCollection = tracksContainer.children;
    //     const _trackMetadataArray = []; //Create an array to store the metadata for each scraped track in the tracklist
    //     let _scrollingTimeoutID = undefined; //Variable tracking the timeout to end the scroll & scrape process, in case no changes to the track row container element are observed for a while
    
    //     const t0 = performance.now();

    //     const _scrapeLoadedTracks = function() { //Set up the function to scrape the set of tracks most recently loaded in the DOM
    //         clearTimeout(_scrollingTimeoutID); //Since there are still track elements available to scrape, clear the timeout that would otherwise end the scrolling process after a few seconds. The timeout will be reset if the scrape isn't complete after the upcoming scrape.        
            
    //         for (let i = scrapeStartingIndex; i < (_trackElementCollection.length); i++) { //For each new track row loaded in the DOM...
    //             _trackMetadataArray.push(new Track(_trackElementCollection[i])); //Scrape the metadata from the track element and add it to the metadata array
    //         }

    //         if (expectedTrackCount === _trackMetadataArray.length) { //If there is an expected track count and it matches the length of the metadata array...
    //             _endScrape(); //End the scrape
    //         } else { //Else, if the scrape isn't complete or the expected track count is unknown...
    //             //scrollToElement(_trackElementCollection[_trackElementCollection.length-1]); //Scroll to the last available child element in the tracks container
    //             //scrapeStartingIndex = _trackElementCollection.length; //Set the starting index for the next scrape to be one greater than the index of the last child element from the previous scrape
    //             tracksContainer.innerHTML = '';
    //             scrapeStartingIndex = 0;
    //             _scrollingTimeoutID = setTimeout(_endScrape, 4000); //Set a timeout to end the scrolling if no new changes to the container element have been observed for a while. This avoids infinite scrolling when the expected track count is unknown, or if an unexpected issue is encountered.
    //         }
    //     }

    //     const _endScrape = function() { //Set up the function to execute once the scrape & scroll process has either been successfully completed or timed out
    //         allowManualScrolling(persistentElements.scrollContainer, true); //Allow the user to scroll manually again
    //         _observer.disconnect(); //Disconnect the mutation observer
    //         const t1 = performance.now();
    //         console.log("Scrape took " + (t1 - t0) + " milliseconds.");
    //         callback(_trackMetadataArray); //Execute the callback function, passing the tracks array as a parameter
    //     }

    //     allowManualScrolling(persistentElements.scrollContainer, false); //Temporarily disable manual scrolling to avoid any interference from the user during the scrape process
    //     scrollToTopOfContainer(persistentElements.scrollContainer); //Scroll to the top of the tracklist, as an extra safety measure just to be certain that no tracks are missed in the scrape. (Note: This step likely isn't necessary in YTM since it appears the track row elements never get removed from the DOM no matter how far down a list you scroll).

    //     //const _observer = new MutationObserver(_onTrackElementsLoaded); //Create a new mutation observer instance linked to the callback function defined above
    //     const _observer = new MutationObserver(setTimeout.bind(null, _scrapeLoadedTracks, 100)); //Create a new mutation observer instance which triggers a scrape of the loaded track elements after a brief delay (which allows time all the elements (e.g. 'duration' metadata) in the DOM to load).
    //     const _observerConfig = {childList: true}; //Set up the configuration options for the Mutation Observer to watch for changes to the element's childList
    //     _observer.observe(tracksContainer, _observerConfig); //Start observing the tracks container element for configured mutations (i.e. for any changes to its childList)
        
    //     setTimeout(_scrapeLoadedTracks, 100); //Wait a short amount of time to allow the page to scroll to the top of the tracklist, and then begin the scrape & scroll process
    // }

    // //

    /**
     * Gets the index of the provided element within it's parent element's list of children
     * @param {object} element The element for which to get an index
     * @returns {number} The index of the position of the given element within it's parent's list of children
     */
     function getIndexOfElement(element) {
        //Note: 'Array.prototype.indexOf.call' is used here because an element's children property returns an HTMLCollection, not an Array, and so it doesn't have the 'indexOf' function, but is set up similarly enough that calling it works
        return Array.prototype.indexOf.call(element.parentElement.children, element);
    }

    /**
     * Sets whether or not the user should be able to scroll manually within the container element provided
     * @param {boolean} enabled Indicates whether or not manual scrolling should be allowed. Defaults to true, meaning the user can scroll manually.
     */
     function allowManualScrolling(container, enabled=true) {
        if (typeof container === 'object') { //If a valid container element was provided...
            //If manual scrolling should be enabled (which is the default), set overflowY to 'auto', otherwise set to 'hidden'
            container.style.overflowY = (enabled === true) ? 'auto' : 'hidden';
        } else console.error('Tried to toggle scrolling but the specified container element does not exist.');
    }

    /**
     * Scrolls to the top of the provided container element
     * @param {object} container The container element to scroll to the top of
     */
    function scrollToTopOfContainer(container) {
        if (typeof container === 'object') {
            switch(currentApp) {
                case supportedApps.youTubeMusic: 
                    scrollToElement(container); //Trigger a scroll such that the scroll container is in view...
                    break;
                case supportedApps.googlePlayMusic: 
                    container.scrollTop = 0; //Modify the scrollTop property to scroll to the top of the scroll container
                    break;
                default:
                    console.error("Tried to scroll to the top of a container element but the current app was not recognized as valid.");
            }
        } else console.error("Tried to scroll to the top of a container element but element provided is invalid.");
    }

    /**
     * Scrolls the page such that the given element is in view
     * @param {object} element The DOM element to scroll into view
     */
     function scrollToElement(element) {
        if (typeof element === 'object') {
            element.scrollIntoView(true);
        }
        else console.error('There is no valid element to scroll to');
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
                    return getTracklistTitleFromElement(persistentElements.header.getElementsByClassName('title')[0]);//(_element);
                case metadataNames.trackCount: 
                    return (window.location.pathname === '/playlist') ? getTrackCountFromElement(persistentElements.header.getElementsByClassName('second-subtitle')[0]) : undefined;
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
        } else console.warn("Tried to extract the track count string from the track count element, but no valid element was provided.");
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