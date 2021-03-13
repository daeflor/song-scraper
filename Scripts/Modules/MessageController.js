import * as DebugController from './DebugController.js';
import * as Model from './Model.js';
import * as UIController from '../AppNavigator.js';

/**
 * Sends a message to content scripts and then executes the provided callback once a response has been received
 * @param {object} message A JSON-ifiable object to send as a message
 * @param {function} callback The function to execute when a response has been received
 */
function sendMessageToContentScripts(message, callback) {	
    chrome.tabs.sendMessage(Model.tab.id, message, response => {
        if(chrome.runtime.lastError) { //If an error occurred during the message connection, print an error
            DebugController.logError("ERROR: An error occurred during the message connection: ");
            console.log(chrome.runtime.lastError);
            return;
        }
        else { //Otherwise, excute the provided callback function
            callback(response); 
        }
    });
}

/**
 * Sends a message to content scripts with the provided greeting string
 * @param {string} messageGreeting The greeting string used to identify the message
 */
function sendMessage(messageGreeting) {
    const _message = {greeting:messageGreeting, app:Model.tab.app}; //Create the message object to pass to the content script
    sendMessageToContentScripts(_message, handleMessageResponse); //Send the message
}

/**
 * Handles message responses received from content scripts
 * @param {object} message An object containing message data, including the greeting and response
 */
function handleMessageResponse(message) {
	if (message.greeting === 'GetTracklistTitle') {         
		if (typeof message.response === 'string') { //If the response received is a string...
            Model.tracklist.title = message.response; //Update the tracklist title in the Model
            UIController.prepareLandingPage(); //Display the popup landing page
        } else {
            DebugController.logError("Requested tracklist title from content script, but response was not a valid string.");
        }
	} else if (message.greeting === 'GetTracklistMetadata') { 
        if (Array.isArray(message.response) === true) { //If the response received is an array...
            Model.tracklist.metadataScraped = message.response; //Update the scraped tracklist metadata in the Model
            UIController.triggerUITransition('ScrapeSuccessful'); //Transition the UI accordingly
        } else {
            UIController.triggerUITransition('ScrapeFailed');
            DebugController.logError("Requested tracklist metadata from content script, but response was not a valid array.");
        }
	}
}

//TODO may want to restructure this similarly to new EventController
//TODO I'm not convinced it makes a lot of sense for the MessageController to also own the logic for how to handle the response
    //If this file were simpler and more contained, it could be a utility module (i.e. not specific to this app) that the background script could also import and leverage (e.g. to get the track count)
        //Although the value of a simple helper for message passing is questionable since it's not that involved.

export {sendMessage};