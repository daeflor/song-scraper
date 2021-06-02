import * as DebugController from './modules/DebugController.js';
import * as ViewRenderer from './modules/ViewRenderer.js';
//import * as IO from './modules/Utilities/IO.js';

/**
 * Updates the UI as specified by the transition parameter
 * @param {string} transition The type of transition that the UI should undergo
 * @param {Object} [options] An optional object to provide additional parameters needed to fulfill the UI transition. Accepted properties: tracklistTitle, username, deltaTracklists, trackTableElement
 */
export function triggerUITransition(transition, options) {
    //TODO a switch might be nice here
    if (transition === 'CachedTracklistMetadataInvalid') {
        //ViewRenderer.showStatusMessage(options.statusMessage ?? 'Error');
        ViewRenderer.showStatusMessage('Unable to retrieve cached tracklist metadata from local storage.');
    } else if (transition === 'ShowAuthPrompt') {
        ViewRenderer.hideElement(ViewRenderer.divs.status);
        ViewRenderer.unhideElement(ViewRenderer.divs.auth);
    } else if (transition === 'LogOutAndExit') {
        //ViewRenderer.hideElement(ViewRenderer.divs.auth);
        ViewRenderer.hideElement(ViewRenderer.divs.header);
        ViewRenderer.hideElement(ViewRenderer.divs.buttons);
        ViewRenderer.hideElement(ViewRenderer.divs.checkboxes);
        ViewRenderer.hideElement(ViewRenderer.divs.tracktables);
        ViewRenderer.showStatusMessage('Goodbye');
    // } else if (transition === 'LogOut') {
    //     ViewRenderer.hideElement(ViewRenderer.divs.header);
    //     ViewRenderer.hideElement(ViewRenderer.divs.buttons);
    //     ViewRenderer.hideElement(ViewRenderer.divs.checkboxes);
    //     //ViewRenderer.hideElement(ViewRenderer.divs.tracktables);

    //     resetAllTrackTablesAndCheckboxes();

    //     //TODO if you log out and back in, the clipboard button doesn't get hidden
    //     //TODO for that matter, if you log out and back in, the 'stored' tracks array doesn't get reset, which it really should
    //     //Also, if the scrape button and checklist will both be disabled and you will be unable to initiate a new scrape or view the scrape track table
    //         //These could probably all be solved with some better rules in this function but it may also be easiest and make the most sense...
    //         //...to just reset the app state completely when the user logs out. (i.e. clear out all the SESSION_STATE properties)
    //         //...and then call init again and start over when the user logs back in (like I was doing before, but this time more intentionally)

    //     ViewRenderer.disableElement(ViewRenderer.buttons.exportScrapedMetadata);
    //     ViewRenderer.updateElementTextContent(ViewRenderer.buttons.storeScrapedMetadata, 'Save Scraped Metadata to Storage');

    //     ViewRenderer.unhideElement(ViewRenderer.divs.auth);
    } else if (transition === 'ShowLandingPage') {
        if (typeof options?.tracklistTitle === 'string' && typeof options.username === 'string') {
            ViewRenderer.hideElement(ViewRenderer.divs.status);
            ViewRenderer.hideElement(ViewRenderer.divs.auth);
            ViewRenderer.showHeader(options.tracklistTitle);
            ViewRenderer.divs.username.textContent = options.username;
            ViewRenderer.showLandingPage();
        } else {
            ViewRenderer.showStatusMessage('The username or the tracklist title retrieved from the cached metadata is invalid.');
            console.error("Tried to display the landing page but the parameters provided were invalid.");
        }
    } else if (transition === 'StartScrape') {
        ViewRenderer.disableElement(ViewRenderer.buttons.scrape);
        ViewRenderer.hideElement(ViewRenderer.divs.buttons);
        ViewRenderer.hideElement(ViewRenderer.divs.checkboxes);
        ViewRenderer.hideElement(ViewRenderer.divs.tracktables);
        ViewRenderer.showStatusMessage('Song list comparison in progress.');
    } else if (transition === 'ScrapeSuccessful') {
        ViewRenderer.hideElement(ViewRenderer.divs.status);
        ViewRenderer.unhideElement(ViewRenderer.divs.buttons);
        ViewRenderer.unhideElement(ViewRenderer.divs.checkboxes);
        ViewRenderer.unhideElement(ViewRenderer.divs.tracktables);
        //ViewRenderer.enableElement(ViewRenderer.buttons.scrape);
        ViewRenderer.enableElement(ViewRenderer.buttons.storeScrapedMetadata);
        ViewRenderer.enableElement(ViewRenderer.buttons.downloadScrapedTracks);
        ViewRenderer.enableElement(ViewRenderer.buttons.copyToClipboardScrapedTracks);
        ViewRenderer.enableElement(ViewRenderer.buttons.copyToClipboardDeltaTrackTables);
        ViewRenderer.enableElement(ViewRenderer.checkboxes.scrapedTrackTable);
        ViewRenderer.enableElement(ViewRenderer.checkboxes.deltaTrackTables);
        ViewRenderer.updateElementTextContent(ViewRenderer.buttons.storeScrapedMetadata, 'Save Scraped Metadata to Storage');
    } else if (transition === 'ScrapeFailed') {
        ViewRenderer.showStatusMessage('Failed to retrieve track list.');
    } else if (transition === 'StorageInProgress') {
        ViewRenderer.updateElementTextContent(ViewRenderer.buttons.storeScrapedMetadata, 'Storage in progress...');
        ViewRenderer.disableElement(ViewRenderer.buttons.storeScrapedMetadata); // Disable the button to store the scraped data
        if (ViewRenderer.tracktables.stored.childElementCount > 0) { // If the track table for the stored tracklist exists...
            ViewRenderer.tracktables.stored.textContent = ''; // Remove the tracktable element from the DOM (since it may be out-of-date)
            ViewRenderer.uncheckBox(ViewRenderer.checkboxes.storedTrackTable); // Uncheck the checkbox
        }
    } else if (transition === 'ScrapedMetadataStored') {
        ViewRenderer.updateElementTextContent(ViewRenderer.buttons.storeScrapedMetadata, 'Data successfully stored!');
        ViewRenderer.updateElementColor(ViewRenderer.buttons.storeScrapedMetadata, '#009900');
    } else if (transition === 'StorageFailed') {
        ViewRenderer.updateElementTextContent(ViewRenderer.buttons.storeScrapedMetadata, 'Failed to store tracklist data!');
        ViewRenderer.updateElementColor(ViewRenderer.buttons.storeScrapedMetadata, '#cc3300');
    } else if (transition === 'UpdateDeltaLabel') {
        ViewRenderer.labels.deltas.childNodes[0].textContent = 'Delta Track Tables (' + options.appUsedForDelta + ')';
    } else if (transition === 'AddDeltaTrackTables') {
        if (options?.deltaTracklists instanceof Map === true) {
            // Create a track table for the list of 'Added Tracks'
            createTrackTable(options.deltaTracklists.get('Added Tracks'), 'Added Tracks', ViewRenderer.tracktables.deltas, {customHeaderClass:'greenFont noVerticalMargins'});
            
            // Create a track table for the list of 'Removed Tracks'
            createTrackTable(options.deltaTracklists.get('Removed Tracks'), 'Removed Tracks', ViewRenderer.tracktables.deltas, {customHeaderClass:'redFont noVerticalMargins'});
    
            // If a list of 'Unplayable Tracks' exits, create a track table for it
            if (options.deltaTracklists.get('Unplayable Status')?.size > 0) {
                createTrackTable(options.deltaTracklists.get('Unplayable Status'), "Change in 'Unplayable' Status", ViewRenderer.tracktables.deltas, {customHeaderClass:'orangeFont noVerticalMargins'});
            
                //TODO maybe put a flag here indicating whether or not the 'Unplayable' column should be included, and then send that when creating the 'Added' & 'Removed' track tables.
            }
        } else console.error("Tried to add delta track tables to the DOM, but a valid map of source tracklists was not provided");
    } else if (transition === 'DisplayTrackTable') {
        if (options?.trackTableElement instanceof Element === true) {
            ViewRenderer.unhideElement(options.trackTableElement); // Show the existing elements
        } else console.error("Tried to show a track table, but a valid table name was not provided.");
        // if (typeof options?.tableName === 'string') {
        //     ViewRenderer.unhideElement(ViewRenderer.tracktables[options.tableName]); // Show the existing elements
        // } else console.error("Tried to show a track table, but a valid table name was not provided.");
    }
}

