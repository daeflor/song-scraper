import * as LocalStorage from './Utilities/LocalStorage.js'; 
//import * as DebugController from './DebugController.js';

//TODO Should this go with the other frozen objects in a separate References module, or something like that?
// const _environments = Object.freeze({
//     prod: 'prod',
//     test: 'test'
// });

// const _tracklistCategories = Object.freeze({
//     playlists: 'playlists',
//     autoPlaylists: 'autoPlaylists',
//     allSongsLists: 'allSongsLists'
// });

//TODO might not need a StorageManager separate from the Model

let _testMode = true;

function retrieveTracklistMetadata(tracklistType, tracklistTitle, callback) {    
    const _tracklistKey = tracklistType + "_'" + tracklistTitle + "'";

    //If Test Mode is enabled, get the test data object from storage and then get the tracklist metadata kvp from that
    if (_testMode === true) {
        const _onTestDataRetrieved = function(testDataObject) {
            if (typeof(callback) === 'function') {
                callback(testDataObject[_tracklistKey]);
            }
        }

        LocalStorage.get('test', _onTestDataRetrieved);
    }
    //Else, if Test Mode is disabled, use the tracklist key to get its metadata array
    else {
        LocalStorage.get(_tracklistKey, callback);
    }
}

//TODO might be better to create an ID for he tracklist the first time it is scraped/stored and use that for the key instead, since the title is not unique.
    //For manual playlist, the ID in the YTM URL could be used for this.
function storeTracklistMetadata(tracklistType, tracklistTitle, tracklistMetadataArray) { 

    //const _objectToStore = (_testMode === true) ? {test: {key: metadataArray}} : {key: metadataArray};

    // const _keyToStore = (_testMode === false) ? tracklistTitle : 'test';
    // const _valueToStore = (_testMode === false) ? tracklistMetadataArray : {tracklistTitleTODO: tracklistMetadataArray};

    const _tracklistKey = tracklistType + "_'" + tracklistTitle + "'";
    const _objectToStore = {};
    //const _objectToStore = (_testMode === false) ? {} : {'test':{}};

    if (_testMode === true) {
        _objectToStore['test'] = {};
        _objectToStore['test'][_tracklistKey] = tracklistMetadataArray;
    }
    else {
        _objectToStore[_tracklistKey] = tracklistMetadataArray;
    }

    LocalStorage.set(_objectToStore); //TODO currently overwriting test data each time, instead of loading it from storage
}

export { retrieveTracklistMetadata, storeTracklistMetadata };