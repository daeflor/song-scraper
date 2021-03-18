import * as DebugController from './DebugController.js';
import * as UIController from '../AppNavigator.js';
import firebaseConfig from '../Configuration/Config.js';

// import firebase from "firebase/app";
// import "firebase/auth";

// import firebase from '/node_modules/@firebase/app';
// import '/node_modules/@firebase/auth';

// import firebase from '/node_modules/firebase/firebase-app.js'; // Firebase App (the core Firebase SDK) is always required and must be listed first
// import '/node_modules/firebase/firebase-auth.js'; // Add the Firebase products that you want to use

import '/node_modules/firebase/firebase-app.js'; //Import the Firebase App before any other Firebase libraries
import '/node_modules/firebase/firebase-auth.js'; //Import the Firebase Auth library
import '/node_modules/firebaseui/dist/firebaseui.js';

/**
 * Sets up the Firebase context and register a listener for the auth state changing
 */
function init() {
    firebase.initializeApp(firebaseConfig); //Initialize Firebase
    firebase.auth().onAuthStateChanged(reactToEvent_AuthStateChanged); //Listen for auth state changes
}

/**
 * Reacts to a change in the authentication state of the current user of the application. 
 * If they are not signed in, the Authentication Screen is displayed and Firebase Google Authentication UI is initiated.
 * If they are signed in, the landing page is displayed.
 * @param {object} user The object representing the data for the authenticated user, if one exists
 */
function reactToEvent_AuthStateChanged(user) {
    if (user === null) { //If there is no user signed into the app...
        DebugController.logInfo("AuthController: There is no user signed in so the FirebaseUI Authentication flow will be initiated.");
        startFirebaseUIAuthFlow(); //Start the Firebase Authentication UI flow
    } else { //Else, if there is a user signed into the app...
        DebugController.logInfo("AuthController: A user is signed in so the landing page will be displayed.");
        UIController.init();
        //TODO probably shouldn't be calling an "init" function more than once,
            //but right now, if you sign out and back in, it will do this (and not all state is re-set properly)
    }
}

/**
 * Starts a new or existing Firebase AuthUI instance
 */
function startFirebaseUIAuthFlow() {
    let _authUI = firebaseui.auth.AuthUI.getInstance();
    let _uiConfig;

    //If a Firebase AuthUI instance does not already exist, set up a new instance along with a configuration
    if (_authUI === null) {
        DebugController.logInfo("AuthController: A Firebase AuthUI instance does not already exist, so setting up a new one.");

        //Initialize the FirebaseUI Widget using Firebase.
        _authUI = new firebaseui.auth.AuthUI(firebase.auth());

        //Specify configuration details for the FirebaseUI Authentication widget
        _uiConfig = {
            callbacks: {
                uiShown: function() { 
                    UIController.triggerUITransition('ShowAuthPrompt'); //Hide the status message and show the auth prompt
                },
                signInSuccessWithAuthResult: (authResult, redirectUrl) => false, //Return false so the page doesn't get automatically redirected
                signInFailure: function(error) {
                    DebugController.logError("AuthController: An error was encountered during the authentication process. Error (below):");
                    DebugController.logError(error);
                }
            },
            signInFlow: 'popup',
            signInOptions : [{
                provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
                scopes: ['https://www.googleapis.com/auth/appstate'],
                customParameters: {
                    prompt: 'select_account' //Forces account selection even when one account is available
                }
            }]
        };
    }

    _authUI.start('#auth', _uiConfig);
}

export function logOut() {
    firebase.auth().signOut().then(function() {
            UIController.triggerUITransition('LogOut');
        }).catch(function(error) {
            DebugController.logError(error);
        });
}

init();