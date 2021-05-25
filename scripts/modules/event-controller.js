import * as ViewRenderer from './ViewRenderer.js';
import * as UIController from '../AppNavigator.js';
import * as Messenger from './utilities/messenger.js';
//import sendMessage from './MessageController.js';
//import logOut from './AuthController.js' //TODO use or remove this, as desired
import * as Auth from '../auth/firebase-ui-auth.js'

import firebaseConfig from '../Configuration/Config.js'; //Import the app's config object needed to initialize Firebase
import '/node_modules/firebase/firebase-app.js'; //Import the Firebase App before any other Firebase libraries

import * as appStorage from './StorageManager.js';
import * as chromeStorage from './utilities/chrome-storage-promises.js'
import * as IO from './utilities/IO.js';

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
            stored: undefined, // TODO: maybe call this ytm instead of stored?
            gpm: undefined
        },
        deltas: undefined
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

// // Button Pressed: Log In
// ViewRenderer.buttons.logIn.addEventListener('click', function() {
//     //TODO when the button gets clicked once, it should get disabled, to ensure it doesn't accidentally get clicked again
//     Auth.logIn();
//     // Messenger.sendMessageToExtension('GetAuthToken', token => {
//     //     const credential = firebase.auth.GoogleAuthProvider.credential(null, token); 
//     //     firebase.auth().signInWithCredential(credential); //TODO could use some error checking here (e.g. a 'catch' block)
//     // });
// });

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
    //TODO when tracklist data is stored, would it make sense to update the extension icon? I think it would help
});

// Button Pressed: Export Scraped Tracklist 
ViewRenderer.buttons.exportScrapedMetadata.addEventListener('click', function() {
    const filename = 'TracklistAfterScrape_' + SESSION_STATE.tracklist.title;
    const includedProperties = ['title', 'artist', 'album', 'duration', 'unplayable']; // Set the track properties which should be used when generating the CSV.
    IO.convertArrayOfObjectsToCsv(SESSION_STATE.tracklist.tracks.scraped, filename, includedProperties);
});

// Button Pressed: Export Stored GPM Tracklist 
ViewRenderer.buttons.exportStoredMetadata.addEventListener('click', async function() {
    const storedTracks = await getStoredTracksGPM(SESSION_STATE.tracklist.title);
    const filename = 'TracklistBefore_' + SESSION_STATE.tracklist.title;
    const includedProperties = ['title', 'artist', 'album', 'duration', 'unplayable']; // Set the track properties which should be used when generating the CSV.
    IO.convertArrayOfObjectsToCsv(storedTracks, filename, includedProperties); 
    //TODO it's unclear that convertArrayOfObjectsToCsv triggers a download, while convertObjectMapsToCsv (used below) does not
        //Should standardize this to have them both just return a CSV, and have the download be triggered separately
});

//TODO maybe put little download buttons next to the clipboard button, which can be used to download the csv for each tracklist

// Button Pressed: Copy to Clipboard
ViewRenderer.buttons.copyToClipboard.addEventListener('click', function() {
    ViewRenderer.buttons.copyToClipboard.firstElementChild.textContent = 'pending'; // As soon as the button is pressed, update the button to show a 'pending' icon
    
    const includedProperties = ['title', 'artist', 'album', 'duration', 'unplayable']; // Set the track properties which should be used when generating the CSV.
    const csv = IO.convertObjectMapsToCsv(SESSION_STATE.tracklist.deltas, includedProperties, SESSION_STATE.tracklist.title);

    navigator.clipboard.writeText(csv)
        .then(() => setTimeout(() => ViewRenderer.buttons.copyToClipboard.firstElementChild.textContent = 'content_paste', 100),  // Once the CSV data has been copied to the clipboard, update the button to show the 'clipboard' icon again after a brief delay (so that the icon transition is visible)
              () => console.error("Failed to copy delta tracklist CSV to clipboard."));
});

// // Button Pressed: Export Selected Lists
// ViewRenderer.buttons.exportSelectedLists.addEventListener('click', function() {
//     if (ViewRenderer.checkboxes.scrapedTrackTable.checked === true) {

//     }
//     if (ViewRenderer.checkboxes.storedTrackTable.checked === true) {

//     }
//     if (ViewRenderer.checkboxes.deltaTrackTables.checked === true) {
//         UIController.downloadDeltaListAsCSV();
//     }
// });

