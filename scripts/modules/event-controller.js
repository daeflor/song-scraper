/***** Imports *****/
//UI & App Navigation Controllers
import * as ViewRenderer from './ViewRenderer.js';
import * as UIController from '../AppNavigator.js';

//Utilities
//import getDeltaTracklists from './tracklist-comparison-utilities.js';
import * as tracklistComparisonUtils from './tracklist-comparison-utilities.js';
import * as Messenger from './utilities/messenger.js';
//import sendMessage from './MessageController.js';
//import logOut from './AuthController.js' //TODO use or remove this, as desired

//Authentication
//Due to Chromium Bug 1255412, manual authentication via Chrome Identity API is currently used instead of the Firebase Auth UI flow
//import * as Auth from '../auth/firebase-ui-auth.js'
import * as Auth from '../auth/firebase-manual-auth.js'

//Firebase Configuration
import firebaseConfig from '../Configuration/config.js'; //Import the app's config object needed to initialize Firebase
import '/node_modules/firebase/firebase-app.js'; //Import the Firebase App before any other Firebase libraries

//Storage
import * as appStorage from './StorageManager.js';
import * as chromeStorage from './utilities/chrome-storage-promises.js'
import { getTracksArray as getGPMTracksArray } from '../storage/gpm-storage.js';

//Other
import * as IO from './utilities/IO.js';
import * as customTracklists from '../Configuration/custom-tracklists.js';

//TODO could consider adding to and/or removing from EventController so that it's the central place for all event-driven logic
    //i.e. EventController should dictate & be aware of all events & reactions throughout the app (not sure about auth...)
    //But it shouldn't necessarily handle any in-depth / area-specific logic. It should hand that off to the scripts designated specifically for that and then just get back the results and act on them.
    //If this is done, it turn out that it's unnecessary/unhelpful having ViewRenderer & UI Controller be separate 

const SESSION_STATE = {
    tracklist: {
        title: undefined,
        type: undefined,
        tracks: {
            scraped: undefined,
            stored: undefined // TODO: maybe call this ytm instead of stored?
        },
        deltas: undefined
    },
    tracksNotInCommon: {
        fromLibrary: undefined,
        fromPlaylists: undefined,
        fromGPM: undefined
    }
}

init();

// ? Extension Popup Opened
function init() {
    firebase.initializeApp(firebaseConfig); //Initialize Firebase
}

// User Becomes Authenticated
Auth.listenForAuthStateChange(async () => { // TODO this name is a bit misleading, since the callback only fires on an initial sign-in (i.e. not on sign-out)
    const tracklistMetadata = await chromeStorage.getValueAtKey('local', 'currentTracklistMetadata');

    if (typeof tracklistMetadata?.type === 'string' && typeof tracklistMetadata?.title === 'string') { // If valid tracklist type and title values were retrieved from the local storage cache...
        SESSION_STATE.tracklist.type = tracklistMetadata.type; // Record the tracklist type in the session state object for future reference
        SESSION_STATE.tracklist.title = tracklistMetadata.title; // Record the tracklist title in the session state object for future reference
        UIController.triggerUITransition('ShowLandingPage', {tracklistTitle: tracklistMetadata.title, username: firebase.auth().currentUser.email.split('@')[0]}); // Display the extension landing page
    } else {
        UIController.triggerUITransition('CachedTracklistMetadataInvalid');
    }
});

// Button Pressed: Log In
ViewRenderer.buttons.logIn.addEventListener('click', function() {
    //TODO when the button gets clicked once, it should get disabled, to ensure it doesn't accidentally get clicked again
    Auth.logIn();
});

// Button Pressed: Log Out
ViewRenderer.buttons.logOut.addEventListener('click', function() {
    Auth.logOut(() => { // Log out of Firebase
        UIController.triggerUITransition('LogOutAndExit'); // Show the exiting screen
        chrome.runtime.connect({name: 'AuthenticationChangePending'}); // Open a port so that when the extension popup is closed, the background script will be informed and can update the icon accordingly.
        setTimeout(() => window.close(), 1000); // After a 1 second delay, close the extension popup
    });
});

// Button Pressed: Options
ViewRenderer.buttons.options.addEventListener('click', () => chrome.runtime.openOptionsPage());

