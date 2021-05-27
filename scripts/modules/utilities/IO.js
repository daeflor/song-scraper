//** Private Helper Functions **//

/**
 * Creates a string of comma-separated values from the provided array
 * @param {*[]} array An array of the values to use to create a comma-separated string
 */
function createCommaSeparatedStringFromArray(array) {
    if (Array.isArray(array) === true) { 
        let _string = ''; //Start with a blank string

        for (let i = 0; i < array.length-1; i++) { // For each element in the array except the last one... 
            if (typeof array[i] === 'string') { // If the element's value type is a string...
                _string += '"' + array[i] + '",'; // Include double-quotes around the output string, followed by a comma to indicate the end of the current element/value
            } else { // Otherwise, output the value without quotes, followed by a comma to indicate the end of the current element/value
                _string += array[i] + ',';
            }
        }

        _string += array[array.length-1]; // Add the array's last value to the string
        return _string;

    } else console.error("Request received to create a comma-separated string but an array of values was not provided.");
}

//** Publicly-Exposed Utility Functions **//

/**
 * Converts multiple maps of objects to a csv
 * @param {Object} maps A map of maps. The contents of each map of which will be printed side-by-side
 * @param {string[]} keysToInclude An array to indicate the specific object keys which should be included in the csv file, and the order in which to output them.
 * @param {string} [tableName] An optional name to include in the first row of the CSV
 * @returns {string} The CSV generated from the data in the provided maps
 */
export function convertObjectMapsToCsv(maps, keysToInclude, tableName) {
    let csv = (typeof tableName === 'string') ? ',"' + tableName + '"\r\n' : ''; // If a table name is provided, use that as the value for the first row in the CSV; otherwise start with a blank string. (Note: the table name is added in the second column of the table (after an empty column) so that the index column can have a short width in spreadsheet editors).

    if (maps instanceof Map === true && Array.isArray(keysToInclude) === true) { // If the parameters provided are both valid...
        const mapEntries = []; // Create an array to hold the Map Iterators for any maps provided that aren't empty.
        const valuesInHeaderRow = []; // Create an array to hold map names that will be included in the header row of the csv
        let valuesInSecondaryHeaderRow = []; // Create an array to hold all the column names that will be included in the secondary header row of the csv
        let largestMapSize = 0; // Used to keep track of the size of the largest Map (i.e. the map with the most number of elements contained within it). This determines the final number of rows in the CSV.
        
        maps.forEach((map, key) => { // For each individual map provided...
            if (map instanceof Map === true && map.size > 0) { //If the map contains data...
                mapEntries.push(map.entries()); // Get a new Iterator for the map which will be used later to extract each element's data
                
                valuesInHeaderRow.push('', key); // Use the map key as the name to appear in the header row for this map. (Note: this is added in the second column of the table (after an empty column) so that the index column can have a short width in spreadsheet editors).
                for (let i = 0; i < keysToInclude.length - 1; i++) valuesInHeaderRow.push(''); // Add empty values to the header row equal to the number of values in the list of keys (column names) to include minus 1, because of the empty column included before table name (see above).
                //keysToInclude.forEach(() => valuesInHeaderRow.push('')); // Add empty values to the header row equal to the number of values in the list of keys (column names) to include

                valuesInSecondaryHeaderRow.push('index'); // Add an index column before the rest of the column names
                valuesInSecondaryHeaderRow = valuesInSecondaryHeaderRow.concat(keysToInclude); // Add the set of included keys to the values that will be used to create columns for the csv's header row
            
                if (map.size > largestMapSize) { // If the size of the current map is larger than the previously recorded largest size...
                    largestMapSize = map.size; // Update the largest size
                }
            } else { // Else, if the map is empty or isn't a valid map...
                maps.delete(key); // Delete the map, so it isn't considered during future loops/checks
            }
        });

        csv += createCommaSeparatedStringFromArray(valuesInHeaderRow) + '\r\n'; // Convert the array of values for the header row into a string, with a newline character at the end to indicate the end of the row
        csv += createCommaSeparatedStringFromArray(valuesInSecondaryHeaderRow) + '\r\n'; // Convert the array of values for the secondary header row into a string, with a newline character at the end to indicate the end of the row
   
        for (let i = 0; i < largestMapSize; i++) { // For each row to include in the CSV...
            const valuesInCurrentRow = []; // Create an array to hold all the string values that will be included in the row

            mapEntries.forEach(iterator => { // For each map iterator... 
                const currentEntry = iterator.next().value; // Get the next entry from the iterator
                const currentIndex = currentEntry?.[0] ?? ''; // Use the entry's key as an 'index' value to print alongside the actual object data. If the key is falsy, then just use a blank string. (Note: the blank/empty cells are added so that if one of the tables has fewer columns than the other, they both still display properly side-by-side in a spreadsheet viewer).
                const currentObject = currentEntry?.[1]; // Get the current object from the entry's value

                valuesInCurrentRow.push(currentIndex); // Add the 'index' to the array of values to include in the current row
                
                keysToInclude.forEach(key => { // For each object key to include in the csv row...
                    const currentValue = currentObject?.[key] ?? ''; // If the object's value for the current key isn't falsy (e.g. undefined), use that value, otherwise set it to a blank string so that the column is still included in the CSV row later
                    valuesInCurrentRow.push(currentValue); // Add the value to the array of values to include in the CSV row
                });
            });
            
            csv += createCommaSeparatedStringFromArray(valuesInCurrentRow) + '\r\n'; // Create a comma-separated string from the array of recorded values and append the resulting string to the CSV string, followed by a newline character to indicate the end of the current row
        }
    } else throw Error("Tried to convert map data to a csv, but invalid parameters were provided. Expected an array of maps and an array of keys to use for the column names.");

    return csv;
}

