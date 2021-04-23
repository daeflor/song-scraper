import * as Model from './Model.js';
import * as ViewRenderer from './ViewRenderer.js';
import * as UIController from '../AppNavigator.js';
import * as Messenger from './utilities/messenger.js';
//import sendMessage from './MessageController.js';
//import logOut from './AuthController.js' //TODO use or remove this, as desired
import * as Auth from '../auth/firebase-ui-auth.js'

//Button Pressed: Log In
// ViewRenderer.buttons.logIn.addEventListener('click', function() {
//     auth.logIn();
// });

//TODO could consider adding to and/or removing from EventController so that it's the central place for all event-driven logic
    //i.e. EventController should dictate & be aware of all events & reactions throughout the app (not sure about auth...)
    //But it shouldn't necessarily handle any in-depth / area-specific logic. It should hand that off to the scripts designated specifically for that and then just get back the results and act on them.

//Button Pressed: Log Out
ViewRenderer.buttons.logOut.addEventListener('click', function() {
    //AuthController.logOut();
    //ViewRenderer.uncheckBox(ViewRenderer.checkboxes.storedTrackTable);
    // UIController.triggerUITransition('LogOut');

    Auth.logOut();
});

//Button Pressed: Scrape Current Tracklist
ViewRenderer.buttons.scrape.addEventListener('click', function() {
    UIController.triggerUITransition('StartScrape');
    Messenger.sendMessageToContentScripts('GetTracks', tracksArray => {
        if (Array.isArray(tracksArray) === true) { //If the response received is an array...
            Model.setScrapedTracksArray(tracksArray); //TODO not sure about this naming //Update the scraped tracklist metadata in the Model
            UIController.triggerUITransition('ScrapeSuccessful'); //Transition the UI accordingly
        } else {
            UIController.triggerUITransition('ScrapeFailed');
            console.error("Requested tracklist metadata from content script, but response was not a valid array.");
        }
    });
});

//Button Pressed: Store Scraped Metadata
ViewRenderer.buttons.storeScrapedMetadata.addEventListener('click', function() {
    UIController.triggerUITransition('StorageInProgress'); //Update the UI while the data is being stored (e.g. disable the 'store' button)

    Model.storeScrapedTracklist(() => { //Store the scraped tracklist and then update the UI accordingly once the storage process is complete
        UIController.triggerUITransition('ScrapedMetadataStored');
    });
});

//Button Pressed: Export Scraped Tracklist 
ViewRenderer.buttons.exportScrapedMetadata.addEventListener('click', function() {
    UIController.downloadCurrentTracklistAsCSV(Model.getScrapedTracksArray());
});

//Button Pressed: Export Stored GPM Tracklist 
ViewRenderer.buttons.exportStoredMetadata.addEventListener('click', function() {
    UIController.downloadGooglePlayMusicTracklistAsCSV();
});

//Checkbox Value Changed: Stored YTM Tracklist
ViewRenderer.checkboxes.storedTrackTable.addEventListener('change', function() {
    //If the checkbox is checked, display the stored metadata for the current tracklist; Otherwise hide it
    if (ViewRenderer.checkboxes.storedTrackTable.checked === true) {
        //If a track table DOM element has previously been created, just show the existing element
        if (typeof ViewRenderer.tracktables.stored === 'object') {
            ViewRenderer.unhideElement(ViewRenderer.tracktables.stored);
        } else { //Else, if a track table element doesn't exist yet, create a new one using the metadata from storage and add it to the DOM
            Model.getStoredMetadata(tracksArray => {
                ViewRenderer.tracktables.stored = UIController.createTrackTable(tracksArray, 'Stored YTM Tracklist');
                //TODO this interaction with ViewRenderer is WIP
            });
        }
    }
    else { //Else, if the checkbox is unchecked, hide the track table element
        if (typeof ViewRenderer.tracktables.stored === 'object') {
            ViewRenderer.hideElement(ViewRenderer.tracktables.stored);
        }
    }
});

//Checkbox Value Changed: Scraped Tracklist
ViewRenderer.checkboxes.scrapedTrackTable.addEventListener('change', function() {
    //If the checkbox is checked, display the scraped tracklist metadata; Otherwise hide it
    if (ViewRenderer.checkboxes.scrapedTrackTable.checked === true) {
        //If a track table DOM element has previously been created, just show the existing element
        if (typeof ViewRenderer.tracktables.scraped === 'object') {
            ViewRenderer.unhideElement(ViewRenderer.tracktables.scraped);
        }
        //Else, if a track table element doesn't exist yet, create a new one using the scraped metadata and add it to the DOM
        else {
            ViewRenderer.tracktables.scraped = UIController.createTrackTable(Model.getScrapedTracksArray(), 'Scraped Tracklist');
            //TODO this interaction with ViewRenderer is WIP
        }
    }
    else { //Else, if the checkbox is unchecked, hide the track table element
        if (typeof ViewRenderer.tracktables.scraped === 'object') {
            ViewRenderer.hideElement(ViewRenderer.tracktables.scraped);
        }
    }
});

//TODO need to handle the case where there is no stored tracklist (e.g. because this is the first time the track was scraped)
    //Could consider leaving the checkbox disabled unless both tracklists (scraped & stored) exist
    //But would also be nice to have some feedback about this, such as a message showing up when the checkbox is pressed, indicating a delta cannot yet be displayed
//Checkbox Value Changed: Delta Tracklists
ViewRenderer.checkboxes.deltaTrackTables.addEventListener('change', function() {
    //If the checkbox is checked, display the delta tracklists metadata; Otherwise hide them
    if (ViewRenderer.checkboxes.deltaTrackTables.checked === true) {
        //If the track table DOM elements have previously been created, just show the existing elements
        if (typeof ViewRenderer.tracktables.deltas === 'object') {
            ViewRenderer.unhideElement(ViewRenderer.tracktables.deltas);
        }
        else { //Else, if the track table elements dont exist yet...
            //Create new track tables based on the scraped and stored metadata and add them to the DOM
            UIController.createDeltaTracklistsGPM(Model.getScrapedTracksArray());
        }
    }
    else { //Else, if the checkbox is unchecked, hide the track table elements
        if (typeof ViewRenderer.tracktables.deltas === 'object') {
            ViewRenderer.hideElement(ViewRenderer.tracktables.deltas);
        }
    }
});

// function react_PrintScrapedMetadata() {
//     console.log(Model.getScrapedTracksArray());
// }