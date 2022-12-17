import { ChromeStorageAccessor } from '../storage/chrome-storage.js'
export { STORAGE_ITEM_PROPERTIES as preferences };

const STORAGE_ITEM_PROPERTIES = Object.freeze({
    comparisonMethod: 'Comparison Method'
});
//TODO consider having an  object per preference, e.g.:
    //COMPARISON_METHOD_VALUES: { alwaysYTM: 'alwaysYTM', preferYTM: 'preferYTM', alwaysGPM: 'alwaysGPM' } exported as comparisonMethods

const options = new ChromeStorageAccessor('sync', 'preferences');

/**
 * Returns the user's preferences object, or a particular preference value if specified
 * @param {string} [preference] An optional preference to specify, if only one value is desired
 * @returns {Promise} A promise with either an object containing all the user's preferences, or the value of a single preference, if specified
 */
export async function getPreferenceValue(preferenceKey) {
    return await options.getProperty(preferenceKey);
}

/**
 * Updates the value of the specified preference in Chrome Sync Storage
 * @param {string} preferenceKey The key for the property in storage matching the given preference
 * @param {string} newValue The new preference value
 */
export async function setPreferenceValue(preferenceKey, newValue) {
    await options.setProperty(preferenceKey, newValue);
}

async function setDefaultPreferenceValue(preferenceKey, newValue) {
    await options.setProperty(preferenceKey, newValue, false);
}

// Set the default comparison method, in case one isn't set already
setDefaultPreferenceValue('Comparison Method', 'preferYTM');