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
    const tracklistTableParentElement = document.getElementById('trackLists');
    UIController.createTracklistTable(Model.tracklist.metadataScraped, tracklistTableParentElement);
    UIController.triggerUITransition('ShowComparison');
    //TODO need to actually do a comparison before displaying the track tables here
});


//Checkbox Value Changed: Stored YTM Tracklist
ViewRenderer.checkboxes.storedTracklist.addEventListener('change', function() {
    //If the checkbox is checked, display the stored metadata for the current tracklist; Otherwise hide it
    if (ViewRenderer.checkboxes.storedTracklist.checked === true) {
        //If a tracklist DOM element has previously been created, just show the existing element
        if (typeof ViewRenderer.tracklists.stored === 'object') {
            ViewRenderer.unhideElement(ViewRenderer.tracklists.stored);
        }
        //Else, if a tracklist element doesn't exist yet, create a new one using the metadata from storage and add it to the DOM
        else {
            const _onMetadataRetrieved = function(metadata) {
                const tracklistTableParentElement = ViewRenderer.divs.tracklists;
                const _tracklistWrapper = UIController.createTracklistTable(metadata, tracklistTableParentElement, "Stored YTM Tracklist");
                //UIController.triggerUITransition('screen_Tracklist');
                ViewRenderer.tracklists.stored = _tracklistWrapper;
                //TODO this interaction with ViewRenderer is WIP
            }
        
            Model.getStoredMetadata(_onMetadataRetrieved);
        }
    }
    else {
        if (typeof ViewRenderer.tracklists.stored === 'object') {
            ViewRenderer.hideElement(ViewRenderer.tracklists.stored);
        }
    }
});

//Checkbox Value Changed: Scraped Tracklist
ViewRenderer.checkboxes.scrapedTracklist.addEventListener('change', function() {
    //If the checkbox is checked, display the scraped tracklist metadata; Otherwise hide it
    if (ViewRenderer.checkboxes.scrapedTracklist.checked === true) {
        //UIController.displayTracklistTable(Model.tracklist.metadataScraped, 'tableTracksAdded', 'pTracksAddedHeader', 'pTracksAddedDescription');
        //UIController.triggerUITransition('screen_Tracklist');

        //If a tracklist DOM element has previously been created, just show the existing element
        if (typeof ViewRenderer.tracklists.scraped === 'object') {
            ViewRenderer.unhideElement(ViewRenderer.tracklists.scraped);
        }
        //Else, if a tracklist element doesn't exist yet, create a new one using the scraped metadata and add it to the DOM
        else {
            const tracklistTableParentElement = ViewRenderer.divs.tracklists;
            const _tracklistWrapper = UIController.createTracklistTable(Model.tracklist.metadataScraped, tracklistTableParentElement, "Scraped Tracklist");
            ViewRenderer.tracklists.scraped = _tracklistWrapper;
            //TODO this interaction with ViewRenderer is WIP
        }
    }
    else {
        if (typeof ViewRenderer.tracklists.scraped === 'object') {
            ViewRenderer.hideElement(ViewRenderer.tracklists.scraped);
        }
    }
});

// function react_PrintScrapedMetadata() {
//     console.log(Model.tracklist.metadataScraped);
// }