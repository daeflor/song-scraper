import * as DebugController from './DebugController.js';
import * as UIController from '../AppNavigator.js';
import firebaseConfig from '../Configuration/Config.js';

//Initialize the app once the DOM content has loaded, and then remove this event listener
window.document.addEventListener('DOMContentLoaded', init, {once:true}); 

/**
 * Sets up the Firebase context and register a listener for the auth state changing
 */
function init() {
    
    firebase.initializeApp(firebaseConfig); //Initialize Firebase

    //Note: This code will force sign out the user, for testing purposes
    firebase.auth().signOut().then(function() {
        DebugController.logInfo("I JUST FORCE SIGNED YOU OUT");
    }).catch(function(error) {
        // An error happened.
        window.DebugController.LogError("An error was encountered when trying to sign the user out. Error (below): ");
        window.DebugController.LogError(error);
      });

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
                    prompt: 'select_account' //Forces account selection even when one account is available.
                }
            }]
        };
    }

    _authUI.start('#firebaseui-auth-container', _uiConfig);
}