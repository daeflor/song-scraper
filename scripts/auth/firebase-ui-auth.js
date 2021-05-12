import * as UIController from '../AppNavigator.js';

import '/node_modules/firebase/firebase-app.js'; //Import the Firebase App before any other Firebase libraries
import '/node_modules/firebase/firebase-auth.js'; //Import the Firebase Auth library
import '/node_modules/firebaseui/dist/firebaseui.js'; //Import the Firebase Auth UI library

//TODO it appears that logging in with google sign-in (from any of the 3 methods supported by this app), the sign-in UI popup causes the extension popup to be closed
    //This doesn't happen if devtools for the extension are open (i.e. Inspect Popup is used), which is why this went unnoticed before
    //This issue still occurs if the extension/popup script sends a message to the background script to initiate the interactive sign-in from the background.
    //Could look into other work-arounds, such as signing in through an options screen instead of the extension popup itself.

/**
 * Listens for a change in authentication state of the current user of the application. 
 * If the user is not authenticated, the authentication screen is displayed and the Firebase UI Auth flow is initiated.
 * If the user is authenticated, the provided callback is executed. 
 *  @param {{()}} onSuccessCallback The function to execute once a user has succesfully authenticated
 */
export function listenForAuthStateChange(onSuccessCallback) {
    //If there is no user signed in, begin the Firebase UI Authentication flow. Otherwise, execute the callback function.
    const authListener = firebase.auth().onAuthStateChanged(user => { // When a change in the user's authentication state is detected...
        //(user === null) ? startFirebaseUIAuthFlow() : onSuccessCallback();
        if (user === null) { // If the user is not signed in, start the Firebase UI Authentication flow
            // Open a port before prompting the user to sign in. This way, when the google-sign in window causes the extension popup to close, the background script will be informed and can update the icon accordingly. 
            chrome.runtime.connect({name: 'AuthenticationChangePending'}); 

            // Get the existing Firebase AuthUI instance if it exits; otherwise, set up a new instance. Then start the auth UI flow.
            const authUI = firebaseui.auth.AuthUI.getInstance() ?? new firebaseui.auth.AuthUI(firebase.auth());
            authUI.start('#auth', getUiConfig());
        } else { // Else, if the user is signed in, remove the listener and execute the provided callback function
            authListener();
            onSuccessCallback();
        }
    });
}

/**
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

/**
 * Signs the current user out and then triggers an update to the UI, accordingly
 */
export function logOut(callback) {
    firebase.auth().signOut()
        .then(callback)
        .catch(error => console.error(error));
}
