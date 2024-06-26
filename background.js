/***** Imports *****/
//TODO once Chrome 91 is released and ES6 modules can be used (supposedly), consider splitting up background.js into various files (e.g. background-event-controller.js and others)

//Firebase Configuration
import '/node_modules/firebase/firebase-app.js'; //Import the Firebase App before any other Firebase libraries
import '/node_modules/firebase/firebase-auth.js'; //Import the Firebase Auth library
import firebaseConfig from '/scripts/Configuration/config.js'; //Import the app's config object needed to initialize Firebase

//Utilities
import * as gpmStorage from '/scripts/storage/gpm-storage.js';
import * as storage from './scripts/storage/storage.js'
import * as options from './scripts/options/options-storage.js';

//Tests
//import './tests/chrome-storage-tests.js';

console.info("Starting service worker");

const ICON_PATHS = Object.freeze({
    default: 'images/icon.png',
    disabled: 'images/icon_disabled.png'
});

// When the extension is installed or reloaded, create the context menus and set a default/initial comparison method preference value, if it isn't set already
chrome.runtime.onInstalled.addListener(async function() {
    chrome.contextMenus.create({
        id: 'contextMenu_scrapePlaylists',
        title: "Get List of Playlists",
        documentUrlPatterns: ['https://music.youtube.com/library/playlists']
    });
    chrome.contextMenus.create({
        id: 'contextMenu_getGPMTracklists',
        title: "Print List of GPM Tracklists to Console",
        documentUrlPatterns: ['https://music.youtube.com/library/playlists']
    });
});

if (firebase.apps.length === 0) { // If Firebase has not yet been initialized (i.e. if the extension was just installed)...
    console.info("Initializing Firebase, since it wasn't already initialized.");
    
    firebase.initializeApp(firebaseConfig); // Initialize Firebase
    firebase.auth(); // "Initialize" Firebase auth - TODO this is janky. It doesn't really seem necessary to do this, given how we're using firebase elsewhere in this script. Not including this triggers a warning when Firebase auth is first reference later in this script, however (nested under other listeners).
    chrome.action.disable(); // Disable the extension's icons on all tabs
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'contextMenu_scrapePlaylists') {
        chrome.tabs.sendMessage(tab.id, {greeting:'GetPlaylists'});
    } else if (info.menuItemId === 'contextMenu_getGPMTracklists') {
        const gpmTracklists = await gpmStorage.getLibraryData('tracklistTitles');
        console.table(gpmTracklists);
    }
});

/**
 * Triggers when a a page change is detected (via History API).
 * Resulting behavior depends on the loaded page (i.e. custom behavior for Uploaded & Subscribed song pages; disable extension icon if invalid page). 
 * Note: this works because YouTube Music appears to use the History API to navigate between pages on the site
 * Note: It's necessary to do these checks here because the content scraper's current implementation cannot recognize when switching to the Uploaded or Subscribed Songs pages
 */
chrome.webNavigation.onHistoryStateUpdated.addListener(details => {
    if (details.url.includes('/library/songs') === true) {
        const metadata = {type: 'all', title: 'Added from YouTube Music'};
        storage.setCachedMetadata(metadata); // Cache the tracklist type and title in chrome local storage
        enableAndUpdateIcon(metadata, details.tabId);
    } else if (details.url.includes('/library/uploaded_songs') === true) {
        const metadata = {type: 'uploads', title: 'Uploaded Songs'};
        storage.setCachedMetadata(metadata); // Cache the tracklist type and title in chrome local storage
        enableAndUpdateIcon(metadata, details.tabId);
    }
    //TODO Since the track count reported in the YTM UI for the 'Your Likes' list seems to be way off, it may be acceptable to just not bother getting the track count to update the icon for this page, since it's likely to be incorrect anyway. Instead, we could just always display the icon with a question mark, like with the 'added' and 'uploaded' cases.
    else if (details.url.includes('list=LM') === false && details.url.includes('list=PL') === false) {
        chrome.action.disable(details.tabId); // Disable the popup action for the specified tab
        chrome.action.setIcon({path: ICON_PATHS.disabled, tabId: details.tabId}); // Show the 'disabled' icon
        chrome.action.setBadgeText({text: "", tabId: details.tabId}); // Clear any badge text on the icon
    }
}, {url: [{hostEquals : 'music.youtube.com'}]});

