/**
 * Gets a storage item from chrome storage and returns a promise containing the resulting storage item value
 * @param {string} area The storage area to access. Allowed values are: local, sync
 * @param {string} key The key to use to get the value from chrome storage
 * @returns {Promise} A promise with the matching storage item value
 */
export function getValueAtKey(area, key) {
    return new Promise((resolve, reject) => {
        if (area === 'local' || area === 'sync') {
            chrome.storage[area].get(key, storageItems => {
                typeof chrome.runtime.lastError === 'undefined'
                ? resolve(storageItems[key])
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
 * @returns {Promise} A promise with an object containing the matching storage items
 */
export function getKeyValuePairs(area, keys) {
    return new Promise((resolve, reject) => {
        if (area === 'local' || area === 'sync') {
            chrome.storage[area].get(keys, storageItems => {
                typeof chrome.runtime.lastError === 'undefined'
                ? resolve(storageItems)
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

/**
 * Modifies the value of a given property of the specified object in storage
 * @param {string} area The storage area in which to modify data. Allowed values are: local, sync
 * @param {string} storageItemKey The key of the storage item which should have its property modified. Note that if a matching storage item isn't found, a new object will be created with the specified property
 * @param {string} propertyKey The key of the storage item's property which should be modified
 * @param {*} newPropertyValue The new value that should be assigned to the storage item's given property
 */
 export async function modifyStorageItemProperty(area, storageItemKey, propertyKey, newPropertyValue) {
    if (area === 'local' || area === 'sync') {
        const storageItem = await getValueAtKey(area, storageItemKey) || {}; // If the specified storage item doesn't already exist, create a new empty object
        storageItem[propertyKey] = newPropertyValue; // Update the value of the storage item's specified property
        await set(area, {[storageItemKey]: storageItem}); // Update the item in storage with the modified version
    } else throw Error ("Tried to access chrome storage but an invalid storage area was provided. Accepted values are 'local' and 'sync'.");
}
