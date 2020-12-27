/**
 * Gets a value from Local Storage and then executes the provided callback function
 * @param {string} key The key to use to get the value from Local Storage
 * @param {function} callback The function to execute once the value has been retrieved from Local Storage
 */
function get(key, callback) {
    chrome.storage.local.get (
        key, 
        function(result) {
            if (chrome.runtime.lastError != null) {
                console.error("ERROR: " + chrome.runtime.lastError.message);
            }
            else {
                console.log("Retrieved value from Local Storage: ");
                console.log(result[key]);
                callback(result[key]);
            }
        }
    );
}

/**
 * Saves an object to Local Storage and then executes the provided callback function
 * @param {object} object The object to save to Local Storage
 * @param {function} callback The function to execute once the object has been saved to Local Storage
 */
function set(object, callback) {
    chrome.storage.local.set (
        object, 
        function() {
            if (chrome.runtime.lastError != null) {
                console.error("ERROR: " + chrome.runtime.lastError.message);
            }
            else if (typeof callback === 'function') {
                callback();
            }
        }
    );
}

export { get, set };