// Button Pressed: Scrape Current Tracklist
ViewRenderer.buttons.scrape.addEventListener('click', function() {    
    UIController.triggerUITransition('StartScrape');
    Messenger.sendMessageToContentScripts('GetTracks', tracksArray => {
        if (Array.isArray(tracksArray) === true) { //If the response received is an array... 
            SESSION_STATE.tracklist.tracks.scraped = tracksArray;
            UIController.triggerUITransition('ScrapeSuccessful'); //Transition the UI accordingly
        } else {
            UIController.triggerUITransition('ScrapeFailed');
            console.error("Requested tracklist metadata from content script, but response was not a valid array.");
        }
    });
});

// Button Pressed: Store Scraped Metadata
ViewRenderer.buttons.storeScrapedMetadata.addEventListener('click', async function() {
    UIController.triggerUITransition('StorageInProgress'); // Update the UI while the data is being stored (e.g. disable the 'store' button)

    SESSION_STATE.tracklist.tracks.stored = SESSION_STATE.tracklist.tracks.scraped; // Set the stored tracks array equal to the scraped tracks array, saving it for future reference within the current app session
    
    try {
        // Store the tracklist in Firestore, then store the track count in chrome sync storage, and then update UI
        await appStorage.storeTracklistInFirestore(SESSION_STATE.tracklist.title, SESSION_STATE.tracklist.type, SESSION_STATE.tracklist.tracks.stored);
        await appStorage.storeTrackCountInChromeSyncStorage(SESSION_STATE.tracklist.title, SESSION_STATE.tracklist.tracks.stored.length);
        UIController.triggerUITransition('ScrapedMetadataStored');
    } catch (error) {
        UIController.triggerUITransition('StorageFailed');
        console.error(error);
    }
    //TODO when tracklist data is stored, would it make sense to update the extension icon? I think it could help
});

// Button Pressed: Download Scraped Tracks
ViewRenderer.buttons.downloadScrapedTracks.addEventListener('click', function() {
    triggerCSVDownload(SESSION_STATE.tracklist.tracks.scraped, 'Tracklist_Scraped_' + SESSION_STATE.tracklist.title);
});

// Button Pressed: Download Stored GPM Tracks
ViewRenderer.buttons.downloadGPMTracks.addEventListener('click', async function() {
    const storedTracks = await getGPMTracksArray(SESSION_STATE.tracklist.title); //TODO calling this without the context that it's from gpm-storage.js is not great for readability. Could import the fnc as getGPMTracksArray, perhaps
    triggerCSVDownload(storedTracks, 'Tracklist_GPM_' + SESSION_STATE.tracklist.title);
});

// Button Pressed: Download Stored YTM Tracks
ViewRenderer.buttons.downloadStoredTracks.addEventListener('click', async function() {
    const storedTracks = await getStoredTracksYTM(SESSION_STATE.tracklist.title);
    triggerCSVDownload(storedTracks, 'Tracklist_YTM_' + SESSION_STATE.tracklist.title);
});

//TODO the events below are all very similar and could probably be merged. The only tricky part is that some are async and some aren't, and one uses maps instead of arrays

// Button Pressed: Copy Scraped Tracks to Clipboard
ViewRenderer.buttons.copyToClipboardScrapedTracks.addEventListener('click', function() {
    this.textContent = 'pending'; // As soon as the button is pressed, update the button to show a 'pending' icon
    
    const includedProperties = ['title', 'artist', 'album', 'duration', 'unplayable']; // Set the track properties which should be used when generating the CSV
    const csv = IO.convertArrayOfObjectsToCsv(SESSION_STATE.tracklist.tracks.scraped, includedProperties);

    navigator.clipboard.writeText(csv)
        .then(() => setTimeout(() => this.textContent = 'content_paste', 100),  // Once the CSV data has been copied to the clipboard, update the button to show the 'clipboard' icon again after a brief delay (so that the icon transition is visible)
              () => console.error("Failed to copy CSV to clipboard."));
});

