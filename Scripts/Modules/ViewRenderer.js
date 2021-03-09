//import * as DebugController from './DebugController.js';

//Should these objects be in the ViewRenderer or elsewhere (e.g. ViewState?)?

export const divs = Object.freeze({
    auth: document.getElementById('auth'),
    header: document.getElementById('header'),
    status: document.getElementById('status'),
    buttons: document.getElementById('buttons'),
    checkboxes: document.getElementById('checkboxes'),
    tracktables: document.getElementById('tracktables')
});

export const buttons = Object.freeze({
    logOut: document.getElementById('btnLogOut'),
    scrape: document.getElementById('btnScrape'),
    storeScrapedMetadata: document.getElementById('btnStoreScrapedMetadata'),
    exportScrapedMetadata: document.getElementById('btnExportScrapedMetadata'),
    exportStoredMetadata: document.getElementById('btnExportStoredMetadataForCurrentTracklist')
});

export const checkboxes = Object.freeze({
    storedTrackTable: document.getElementById('checkboxStoredTrackTable'),
    scrapedTrackTable: document.getElementById('checkboxScrapedTrackTable'),
    deltaTrackTables: document.getElementById('checkboxDeltaTrackTables')
});

export const tracktables = {
    stored: undefined,
    scraped: undefined,
    deltas: undefined
};

export function disableElement(element) {
    //TODO it would be better to have a more thorough 'isElement'/'validateElement' check
    if (typeof element === 'object') {
        element.disabled = true;
    } else {
        throw new Error('Cannot find element.');
    }
}

export function enableElement(element) {
    element.disabled = false;
}

export function hideElement(element) {
    //TODO it would be better to have a more thorough 'isElement'/'validateElement' check
    if (typeof element === 'object') {
        element.hidden = true;
    } else {
        throw new Error('Cannot find element.');
    }
}

// function modifyElementProperty(element, property) {}

export function unhideElement(element) {
    element.hidden = false;
}

export function uncheckBox(element) {
    element.checked = false;
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

export function showStatusMessage(text) {
    document.getElementById('status').textContent = text;
    document.getElementById('status').hidden = false;
}

export function showHeader(title) {
    document.getElementById('title').textContent = title;
    document.getElementById('header').hidden = false;
}

//     // function toggleScreenVisibility(screenName, visible) {
//     //     if (typeof(screenName) === 'string' && typeof(visible) === 'boolean') {
//     //         document.getElementById(screenName).hidden = !visible;
//     //     }
//     //     else {
//     //         console.log("ERROR: Tried to toggle the visibility of a screen, but the necessary parameters were not provided correctly.");
//     //     }
//     // }