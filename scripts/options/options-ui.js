import { comparisonMethod } from './options-storage.js';

async function initializeOptionsUI() {    
    const checkboxToEnable = document.getElementById(await comparisonMethod.getValue()); // Get the DOM checkbox element matching the found preference
    if (checkboxToEnable instanceof Element === true) { // If a valid checkbox element was found, check it
        checkboxToEnable.checked = true;
    } else throw Error("Tried to update the preferences selection UI based on data found in storage, but failed to find a corresponding checkbox element in the DOM.");
}

//TODO currently, when the Comparison Method preference is changed, the icon isn't immediately updated to reflect the new (possibly different) track count delta. This doesn't seem like a big deal.
document.getElementById('alwaysYTM').addEventListener('change', event => comparisonMethod.setValue(event.target.value));
document.getElementById('preferYTM').addEventListener('change', event => comparisonMethod.setValue(event.target.value));
document.getElementById('alwaysGPM').addEventListener('change', event => comparisonMethod.setValue(event.target.value));
initializeOptionsUI();