// Button Pressed: Copy Stored (YTM) Tracks to Clipboard
ViewRenderer.buttons.copyToClipboardStoredTracks.addEventListener('click', async function() {
    this.textContent = 'pending'; // As soon as the button is pressed, update the button to show a 'pending' icon
    
    const storedTracks = await getStoredTracksYTM(SESSION_STATE.tracklist.title);

    if (Array.isArray(storedTracks) === true) {
        const includedProperties = ['title', 'artist', 'album', 'duration', 'unplayable']; // Set the track properties which should be used when generating the CSV
        const csv = IO.convertArrayOfObjectsToCsv(storedTracks, includedProperties);

        navigator.clipboard.writeText(csv)
            .then(() => setTimeout(() => this.textContent = 'content_paste', 100),  // Once the CSV data has been copied to the clipboard, update the button to show the 'clipboard' icon again after a brief delay (so that the icon transition is visible)
                    () => console.error("Failed to copy CSV to clipboard."));
    } else console.info("Tried to copy the stored tracklist to the clipboard, but the tracklist could not be found in storage.");
    //TODO maybe update the UI (e.g. button icon) if the tracklist couldn't be found in storage
        //Right now it stays in the pending state, which isn't so bad.
});

// Button Pressed: Copy Delta Track Tables to Clipboard
ViewRenderer.buttons.copyToClipboardDeltaTrackTables.addEventListener('click', async function() {
    this.textContent = 'pending'; // As soon as the button is pressed, update the button to show a 'pending' icon
    
    const deltaTracklists = await getDeltaTracklists();

    if (deltaTracklists instanceof Map === true) {
        const includedProperties = ['title', 'artist', 'album', 'duration', 'unplayable']; // Set the track properties which should be used when generating the CSV.
        const csv = IO.convertObjectMapsToCsv(deltaTracklists, includedProperties, SESSION_STATE.tracklist.title);

        navigator.clipboard.writeText(csv)
            .then(() => setTimeout(() => this.textContent = 'content_paste', 100),  // Once the CSV data has been copied to the clipboard, update the button to show the 'clipboard' icon again after a brief delay (so that the icon transition is visible)
                  () => console.error("Failed to copy CSV to clipboard."));
    } else console.info("Tried to copy the delta track tables to the clipboard, but the delta tracklists could not be generated. This is likely because there is no tracklist available in storage with which to compare the scraped tracklist.");
    //TODO maybe update the UI (e.g. button icon) if the tracklist couldn't be found in storage
        //Right now it stays in the pending state, which isn't so bad.
});

//TODO the functions below have a lot of duplicated code that could be consolidated
// Button Pressed: Copy to Clipboard - Tracks Not In Common From Library
ViewRenderer.buttons.copyToClipboardTracksNotInCommonFromLibrary.addEventListener('click', async function() {
    this.textContent = 'pending'; // As soon as the button is pressed, update the button to show a 'pending' icon
    
    const tracksNotInCommon = await getTracksNotInCommonFromLibrary();

    const includedProperties = ['title', 'artist', 'album', 'duration', 'playlists', 'unplayable']; // Set the track properties which should be used when generating the CSV
    const csv = IO.convertArrayOfObjectsToCsv(tracksNotInCommon, includedProperties);

    navigator.clipboard.writeText(csv)
        .then(() => setTimeout(() => this.textContent = 'content_paste', 100),  // Once the CSV data has been copied to the clipboard, update the button to show the 'clipboard' icon again after a brief delay (so that the icon transition is visible)
              () => console.error("Failed to copy CSV to clipboard."));
});

// Button Pressed: Copy to Clipboard - Tracks Not In Common From Playlists
ViewRenderer.buttons.copyToClipboardTracksNotInCommonFromPlaylists.addEventListener('click', async function() {
    this.textContent = 'pending'; // As soon as the button is pressed, update the button to show a 'pending' icon
    
    const tracksNotInCommon = await getTracksNotInCommonFromPlaylists();

    const includedProperties = ['title', 'artist', 'album', 'duration', 'playlists', 'unplayable']; // Set the track properties which should be used when generating the CSV
    const csv = IO.convertArrayOfObjectsToCsv(tracksNotInCommon, includedProperties);

    navigator.clipboard.writeText(csv)
        .then(() => setTimeout(() => this.textContent = 'content_paste', 100),  // Once the CSV data has been copied to the clipboard, update the button to show the 'clipboard' icon again after a brief delay (so that the icon transition is visible)
              () => console.error("Failed to copy CSV to clipboard."));
});