//TODO it does seem like the 3 listeners below could all be merged into one somehow, since they all follow the exact same pattern
    //Would just need to know how to map/link from a checkbox to a tracktable and to a UI controller callback/function

// Checkbox Value Changed: Scraped Track Table
ViewRenderer.checkboxes.scrapedTrackTable.addEventListener('change', function() {
    // If the checkbox is checked, display the scraped tracklist metadata; Otherwise hide it
    if (ViewRenderer.checkboxes.scrapedTrackTable.checked === true) {
        if (ViewRenderer.tracktables.scraped.childElementCount > 0) { // If a track table DOM element has previously been created...
            UIController.triggerUITransition('DisplayTrackTable', {tableName: 'scraped'}); // Show the existing element
            //ViewRenderer.unhideElement(ViewRenderer.tracktables.scraped); 
        } else { // Else, if a track table element doesn't exist yet, create a new one using the scraped metadata and add it to the DOM
            UIController.createTrackTable(SESSION_STATE.tracklist.tracks.scraped, 'Scraped Tracklist', ViewRenderer.tracktables.scraped);
            // TODO this interaction with ViewRenderer is WIP
        }
        //TODO Implement:
        //UIController.triggerUITransition('CheckboxChecked');
    } else { // Else, if the checkbox is unchecked, hide the track table element
        ViewRenderer.hideElement(ViewRenderer.tracktables.scraped);

        //TODO Still need to implement this:
            //If (allCheckboxesUnchecked() === true) {
            //     UIController.triggerUITransition('AllCheckboxesUnchecked');
            // }
    }
});

// Checkbox Value Changed: Stored YTM Track Table
ViewRenderer.checkboxes.storedTrackTable.addEventListener('change', async function() {
    // If the checkbox is checked, display the stored metadata for the current tracklist; Otherwise hide it
    if (ViewRenderer.checkboxes.storedTrackTable.checked === true) {
        if (ViewRenderer.tracktables.stored.childElementCount > 0) { // If a track table DOM element has previously been created...
            UIController.triggerUITransition('DisplayTrackTable', {tableName: 'stored'}); // Show the existing element
            //ViewRenderer.unhideElement(ViewRenderer.tracktables.stored); 
        } else { // Else, if a track table element doesn't exist yet, create a new one using the metadata from storage and add it to the DOM
            const storedTracks = await getStoredTracksYTM(SESSION_STATE.tracklist.title);
            if (Array.isArray(storedTracks) === true) {
                UIController.createTrackTable(storedTracks, 'Stored YTM Tracklist', ViewRenderer.tracktables.stored);
            } else console.info("Tried to display the stored tracklist, but the tracklist could not be found in storage.");
        }
        //TODO Implement:
        //UIController.triggerUITransition('CheckboxChecked');
    } else { // Else, if the checkbox is unchecked, hide the track table element
        ViewRenderer.hideElement(ViewRenderer.tracktables.stored);

        //TODO Still need to implement this:
            //If (allCheckboxesUnchecked() === true) {
            //     UIController.triggerUITransition('AllCheckboxesUnchecked');
            // }
    }
});

// TODO need to handle the case where there is no stored tracklist (e.g. because this is the first time the track was scraped)
    // Could consider leaving the checkbox disabled unless both tracklists (scraped & stored) exist
    // But would also be nice to have some feedback about this, such as a message showing up when the checkbox is pressed, indicating a delta cannot yet be displayed
