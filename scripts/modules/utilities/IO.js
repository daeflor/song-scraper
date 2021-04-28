//** Private Helper Functions **//

/**
 * Creates a string of comma-separated values from the provided array
 * @param {array} array An array of the values to use to create a comma-separated string
 */
function createCommaSeparatedStringFromArray(array) {
    if (Array.isArray(array) === true) { 
        let _string = ''; //Start with a blank string

        //For each element in the array except for the last one...
        for (let i = 0; i < array.length-1; i++) {
            //If the element's value type is a string...
            if (typeof array[i] === 'string') {
                //Include double-quotes around the output string, followed by a comma to indicate the end of the current element/value
                _string += '"' + array[i] + '",';
            }
            //Otherwise, output the value without quotes, followed by a comma to indicate the end of the current element/value
            else {
                _string += array[i] + ',';
            }
        }

        //Add the array's last value to the string
        _string += array[array.length-1];

        return _string;
    }
    else {
        console.error("Request received to create a comma-separated string but an array of values was not provided.");
    }
}

//** Publicly-Exposed Utility Functions **//

//TODO would be good to pass the track position (index to these files)

/**
 * Converts multiple maps of objects to a csv
 * @param {array} maps An array of maps. The contents of each map of which will be printed side-by-side
 * @param {array} keysToInclude An array to indicate the specific object keys which should be included in the csv file, and the order in which to output them.
 * @returns {string} The CSV generated from the data in the provided maps
 */
export function convertObjectMapsToCsv(maps, keysToInclude) {
    let csv = ''; // Begin with a blank string for the CSV

    if (Array.isArray(keysToInclude) === true) {
        let valuesInHeaderRow = []; // Create an array to hold all the string values that will be included in the header row of the csv
        maps?.forEach(() => { // For each map provided...
            valuesInHeaderRow.push('index'); // Add an index column before the rest of the keys
            valuesInHeaderRow = valuesInHeaderRow.concat(keysToInclude); // Add the set of included keys to the values that will be used to create columns for the csv's header row
        });
        csv += createCommaSeparatedStringFromArray(valuesInHeaderRow) + '\r\n'; // Add a newline character to indicate the end of the header row

        let largestMapSize = 0; // Get the size of the first map (i.e. the number of elements contained within it)
        maps?.forEach(map => { // For each map provided...
            if (map?.size > largestMapSize) { // If the size of the current map is larger than the previously recorded largest size...
                largestMapSize = map.size; // Update the largest size
            }
        });
        const mapEntries = maps?.map(e => e.entries()); //Get an array of Map Iterators from the provided array of maps


        for (let i = 0; i < largestMapSize; i++) {
            const valuesInCurrentRow = []; // Create an array to hold all the string values that will be included in the current row of the csv

            mapEntries.forEach(iterator => { // For each map iterator... 
                const currentEntry = iterator.next().value; // Get the next entry from the iterator
                const currentIndex = currentEntry?.[0] ?? ''; // Use the entry's key as an 'index' value to print alongside the actual object data. If the key is falsy, then just use a blank string
                const currentObject = currentEntry?.[1]; // Get the current object from the entry's value

                valuesInCurrentRow.push(currentIndex); // Add the 'index' to the array of values to include in the current row
                
                keysToInclude.forEach(key => { // For each object key to include in the csv row...
                    const currentValue = currentObject?.[key] ?? ''; // If the object's value for the current key isn't falsy (e.g. undefined), use that value, otherwise set it to a blank string so that the column is still included in the CSV row later
                    valuesInCurrentRow.push(currentValue); // Add the value to the array of values to include in the CSV row
                });
            });
            
            csv += createCommaSeparatedStringFromArray(valuesInCurrentRow) + '\r\n'; // Create a comma-separated string from the array of recorded values and append the resulting string to the CSV string, followed by a newline character to indicate the end of the current row
        }
    } else console.error ("Tried to convert map data to a csv, but a list of keys to use for the columns was not provided.");

    return csv;
}

