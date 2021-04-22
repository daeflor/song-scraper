let tabId = undefined;

function init() {
    chrome.tabs.query( { active: true, currentWindow: true}, tabs => { //Query for the Active Tab...
        tabId = tabs[0].id; //Make a record of the current/active tab for future reference
    });
}

// /**
//  * Sends a message to content scripts and then executes the provided callback once a response has been received
//  * @param {object} messageToSend A JSON-ifiable object to send as a message
//  * @param {function} callback The function to execute when a response has been received
//  */
// export function sendMessageToContentScripts(messageToSend, callback) {	
//     chrome.tabs.sendMessage(tabId, messageToSend, messageReceived => {
//         if (typeof chrome.runtime.lastError === 'undefined') {
//             callback(messageReceived.response);
//         } else console.error("Error encountered while attempting to send a message to content scripts: " + chrome.runtime.lastError.message);
//     });
// }


//

/**
 * Sends a message to content scripts and then executes the provided callback once a response has been received
 * @param {string} messageGreeting The greeting to use to identify the message
 * @param {object} [options] An optional object containing additional options to pass along with the message
 * @param {function} callback The function to execute when a response has been received
 */
 export function sendMessageToContentScripts(messageGreeting, options={}, callback) {	
    const _messageToSend = {greeting:messageGreeting}; //Create the message object to pass to the content script
    for (const key in options) _messageToSend[key] = options[key]; //Add any provided option values to the message object 
    chrome.tabs.sendMessage(tabId, _messageToSend, messageReceived => {
        if (typeof chrome.runtime.lastError === 'undefined') {
            callback(messageReceived.response);
        } else console.error("Error encountered while attempting to send a message to content scripts: " + chrome.runtime.lastError.message);
    });
}

//

// /**
//  * Sends a message to content scripts with the provided greeting string
//  * @param {string} messageGreeting The greeting string used to identify the message
//  */
// function sendMessage(messageGreeting) {
//     const _message = {greeting:messageGreeting}; //Create the message object to pass to the content script
//     sendMessageToContentScripts(_message, handleMessageResponse); //Send the message
// }

// /**
//  * Handles message responses received from content scripts
//  * @param {object} message An object containing message data, including the greeting and response
//  */
// function handleMessageResponse(message) {
// 	if (message.greeting === 'GetTracklistMetadata') { 
//         if (Array.isArray(message.response) === true) { //If the response received is an array...
//             Model.setScrapedTracksArray(message.response); //TODO not sure about this naming //Update the scraped tracklist metadata in the Model
//             UIController.triggerUITransition('ScrapeSuccessful'); //Transition the UI accordingly
//         } else {
//             UIController.triggerUITransition('ScrapeFailed');
//             DebugController.logError("Requested tracklist metadata from content script, but response was not a valid array.");
//         }
// 	}
// }

init();
