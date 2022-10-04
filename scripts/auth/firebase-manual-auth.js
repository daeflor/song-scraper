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
            UIController.triggerUITransition('ShowAuthPrompt');
        } else { // Else, if the user is signed in, remove the listener and execute the provided callback function
            authListener();
            onSuccessCallback();
        }
    });
}

export function logIn() {
    chrome.identity.getAuthToken({interactive: true}, token => {
        //Generating a firebase auth credential takes either an id token (1st param) or access token (2nd param)
            //Since the token we get from chrome.identity is an access token, we have to pass that as the 2nd parameter. 
        const credential = firebase.auth.GoogleAuthProvider.credential(null, token); 
        firebase.auth().signInWithCredential(credential); //TODO could use some error checking here (e.g. a 'catch' block)
    });
}

export function logOut(callback) {
    //TODO perhaps replace this with removeCachedAuthToken
        //This will require a secure way of storing the auth token.
            //For the purposes of this local app, it may also be sufficient to sign out of firebase but not clear the auth token
    firebase.auth().signOut().then(function() {
        chrome.identity.clearAllCachedAuthTokens(() => {
            callback();
            //UIController.triggerUITransition('LogOut');
            console.log("Cleared cached token");
        });
    }).catch(function(error) {
        console.error(error);
    });
}


