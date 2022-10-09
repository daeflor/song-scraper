//TODO Maybe rename this to gpm storage utilities or put it in a storage directory or something

import * as chromeStorage from './chrome-storage-promises.js'

/**
 * Returns an object containing the the exported GPM library data
 * @returns {Promise} A promise with the resulting GPM library data object
 */
 export default async function getGPMLibraryData(){
    const gpmLibraryKey = 'gpmLibraryData';
    const storageItems = await chromeStorage.getKeyValuePairs('local', gpmLibraryKey);

    typeof storageItems[gpmLibraryKey] === 'undefined'
    ? console.warn("Tried to fetch the GPM library data from local storage but it wasn't found.")
    : console.log("Successfully fetched GPM library data from local storage.")

    return storageItems[gpmLibraryKey];
}