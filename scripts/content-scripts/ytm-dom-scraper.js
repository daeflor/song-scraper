'use strict';
const header = document.querySelector('ytmusic-responsive-header-renderer');
//let scrollContainer = document.body;

// const tracklistMetadata = {
//     type: undefined, 
//     title: undefined, 
//     trackCount: undefined
// };

//if (window.location.host === 'music.youtube.com') {
    // header = document.querySelector('ytmusic-responsive-header-renderer');
    // scrollContainer = document.body; //Set the scroll container element as applicable, for future reference
    
observeHeaderElementMutations(); // Begin observing the YTM Header element for DOM mutations
    
scrapeTracklistMetadata(); // Scrape the header element for tracklist metadata. (This needs to be manually triggered the first time the content script runs e.g. on page refresh)
//}

function observeHeaderElementMutations() {    
    // TODO something changed in the YTM implementation and switching from an invalid page (e.g. not a playlist) to a valid one is not properly registered. Not sure if the issue is here or in background.js
    
    const observer = new MutationObserver(scrapeTracklistMetadata); // Create a new mutation observer instance which will scrape metadata on trigger
    const observerConfig = {childList: true, subtree: false};
    if (typeof header === 'object') { // If the element to observe actually exists in the DOM...
        //TODO This errors out on https://music.youtube.com/library/playlists because header is note a DOM node. Don't think we should even need to watch this on this page. 
            //2024-07-21 Update: I think this is the same issue as above TODO. Maybe I can just switch to observing a higher level element that is consistent throughout the site, if one exists.
        observer.observe(header, observerConfig); // Observing the ytm header element for any changes to its childList
    } else console.error(`Tried observing the YTM header element for DOM mutations, but the element doesn't exist.`);
}

function scrapeTracklistMetadata() {
    console.info(`Scraping DOM for ytm tracklist metadata.`);
    
    // Create an object to store and transmit the current tracklist metadata so it can be easily accessed across the extension
    //const tracklistMetadata = {type: undefined, title: undefined, trackCount: undefined};

    //globalThis.tracklistMetadata.title = (window.location.search.startsWith('?list=PL')) ? scrapeTracklistTitle() : 

    const tracklistMetadata = {
        type: undefined, 
        title: undefined, 
        trackCount: scrapeTrackCount() //TODO should this also only be done if the list is LM or PL?
    };

    //tracklistMetadata.trackCount = scrapeTrackCount();

    // Scrape and record the current tracklist metadata based on the URL
    if (window.location.search.startsWith('?list=LM')) {
        tracklistMetadata.type = 'auto';
        tracklistMetadata.title = 'Your Likes';
        storeMetadata(tracklistMetadata);
    } else if (window.location.search.startsWith('?list=PL')) {
        tracklistMetadata.type = 'playlist';
        tracklistMetadata.title = scrapeTracklistTitle();
        storeMetadata(tracklistMetadata);
    }
}

/**
 * Caches the metadata in Chrome local storage and then informs the service worker
 * @param {Object} metadata The tracklist metadata object to store
 */
function storeMetadata(metadata) {
    // TODO would it be better to store each piece of metadata individually instead of in a single object?
        // That way, if we want to just update partial data (e.g. type in background script) we can do that with just a set, without needing an initial get.            
    chrome.storage.local.set ({currentTracklistMetadata: metadata}, () => {
        if (typeof chrome.runtime.error === 'undefined') {
            const message = { greeting: 'TracklistMetadataUpdated', currentTracklistMetadata: metadata };
            chrome.runtime.sendMessage(message); // Send the metadata to the extension's service worker so it can react accordingly (e.g. updating the extension icon)
        } else console.error(`Error while attempting to store metadata in Chrome local storage:  ${chrome.runtime.lastError.message}`);
    });
}

/**
 * Gets the tracklist title by scraping it from the DOM
 * @returns {string} the title of the current tracklist
 */
function scrapeTracklistTitle() {
    return getTracklistTitleFromElement(header.getElementsByClassName('title')[0]);
}

/**
 * Extracts and returns the tracklist title string from the title element
 * @param {Object} element The DOM element containing the tracklist title
 * @returns {string} The tracklist title as a string
 */
function getTracklistTitleFromElement(element) {
    if (typeof element === 'object') {
        return element.textContent;
    } else console.error(`Tried to extract the tracklist title string from the title element, but no valid element was provided.`);
}

/**
 * Gets the tracklist track count by scraping it from the DOM
 * @returns {number} the track count of the current tracklist
 */
function scrapeTrackCount() {
    if (window.location.pathname === '/playlist') {
        return getTrackCountFromElement(header.getElementsByClassName('second-subtitle')[0]);
    }
}

