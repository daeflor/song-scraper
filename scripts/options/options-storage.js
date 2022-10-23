import * as chromeStorage from '../modules/utilities/chrome-storage-promises.js';

/**
 * Returns the user's preferences object, or a particular preference value if specified
 * @param {string} [preference] An optional preference to specify, if only one value is desired
 * @returns {Promise} A promise with either an object containing all the user's preferences, or the value of a single preference, if specified
 */
 export default async function getPreferencesFromChromeSyncStorage(preference) {
    const preferencesKey = 'preferences';
    const storageItems = await chromeStorage.getKeyValuePairs('sync', preferencesKey);
    return (typeof preference === 'undefined')
    ? storageItems[preferencesKey]
    : storageItems[preferencesKey]?.[preference];
}
