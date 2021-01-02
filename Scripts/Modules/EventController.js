import * as Storage from './StorageManager.js';
import * as Model from './Model.js';
import * as ViewBinder from './ViewBinder.js';
import * as UIController from '../AppNavigator.js';
import * as Messenger from './MessageController.js';

function react_InitiateScrape() {
    UIController.navigateToScreen('StartScrape');
    Messenger.sendMessage('GetTracklistMetadata');
}

function react_PrintScrapedMetadata() {
    console.log(Model.tracklist.metadataScraped);
}

function react_PrintStoredMetadata() {

    const _onMetadataRetrieved = function(metadata) {
        console.log(metadata);
    }

    Model.getStoredMetadata(_onMetadataRetrieved);
}

function react_StoreScrapedMetadata() {
    //TODO is it right to call Storage functions from here?
    Storage.storeTracklistMetadata(Model.tracklist.type, Model.tracklist.title, Model.tracklist.metadataScraped);
}

function react_ExportScrapedTracklist() {
    UIController.downloadCurrentTracklistAsCSV(response.tracklist);
}

function react_ExportStoredTracklistGPM() {
    UIController.downloadGooglePlayMusicTracklistAsCSV();
}

function react_ShowComparisonPage() {
    //UIController.displayTracklistTable(Model.tracklist.metadataScraped, 'tableTracksAdded', 'pTracksAddedHeader', 'pTracksAddedDescription');
    UIController.createTracklistTable(Model.tracklist.metadataScraped);
    UIController.navigateToScreen('ShowComparison');
}

ViewBinder.bind('buttonPressed_InitiateScrape', react_InitiateScrape);
ViewBinder.bind('buttonPressed_PrintScrapedMetadata', react_PrintScrapedMetadata);
ViewBinder.bind('buttonPressed_PrintStoredMetadata', react_PrintStoredMetadata);
ViewBinder.bind('buttonPressed_StoreScrapedMetadata', react_StoreScrapedMetadata);
ViewBinder.bind('buttonPressed_ExportScrapedTracklist', react_ExportScrapedTracklist);
ViewBinder.bind('buttonPressed_ExportStoredTracklistGPM', react_ExportStoredTracklistGPM);
ViewBinder.bind('buttonPressed_ShowComparisonPage', react_ShowComparisonPage);