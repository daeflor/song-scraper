//Should these objects be in the ViewRenderer or elsewhere (e.g. ViewState?)?

export const divs = Object.freeze({
    status: document.getElementById('status'),
    buttons: document.getElementById('buttons'),
    checkboxes: document.getElementById('checkboxes'),
    tracktables: document.getElementById('tracktables')
});

export const buttons = Object.freeze({
    scrape: document.getElementById('btnScrape'),
    storeScrapedMetadata: document.getElementById('btnStoreScrapedMetadata'),
    exportScrapedMetadata: document.getElementById('btnExportScrapedMetadata'),
    exportStoredMetadata: document.getElementById('btnExportStoredMetadataForCurrentTracklist')
});

//TODO Rename the below to tracktables probably
export const checkboxes = Object.freeze({
    storedTracklist: document.getElementById('checkboxStoredTracklist'),
    scrapedTracklist: document.getElementById('checkboxScrapedTracklist'),
    deltaTracklists: document.getElementById('checkboxDeltaTracklists')
});

export const tracktables = {
    stored: undefined,
    scraped: undefined,
    deltas: undefined
};

export function disableElement(element) {
    element.disabled = true;
}

export function enableElement(element) {
    element.disabled = false;
}

export function hideElement(element) {
    element.hidden = true;
}

export function unhideElement(element) {
    element.hidden = false;
}

export function setElementOpacity(element, targetOpacity)
{
    element.style.opacity = targetOpacity;
}

export function showLandingPage() {
    document.getElementById('buttons').hidden = false;
    document.getElementById('checkboxes').hidden = false;
    
    //document.getElementById('landingPage').hidden = false;
}

export function hideLandingPage() {
    document.getElementById('landingPage').hidden = true;
}

export function showScrapeCompletedPage() {
    document.getElementById('divScrapeCompleted').hidden = false;
}

export function hideScrapeCompletedPage() {
    document.getElementById('divScrapeCompleted').hidden = true;
}

export function showStatusMessage(text) {
    document.getElementById('status').textContent = text;
    document.getElementById('status').hidden = false;
}

export function showTitle(title) {
    document.getElementById('title').textContent = title;
    document.getElementById('title').hidden = false;
}

export function showComparisonPage() {
    document.getElementById('comparisonPage').hidden = false;
    document.getElementById('trackLists').hidden = false;
}

export function displayScreen_Tracklist() {
    document.getElementById('screen_Tracklist').hidden = false;
}

//     // function toggleScreenVisibility(screenName, visible) {
//     //     if (typeof(screenName) === 'string' && typeof(visible) === 'boolean') {
//     //         document.getElementById(screenName).hidden = !visible;
//     //     }
//     //     else {
//     //         console.log("ERROR: Tried to toggle the visibility of a screen, but the necessary parameters were not provided correctly.");
//     //     }
//     // }