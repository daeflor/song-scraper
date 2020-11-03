let rulePageIsValidTracklist = {
    conditions: [
        new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { 
                hostEquals: 'play.google.com', 
                schemes: ['https'],
                pathEquals: '/music/listen'
            }
        }),
        new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { 
                hostEquals: 'music.youtube.com', 
                schemes: ['https'],
                pathEquals: '/playlist' 
            }
        })
    ],
    actions: [ new chrome.declarativeContent.ShowPageAction() ]
};

//When the extenstion is installed or updated...
chrome.runtime.onInstalled.addListener(function(details) {

    //Remove all pre-existing rules to start from a clean slate and then...
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {

        //Add the rules defined above
        chrome.declarativeContent.onPageChanged.addRules([rulePageIsValidTracklist]);

        console.log("Rules have been updated.");
    });
});