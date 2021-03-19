import * as Storage from './StorageManager.js';
import * as Model from './Model.js';
import * as ViewRenderer from './ViewRenderer.js';
import * as UIController from '../AppNavigator.js';
import * as Messenger from './MessageController.js';
//import sendMessage from './MessageController.js';
//import logOut from './AuthController.js'
import * as auth from '../auth/firebase-ui-auth.js'

//TODO might be good to have an app.js or similar file that is the singular point waiting for the DOM to load,
    //and which then tells EventController, AuthController, etc. to initiaite / listen for events.
    //Note that this might not be necessary since module scripts are deferred by default

//Button Pressed: Log In
// ViewRenderer.buttons.logIn.addEventListener('click', function() {
//     auth.logIn();
// });

//Button Pressed: Log Out
ViewRenderer.buttons.logOut.addEventListener('click', function() {
    //AuthController.logOut();
    //ViewRenderer.uncheckBox(ViewRenderer.checkboxes.storedTrackTable);
    // UIController.triggerUITransition('LogOut');

    auth.logOut();
});

//Button Pressed: Scrape Current Tracklist
ViewRenderer.buttons.scrape.addEventListener('click', function() {
    UIController.triggerUITransition('StartScrape');
    Messenger.sendMessage('GetTracklistMetadata');
    //sendMessage('GetTracklistMetadata');
});

//Button Pressed: Store Scraped Metadata
ViewRenderer.buttons.storeScrapedMetadata.addEventListener('click', function() {
    //TODO is it right to call Storage functions from here?
    //Storage.storeTracklistMetadata(Model.tracklist.type, Model.tracklist.title, Model.tracklist.metadataScraped);
    
    //TODO For now, commented this out and do nothing when the button is pressed.
    //Storage.storeData(Model.tracklist.metadataScraped);
});

//Button Pressed: Export Scraped Tracklist 
ViewRenderer.buttons.exportScrapedMetadata.addEventListener('click', function() {
    UIController.downloadCurrentTracklistAsCSV(Model.tracklist.metadataScraped);
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
        }
        //Else, if a track table element doesn't exist yet, create a new one using the metadata from storage and add it to the DOM
        else {
            const _onMetadataRetrieved = function(metadata) {
                ViewRenderer.tracktables.stored = UIController.createTrackTable(metadata, 'Stored YTM Tracklist');
                //TODO this interaction with ViewRenderer is WIP
            }
        
            Model.getStoredMetadata(_onMetadataRetrieved);
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
            ViewRenderer.tracktables.scraped = UIController.createTrackTable(Model.tracklist.metadataScraped, 'Scraped Tracklist');
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
            UIController.createDeltaTracklistsGPM(Model.tracklist.metadataScraped);
        }
    }
    else { //Else, if the checkbox is unchecked, hide the track table elements
        if (typeof ViewRenderer.tracktables.deltas === 'object') {
            ViewRenderer.hideElement(ViewRenderer.tracktables.deltas);
        }
    }
});

// function react_PrintScrapedMetadata() {
//     console.log(Model.tracklist.metadataScraped);
// }