// TODO could check if YouTube API reports correct track count value for "Your Likes" & consider ONLY using the API to get track counts
/**
 * Extracts the track count string from the track count element and then returns the track count number
 * @param {Object} element The DOM element containing the track count string
 * @returns {number} The tracklist's track count, as a number
 */
function getTrackCountFromElement(element) {
    if (typeof element === 'object') {
        return getTrackCountNumberFromString(element.textContent);
    } else console.warn(`Tried to extract the track count string from the track count element, but no valid element was provided.`);
}

    /**
 * Parses a track count string and returns an integer value
 * @param {string} trackCountString The string containing the track count information
 * @returns {number} The track count as an integer
 */
    function getTrackCountNumberFromString(trackCountString) {
    if (typeof trackCountString === 'string') {
        trackCountString = trackCountString.split(" ")[0]; // Split off any trailing text after the actual number
        trackCountString = trackCountString.replace(/,/g, ""); // Remove any commas from the string (e.g. for counts > 999)
        return parseInt(trackCountString, 10); // Parse the string to get the track count value as an integer and return it
    } else console.error(`Tried to convert a track count string to a number, but the value provided was not a string.`);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(`message received`);
    if (message.greeting === 'GetPlaylists') {
        console.info(`Received a request to retrieve a list of playlists from the DOM.`);
        scrapePlaylists();
    } else if (message.greeting === 'GetTracks') {
        console.info(`Received a request to retrieve a list of tracks from the DOM.`);
        scrapeTracks(tracksArray => {
            message.response = tracksArray;
            sendResponse(message);
        });
    }

    return true; // Return true to keep the message channel open (so the callback can be called asynchronously)
});

/**
 * Extracts a list of all playlists by scraping the playlist elements in the DOM, and then displays a modal dialog with an option to copy the resulting list to the clipboard
 */
async function scrapePlaylists() {
    const firstElementInList = document.querySelector('ytmusic-two-row-item-renderer.style-scope.ytmusic-grid-renderer'); // Find the first track element using query selector.
    if (firstElementInList instanceof Element === true) {
        const elementContainer = firstElementInList.parentElement; // Get the container element
        //TODO should all globalThis properties be under a 'songScraper' property, or break them down into categories (e.g. globalThis.Utilities)?
        const scrapeStartingIndex = globalThis.songScraper.getIndexOfElement(firstElementInList) + 1; // The scrape should start at one greater than the index of the first element in the list. This is because the first element is the 'New playlist' button, which should be skipped. 
        const scrapeMetadataFromElement = element => element.children[0].title;
        const dialog = new globalThis.songScraper.ScrapeInProgressDialog();
        const results = await globalThis.songScraper.scrapeElements(elementContainer, scrapeStartingIndex, scrapeMetadataFromElement); // Initiate the scrape & scroll process
        
        dialog.text = `List of Playlists Successfully Scraped!`;
        dialog.addCopyToClipboardPrompt(results);
    } else console.error(`Tried to scrape the list of playlists, but the first element in the list couldn't be identified.`);
}

/**
 * Extracts a list of tracks by scraping the track row elements in the DOM, and then passes the results along in the provided callback
 * @param {Function} callback The function to execute once the list of tracks has been generated. The callback takes an array of Track Objects as its single parameter.
 */
async function scrapeTracks(callback) {
    const firstElementInList = document.querySelector('ytmusic-responsive-list-item-renderer[should-render-subtitle-separators]'); // Find the first track element using query selector. This selector is used because it currently works across all valid tracklists.
    if (firstElementInList instanceof Element === true) {
        const elementContainer = firstElementInList.parentElement; // Get the container element
        //TODO could make sense to record the track count and see if that exists before scraping again. But would require clearing it anytime it may be invalidated, which is probably more work than just scraping it.
        const expectedElementCount = scrapeTrackCount(); // Fetch the official track count of the tracklist, if one exists. This will be undefined otherwise. 
        const scrapeStartingIndex = globalThis.songScraper.getIndexOfElement(firstElementInList); // Get the index of the first element at which to begin the scrape, since it isn't always necessarily the first element in the container (i.e. can't assume it's 0)  
        const scrapeMetadataFromElement = element => new globalThis.songScraper.Track(element); // Set up the function to execute on each element found in the list. In this case, track metadata will be extracted from the track element.
        const dialog = new globalThis.songScraper.ScrapeInProgressDialog(); // Create a dialog modal to indicate that the scrape is in progress
        const results = await globalThis.songScraper.scrapeElements(elementContainer, scrapeStartingIndex, scrapeMetadataFromElement, expectedElementCount); // Initiate the scrape & scroll process;
        
        callback(results);
        dialog.close();
    } else console.error(`Tried to scrape the tracklist, but the first element in the list couldn't be identified.`); //TODO this should show an error in the popup instead
}