/**
 * Converts an array of objects to a CSV file and then downloads the file locally
 * @param {Object[]} array An array of objects to convert to CSV
 * @param {string} filename The name of the file to download
 * @param {string[]} [objectKeysToInclude] An optional array to indicate the specific object keys which should be included in the CSV, and the order in which to output them. If none is provided, all keys for every object will be outputted.
 */
export function convertArrayOfObjectsToCsv(array, filename, objectKeysToInclude=null) {
    let _csv = ''; //Begin with a blank string for the CSV
    
    //If a list of object keys to include was provided...
    if (objectKeysToInclude != null) {
        //Create a header row for the CSV file using the object keys, followed by a newline character to indicate the end of the row
        _csv += createCommaSeparatedStringFromArray(objectKeysToInclude) + '\r\n';
    }

    //If a valid array was provided...
    if (Array.isArray(array) === true) {
        //For each object in the array...
        for (let i = 0; i < array.length; i++) {
            const _currentObject = array[i]; //For better readability, track the current object in the objects array
            let _valuesInCurrentObject = []; //Create an array to contain all the values for the current object that are going to be included in the CSV

            //If a list of specific keys to use wasn't provided, use all of the object's keys
            objectKeysToInclude = objectKeysToInclude || Object.keys(_currentObject);

            //For each key that should be included in the CSV output...
            for (let j = 0; j < objectKeysToInclude.length; j++) { 
                //If the value that matches the current key isn't falsy (e.g. undefined), use that value, otherwise set it to a blank string so that the column is still included in the CSV row later
                const _currentValue = _currentObject[objectKeysToInclude[j]] || '';
                //Add the key's value to the array of values to include in the CSV row later
                _valuesInCurrentObject.push(_currentValue);      
            }

            //Create a comma-separated string from the array of recorded values and append the resulting string to the CSV string, followed by a newline character to indicate the end of the current row
            _csv += createCommaSeparatedStringFromArray(_valuesInCurrentObject) + '\r\n';
        }
    }

    downloadTextFile(_csv, filename, 'csv');
}

/**
 * Downloads a text file with the provided data
 * @param {string} data The text data that makes up the contents of the file
 * @param {string} [filename] The name of the file. Defaults to 'download'.
 * @param {string} [fileType] The type/extension of the file. Defaults to 'csv'.
 */
function downloadTextFile(data, filename = 'download', fileType = 'csv') {
    if (data.length > 0) { //If there is data to download...
        //Create a new link DOM element to use to trigger a download of the file locally
        const link = document.createElement('a');
        link.id = 'download-text-file';
        link.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(data));
        link.setAttribute('download', filename + '.' + fileType);
        document.body.appendChild(link); // Add the link element to the DOM
        link.click(); // Trigger an automated click of the link to download the CSV file
        link.remove(); // Remove the temporary link element from the DOM
    } else console.warn("Tried to download a text file but the data provided was blank, so no file will be downloaded.");
}

/**
 * Loads text data from a file via XMLHttpRequest and then executes the provided callback function
 * @param {string} filepath The path of the file to load
 * @param {function} callback The function to execute once the data has been successfully loaded from the file
 * @param {boolean} [parseJSON] Indicates whether or not the loaded text data should be parsed into JSON before being returned. Defaults to true.
 */
export function loadTextFileViaXMLHttpRequest(filepath, callback, parseJSON=true) {
    const xmlhttp = new XMLHttpRequest();

    //Once the data has been succssfully loaded from the file, either return the raw text data or the parsed JSON
    xmlhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            const _result = (parseJSON == true) ? JSON.parse(this.responseText) : this.responseText;
            callback(_result);
        }
    };
    xmlhttp.open("GET", filepath, true);
    xmlhttp.send();
}