import * as Storage from './StorageManager.js';
import * as Model from './Model.js';
import * as ViewRenderer from './ViewRenderer.js';
import * as ViewBinder from './ViewBinder.js';
import * as UIController from '../AppNavigator.js';
import * as Messenger from './MessageController.js';

//Button Pressed: Scrape Current Tracklist
ViewRenderer.buttons.scrape.addEventListener('click', function() {
    UIController.navigateToScreen('StartScrape');
    Messenger.sendMessage('GetTracklistMetadata');
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
                const tracklistTableParentElement = document.getElementById('tracklists');
                const _tracklistWrapper = UIController.createTracklistTable(metadata, tracklistTableParentElement);
                //UIController.navigateToScreen('screen_Tracklist');
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

//Button Pressed: Store Scraped Metadata
ViewRenderer.buttons.storeScrapedMetadata.addEventListener('click', function() {
    //TODO is it right to call Storage functions from here?
    Storage.storeTracklistMetadata(Model.tracklist.type, Model.tracklist.title, Model.tracklist.metadataScraped);
});

// function react_PrintScrapedMetadata() {
//     console.log(Model.tracklist.metadataScraped);
// }

function react_ExportScrapedTracklist() {
    UIController.downloadCurrentTracklistAsCSV(Model.tracklist.metadataScraped);
}

function react_ExportStoredTracklistGPM() {
    UIController.downloadGooglePlayMusicTracklistAsCSV();
}

function react_ShowComparisonPage() {
    //UIController.displayTracklistTable(Model.tracklist.metadataScraped, 'tableTracksAdded', 'pTracksAddedHeader', 'pTracksAddedDescription');
    const tracklistTableParentElement = document.getElementById('trackLists');
    UIController.createTracklistTable(Model.tracklist.metadataScraped, tracklistTableParentElement);
    UIController.navigateToScreen('ShowComparison');
    //TODO need to actually do a comparison before displaying the track tables here
}

function react_ShowScrapedTracklist() {
    //UIController.displayTracklistTable(Model.tracklist.metadataScraped, 'tableTracksAdded', 'pTracksAddedHeader', 'pTracksAddedDescription');
    //UIController.navigateToScreen('screen_Tracklist');

    //If a tracklist DOM element has previously been created, just show the existing element
    if (typeof ViewRenderer.tracklists.scraped === 'object') {
        ViewRenderer.unhideElement(ViewRenderer.tracklists.scraped);
    }
    //Else, if a tracklist element doesn't exist yet, create a new one using the scraped metadata and add it to the DOM
    else {
        const tracklistTableParentElement = document.getElementById('tracklists');//document.getElementById('screen_Tracklist');
        const _tracklistWrapper = UIController.createTracklistTable(Model.tracklist.metadataScraped, tracklistTableParentElement);
        ViewRenderer.tracklists.scraped = _tracklistWrapper;
    }
}

function react_HideScrapedTracklist() {
    if (typeof ViewRenderer.tracklists.scraped === 'object') {
        ViewRenderer.hideElement(ViewRenderer.tracklists.scraped);
    }
}

ViewBinder.bind('buttonPressed_ExportScrapedTracklist', react_ExportScrapedTracklist);
ViewBinder.bind('buttonPressed_ExportStoredTracklistGPM', react_ExportStoredTracklistGPM);
ViewBinder.bind('buttonPressed_ShowComparisonPage', react_ShowComparisonPage);
ViewBinder.bind('checkboxChanged_ScrapedTracklist', react_ShowScrapedTracklist, react_HideScrapedTracklist);
