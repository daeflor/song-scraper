/**
 * Gets the index of the provided element within it's parent element's list of children
 * @param {Object} element The element for which to get an index
 * @returns {number} The index of the position of the given element within it's parent's list of children
 */
function getIndexOfElement (element) {
    // Note: 'Array.prototype.indexOf.call' is used here because an element's children property returns an HTMLCollection, not an Array, and so it doesn't have the 'indexOf' function, but is set up similarly enough that calling it works
    return Array.prototype.indexOf.call(element.parentElement.children, element);
}

/**
 * Runs through a process that scrolls through the given list of elements and scrapes metadata out of each of the elements
 * @param {Object} scrollContainer The element which needs to be scrolled in order to load all relevant child elements
* @param {Object} elementContainer The container element wrapping all the individual elements to scrape
 * @param {number} scrapeStartingIndex The index within the container element at which to begin the initial scrape
 * @param {function} scrapeElementFunction The function to execute on each individual element to extract metadata from it
 * @param {number} [expectedElementCount] An optional parameter indicating the expected element count for the list, if available
 * @returns {Promise} A promise with an array of the metadata scraped from each element
 */
function scrapeElements (scrollContainer, elementContainer, scrapeStartingIndex, scrapeElementFunction, expectedElementCount) {
    return new Promise(resolve => {
        const elementCollection = elementContainer.children;
        const results = []; // Create an array to store the metadata scraped from each element in the list
        let scrollingTimeoutID = undefined; // Variable tracking the timeout to end the scroll & scrape process, in case no changes to the container element are observed for a while

        const triggerDelayedScrape = (delay=100) => setTimeout(scrapeLoadedElements, delay); // Set up the function to trigger a scrape of the loaded element after a brief delay. This allows time for all the sub-elements in the DOM to load.

        const scrapeLoadedElements = () => { // Set up the function to scrape the set of elements most recently loaded in the DOM
            clearTimeout(scrollingTimeoutID); // Since there are still elements available to scrape, clear the timeout that would otherwise end the scrolling process after a few seconds. The timeout will be reset if the scrape isn't complete after the upcoming scrape.        
            
            console.info(`Current element collection length is ${elementCollection.length}`);

            for (let i = scrapeStartingIndex; i < elementCollection.length; i++) { // For each new element loaded in the DOM...
                if (i === scrapeStartingIndex || i % 100 !== 0) {
                    const elementMetadata = scrapeElementFunction(elementCollection[i]); // Scrape the metadata from the element
                    results.push(elementMetadata); // If the metadata has valid data, add it to the results array

                    if (typeof elementMetadata.title === "undefined") {
                        console.log("problematic index is " + i);
                    }
                }
                
                // const elementMetadata = scrapeElementFunction(elementCollection[i]); // Scrape the metadata from the element

                // if (typeof elementMetadata.title === "undefined") {
                //     console.log("problematic index is " + i);
                // }

                

                // if (typeof elementMetadata.title !== "undefined") {
                //     results.push(elementMetadata); // If the metadata has valid data, add it to the results array
                // }
                //results.push(scrapeElementFunction(elementCollection[i])); // Scrape the metadata from the element and add it to the metadata array
            }

            if (results.length === expectedElementCount) { // If there is an expected element count and it matches the length of the metadata array...
                // Note: This currently works for the 'Your Likes' list even though the expected/displayed track count is incorrect. This is is because the displayed track count is greater than the actual one. If it was the other way around, it's possible the resulting scraped tracklist could be incorrect.
                console.info(`Scrape ended. ${results.length} results scraped out of an expected ${expectedElementCount}.`);
                endScrape(); // End the scrape
            } else { // Else, if the scrape isn't complete or the expected element count is unknown...
                console.info(`Scrape is incomplete and will continue. ${results.length} results scraped out of an expected ${expectedElementCount}.`);
                scrollToElement(elementCollection[elementCollection.length-1]); // Scroll to the last available child element in the container
                scrapeStartingIndex = elementCollection.length-1; // Set the starting index for the next scrape to be one greater than the index of the last child element from the previous scrape
                scrollingTimeoutID = setTimeout(endScrape, 10000); // Set a timeout to end the scrolling if no new changes to the container element have been observed for a while. This avoids infinite scrolling when the expected element count is unknown, or if an unexpected issue is encountered.
            }
        }

        const endScrape = () => { // Set up the function to execute once the scrape & scroll process has either been successfully completed or timed out
            allowManualScrolling(scrollContainer, true); // Allow the user to scroll manually again
            observer.disconnect(); // Disconnect the mutation observer
            resolve(results); // Resolve the promise along with the resulting array of scraped metadata
        }

        allowManualScrolling(scrollContainer, false); //Temporarily disable manual scrolling to avoid any interference from the user during the scrape process
        scrollToTopOfContainer(scrollContainer); //Scroll to the top of the tracklist, as an extra safety measure just to be certain that no tracks are missed in the scrape. (Note: This step likely isn't necessary in YTM since it appears the track row elements never get removed from the DOM no matter how far down a list you scroll).

        const observer = new MutationObserver(triggerDelayedScrape); // Create a new mutation observer instance which triggers a scrape of the loaded elements after a brief delay (which allows time for all the sub-elements in the DOM to load).
        const observerConfig = {childList: true}; // Set up the configuration options for the Mutation Observer to watch for changes to the element's childList
        observer.observe(elementContainer, observerConfig); // Start observing the container element for configured mutations (i.e. for any changes to its childList)
        
        triggerDelayedScrape(); // Wait a short amount of time to allow the page to scroll to the top of the tracklist, and then begin the scrape & scroll process
    });
}

/**** Helpers ****

/**
 * Sets whether or not the user should be able to scroll manually within the container element provided
 * @param {boolean} enabled Indicates whether or not manual scrolling should be allowed. Defaults to true, meaning the user can scroll manually.
 */
function allowManualScrolling(container, enabled=true) {
    if (typeof container === 'object') { // If a valid container element was provided...
        container.style.overflowY = (enabled === true) ? 'auto' : 'hidden'; // If manual scrolling should be enabled (which is the default), set overflowY to 'auto', otherwise set to 'hidden'
    } else console.error(`Tried to toggle scrolling but the specified container element does not exist.`);
}

/**
 * Scrolls to the top of the provided container element
 * @param {Object} container The container element to scroll to the top of
 */
function scrollToTopOfContainer(container) {
    //if (typeof container === 'object') {
        // switch(currentApp) {
            // case supportedApps.youTubeMusic: 
                scrollToElement(container); // Trigger a scroll such that the scroll container is in view...
        //         break;
        //     case supportedApps.googlePlayMusic: 
        //         container.scrollTop = 0; // Modify the scrollTop property to scroll to the top of the scroll container
        //         break;
        //     default:
        //         console.error(`Tried to scroll to the top of a container element but the current app was not recognized as valid.`);
        // }
    //} else console.error(`Tried to scroll to the top of a container element but element provided is invalid.`);
}

/**
 * Scrolls the page such that the given element is in view
 * @param {Object} element The DOM element to scroll into view
 */
function scrollToElement(element) {
    if (typeof element === 'object') {
        element.scrollIntoView(true);
    }
    else console.error(`There is no valid element to scroll to.`);
}

function convertArrayToSingleColumnCSV(array) {
    if (Array.isArray(array) === true) { // If a valid array was provided, convert it to a single column CSV
        let csv = '';
        for (const element of array) {
            csv += element + '\r\n';
        }

        return csv;
    } else throw Error(`Tried to convert an array to a single-column CSV but a valid array was not provided.`);  
}