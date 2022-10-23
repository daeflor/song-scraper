import * as chromeStorage from '../modules/utilities/chrome-storage-promises.js';

// const STORAGE_ITEM_KEY = 'preferences';
// const PREFERENCE_TYPES = Object.freeze({
//     comparisonMethod: 'Comparison Method'
// });

export const STORAGE_KEYS = Object.freeze({
    allPreferences: 'preferences',
    comparisonMethod: 'Comparison Method'
});

/**
 * Returns the user's preferences object, or a particular preference value if specified
 * @param {string} [preference] An optional preference to specify, if only one value is desired
 * @returns {Promise} A promise with either an object containing all the user's preferences, or the value of a single preference, if specified
 */
 export async function getPreferencesFromChromeSyncStorage(preferenceKey) {
    const preferencesStorageItem = await chromeStorage.getValueAtKey('sync', STORAGE_KEYS.allPreferences);
    return (typeof preferenceKey === 'undefined')
    ? preferencesStorageItem
    : preferencesStorageItem?.[preferenceKey];
}

export async function updatePreferencesInChromeSyncStorage(preferenceKey, newValue) {
    await chromeStorage.modifyStorageItemProperty('sync', STORAGE_KEYS.allPreferences, preferenceKey, newValue);
}
