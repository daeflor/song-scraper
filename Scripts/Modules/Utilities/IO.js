import * as DebugController from '../DebugController.js';

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
            if (typeof(array[i]) === 'string') {
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
        DebugController.logError("ERROR: Request received to create a comma-separated string but an array of values was not provided.");
    }
}

//** Publicly-Exposed Utility Functions **//

/**
 * Converts an array of objects to a CSV file and then downloads the file locally
 * @param {array} array An array of object to convert to CSV
 * @param {string} filename The name of the file to download
 * @param {array} [objectKeysToInclude] An optional array to indicate the specific object keys which should be included in the CSV, and the order in which to output them. If none is provided, all keys for every object will be outputted.
 */
function convertArrayOfObjectsToCsv(array, filename, objectKeysToInclude=null) {
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

    //TODO at some point, pull this logic out of this function and into a separate one specifically for downloading a csv file
    //If the CSV actually has some data in it after the array has been converted...
    if (_csv.length > 0) {
        //Create a new link DOM element to use to trigger a download of the file locally
        const _link = document.createElement('a');
        _link.id = 'download-csv';
        _link.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(_csv));
        _link.setAttribute('download', filename+'.csv');
        document.body.appendChild(_link); //Add the link element to the DOM
        _link.click(); //Trigger an automated click of the link to download the CSV file
        _link.remove(); //Remove the temporary link element from the DOM
    }
    else {
        DebugController.logWarning("The generated CSV was blank, so no file will be downloaded.");
    }
}

/**
 * Loads text data from a file via XMLHttpRequest and then executes the provided callback function
 * @param {string} filepath The path of the file to load
 * @param {function} callback The function to execute once the data has been successfully loaded from the file
 * @param {boolean} [parseJSON] Indicates whether or not the loaded text data should be parsed into JSON before being returned. Defaults to true.
 */
function loadTextFileViaXMLHttpRequest(filepath, callback, parseJSON=true) {
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

export { convertArrayOfObjectsToCsv, loadTextFileViaXMLHttpRequest };