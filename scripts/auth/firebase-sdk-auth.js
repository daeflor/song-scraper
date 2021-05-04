import * as UIController from '../AppNavigator.js';
import '/node_modules/firebase/firebase-app.js'; //Import the Firebase App before any other Firebase libraries
import '/node_modules/firebase/firebase-auth.js'; //Import the Firebase Auth library

/**
 * Listens for a change in authentication state of the current user of the application. 
 * If the user is not authenticated, the authentication screen is displayed.
 * If the user is authenticated, the provided callback is executed. 
 *  @param {{()}} onSuccessCallback The function to execute once a user has succesfully authenticated
 */
 export function listenForAuthStateChange(onSuccessCallback) {
    const authListener = firebase.auth().onAuthStateChanged(user => { // When a change in the user's authentication state is detected...
        //(user === null) ? startFirebaseUIAuthFlow() : onSuccessCallback();
        if (user === null) { // If the user is not signed in, show the auth screen
            //chrome.runtime.sendMessage({ greeting: 'StartFirebaseUIAuthFlow'});
            UIController.triggerUITransition('ShowAuthPrompt');
        } else { // Else, if the user is signed in, remove the listener and execute the provided callback function
            authListener();
            onSuccessCallback();
        }
    });
}

export function logIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/appstate');

    firebase.auth()
        .signInWithPopup(provider)
        .then((result) => {
            /** @type {firebase.auth.OAuthCredential} */
            //const credential = result.credential;

            console.log("Sign in with popup successful.");

            // This gives you a Google Access Token. You can use it to access the Google API.
            //var token = credential.accessToken;
            // The signed-in user info.
            //var user = result.user;
            // ...
        }).catch((error) => {
            // Handle Errors here.
            // var errorCode = error.code;
            // var email = error.email;                 //The email of the user's account used.
            // var credential = error.credential; //The firebase.auth.AuthCredential type that was used.
            console.error(error.message);
        });
}

/**
 * Signs the current user out and then triggers an update to the UI, accordingly
 */
 export function logOut(callback) {
    firebase.auth().signOut()
        .then(callback)
        .catch(error => console.error(error));
}