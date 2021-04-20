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
    //logIn: document.getElementById('btnLogIn'),
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

//TODO It could be a bit confusing that these are all also divs, not actual 'tables'
    //It might be easier to follow to nest these under the divs object above, and add a divs.tracktables.root field, or something to that effect.
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

export function removeElement(element) {
    if (typeof element === 'object') { //TODO better isElement check preferred 
        element.parentNode.removeChild(element);
    } else {
        console.error("ViewRenderer: Tried to remove an element but the element provided does not exist.");
    }
}

//     // function toggleScreenVisibility(screenName, visible) {
//     //     if (typeof(screenName) === 'string' && typeof(visible) === 'boolean') {
//     //         document.getElementById(screenName).hidden = !visible;
//     //     }
//     //     else {
//     //         console.log("ERROR: Tried to toggle the visibility of a screen, but the necessary parameters were not provided correctly.");
//     //     }
//     // }