// Button Pressed: Copy to Clipboard - Tracks Not In Common From GPM
ViewRenderer.buttons.copyToClipboardTracksNotInCommonGPM.addEventListener('click', async function() {
    this.textContent = 'pending'; // As soon as the button is pressed, update the button to show a 'pending' icon
    
    const tracksNotInCommon = await getTracksNotInCommonGPM();

    const includedProperties = ['title', 'artist', 'album', 'duration', 'playlists']; // Set the track properties which should be used when generating the CSV
    const csv = IO.convertArrayOfObjectsToCsv(tracksNotInCommon, includedProperties);

    //TODO consolidate this logic which is repeated a lot.
    navigator.clipboard.writeText(csv)
        .then(() => setTimeout(() => this.textContent = 'content_paste', 100),  // Once the CSV data has been copied to the clipboard, update the button to show the 'clipboard' icon again after a brief delay (so that the icon transition is visible)
              () => console.error("Failed to copy CSV to clipboard."));
});

//TODO I think it would be more intuitive to have the checkbox section above the download/clipboard button sections

// Checkbox Value Changed: Scraped Track Table
ViewRenderer.checkboxes.scrapedTrackTable.addEventListener('change', function() {
    reactToCheckboxChange(SESSION_STATE.tracklist.tracks.scraped, ViewRenderer.tracktables.scraped, this.checked, 'Scraped Tracklist');
});

// Checkbox Value Changed: Stored GPM Track Table
ViewRenderer.checkboxes.gpmTrackTable.addEventListener('change', async function() {
    //TODO it's a bit silly to get the tracks array even in the case when the checkbox is unchecked.
    const storedTracks = await getGPMTracksArray(SESSION_STATE.tracklist.title);
    reactToCheckboxChange(storedTracks, ViewRenderer.tracktables.gpm, this.checked, 'Stored GPM Tracklist');
});

// Checkbox Value Changed: Stored YTM Track Table
ViewRenderer.checkboxes.storedTrackTable.addEventListener('change', async function() {
    const storedTracks = await getStoredTracksYTM(SESSION_STATE.tracklist.title);
    reactToCheckboxChange(storedTracks, ViewRenderer.tracktables.stored, this.checked, 'Stored YTM Tracklist');
});

// TODO could better handle the case where there is no stored tracklist (e.g. because this is the first time the track was scraped)
    // Could consider leaving the checkbox disabled unless both tracklists (scraped & stored) exist
    // But would also be nice to have some feedback about this, such as a message showing up when the checkbox is pressed, indicating a delta cannot yet be displayed
// Checkbox Value Changed: Delta Tracklists
ViewRenderer.checkboxes.deltaTrackTables.addEventListener('change', async function() {
    //TODO I'm trying to get the delta tracklists here even if the checkbox was 'unchecked', which doesn't make much sense.
        //Should try to do this more efficiently
    const deltaTracklists = await getDeltaTracklists();

    reactToCheckboxChange(deltaTracklists, ViewRenderer.tracktables.deltas, this.checked);
});
//TODO Consider displaying the delta tracklists by default once a scrape has been completed

// Checkbox Value Changed: Tracks Not In Common
ViewRenderer.checkboxes.tracksNotInCommonFromLibrary.addEventListener('change', async function() {
    const tracksNotInCommon = await getTracksNotInCommonFromLibrary();
    //TODO this only covers the tracks that are in the Library (i.e. Added from YTM Subscription) but not in Common. It doesn't cover tracks which may be included only in other playlists but not in Common.
    //TODO this doesn't fully work because you can't pass track table columns here and so the new 'playlist' field/column gets omitted.

    reactToCheckboxChange(tracksNotInCommon, ViewRenderer.tracktables.tracksNotInCommonFromLibrary, this.checked, 'Tracks missing from the Common playlist');
});

// Checkbox Value Changed: Tracks Only In Common
ViewRenderer.checkboxes.tracksOnlyInCommon.addEventListener('change', async function() {
    const filteredTracks = await tracklistComparisonUtils.getFilteredTracksWithTracklistMappingYTM('Common', 'Uploaded Songs', ...customTracklists.getCommonPlaylists());

    reactToCheckboxChange(filteredTracks, ViewRenderer.tracktables.tracksOnlyInCommon, this.checked, 'Tracks in the Common playlist missing from others');
});

