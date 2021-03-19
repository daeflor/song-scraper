import * as DebugController from '../Modules/DebugController.js';
import * as UIController from '../AppNavigator.js';
import firebaseConfig from '/Scripts/Configuration/Config.js';
import '/node_modules/firebase/firebase-app.js'; //Import the Firebase App before any other Firebase libraries
import '/node_modules/firebase/firebase-auth.js'; //Import the Firebase Auth library

/**
 * Sets up the Firebase context and register a listener for the Firebase Authentication state changing
 */
function init() {
    firebase.initializeApp(firebaseConfig); //Initialize Firebase
    firebase.auth().onAuthStateChanged(reactToEvent_AuthStateChanged);
}

/**
 * Reacts to a detected change in the Firebase Authentication state and updates the UI accordingly
 * @param {object} user The object containing details about the authenitcated user, if there is one. 
 */
function reactToEvent_AuthStateChanged(user) {
    if (user === null) { //If there is no user signed into the app...
        DebugController.logInfo("Auth: A change in the Firebase Auth state was detected. Currently no user is signed in.");
        UIController.triggerUITransition('ShowAuthPrompt');
    } else { //Else, if there is a user signed into the app...
        DebugController.logInfo("Auth: A change in the Firebase Auth state was detected. A user is currently signed in so the landing page will be displayed.");
        UIController.init();
        //TODO probably shouldn't be calling an "init" function more than once,
            //but right now, if you sign out and back in, it will do this (and not all state is re-set properly)
    }
}

export function logIn() {
//TODO when the button gets clicked once, it should get disabled, to ensure it doesn't accidentally get clicked again
    chrome.identity.getAuthToken({interactive: true}, token => {
        //console.log("Retrieved cached token: " + token);
        //Generating a firebase auth credential takes either an id token (1st param) or access token (2nd param)
            //Since the token we get from chrome.identity is an access token, we have to pass that as the 2nd parameter. 
        const _credential = firebase.auth.GoogleAuthProvider.credential(null, token); 
        firebase.auth().signInWithCredential(_credential); //TODO could use some error checking here (e.g. a 'catch' block)
    });
}

export function logOut() {
    //TODO perhaps replace this with removeCachedAuthToken
        //This will require a secure way of storing the auth token.
            //For the purposes of this local app, it may also be sufficient to sign out of firebase but not clear the auth token
    firebase.auth().signOut().then(function() {
        chrome.identity.clearAllCachedAuthTokens(() => {
            UIController.triggerUITransition('LogOut');
            console.log("Cleared cached token");
        });
    }).catch(function(error) {
        console.error(error);
    });
}

init();


