//TODO It would be better if this were a sandboxed script instead of a content script
    //But for now, it's difficut to interact with sandboxed scripts from service workers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.greeting === 'GetGPMData') {
        console.info("Content Script: Received request to retrieve exported GPM library data");
        import('chrome-extension://mciancigjjiffaloookdflbklefkemnj/Scripts/Modules/Utilities/IO.js').then(io => {
            console.info("IO module loaded");
            const _filePath = 'chrome-extension://mciancigjjiffaloookdflbklefkemnj/ExportedData/' + message.fileName;
            io.loadTextFileViaXMLHttpRequest(_filePath, gpmLibraryObject => {
                message.response = gpmLibraryObject;
                sendResponse(message);
            });
        });
    }
    
    return true; //Return true to keep the message channel open (so the callback can be called asynchronously)
});