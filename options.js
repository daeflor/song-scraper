import * as chromeStorage from '../scripts/modules/utilities/chrome-storage-promises.js'
import * as appStorage from '/scripts/storage/firestore-storage.js';

async function updatePreferencesScreenUI() {
    const comparisonMethod = await appStorage.getPreferencesFromChromeSyncStorage('Comparison Method');
    
    const checkboxToEnable = document.getElementById(comparisonMethod); // Get the DOM checkbox element matching the found preference
    if (checkboxToEnable instanceof Element === true) { // If a valid checkbox element was found, check it
        checkboxToEnable.checked = true;
    } else throw Error("Tried to update the preferences selection UI based on data found in storage, but failed to find a corresponding checkbox element in the DOM.");
}

/**
 * Updates the value for the given user preference in chrome storage
 * @param {string} preference The preference to update. Currently used values are: 'Comparison Method'
 * @param {string} value The value to set the preference to
 */
async function updatePreferencesInChromeSyncStorage(preference, value) {
    const preferencesObject = await appStorage.getPreferencesFromChromeSyncStorage();
    console.info("Current " + preference + " preference in storage is: " + preferencesObject[preference] + ". New value will be: " + value);
    preferencesObject[preference] = value;
    chromeStorage.set('sync', {preferences:preferencesObject});
    //TODO currently, when the preference is changed, the icon isn't updated to reflect the new (possibly different) track count delta. This doesn't seem like a big deal.
}

document.getElementById('alwaysYTM').addEventListener('change', event => updatePreferencesInChromeSyncStorage('Comparison Method', event.target.value));
document.getElementById('preferYTM').addEventListener('change', event => updatePreferencesInChromeSyncStorage('Comparison Method', event.target.value));
document.getElementById('alwaysGPM').addEventListener('change', event => updatePreferencesInChromeSyncStorage('Comparison Method', event.target.value));
updatePreferencesScreenUI();