// function resetAllTrackTablesAndCheckboxes() {
//     //For each potential track table...
//     for (const key in ViewRenderer.tracktables) {
//         //If the track table actually exists (i.e. was previously created)...
//         if (typeof ViewRenderer.tracktables[key] === 'object') {
//             //Hide the track table
//             ViewRenderer.hideElement(ViewRenderer.tracktables[key]);
//         } 
//     }
//     //For each track table checkbox...
//     for (const key in ViewRenderer.checkboxes) {
//         //Uncheck the checkbox
//         ViewRenderer.uncheckBox(ViewRenderer.checkboxes[key]);
//     }
//     //Disable the 'scraped' and 'deltas' track table checkboxes
//     ViewRenderer.disableElement(ViewRenderer.checkboxes.scrapedTrackTable);
//     ViewRenderer.disableElement(ViewRenderer.checkboxes.deltaTrackTables);
// }

//TODO maybe this should just create the track table element (and sub-elements) and not handle actually adding them to a parent element
    //That step could be done later with the 'new' Element.append() method
/**
 * Creates a track table from the provided tracklist and other inputs
 * @param {Object[]} tracklist The tracklist array for which to create a table element
 * @param {string} headerText The name of the track table to display above it
 * @param {Object} parentElement The element in the DOM under which the track table should be appended
 * @param {Object} [options] An object to provide the following optional parameters: headerElement (object); descriptionIfEmpty (string);
 * @returns The container element for the track table and all associated elements
 */
