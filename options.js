import * as chromeStorage from '../scripts/modules/utilities/chrome-storage-promises.js'
console.info("Options page loaded");

//TODO would be nice to not have to repeat this 3 times, for each radio button
document.getElementById('alwaysYTM').addEventListener('click', () => {
    console.log("always YTM");

    const preferencesObject = {
        'Comparison Method': 'alwaysYTM'
    }; //TODO this works at the moment because 'Comparison Method' is the only preference. But if more are added, then would first have to get the preferences object from storage, update it, and then re-store it, as opposed to just creating a new object like this.

    chromeStorage.set('sync', {preferences:preferencesObject});
});

document.getElementById('preferYTM').addEventListener('click', () => {
    console.log("prefer YTM");
});

document.getElementById('alwaysGPM').addEventListener('click', () => {
    console.log("always GPM");
});