/***** Helper Functions *****/

/**
 * Triggers a download of a CSV file generated from the provided tracks array
 * @param {Object[]} tracksArray The array of Track objects to convert to a CSV file
 * @param {string} filename The desired name of the CSV file
 */
 function triggerCSVDownload(tracksArray, filename) {    
    if (Array.isArray(tracksArray) === true) {
        const includedProperties = ['title', 'artist', 'album', 'duration', 'unplayable']; // Set the track properties which should be used when generating the CSV
        const csv = IO.convertArrayOfObjectsToCsv(tracksArray, includedProperties);

        IO.downloadTextFile(csv, filename, 'csv');
    } else console.info("Tried to download a tracklist, but the tracklist could not be found in storage.");
    //TODO maybe update the UI (e.g. button icon) if the tracklist couldn't be found in storage
}

/**
 * Displays/Adds or hides the specified track table in the UI, depending on the provided data
 * @param {Object[] | Map} tracksData An array of Track objects or a map of arrays of track objects
 * @param {Element} trackTableElement The track table container element which should be displayed
 * @param {boolean} checked Indicates whether the checkbox is checked or unchecked
 * @param {string} [trackTableTitle] The title of the track table to display in its header in the popup UI
 */
 function reactToCheckboxChange(tracksData, trackTableElement, checked, trackTableTitle) {
    // If the checkbox is checked, display the corresponding track table; Otherwise hide the track table
    if (checked === true) {
        if (trackTableElement.childElementCount > 0) { // If a track table DOM element has previously been created...
            UIController.triggerUITransition('DisplayTrackTable', {trackTableElement: trackTableElement}); // Show the existing element
        } else { // Else, if a track table element doesn't exist yet, create a new one using the provided data and add it to the DOM
            if (Array.isArray(tracksData) === true) {
                //TODO I don't like that Event Controller has to specify the parent element when calling this function. It doesn't make much sense.
                    //Maybe it would help to have a mapping from checkbox element to tracktable element, and from tracktable element to tracktable title
                UIController.createTrackTable(tracksData, trackTableTitle, trackTableElement);
            } else if (tracksData instanceof Map === true) {
                //TODO might be helpful to make this work more consistently for deltas vs stored/scraped tracklists. (e.g. have them both or neither use triggerUITransition, separate the creation of the track tables from adding them to the DOM, etc.)
                UIController.triggerUITransition('AddDeltaTrackTables', {deltaTracklists: tracksData});
            } else console.info("Tried to display a track table, but no tracks data was provided. This is likely because there is no matching tracklist available in storage.");
        }
    } else { // Else, if the checkbox is unchecked, hide the track table element
        ViewRenderer.hideElement(trackTableElement); //TODO this should be handled by UI Controller (i.e. this should be a triggerUITransition call)
    }
}

///////////

//TODO I think this is just here temporarily. I don't think I like the event-controller containing functions like this.
    //Could these go in StorageManager instead?

//TODO could each of the below be an instance of a custom class?
/**
 * Returns the YTM tracks array that matches the given tracklist title, if one exists
 * @param {string} tracklistTitle The title of the tracklist to look for
 * @returns {Promise} A promise containing the YTM tracks array matching the tracklist title, if one exists
 */
async function getStoredTracksYTM(tracklistTitle) {
    // If the YTM tracks array for the current tracklist has previously been fetched, return that array. Otherwise, fetch it from Firestore and then return it
    if (Array.isArray(SESSION_STATE.tracklist.tracks.stored) === false) {
        SESSION_STATE.tracklist.tracks.stored = await appStorage.retrieveTracksArrayFromFirestore(tracklistTitle);
    }

    return SESSION_STATE.tracklist.tracks.stored;
    // SESSION_STATE.tracklist.tracks.stored = SESSION_STATE.tracklist.tracks.stored ?? await appStorage.retrieveTracksFromFirestore(tracklistTitle);
    // return SESSION_STATE.tracklist.tracks.stored;
}

/**
 * Get a map containing the delta tracklists
 * @returns {Promise} A promise with a map containing the various delta tracklists (Added, Removed, Unplayable)
 */
