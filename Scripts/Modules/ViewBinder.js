/**
 * Binds an input event to a callback, so that the latter ix executed when the input event is triggered
 * @param {string} event The name used to identify the event being bound
 * @param {function} callback the function to execute when the event is triggered
 */
function bind(event, callback) {
    if (event === 'buttonPressed_PrintScrapedMetadata') {
        window.Utilities.GetElement('buttonPrintScrapedMetadataToConsole').addEventListener('click', callback);
    }
    else if (event === 'buttonPressed_InitiateScrape') {
        window.Utilities.GetElement('buttonComparePlaylist').addEventListener('click', callback);
    }
    else if (event === 'buttonPressed_PrintStoredMetadata') {
        window.Utilities.GetElement('buttonPrintStoredTracklistYTM').addEventListener('click', callback);
    }
    else if (event === 'buttonPressed_StoreScrapedMetadata') {
        window.Utilities.GetElement('buttonSaveScrapedMetadataToStorage').addEventListener('click', callback);
    }
    else if (event === 'buttonPressed_ExportScrapedTracklist') {
        window.Utilities.GetElement('buttonExportScrapedTracklist').addEventListener('click', callback);
    }
    else if (event === 'buttonPressed_ExportStoredTracklistGPM') {
        window.Utilities.GetElement('buttonExportStoredTracklistGPM').addEventListener('click', callback);
    }
}

export {bind};