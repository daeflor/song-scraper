export class ChromeStorageAccessor {
    #storageArea;
    #storageItemKey;
    
    constructor(area, key/*, ...properties*/) {
        if (area === 'local' || area === 'sync') {
            this.#storageArea = area;
            this.#storageItemKey = key;
            //this.#properties = properties;
        } else throw RangeError("An invalid storage area was provided for accessing Chrome storage. Accepted values are 'local' and 'sync'. Value provided: " + area);
    }

    /**
     * @returns {Promise} A promise with the item from storage matching the key provided in the constructor
     */
    async #getStorageItem() {
        const storageItems = await chrome.storage[this.#storageArea].get(this.#storageItemKey);

        if (typeof chrome.runtime.lastError === 'undefined') {
            return storageItems[this.#storageItemKey];
        } else throw chrome.runtime.lastError;
        
        // if (typeof chrome.runtime.lastError !== 'undefined') {
        //     throw chrome.runtime.lastError;
        // } else if (typeof storageItems[this.#storageItemKey] === 'undefined') {
        //     //TODO not sure if this should error out or just print an error/warning and return undefined.
        //     throw Error("Tried to access the property of an item in Chrome storage but there is no item associated with the key provided. Key: " + this.#storageItemKey);
        // } else return storageItems[this.#storageItemKey];
    }

    async getProperty(propertyKey) {
        //TODO maybe reorder these ifs so it reads better / is less nested (e.g. use guard clauses)
        if (typeof propertyKey === 'string') {
            const storageItem = await this.#getStorageItem();
            if (typeof storageItem !== 'undefined') {
                return storageItem[propertyKey];
            } else throw Error("Tried to access the property of an item in Chrome storage but there is no item associated with the key provided. Key: " + this.#storageItemKey);
            //TODO not sure if this should error out or just print an error/warning and return undefined.
        } else throw TypeError("Tried to get a property value for an item in Chrome storage, but an invalid property key was provided. The key must be of type 'string'. Key provided: " + propertyKey);

        
        // const storageItems = await chrome.storage[this.#storageArea].get(this.#storageItemKey);
        
        // if (typeof chrome.runtime.lastError !== 'undefined') {
        //     throw chrome.runtime.lastError;
        // } else if (typeof storageItems[this.#storageItemKey] === 'undefined') {
        //     //TODO not sure if this should error out or just print an error/warning and return undefined.
        //     throw Error("Tried to access the property of an item in Chrome storage but there is no item associated with the key provided. Key: " + this.#storageItemKey);
        // } else return storageItems[this.#storageItemKey][propertyKey];
        // //return storageItems[this.#storageItemKey]?.[propertyKey]; //This would "fail silently" and return undefined if no item is found matching the given storage key
    }

    async setProperty(propertyKey, newPropertyValue, overrideCurrentValue=true) {
        if (typeof propertyKey === 'string' && typeof newPropertyValue !== 'undefined') { // Ignore any requests if a new property value isn't provided. Otherwise, this would lead to the value getting set to undefined, and therefore the property getting removed from Chrome storage, which is undesireable unless there is an explicit request to remove the data.
            const storageItem = await this.#getStorageItem() || {}; // If the specified storage item doesn't already exist, create a new empty object
            
            // If the given property doesn't already exist, or if overriding its current value is permitted, update the property's value and store the updated item 
            if (typeof storageItem[propertyKey] === 'undefined' || overrideCurrentValue === true) {
                storageItem[propertyKey] = newPropertyValue; 
                await chrome.storage[this.#storageArea].set({[this.#storageItemKey]: storageItem});
                if (typeof chrome.runtime.lastError !== 'undefined') {
                    throw chrome.runtime.lastError;
                }
            }
        } else throw TypeError("Tried to set a property value for an item in Chrome storage, but an invalid property key or value was provided. The key must be of type 'string', and the value must not be 'undefined'.");
    }
}