async function getDeltaTracklists() {
    if (SESSION_STATE.tracklist.deltas instanceof Map === false) {
        const comparisonMethod = await appStorage.getPreferencesFromChromeSyncStorage('Comparison Method');
        console.info("Comparison method found in user's preferences: " + comparisonMethod);

        let tracksUsedForDelta = undefined;
        let appUsedForDelta = 'YTM';

        // If the selected comparison method is to use YouTube Music only or whenever possible, get the tracks from Firestore
        if (comparisonMethod === 'alwaysYTM' || comparisonMethod === 'preferYTM') {
            tracksUsedForDelta = await getStoredTracksYTM(SESSION_STATE.tracklist.title);
        }

        // If the selected comparison method is to use only Google Play Music, or to use GPM as a fallback and the tracklist was not found in the YTM stored tracks, get the tracks from the GPM data in Chrome local storage
        if (comparisonMethod === 'alwaysGPM' || (comparisonMethod === 'preferYTM' && typeof tracksUsedForDelta === 'undefined')) {
            tracksUsedForDelta = await getGPMTracksArray(SESSION_STATE.tracklist.title);
            appUsedForDelta = 'GPM';
        }

        // If a valid array of tracks was found in storage, use that to compare with the scraped tracks & generate the deltas, and update the deltas checkbox label accordingly
        if (Array.isArray(tracksUsedForDelta) === true) {
            SESSION_STATE.tracklist.deltas = tracklistComparisonUtils.generateDeltaTracklists(SESSION_STATE.tracklist.tracks.scraped, tracksUsedForDelta); // Generate delta tracklists based on the scraped and stored tracklists
            UIController.triggerUITransition('UpdateDeltaLabel', {appUsedForDelta: appUsedForDelta});
            //TODO it would be nice to update the checkbox label earlier in the UX flow than this...
        }
    } else console.info("Tracklist Delta map already exists so a new one won't be created.");
                    
    return SESSION_STATE.tracklist.deltas;
}

//The functions below don't really belong in this file

/**
 * Returns the array of tracks from the YTM Library that aren't in the Common playlist
 * @returns {Promise} A promise containing the array of tracks
 */
 async function getTracksNotInCommonFromLibrary() {
    // If the list of tracks has previously been calculated, return that array. Otherwise, calculate it, save it for future reference, and return it
    if (Array.isArray(SESSION_STATE.tracksNotInCommon.fromLibrary) === false) {
        SESSION_STATE.tracksNotInCommon.fromLibrary = await tracklistComparisonUtils.getFilteredTracksWithTracklistMappingYTM('Added from YouTube Music', 'Common', ...customTracklists.getNonCommonPlaylists());
        //TODO after generating the list of tracks, consider filtering out any where the only 'playlist' containing them is 'Your Likes'
    }

    return SESSION_STATE.tracksNotInCommon.fromLibrary;
}

/**
 * Returns the array of tracks from YTM playlists that aren't in the Common playlist
 * @returns {Promise} A promise containing the array of tracks
 */
 async function getTracksNotInCommonFromPlaylists() {
    // If the list of tracks has previously been calculated, return that array. Otherwise, calculate it, save it for future reference, and return it
    if (Array.isArray(SESSION_STATE.tracksNotInCommon.fromPlaylists) === false) {
        SESSION_STATE.tracksNotInCommon.fromPlaylists = await tracklistComparisonUtils.getTracksNotInCommonFromPlaylists();
    }

    return SESSION_STATE.tracksNotInCommon.fromPlaylists;
}

/**
 * Returns the array of tracks from the GPM Library that aren't in the Common playlist
 * @returns {Promise} A promise containing the array of tracks
 */
 async function getTracksNotInCommonGPM() {
    // If the list of tracks has previously been calculated, return that array. Otherwise, calculate it, save it for future reference, and return it
    if (Array.isArray(SESSION_STATE.tracksNotInCommon.fromGPM) === false) {
        SESSION_STATE.tracksNotInCommon.fromGPM = await tracklistComparisonUtils.getFilteredTracksWithTracklistMappingGPM(
            'ADDED FROM MY SUBSCRIPTION', ...customTracklists.getCommonPlaylistsGPM(), ...customTracklists.getNonCommonPlaylistsGPM());
    }

    return SESSION_STATE.tracksNotInCommon.fromGPM;
}


