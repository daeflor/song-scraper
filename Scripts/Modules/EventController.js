import * as Storage from './StorageManager.js';
import * as Model from './Model.js';
import * as ViewBinder from './ViewBinder.js';
import * as Controller from '../AppNavigator.js';

function react_InitiateScrape() {
    Controller.initiateTrackScraper();
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
    Controller.downloadCurrentTracklistAsCSV(response.tracklist);
}

function react_ExportStoredTracklistGPM() {
    Controller.downloadGooglePlayMusicTracklistAsCSV();
}

ViewBinder.bind('buttonPressed_InitiateScrape', react_InitiateScrape);
ViewBinder.bind('buttonPressed_PrintScrapedMetadata', react_PrintScrapedMetadata);
ViewBinder.bind('buttonPressed_PrintStoredMetadata', react_PrintStoredMetadata);
ViewBinder.bind('buttonPressed_StoreScrapedMetadata', react_StoreScrapedMetadata);
ViewBinder.bind('buttonPressed_ExportScrapedTracklist', react_ExportScrapedTracklist);
ViewBinder.bind('buttonPressed_ExportStoredTracklistGPM', react_ExportStoredTracklistGPM);