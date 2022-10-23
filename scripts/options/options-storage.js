import * as chromeStorage from '../modules/utilities/chrome-storage-promises.js';

export { STORAGE_ITEM_PROPERTIES as preferences, getPreferencesFromChromeSyncStorage as getPreferences, updatePreferencesInChromeSyncStorage as updatePreferences};

const STORAGE_ITEM_KEY = 'preferences';
const STORAGE_ITEM_PROPERTIES = Object.freeze({
    comparisonMethod: 'Comparison Method'
});

// const PREFERENCE_TYPES = Object.freeze({
//     comparisonMethod: 'Comparison Method'
// });

// export const STORAGE_KEYS = Object.freeze({
//     allPreferences: 'preferences',
//     comparisonMethod: 'Comparison Method'
// });

// const STORAGE_KEYS = Object.freeze({
//     root: 'preferences', //aka main, primary, parent
//     properties: {
//         comparisonMethod: 'Comparison Method'
//     }
// });

/**
 * Returns the user's preferences object, or a particular preference value if specified
 * @param {string} [preference] An optional preference to specify, if only one value is desired
 * @returns {Promise} A promise with either an object containing all the user's preferences, or the value of a single preference, if specified
 */
async function getPreferencesFromChromeSyncStorage(preferenceKey) {
    const preferencesStorageItem = await chromeStorage.getValueAtKey('sync', STORAGE_ITEM_KEY);
    return (typeof preferenceKey === 'undefined')
    ? preferencesStorageItem
    : preferencesStorageItem?.[preferenceKey];
}

async function updatePreferencesInChromeSyncStorage(preferenceKey, newValue) {
    await chromeStorage.modifyStorageItemProperty('sync', STORAGE_ITEM_KEY, preferenceKey, newValue);
    console.info("Preferences have been updated in Chrome Sync Storage. The %s was set to %s.", preferenceKey, newValue);
}
