// /**
//  * Binds an input event to a callback, so that the latter is executed when the input event is triggered
//  * @param {string} event The name used to identify the event being bound
//  * @param {function} callback the function to execute when the event is triggered
//  */
// function bind(event, callback, altCallback) {
//     //TODO if we really want to allow multiple callbacks, we should handle this better
    
//     // if (event === 'buttonPressed_PrintScrapedMetadata') {
//     //     window.Utilities.GetElement('buttonPrintScrapedMetadataToConsole').addEventListener('click', callback);
//     // }
//     // else if (event === 'buttonPressed_InitiateScrape') {
//     //     window.Utilities.GetElement('btnScrape').addEventListener('click', callback);
//     // }
//     // else if (event === 'checkboxChanged_StoredTracklist') {
//     //     const _element = window.Utilities.GetElement('checkboxStoredTracklist');

//     //     const _callback = function() {
//     //         if (_element.checked) {
//     //             callback();
//     //         }
//     //         else {
//     //             altCallback();
//     //         }
//     //     }

//     //     _element.addEventListener('change', _callback);
//     // }
//     // else if (event === 'buttonPressed_StoreScrapedMetadata') {
//     //     window.Utilities.GetElement('buttonSaveScrapedMetadataToStorage').addEventListener('click', callback);
//     // }
//     if (event === 'buttonPressed_ExportScrapedTracklist') {
//         window.Utilities.GetElement('btnExportScrapedMetadata').addEventListener('click', callback);
//     }
//     else if (event === 'buttonPressed_ExportStoredTracklistGPM') {
//         window.Utilities.GetElement('btnExportStoredMetadataForCurrentTracklist').addEventListener('click', callback);
//     }
//     else if (event === 'buttonPressed_ShowComparisonPage') {
//         window.Utilities.GetElement('buttonShowComparisonPage').addEventListener('click', callback);
//     }
//     else if (event === 'checkboxChanged_ScrapedTracklist') {
//         const _element = window.Utilities.GetElement('checkboxScrapedTracklist');

//         const _callback = function() {
//             if (_element.checked) {
//                 callback();
//             }
//             else {
//                 altCallback();
//             }
//         }

//         _element.addEventListener('change', _callback);
//     }
// }

// export {bind};