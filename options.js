import * as chromeStorage from '../scripts/modules/utilities/chrome-storage-promises.js'
console.info("Options page loaded");

/**
 * Updates the value for the given user preference in chrome storage
 * @param {string} preference The preference to update. Currently used values are: 'Comparison Method'
 * @param {string} value The value to set the preference to
 */
async function updatePreferencesInChromeSyncStorage(preference, value) {
    const preferencesObject = await getPreferencesFromChromeSyncStorage();
    console.info("Current " + preference + " preference in storage is: " + preferencesObject[preference] + ". New value will be: " + value);
    preferencesObject[preference] = value;
    chromeStorage.set('sync', {preferences:preferencesObject});
}

document.getElementById('alwaysYTM').addEventListener('change', event => updatePreferencesInChromeSyncStorage('Comparison Method', event.target.value));
document.getElementById('preferYTM').addEventListener('change', event => updatePreferencesInChromeSyncStorage('Comparison Method', event.target.value));
document.getElementById('alwaysGPM').addEventListener('change', event => updatePreferencesInChromeSyncStorage('Comparison Method', event.target.value));

//TODO Duplicated due to Chromium Bug 824647
//TODO this would be good to put in a module that both background and options scripts can access, once Chrome 91 releases.
/**
 * Returns the user's preferences object, or a particular preference value if specified
 * @param {string} [preference] An optional preference to specify, if only one value is desired
 * @returns {Promise} A promise with either an object containing all the user's preferences, or the value of a single preference, if specified
 */
 async function getPreferencesFromChromeSyncStorage(preference) {
    const preferencesKey = 'preferences';
    const storageItems = await chromeStorage.getKeyValuePairs('sync', preferencesKey);
    return (typeof preference === 'undefined')
    ? storageItems[preferencesKey]
    : storageItems[preferencesKey]?.[preference];
}