export function createTrackTable(tracklist, headerText, parentElement, options/*parentElement, header, descriptionIfEmpty*/) {
//TODO: Future note: If it's possible to go back and re-scrape, doing another scrape should remove (or replace?) any existing scraped tracklist tables, including from ViewRenderer's tracker object
    const _descriptionIfEmpty = (typeof options === 'object' && typeof options.descriptionIfEmpty === 'string') ? options.descriptionIfEmpty : 'No tracks to display'; //TODO Not sure it's ever going to be necessary to pass this as a parameter instead of just using the default value.
    //const _headerElement      = options?.headerElement ?? window.Utilities.CreateNewElement('p', {attributes:{class:'noVerticalMargins'}});
    const headerElement = (typeof options?.customHeaderClass === 'string') ? window.Utilities.CreateNewElement('p', {attributes:{class:options.customHeaderClass}}) : window.Utilities.CreateNewElement('p', {attributes:{class:'noVerticalMargins'}});
    //const headerElement = window.Utilities.CreateNewElement('p');
    //typeof options?.customHeaderClass === 'string' ? headerElement.classList.add(options.customHeaderClass) : headerElement.classList.add('noVerticalMargins');
    
    //const headerClass = options?.customHeaderClass ?? 'noVerticalMargins';
    //const headerElement = window.Utilities.CreateNewElement('p', {attributes:{class:headerClass}});


    //TODO Should all or some of this be done in ViewRenderer instead?

    //TODO A nice-to-have in the future would be to omit any header/column (e.g. 'Unplayable') if there are zero displayable values for that metadatum
    const columnNames = ['Title', 'Artist', 'Album', 'Duration', 'Unplayable']; //TODO This is currently hard-coded. Should eventually be a param, probably. Although it would be good to have a default set of keys to fall back to.
    const includedMetadataKeys = [];

    // Create the table element, the header row, and the header cell for the 'Index' column
    let th = window.Utilities.CreateNewElement('th', {textContent:'Index', attributes:{class:'index'}}); // Create a new th element for the 'Index' column
    let tr = window.Utilities.CreateNewElement('tr', {children:[th]}); // Create a new row element to use as a header row, with the 'Index' th cell as a child
    const _table = window.Utilities.CreateNewElement('table', {attributes:{class:'trackTable'}, children:[tr]}); // Create a new table element, with the header row as a child

    // Add a header cell for each column that should be included after the Index (i.e. track position)
    for (let i = 0; i < columnNames.length; i++) { 
        if (typeof columnNames[i] === 'string') {
            includedMetadataKeys.push(columnNames[i].toLowerCase()); // Add a lower case copy of the column name to the includedMetadataKeys array, which will be used later to access each track's properties
            th = window.Utilities.CreateNewElement('th', {textContent:columnNames[i], attributes:{class:includedMetadataKeys[i]}});
            tr.append(th);
        } else throw new Error("Tried to create a track table with non-string header cells, but only strings are accepted for header cells.");
    }

    if (typeof tracklist === 'object') { // If the tracklist parameter provided is a valid object...       
        tracklist.forEach( (track, index) => { // For each track in the tracklist...
            const trackPosition = (Array.isArray(tracklist) === true) ? index + 1 : index; // If the tracklist is stored in an array, the track position should be its index (or key) plus 1. If the tracklist is stored in a map, the track position is equal to the key value.
            const td = window.Utilities.CreateNewElement('td', {textContent:trackPosition}); // Create a new data cell for the track position
            tr = window.Utilities.CreateNewElement('tr', {children:[td]}); // Create a new row for the track, adding the index cell to the new row      
            _table.append(tr); // Add the new row to the table

            for (const metadataKey of includedMetadataKeys) { // For each additional column in the Track Table...
                tr.append(window.Utilities.CreateNewElement('td', {textContent:track[metadataKey] ?? ''})); // Append to the row a new cell containing the metadatum value, or a blank string if the metadatum has a falsy value. (For example, in the common case of the 'unplayable' value not being set, or the less common case where an unplayable track doesn't have a piece of metadata specified, such as the duration).
            }
        });
    } else throw Error("Tried to create a track table but a valid tracklist object was not provided.");
    //TODO could probably separate creating the track table itself from all the various other elements (e.g. header, description) that go along with it, to have smaller and easier-to-read functions

    let _tableBody = undefined;
    if (_table.childElementCount === 1) { //If the table has no tracks in it (i.e. the child count is 1, because of the header row)...
        //Create a new element for a description of the empty track table
        _tableBody = window.Utilities.CreateNewElement('p', {attributes:{class:'indent'}});
        _tableBody.textContent = _descriptionIfEmpty;
    }
    else { //Else, if the table does have tracks in it, create a scroll area to contain the table
        _tableBody = window.Utilities.CreateNewElement('div', {attributes:{class:'trackTableScrollArea'}, children:[_table]});
    }
    headerElement.textContent = headerText.concat(' (' + (_table.childElementCount -1) + ')'); //Set the header text, including the number of tracks in the table
    const _tableContainer = window.Utilities.CreateNewElement('div', {children:[headerElement, _tableBody]}); //Create a new element to contain the various table elements
    parentElement.appendChild(_tableContainer); //Add the new container element (and its children) to the DOM
}

