'use strict';
(function() {
    /**
     * Creates a track object that contains properties for each piece of metadata scraped from the DOM
     */
    class Track {
        constructor(trackContainerElement) {
            if (currentApp === supportedApps.youTubeMusic) {
                const metadataElements = trackContainerElement.getElementsByTagName('yt-formatted-string');
                if (metadataElements[0] instanceof Element === true) {
                    this.title = metadataElements[0].title;
                } else console.error("Track title could not be retrieved from DOM.");

                if (metadataElements[1] instanceof Element === true) {
                    this.artist = metadataElements[1].title;
                } else console.error("Artist could not be retrieved from DOM.");

                if (metadataElements[2] instanceof Element === true) {
                    this.album = metadataElements[2].title;
                } else console.error("Album could not be retrieved from DOM.");

                if (metadataElements[3] instanceof Element === true) {
                    this.duration = metadataElements[3].title;
                } else console.warn("Duration could not be retrieved from DOM.");
                //this.duration = metadataElements[3]?.title || '';

                if (trackContainerElement.hasAttribute('unplayable')) { //Note: <if (trackContainerElement.unplayable_ === true)> should work but it doesn't for some reason
                    this.unplayable = true;
                    console.info("Encountered an unplayable track with title: " + this.title);
                }
            }
        }
    }

    class CustomButton {
        #buttonElement;
        constructor(text) {
            this.#buttonElement = document.createElement('button');
            this.#buttonElement.textContent= text;
            this.#buttonElement.style.margin = '10px';
            this.#buttonElement.style.color = '#505739';
            this.#buttonElement.style.backgroundColor = '#eae0c2';
            this.#buttonElement.style.padding = '10px';
            this.#buttonElement.style.borderRadius = '15px';
        }

        get element() {
            return this.#buttonElement;
        }
    }

    class ScrapeInProgressDialog {
        #dialog;
        #dialogText;
        constructor() {
            this.#dialog = document.createElement('dialog');
            this.#dialog.style.textAlign = 'center';
            this.#dialog.style.color = '#FFCC66';
            this.#dialog.style.backgroundColor = '#303030';
            this.#dialog.style.fontFamily = 'Gill Sans';

            this.#dialog.addEventListener('close', () => this.#dialog.remove());

            this.#dialogText = document.createElement('h3');
            this.#dialogText.textContent = 'Scrape In Progress...';
            this.#dialogText.style.marginBottom = '5px';
            
            this.#dialog.append(this.#dialogText);
            document.body.append(this.#dialog);

            this.#dialog.showModal();
        }

        /**
         * Updates the text displayed in the dialog
         * @param {string} value The text string value to show in the dialog modal
         */
        set text(value) {
            this.#dialogText.textContent = value;
        }

        /**
         * Closes the dialog modal
         */
        close() {
            this.#dialog.close();
        }

        /**
         * Adds a form to the dialog that prompts the user to copy the provided data to the clipboard
         * @param {string[]} results An array of strings that will be converted to a csv and copied to the clipboard if the corresponding button is pressed
         */
        addCopyToClipboardPrompt(results) {
            const closeButton = new CustomButton('Close').element;
            const clipboardButton = new CustomButton('Copy to Clipboard').element;
            clipboardButton.addEventListener('click', () => navigator.clipboard.writeText(convertArrayToSingleColumnCSV(results)));

            const form = document.createElement('form');
            form.method = 'dialog';
            form.append(closeButton, clipboardButton);
            this.#dialog.append(form);
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
            persistentElements.header = document.querySelector('ytmusic-responsive-header-renderer');
            persistentElements.scrollContainer = document.body; //Set the scroll container element as applicable, for future reference
            observeHeaderElementMutations(); //Begin observing the YTM Header element for DOM mutations
            scrapeTracklistMetadata(); //Scrape the header element for tracklist metadata. (This needs to be manually triggered the first time the content script runs e.g. on page refresh)
        } else console.error("Tried to initialize data in the content scraper script, but the host was not recognized.");        
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.greeting === 'GetTracks') {
            console.info("Content Script: Received a request to retrieve a list of tracks from the DOM.");
            getTracks(tracksArray => {
                message.response = tracksArray;
                sendResponse(message);
            });
        }
        
        return true; // Return true to keep the message channel open (so the callback can be called asynchronously)
    });

    chrome.runtime.onMessage.addListener(message => {
        if (message.greeting === 'GetPlaylists') {
            console.info("Content Script: Received a request to retrieve a list of playlists from the DOM.");
            getPlaylists();
        }
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
        //TODO something changed in the YTM implementation and switching from an invalid page (e.g. not a playlist) to a valid one is not properly registered. Not sure if the issue is here or in background.js
        const _observer = new MutationObserver(scrapeTracklistMetadata); //Create a new mutation observer instance linked to the callback function defined above
        const _observerConfig = {childList: true, subtree: false}; //Set up the configuration options for the Mutation Observer
        if (typeof persistentElements.header === 'object') { //If the element to observe actually exists in the DOM...
            _observer.observe(persistentElements.header, _observerConfig); //Start observing the specified element for configured mutations (i.e. for any changes to its childList)
        } else console.error("Tried observing the YTM header element for DOM mutations, but the element doesn't exist.");
    }

    function scrapeTracklistMetadata() {
        if (currentApp === supportedApps.youTubeMusic) {
            console.info("Scraping 'header' element in DOM for tracklist metadata.");
            //Create an object to store and transmit the current tracklist metadata so it can be easily accessed across the extension
            const tracklistMetadata = {type: undefined, title: undefined, trackCount: undefined};

            //Scrape and record the current tracklist metadata based on the URL
            if (window.location.search.startsWith('?list=LM')) {
                tracklistMetadata.type = supportedTracklistTypes.autoPlaylist;
                tracklistMetadata.title = 'Your Likes';
                tracklistMetadata.trackCount = scrapeTrackCount();
            } else if (window.location.search.startsWith('?list=PL')) {
                tracklistMetadata.type = supportedTracklistTypes.playlist;
                tracklistMetadata.title = scrapeTracklistTitle();
                tracklistMetadata.trackCount = scrapeTrackCount();
            }

            if (typeof tracklistMetadata.type === 'string') { //If a valid tracklist type was set (i.e. the current page is a valid tracklist)...
                //TODO would it be better to store each piece of metadata individually instead of in a single object?
                    //That way, if we want to just update partial data (e.g. type in background script) we can do that with just a set, without needing an initial get.            
                chrome.storage.local.set ({currentTracklistMetadata: tracklistMetadata}, () => { //Cache the metadata in local storage
                    if (typeof chrome.runtime.error === 'undefined') {
                        const message = { greeting: 'TracklistMetadataUpdated', currentTracklistMetadata: tracklistMetadata };
                        chrome.runtime.sendMessage(message); //Send the metadata to the extension's service worker so it can update the icon accordingly
                    } else console.error("Error encountered while attempting to store metadata in local storage: " + chrome.runtime.lastError.message);
                });
            }
        }
    }
    
    /**
     * Extracts a list of all playlists by scraping the playlist elements in the DOM, and then displays a modal dialog with an option to copy the resulting list to the clipboard
     */
    async function getPlaylists() {
        const firstElementInList = document.querySelector('ytmusic-two-row-item-renderer.style-scope.ytmusic-grid-renderer'); // Find the first track element using query selector.
        if (firstElementInList instanceof Element === true) {
            const elementContainer = firstElementInList.parentElement; // Get the container element
            const scrapeStartingIndex = getIndexOfElement(firstElementInList) + 1; // The scrape should start at one greater than the index of the first element in the list. This is because the first element is the 'New playlist' button, which should be skipped. 
            const scrapeMetadataFromElement = element => element.children[0].title;
            const dialog = new ScrapeInProgressDialog();
            const results = await scrapeElements(elementContainer, scrapeStartingIndex, scrapeMetadataFromElement); //Initiate the scrape & scroll process;
            
            dialog.text = 'List of Playlists Successfully Scraped!';
            dialog.addCopyToClipboardPrompt(results);
        } else console.error("Tried to scrape the list of playlists, but the first element in the list couldn't be identified.");
    }

    /**
     * Extracts a list of tracks by scraping the track row elements in the DOM, and then passes the results along in the provided callback
     * @param {Function} callback The function to execute once the list of tracks has been generated. The callback takes an array of Track Objects as its single parameter.
     */
     async function getTracks(callback) {
        const firstElementInList = document.querySelector('ytmusic-responsive-list-item-renderer[should-render-subtitle-separators]'); // Find the first track element using query selector. This selector is used because it currently works across all valid tracklists.
        if (firstElementInList instanceof Element === true) {
            const elementContainer = firstElementInList.parentElement; // Get the container element
            const expectedElementCount = scrapeTrackCount(); // Fetch the official track count of the tracklist, if one exists. This will be undefined otherwise. 
            const scrapeStartingIndex = getIndexOfElement(firstElementInList); // Get the index of the first element at which to begin the scrape, since it isn't always necessarily the first element in the container (i.e. can't assume it's 0)  
            const scrapeMetadataFromElement = element => new Track(element); // Set up the function to execute on each element found in the list. In this case, track metadata will be extracted from the track element.
            const dialog = new ScrapeInProgressDialog(); // Create a dialog modal to indicate that the scrape is in progress
            const results = await scrapeElements(elementContainer, scrapeStartingIndex, scrapeMetadataFromElement, expectedElementCount); // Initiate the scrape & scroll process;
            callback(results);
            dialog.close();
        } else console.error("Tried to scrape the tracklist, but the first element in the list couldn't be identified."); //TODO this should show an error in the popup instead
    }

    /**
     * Runs through a process that scrolls through the given list of elements and scrapes metadata out of each of the elements
     * @param {Object} elementContainer The container element wrapping all the individual elements to scrape
     * @param {number} scrapeStartingIndex The index within the container element at which to begin the initial scrape
     * @param {function} scrapeElementFunction The function to execute on each individual element to extract metadata from it
     * @param {number} [expectedElementCount] An optional parameter indicating the expected element count for the list, if available
     * @returns {Promise} A promise with an array of the metadata scraped from each element
     */
    function scrapeElements(elementContainer, scrapeStartingIndex, scrapeElementFunction, expectedElementCount) {
        return new Promise(resolve => {
            const elementCollection = elementContainer.children;
            const results = []; // Create an array to store the metadata scraped from each element in the list
            let scrollingTimeoutID = undefined; // Variable tracking the timeout to end the scroll & scrape process, in case no changes to the container element are observed for a while

            const triggerDelayedScrape = (delay=100) => setTimeout(scrapeLoadedElements, delay); // Set up the function to trigger a scrape of the loaded element after a brief delay. This allows time for all the sub-elements in the DOM to load.

            const scrapeLoadedElements = () => { // Set up the function to scrape the set of elements most recently loaded in the DOM
                clearTimeout(scrollingTimeoutID); // Since there are still elements available to scrape, clear the timeout that would otherwise end the scrolling process after a few seconds. The timeout will be reset if the scrape isn't complete after the upcoming scrape.        
                
                for (let i = scrapeStartingIndex; i < (elementCollection.length); i++) { // For each new element loaded in the DOM...
                    results.push(scrapeElementFunction(elementCollection[i])); // Scrape the metadata from the element and add it to the metadata array
                }

                if (results.length === expectedElementCount) { // If there is an expected element count and it matches the length of the metadata array...
                    // Note: This currently works for the 'Your Likes' list even though the expected/displayed track count is incorrect. This is is because the displayed track count is bigger than the actual one. If it was the other way around, it's possible the resulting scraped tracklist could be incorrect.
                    endScrape(); // End the scrape
                } else { // Else, if the scrape isn't complete or the expected element count is unknown...
                    scrollToElement(elementCollection[elementCollection.length-1]); // Scroll to the last available child element in the container
                    scrapeStartingIndex = elementCollection.length; // Set the starting index for the next scrape to be one greater than the index of the last child element from the previous scrape
                    scrollingTimeoutID = setTimeout(endScrape, 10000); // Set a timeout to end the scrolling if no new changes to the container element have been observed for a while. This avoids infinite scrolling when the expected element count is unknown, or if an unexpected issue is encountered.
                }
            }

            const endScrape = () => { // Set up the function to execute once the scrape & scroll process has either been successfully completed or timed out
                allowManualScrolling(persistentElements.scrollContainer, true); // Allow the user to scroll manually again //TODO the scrollContainer should probably be a parameter
                observer.disconnect(); // Disconnect the mutation observer
                resolve(results); // Resolve the promise along with the resulting array of scraped metadata
            }

            allowManualScrolling(persistentElements.scrollContainer, false); //Temporarily disable manual scrolling to avoid any interference from the user during the scrape process
            scrollToTopOfContainer(persistentElements.scrollContainer); //Scroll to the top of the tracklist, as an extra safety measure just to be certain that no tracks are missed in the scrape. (Note: This step likely isn't necessary in YTM since it appears the track row elements never get removed from the DOM no matter how far down a list you scroll).

            const observer = new MutationObserver(triggerDelayedScrape); // Create a new mutation observer instance which triggers a scrape of the loaded elements after a brief delay (which allows time for all the sub-elements in the DOM to load).
            const observerConfig = {childList: true}; // Set up the configuration options for the Mutation Observer to watch for changes to the element's childList
            observer.observe(elementContainer, observerConfig); // Start observing the container element for configured mutations (i.e. for any changes to its childList)
            
            triggerDelayedScrape(); // Wait a short amount of time to allow the page to scroll to the top of the tracklist, and then begin the scrape & scroll process
        });
    }

    /**
     * Gets the index of the provided element within it's parent element's list of children
     * @param {Object} element The element for which to get an index
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
     * @param {Object} container The container element to scroll to the top of
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
     * @param {Object} element The DOM element to scroll into view
     */
     function scrollToElement(element) {
        if (typeof element === 'object') {
            element.scrollIntoView(true);
        }
        else console.error('There is no valid element to scroll to');
    }

    /**
     * Gets the tracklist track count by scraping it from the DOM
     * @returns {number} the track count of the current tracklist
     */
    function scrapeTrackCount() {
        if (currentApp === supportedApps.youTubeMusic && window.location.pathname === '/playlist') {
            return getTrackCountFromElement(persistentElements.header.getElementsByClassName('second-subtitle')[0]);
        }
    }

    /**
     * Gets the tracklist title by scraping it from the DOM
     * @returns {string} the title of the current tracklist
     */
     function scrapeTracklistTitle() {
        if (currentApp === supportedApps.youTubeMusic) {
            return getTracklistTitleFromElement(persistentElements.header.getElementsByClassName('title')[0]);
        }
    }

    //TODO this extra step seems unnecessary now, since the other elements are 'static'
        //...(i.e. header, tracksContainer, & scrollContainer don't change, so we can just fetch then once on script load)
    // /**
    //  * Gets a DOM element from the name provided
    //  * @param {string} name The name of the DOM element to look for. Supported names are included in the 'metadataNames' object.
    //  * @returns {Object} The element matching the name provided
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
     * @param {Object} element The DOM element containing the tracklist title
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
     * @param {Object} element The DOM element containing the track count string
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

    function convertArrayToSingleColumnCSV(array) {
        if (Array.isArray(array) === true) { // If a valid array was provided, convert it to a single column CSV
            let csv = '';
            for (const element of array) {
                csv += element + '\r\n';
            }

            return csv;
        } else throw Error("Tried to convert an array to a single-column CSV but a valid array was not provided.");  
    }

    init();
})();
