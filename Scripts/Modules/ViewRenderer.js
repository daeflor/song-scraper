export function disableElement(id) {
    document.getElementById(id).disabled = true;
}

export function hideStatusMessage() {
    document.getElementById('status').hidden = true;
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