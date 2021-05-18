/**
 * Gets a value from chrome storage and returns a promise depending on the result
 * @param {string} area The storage area to access. Allowed values are: local, sync
 * @param {string} key The key to use to get the value from chrome storage
 */
export function getValueAtKey(area, key) {
    return new Promise((resolve, reject) => {
        if (area === 'local' || area === 'sync') {
            chrome.storage[area].get(key, storageResult => {
                typeof chrome.runtime.lastError === 'undefined'
                ? resolve(storageResult[key])
                : reject(chrome.runtime.lastError) //TODO does it make sense to reject instead of erroring out here? I think it does make sense for a utility function (like this one is trying to be), but probably not in some other circumstances.
            });
        } else reject(Error("Tried to access chrome storage but an invalid storage area was provided. Accepted values are 'local' and 'sync'."));
    });
}

/**
 * Gets an object of storage items from chrome storage and returns a promise with the result.
 * On success, the promise resolves with the object of storage items in their key-value mappings.
 * @param {string} area The storage area to access. Allowed values are: local, sync
 * @param {string | string[]} keys A single key to get or a list of keys to get. An empty list will return an empty result object. Pass in null to get the entire contents of storage.
 */
export function getKeyValuePairs(area, keys) {
    return new Promise((resolve, reject) => {
        if (area === 'local' || area === 'sync') {
            chrome.storage[area].get(keys, storageResult => {
                typeof chrome.runtime.lastError === 'undefined'
                ? resolve(storageResult)
                : reject(chrome.runtime.lastError)
            });
        } else reject(Error("Tried to access chrome storage but an invalid storage area was provided. Accepted values are 'local' and 'sync'."));
    });
}

/**
 * Saves an object to chrome storage and returns a promise depending on the result
 * @param {string} area The storage area in which to set data. Allowed values are: local, sync
 * @param {Object} object The object to save to chrome storage
 */
export function set(area, object) {
    return new Promise((resolve, reject) => {
        if (area === 'local' || area === 'sync') {
            chrome.storage[area].set(object, () => {
                typeof chrome.runtime.lastError === 'undefined'
                ? resolve()
                : reject(chrome.runtime.lastError.message)
            });
        } else reject(Error("Tried to access chrome storage but an invalid storage area was provided. Accepted values are 'local' and 'sync'."));
    });
}