/**
 * Converts multiple arrays of objects to a csv and then downloads the file locally
 * @param {array} arrays An array of arrays. The contents of each of which will be printed side-by-side
 * @param {string} filename The name of the file to download
 * @param {array} [objectKeysToInclude] An optional array to indicate the specific object keys which should be included in the csv file, and the order in which to output them. If none is provided, all keys for every object will be outputted.
 */
export function convertArraysOfObjectsToCsv(arrays, filename, objectKeysToInclude) {
    let csv = ''; // Begin with a blank string for the CSV
    
    // Note that a header row can only be included if a list of specific keys to use was provided. Otherwise, all keys are included in the file export which means they might not all be consistent and able to match specific header columns.
    if (typeof objectKeysToInclude !== 'undefined') { // If a list of object keys to include was provided...
        let valuesInHeaderRow = []; // Create an array to hold all the string values that will be included in the header row of the csv
        arrays?.forEach(array => { // For each array of objects provided...
            valuesInHeaderRow = valuesInHeaderRow.concat(objectKeysToInclude); // Add the set of included keys to the values that will be used to create columns for the file's header row
        });
        csv += createCommaSeparatedStringFromArray(valuesInHeaderRow) + '\r\n'; // Add a newline character to indicate the end of the header row
    }

    //TODO maybe this function should be less abstract and more about exporting two side-by-side (delta) tracklists.
        //That would make it easier to force in the track position
        //Also, this approach of printing two objects side by side probably doesn't make much sense in the abstract. It really is just applicable to the delta tracklists, I think...

    let highestTrackCount = arrays?.[0]?.length; //TODO highestTrackCount and some other variable names below are specific to tracklists, while the rest of this function isn't
    
    for (let i = 1; i < arrays?.length; i++) {
        if (arrays[i]?.length > highestTrackCount) {
            highestTrackCount = arrays[i]?.length;
        }
    }

    console.log(highestTrackCount);

    for (let i = 0; i < highestTrackCount; i++) {
        const valuesInCurrentRow = []; // Create an array to hold all the string values that will be included in the current row of the csv
        arrays.forEach(array => {
            //array.forEach(track => {
                const currentObject = array?.[i];
                //const valuesInCurrentObject = []; //Create an array to contain all the values for the current object that are going to be included in the CSV
                
                // If a list of specific keys to include was not provided, and there is a valid object from which to extract data...
                if (typeof objectKeysToInclude === 'undefined' && typeof currentObject !== 'undefined') {
                    objectKeysToInclude = Object.keys(currentObject); // Get the list of keys from the current object
                }

                //TODO problem I think is that if there is no track AND no object keys were included as a parameter, then the foreach below will not hit anything and so no blank strings will be included
                    //Which is a problem because if it's the first/left array/list which has the fewer elements, then the printout will be wrong.
                    //Could just require the list of objectKeys OR could grab them from the first object available rather than every single one.

                //If a list of specific keys to use wasn't provided, use all of the object's keys
                //objectKeysToInclude = objectKeysToInclude ?? Object.keys(currentObject);

                objectKeysToInclude.forEach(key => {
                    //If the value that matches the current key isn't falsy (e.g. undefined), use that value, otherwise set it to a blank string so that the column is still included in the CSV row later
                    const currentValue = currentObject?.[key] ?? '';
                    //Add the key's value to the array of values to include in the CSV row later
                    valuesInCurrentRow.push(currentValue);  
                });
            //});
        });
        //Create a comma-separated string from the array of recorded values and append the resulting string to the CSV string, followed by a newline character to indicate the end of the current row
        csv += createCommaSeparatedStringFromArray(valuesInCurrentRow) + '\r\n';
    }

    //console.log(csv);
    downloadTextFile(csv, filename, 'csv');
}

/**
 * Converts an array of objects to a CSV file and then downloads the file locally
 * @param {array} array An array of object to convert to CSV
 * @param {string} filename The name of the file to download
 * @param {array} [objectKeysToInclude] An optional array to indicate the specific object keys which should be included in the CSV, and the order in which to output them. If none is provided, all keys for every object will be outputted.
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