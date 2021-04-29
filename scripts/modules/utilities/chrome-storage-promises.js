/**
 * Gets a value from chrome local storage and then executes the provided callback function
 * @param {string} area The storage area to access. Allowed values are: local, sync
 * @param {string} key The key to use to get the value from Local Storage
 */
export function get(area, key) {
    return new Promise((resolve, reject) => {
        if (area === 'local' || area === 'sync') {
            chrome.storage[area].get(key, storageResult => {
                typeof chrome.runtime.lastError === 'undefined'
                ? resolve(storageResult[key])
                : reject(Error(chrome.runtime.lastError.message))
            });
        } else reject(Error("Tried to access chrome storage but an invalid storage area was provided. Accepted values are 'local' and 'sync'."));
    });
}

/**
 * Saves an object to Local Storage and then executes the provided callback function
 * @param {Object} object The object to save to Local Storage
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

export { set };