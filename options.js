//TODO it bothers me that I need to load and initialize Fireabse here *again*
//import './node_modules/firebase/firebase-app.js'; // Import the Firebase App before any other Firebase libraries
//import './node_modules/firebase/firebase-auth.js'; // Import the Firebase Auth library
//import firebaseConfig from './scripts/Configuration/Config.js'; // Import the app's config object needed to initialize Firebase
import * as chromeStorage from '../scripts/modules/utilities/chrome-storage-promises.js'
console.info("Options page loaded");

// if (firebase.apps.length === 0) { // If Firebase has not yet been initialized (i.e. if the extension was just installed)...
//     firebase.initializeApp(firebaseConfig); // Initialize Firebase
//     //firebase.auth(); // "Initialize" Firebase auth - TODO this is janky. It doesn't really seem necessary to do this, given how we're using firebase elsewhere in this script. Not including this triggers a warning when Firebase auth is first reference later in this script, however (nested under other listeners).
// }

//TODO how do I save settings if I'm not guaranteed to be signed into Firebase... :(
    //Maybe just have one set of preferences, per Chrome account (i.e. per account signed into Chrome / per account that has the extension installed).
    //As opposed to one per Firebase account that has signed into the app.

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