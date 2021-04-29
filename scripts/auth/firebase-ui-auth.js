import * as DebugController from '../Modules/DebugController.js';
import * as UIController from '../AppNavigator.js';

import '/node_modules/firebase/firebase-app.js'; //Import the Firebase App before any other Firebase libraries
import '/node_modules/firebase/firebase-auth.js'; //Import the Firebase Auth library
import '/node_modules/firebaseui/dist/firebaseui.js'; //Import the Firebase Auth UI library

//TODO try async
/**
 * Listens for a change in authentication state of the current user of the application. 
 * If the user is not authenticated, the authentication screen is displayed and the Firebase UI Auth flow is initiated.
 * If the user is authenticated, the provided callback is executed. 
 *  @param {{()}} onSuccessCallback The function to execute once a user has succesfully authenticated
 */
export function listenForAuthStateChange(onSuccessCallback) {
    //If there is no user signed in, begin the Firebase UI Authentication flow. Otherwise, execute the callback function.
    firebase.auth().onAuthStateChanged(user => {
        (user === null) ? startFirebaseUIAuthFlow() : onSuccessCallback();
    });
}

/**
 * Starts a new or existing Firebase AuthUI instance
 */
function startFirebaseUIAuthFlow() {
    // Get the existing Firebase AuthUI instance if it exits; otherwise, set up a new instance
    const authUI = firebaseui.auth.AuthUI.getInstance() ?? new firebaseui.auth.AuthUI(firebase.auth());
    authUI.start('#auth', getUiConfig());
}

/**
 * 
 * @returns {Object} The FirebaseUI config
 */
function getUiConfig() {
    return {
        callbacks: {
            uiShown: () => UIController.triggerUITransition('ShowAuthPrompt'), // Hide the status message and show the auth prompt
            signInSuccessWithAuthResult: (authResult, redirectUrl) => false, // Return false so the page doesn't get automatically redirected
            signInFailure: error => console.error(error)
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

export function logOut() {
    firebase.auth().signOut().then(function() {
            UIController.triggerUITransition('LogOut');
        }).catch(function(error) {
            DebugController.logError(error);
        });
}
