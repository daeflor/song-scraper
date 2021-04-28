import * as DebugController from '../Modules/DebugController.js';
import * as UIController from '../AppNavigator.js';
import firebaseConfig from '/Scripts/Configuration/Config.js';
import '/node_modules/firebase/firebase-app.js'; //Import the Firebase App before any other Firebase libraries
import '/node_modules/firebase/firebase-auth.js'; //Import the Firebase Auth library

/**
 * Sets up the Firebase context and register a listener for the auth state changing
 */
function init() {
    firebase.initializeApp(firebaseConfig); //Initialize Firebase
    firebase.auth().onAuthStateChanged(reactToEvent_AuthStateChanged); //Listen for auth state changes
};

/**
 * Reacts to a change in the authentication state of the current user of the application. 
 * If they are not signed in, the Authentication Screen is displayed, allowing the user to choose to log in.
 * If they are signed in, the landing page is displayed.
 * @param {Object} user The object representing the data for the authenticated user, if one exists
 */
function reactToEvent_AuthStateChanged(user) {
    if (user === null) { //If there is no user signed into the app...
        DebugController.logInfo("Auth: There is no user signed in so the login screen will be displayed.");
        UIController.triggerUITransition('ShowAuthPrompt');
    } else { //Else, if there is a user signed into the app...
        DebugController.logInfo("Auth: A user is signed in so the landing page will be displayed.");
        UIController.init();
        //TODO probably shouldn't be calling an "init" function more than once,
            //but right now, if you sign out and back in, it will do this (and not all state is re-set properly)
    }
}

export function logIn() {
    var provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/appstate');

    console.log("WILL CALL SIGN IN WITH POPUP");

    firebase.auth()
        .signInWithPopup(provider)
            .then((result) => {
                /** @type {firebase.auth.OAuthCredential} */
                var credential = result.credential;

                console.log("SIGN IN WITH POPUP SUCCESSFUL");

                // This gives you a Google Access Token. You can use it to access the Google API.
                var token = credential.accessToken;
                // The signed-in user info.
                var user = result.user;
                // ...
            }).catch((error) => {
                // Handle Errors here.
                var errorCode = error.code;
                var errorMessage = error.message;
                var email = error.email;                 //The email of the user's account used.
                var credential = error.credential; //The firebase.auth.AuthCredential type that was used.
                console.error(errorMessage);
            });
}

export function logOut() {
    firebase.auth().signOut().then(function() {
            UIController.triggerUITransition('LogOut');
        }).catch(function(error) {
            DebugController.logError(error);
        });
}

init();