import * as chromeStorage from '../modules/utilities/chrome-storage-promises.js';
export { 
    STORAGE_ITEM_PROPERTIES as preferences, 
    getPreferencesFromChromeSyncStorage as getPreferences, 
    updatePreferencesInChromeSyncStorage as updatePreferences, 
    setDefaultPreferenceValueInChromeSyncStorage as setDefaultPreferenceValue
};

const STORAGE_ITEM_KEY = 'preferences';
const STORAGE_ITEM_PROPERTIES = Object.freeze({
    comparisonMethod: 'Comparison Method'
});
//TODO could consider a similar object that lists the possible property values, but that may get too convoluted.
    //For example comparisonMethod: { key: 'Comparison Method', supportedValues: {alwaysYTM: 'alwaysYTM', preferYTM: 'preferYTM', alwaysGPM: 'alwaysGPM'} }
    //The above suggestion would make the code elsewhere very hard to read. An alternative option could be to have a separate object per preference, e.g.:
        //COMPARISON_METHOD_VALUES: { alwaysYTM: 'alwaysYTM', preferYTM: 'preferYTM', alwaysGPM: 'alwaysGPM' } exported as comparisonMethods

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

async function setDefaultPreferenceValueInChromeSyncStorage(preferenceKey, newValue) {
    const preferencesStorageItem = await chromeStorage.getValueAtKey('sync', STORAGE_ITEM_KEY);
    typeof preferencesStorageItem !== 'object'
    ? await chromeStorage.modifyStorageItemProperty('sync', STORAGE_ITEM_KEY, preferenceKey, newValue)
    : console.log("Request received to set a default value for the %s preference, but it already has a value of %s set in storage.", preferenceKey, preferencesStorageItem[preferenceKey])
}