//TODO this should be a module instead (or move the few different remaining helper functions here into other already-existing modules as applicable)
window.Utilities = (function() {
    /**
     * Creates and returns an element of the specified type and with the specified attributes and/or children
     * @param {string} type The type of element to create
     * @param {Object} [options] An optional object to provide attributes or children to the new element (using the 'attributes' and 'children' properties) 
     * @returns the new element object
     */
    function createNewElement(type, options) {
        if (typeof type === 'string') { //If a valid element type was provided...
            const _element = document.createElement(type); //Create a new element of the specified type

            //TODO could make this more user-friendly for setting classes, since that is one of the more common use-cases.
            if (typeof options === 'object') { //If an options object was provided...
                if (typeof options.attributes === 'object') { //If an attributes property was provided...                    
                    // for (let i = 0; i < options.attributes.length; i++) {
                    //     _element.setAttribute(options.attributes[i].key, attributes[i].value);
                    // }
                    for (const [key, value] of Object.entries(options.attributes)) {
                        _element.setAttribute(key, value);
                    }
                }
                if (typeof options.textContent !== 'undefined') { //If a textContent property was provided...                    
                    _element.textContent = options.textContent;
                }
                if (Array.isArray(options.children) === true) { //If a valid array of children was provided as a property...                    
                    for (let i = 0; i < options.children.length; i++) {
                        _element.appendChild(options.children[i]);
                    }
                }
            }

            return _element;
        }
        else {
            DebugController.LogError("ERROR: Could not create new element as the element type was not provided.");
        }
    }

    /**
     * 
     * @param {element} element The element to fade in
     * @param {function} callback The callback function to execute once the fade-in is complete
     * @param {number} [increment=1000] The length that the fade-in should last, in milliseconds. Defaults to 1000ms. Minimum value supported is 100ms.
     */
    function fadeIn(element, callback, fadeLength=1000) {
		console.log("Element \'%s\' is beginning to Fade In.", element);

        //If the fade length provided is less than 100ms, set it to 100ms.
        if (fadeLength < 100) {
            fadeLength = 100;
        }

        //The opacity will be re-calculated every 50ms
        const _intervalPeriod = 50;

        //The opacity will be incremented by this value with every interval period 
        const _opacityIncrementPerInterval = _intervalPeriod/fadeLength;
        
        //At the beginning of the fade-in, the current (i.e first) opacity level to use should be 0 (fully transparent)
        let _currentOpacityLevel = 0;
        
        //Every 60 milliseconds, increment the opacity level by the specified amount and then apply it to the element
		const _fadeInterval = setInterval(
			function() {
                
                //Apply the current opacity level to the element
                ViewRenderer.setElementOpacity(element, _currentOpacityLevel);
                
                //If the current opacity level is 1 then the fade-in is complete, so clear the interval/timer and execute the provided callback function
				if (_currentOpacityLevel == 1) {
					window.clearInterval(_fadeInterval);
                    
                    //TODO can we abstract all the null checks for all the callbacks? 
					if (typeof callback !== "undefined") { 
						callback();
					}
                }	
                //If the current opacity level has exceeded one for any reason, set it to 1 so the fade-in will be completed in the next interval
				else if (_currentOpacityLevel > 1) {
					_currentOpacityLevel = 1;
                }
                //Else, increment the current opacity level
				else {
					_currentOpacityLevel += _opacityIncrementPerInterval;
				}
			},
			_intervalPeriod
		);
    }

    function getElement(id) {
        let element = document.getElementById(id);

        if (element != null) {
            return element
        }
        else {
            DebugController.logError("ERROR: Failed to get element with an ID of: " + id);
        }
    }

    //TODO Move this out of the general Utilities section and into somewhere more applicable
        //This one could maybe go into the storage manager?
    function sendRequest_LoadGooglePlayMusicExportData(callback) {
        const _filepath = "ExportedData/LocalStorageExport_2020-10-12-10-30PM_ThumbsUpDuplicatedAsYourLikes.txt";
        IO.loadTextFileViaXMLHttpRequest(_filepath, callback, true);
    }

    return {
        // FadeIn: fadeIn,
        // GetElement: getElement,
        CreateNewElement: createNewElement
        //SendRequest_LoadGooglePlayMusicExportData: sendRequest_LoadGooglePlayMusicExportData
    };
})();

//window.Utilities.FadeIn(document.body, init, 500);