let tabId = undefined;

function init() {
    chrome.tabs.query( { active: true, currentWindow: true}, tabs => { //Query for the Active Tab...
        tabId = tabs[0].id; //Make a record of the current/active tab for future reference
    });
}

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

init();
