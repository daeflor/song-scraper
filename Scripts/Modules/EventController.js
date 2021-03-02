import * as Storage from './StorageManager.js';
import * as Model from './Model.js';
import * as ViewRenderer from './ViewRenderer.js';
import * as ViewBinder from './ViewBinder.js';
import * as UIController from '../AppNavigator.js';
import * as Messenger from './MessageController.js';

//TODO maybe don't need this naming convention now that this is its own module
    //Although perhaps this should be merged with ViewBinder somehow for better readability
function react_InitiateScrape() {
    UIController.navigateToScreen('StartScrape');
    Messenger.sendMessage('GetTracklistMetadata');
}

function react_PrintScrapedMetadata() {
    console.log(Model.tracklist.metadataScraped);
}

function react_ShowStoredTracklist() {
    //If a tracklist DOM element has previously been created, just show the existing element
    console.log(typeof ViewRenderer.tracklists.stored);
    console.log(ViewRenderer.tracklists.stored);
    if (typeof ViewRenderer.tracklists.stored === 'object') {
        ViewRenderer.unhideElement(ViewRenderer.tracklists.stored);
    }
    //Else, if a tracklist element doesn't exist yet, create a new one using the metadata from storage and add it to the DOM
    else {
        const _onMetadataRetrieved = function(metadata) {
            console.log(metadata);
            const tracklistTableParentElement = document.getElementById('tracklists');//document.getElementById('screen_Tracklist');
            const _tracklistWrapper = UIController.createTracklistTable(metadata, tracklistTableParentElement);
            //UIController.navigateToScreen('screen_Tracklist');
            ViewRenderer.tracklists.stored = _tracklistWrapper;
        }
    
        Model.getStoredMetadata(_onMetadataRetrieved);
    }
}

function react_HideStoredTracklist() {
    if (typeof ViewRenderer.tracklists.stored === 'object') {
        ViewRenderer.hideElement(ViewRenderer.tracklists.stored);
    }
}

function react_StoreScrapedMetadata() {
    //TODO is it right to call Storage functions from here?
    Storage.storeTracklistMetadata(Model.tracklist.type, Model.tracklist.title, Model.tracklist.metadataScraped);
}

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

ViewBinder.bind('buttonPressed_InitiateScrape', react_InitiateScrape);
ViewBinder.bind('buttonPressed_PrintScrapedMetadata', react_PrintScrapedMetadata);
ViewBinder.bind('checkboxChanged_StoredTracklist', react_ShowStoredTracklist, react_HideStoredTracklist);
ViewBinder.bind('buttonPressed_StoreScrapedMetadata', react_StoreScrapedMetadata);
ViewBinder.bind('buttonPressed_ExportScrapedTracklist', react_ExportScrapedTracklist);
ViewBinder.bind('buttonPressed_ExportStoredTracklistGPM', react_ExportStoredTracklistGPM);
ViewBinder.bind('buttonPressed_ShowComparisonPage', react_ShowComparisonPage);
ViewBinder.bind('checkboxChanged_ScrapedTracklist', react_ShowScrapedTracklist, react_HideScrapedTracklist);
