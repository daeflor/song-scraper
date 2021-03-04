import * as Storage from './StorageManager.js';
import * as Model from './Model.js';
import * as ViewRenderer from './ViewRenderer.js';
import * as UIController from '../AppNavigator.js';
import * as Messenger from './MessageController.js';

//Button Pressed: Scrape Current Tracklist
ViewRenderer.buttons.scrape.addEventListener('click', function() {
    UIController.triggerUITransition('StartScrape');
    Messenger.sendMessage('GetTracklistMetadata');
});

//Button Pressed: Store Scraped Metadata
ViewRenderer.buttons.storeScrapedMetadata.addEventListener('click', function() {
    //TODO is it right to call Storage functions from here?
    Storage.storeTracklistMetadata(Model.tracklist.type, Model.tracklist.title, Model.tracklist.metadataScraped);
});

//Button Pressed: Export Scraped Tracklist 
ViewRenderer.buttons.exportScrapedMetadata.addEventListener('click', function() {
    UIController.downloadCurrentTracklistAsCSV(Model.tracklist.metadataScraped);
});

//Button Pressed: Export Stored GPM Tracklist 
ViewRenderer.buttons.exportStoredMetadata.addEventListener('click', function() {
    UIController.downloadGooglePlayMusicTracklistAsCSV();
});

//TODO This is deprecated. Needs updating or removal.
//Button Pressed: Show Comparison Page
window.Utilities.GetElement('buttonShowComparisonPage').addEventListener('click', function() {
    //UIController.displayTracklistTable(Model.tracklist.metadataScraped, 'tableTracksAdded', 'pTracksAddedHeader', 'pTracksAddedDescription');
    const _tracklistTableParentElement = document.getElementById('trackLists');
    UIController.createTracklistTable(Model.tracklist.metadataScraped, _tracklistTableParentElement);
    UIController.triggerUITransition('ShowComparison');
    //TODO need to actually do a comparison before displaying the track tables here
});


//Checkbox Value Changed: Stored YTM Tracklist
ViewRenderer.checkboxes.storedTracklist.addEventListener('change', function() {
    //If the checkbox is checked, display the stored metadata for the current tracklist; Otherwise hide it
    if (ViewRenderer.checkboxes.storedTracklist.checked === true) {
        //If a track table DOM element has previously been created, just show the existing element
        if (typeof ViewRenderer.tracktables.stored === 'object') {
            ViewRenderer.unhideElement(ViewRenderer.tracktables.stored);
        }
        //Else, if a track table element doesn't exist yet, create a new one using the metadata from storage and add it to the DOM
        else {
            const _onMetadataRetrieved = function(metadata) {
                ViewRenderer.tracktables.stored = UIController.createTracklistTable(metadata, ViewRenderer.divs.tracktables, "Stored YTM Tracklist");
                //UIController.triggerUITransition('screen_Tracklist');
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
ViewRenderer.checkboxes.scrapedTracklist.addEventListener('change', function() {
    //If the checkbox is checked, display the scraped tracklist metadata; Otherwise hide it
    if (ViewRenderer.checkboxes.scrapedTracklist.checked === true) {
        //UIController.displayTracklistTable(Model.tracklist.metadataScraped, 'tableTracksAdded', 'pTracksAddedHeader', 'pTracksAddedDescription');
        //UIController.triggerUITransition('screen_Tracklist');

        //If a track table DOM element has previously been created, just show the existing element
        if (typeof ViewRenderer.tracktables.scraped === 'object') {
            ViewRenderer.unhideElement(ViewRenderer.tracktables.scraped);
        }
        //Else, if a track table element doesn't exist yet, create a new one using the scraped metadata and add it to the DOM
        else {
            ViewRenderer.tracktables.scraped = UIController.createTracklistTable(Model.tracklist.metadataScraped, ViewRenderer.divs.tracktables, "Scraped Tracklist");
            //TODO this interaction with ViewRenderer is WIP
        }
    }
    else { //Else, if the checkbox is unchecked, hide the track table element
        if (typeof ViewRenderer.tracktables.scraped === 'object') {
            ViewRenderer.hideElement(ViewRenderer.tracktables.scraped);
        }
    }
});

//Checkbox Value Changed: Delta Tracklists
ViewRenderer.checkboxes.deltaTracklists.addEventListener('change', function() {
    //If the checkbox is checked, display the delta tracklists metadata; Otherwise hide them
    if (ViewRenderer.checkboxes.deltaTracklists.checked === true) {
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