// Checkbox Value Changed: Delta Tracklists
ViewRenderer.checkboxes.deltaTrackTables.addEventListener('change', async function() {
    // If the checkbox is checked, display the delta tracklists metadata; Otherwise hide them
    if (ViewRenderer.checkboxes.deltaTrackTables.checked === true) {

        //UIController.triggerUITransition('DisplayDeltaTrackTables');

        if (ViewRenderer.tracktables.deltas.childElementCount > 0) { // If the track table DOM elements have previously been created...
            
            UIController.triggerUITransition('DisplayTrackTable', {tableName: 'deltas'});
            //ViewRenderer.unhideElement(ViewRenderer.tracktables.deltas); // Show the existing elements
            //ViewRenderer.unhideElement(ViewRenderer.buttons.copyToClipboard);
            //TODO should probably trigger a UI transition instead of calling ViewRenderer functions directly
        } else { // Else, if the track table elements dont exist yet...      
            const comparisonMethod = await appStorage.getPreferencesFromChromeSyncStorage('Comparison Method');
            console.log("Comparison method found in user's preferences: " + comparisonMethod);

            let tracksUsedForDelta = undefined;
            let appUsedForDelta = 'YTM';

            // If the selected comparison method is to use YouTube Music only or whenever possible, get the tracks from Firestore
            if (comparisonMethod === 'alwaysYTM' || comparisonMethod === 'preferYTM') {
                tracksUsedForDelta = await getStoredTracksYTM(SESSION_STATE.tracklist.title);
            }

            // If the selected comparison method is to use only Google Play Music, or to use GPM as a fallback and the tracklist was not found in the YTM stored tracks, get the tracks from the GPM data in Chrome local storage
            if (comparisonMethod === 'alwaysGPM' || (comparisonMethod === 'preferYTM' && typeof tracksUsedForDelta === 'undefined')) {
                tracksUsedForDelta = await getStoredTracksGPM(SESSION_STATE.tracklist.title);
                appUsedForDelta = 'GPM';
            }
            
            if (typeof tracksUsedForDelta !== 'undefined') {
                SESSION_STATE.tracklist.deltas = UIController.getDeltaTracklists(SESSION_STATE.tracklist.tracks.scraped, tracksUsedForDelta); // Generate delta tracklists based on the scraped and stored tracklists
                UIController.triggerUITransition('AddDeltaTrackTables', {deltaTracklists: SESSION_STATE.tracklist.deltas, appUsedForDelta: appUsedForDelta});
                //UIController.triggerUITransition('DisplayTrackTable', {tableName: 'deltas'});
                //ViewRenderer.unhideElement(ViewRenderer.buttons.copyToClipboard);
            }
        }
    } else { // Else, if the checkbox is unchecked, hide the track table elements
        ViewRenderer.hideElement(ViewRenderer.tracktables.deltas);
        ViewRenderer.hideElement(ViewRenderer.buttons.copyToClipboard);
        //TODO Still need to implement this:
            //If (allCheckboxesUnchecked() === true) {
            //     UIController.triggerUITransition('AllCheckboxesUnchecked');
            // }
    }
});

///////////

//TODO I think this is just here temporarily. I don't think I like the event-controller containing functions like this.
    //Could these go in StorageManager instead?
/**
 * Returns the YTM tracks array that matches the given tracklist title, if one exists
 * @param {string} tracklistTitle The title of the tracklist to look for
 * @returns {Promise} A promise containing the YTM tracks array matching the tracklist title, if one exists
 */
async function getStoredTracksYTM(tracklistTitle) {
    // If the YTM tracks array for the current tracklist has previously been fetched, return that array. Otherwise, fetch it from Firestore and then return it
    if (Array.isArray(SESSION_STATE.tracklist.tracks.stored) === false) {
        SESSION_STATE.tracklist.tracks.stored = await appStorage.retrieveTracksFromFirestore(tracklistTitle);
    }

    return SESSION_STATE.tracklist.tracks.stored; 
    // SESSION_STATE.tracklist.tracks.stored = SESSION_STATE.tracklist.tracks.stored ?? await appStorage.retrieveTracksFromFirestore(tracklistTitle);
    // return SESSION_STATE.tracklist.tracks.stored; 
}

//TODO could merge the YTM & GPM functions (above and below) but not sure if that would actually be helpful
/**
 * Returns the GPM tracks array that matches the given tracklist title, if one exists
 * @param {string} tracklistTitle The title of the tracklist to look for
 * @returns {Promise} A promise containing the GPM tracks array matching the tracklist title, if one exists
 */
async function getStoredTracksGPM(tracklistTitle) {
    // If the GPM tracks array for the current tracklist has previously been fetched, return that array. Otherwise, fetch it from local storage and then return it
    if (Array.isArray(SESSION_STATE.tracklist.tracks.gpm) === false) {
        SESSION_STATE.tracklist.tracks.gpm = await appStorage.retrieveGPMTracklistFromLocalStorage(tracklistTitle);
    }
    
    return SESSION_STATE.tracklist.tracks.gpm; 
}