/**
 * Enables and updates the icon & badge for the specified tab based on the tracklist metadata provided
 * @param {Object} currentTracklistMetadata An object containing the current tracklist metadata, which will be used to determine the changes made to the icon. In some cases, this includes calculating and displaying the track count delta in the icon badge.
 * @param {number} [tabId] The id of the tab for which to update the icon. If none is provided, the active tab ID will be used.
*/
async function enableAndUpdateIcon(currentTracklistMetadata, tabId) {
    if (typeof tabId === 'undefined') {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        tabId = tab.id;
    }

    if (firebase.auth().currentUser instanceof firebase.User === true) {
        if (typeof currentTracklistMetadata === 'object') {
            if (currentTracklistMetadata.type === 'all' || currentTracklistMetadata.type === 'uploads') {
                chrome.action.setBadgeText({text: "?", tabId: tabId});
                chrome.action.setBadgeBackgroundColor({color: [255, 178, 102, 200], tabId: tabId}); // Peach
            } else if (currentTracklistMetadata.type === 'playlist' || currentTracklistMetadata.type === 'auto') {
                const previousTrackCountData = await getPreviousTrackCount(currentTracklistMetadata.title);
                const trackCountDelta = currentTracklistMetadata.trackCount - previousTrackCountData.trackCount;
                
                if (trackCountDelta === 0) {
                    chrome.action.setBadgeText({text: previousTrackCountData.sourcePrefix + "0", tabId: tabId});
                    chrome.action.setBadgeBackgroundColor({color: [255, 178, 102, 200], tabId: tabId}); // Peach
                } else if (trackCountDelta > 0) {
                    chrome.action.setBadgeText({text: previousTrackCountData.sourcePrefix + "+" + trackCountDelta.toString(), tabId: tabId});
                    chrome.action.setBadgeBackgroundColor({color: [255, 178, 102, 200], tabId: tabId}); // Peach
                } else if (trackCountDelta < 0) {
                    chrome.action.setBadgeText({text: previousTrackCountData.sourcePrefix + trackCountDelta.toString(), tabId: tabId});
                    chrome.action.setBadgeBackgroundColor({color: [255, 153, 153, 200], tabId: tabId}); // Rose
                } else { // Track count delta not a valid number
                    chrome.action.setBadgeText({text: "?", tabId: tabId});
                    chrome.action.setBadgeBackgroundColor({color: [255, 178, 102, 200], tabId: tabId}); // Peach
                    console.warn("Tried to display the track count delta in the extension's icon, but a valid track count delta could not be determined.");
                }
            } else console.error(Error("Tried to update the extension's icon, but a valid tracklist type was not available in the provided tracklist metadata."));
        } else console.error(Error("Tried to update the extension's icon, but no metadata was provided for the current tracklist."));
    } else {
        chrome.action.setBadgeText({text: "login", tabId: tabId}); // TODO sometimes, this text is displayed in the badge, even though the user is signed in. I suspect it's due to some sort of timing issue, since the repro is inconsistent and rare.
        chrome.action.setBadgeBackgroundColor({color: [64, 64, 64, 200], tabId: tabId}); // Dark Grey
    }

    chrome.action.setIcon({path: ICON_PATHS.default, tabId: tabId}); // Set the default icon (i.e. with full color, as opposed to the washed out 'disabled' icon)
    chrome.action.enable(tabId); // Enable the popup action for the specified tab
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.greeting === 'TracklistMetadataUpdated') {
        console.log('The current tracklist metadata was updated. New track title is "%s" and new track count is "%s".',
            message.currentTracklistMetadata.title, message.currentTracklistMetadata.trackCount);
            
        enableAndUpdateIcon(message.currentTracklistMetadata, sender.tab?.id);
    }
});

chrome.runtime.onConnect.addListener(port => {
    if (port.name === 'AuthenticationChangePending') {
        port.onDisconnect.addListener(port => {
            console.log(`Authentication change detected. The active user was logged out.`);
            enableAndUpdateIcon();
        });
    }
});

//TODO it would be nice if the helper function below to get the previous track count could be in a separate module, 
//along with other related functions that the extension scripts need to access.
//Once ES6 module import is possible in service workers, could make this change. Waiting for Chromium Chromium Bug 824647 to be fixed.
/**
 * Returns the previous track count for the given tracklist, if available
 * @param {string} tracklistTitle The title of the tracklist
 * @returns {Promise} A promise with the resulting track count
 */
async function getPreviousTrackCount(tracklistTitle) {
    const comparisonMethod = await options.comparisonMethod.getValue();
    console.log("Comparison method found in user's preferences: " + comparisonMethod);

    let trackCount = undefined;
    let trackCountSourcePrefix = 'Y';

    // If the selected comparison method is to use YouTube Music only or whenever possible, get the track count from Chrome sync storage
    if (comparisonMethod === 'alwaysYTM' || comparisonMethod === 'preferYTM') {
        trackCount = await storage.getTrackCount(tracklistTitle);
    }

    // If the selected comparison method is to use only Google Play Music, or to use GPM as a fallback and the track count was not found in Chrome sync storage, get the track count from the GPM data in Chrome local storage
    if (comparisonMethod === 'alwaysGPM' || (comparisonMethod === 'preferYTM' && typeof trackCount === 'undefined')) {
        trackCount = await gpmStorage.getTracklistData('trackCount', tracklistTitle);
        trackCountSourcePrefix = 'G';
    }

    return {trackCount:trackCount, sourcePrefix:trackCountSourcePrefix};
}
