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
        const storageItems = await chrome.storage[this.#storageArea].get(this.#storageItemKey); // Get the key value pairing for the storage item matching the given key in the specified Chrome storage area
        return storageItems[this.#storageItemKey]; // Return the storage item's value
    }

    /**
     * Gets a property value for an item in Chrome storage
     * @param {string} propertyKey The property's key
     * @returns {Promise} A promise with the property's value
     */
    async getProperty(propertyKey) {
        if (typeof propertyKey !== 'string') {
            throw TypeError("Tried to get a property value for an item in Chrome storage, but an invalid property key was provided. The key must be of type 'string'. Key provided: " + propertyKey);
        }

        const storageItem = await this.#getStorageItem();
        if (typeof storageItem === 'undefined') {
            throw Error("Tried to access the property of an item in Chrome storage but there is no item associated with the key provided. Key: " + this.#storageItemKey);
        }

        return storageItem[propertyKey];
    }

    /**
     * Sets the value of a property of an item in Chrome storage
     * @param {string} propertyKey The property's key
     * @param {*} newPropertyValue The property's new value to set in storage
     * @param {boolean} [overrideCurrentValue] An optional boolean indicating whether or not the existing property value can be overriden. Defaults to true. Setting this to false is useful when assigning a default value. 
     */
    async setProperty(propertyKey, newPropertyValue, overrideCurrentValue=true) {
        if (typeof propertyKey !== 'string' || typeof newPropertyValue === 'undefined') { // Ignore any requests if a new property value isn't provided. Otherwise, this would lead to the value getting set to undefined, and therefore the property getting removed from Chrome storage, which is undesireable unless there is an explicit request to remove the data.
            throw TypeError("Tried to set a property value for an item in Chrome storage, but an invalid property key or value was provided. The key must be of type 'string', and the value must not be 'undefined'.");
        }

        const storageItem = await this.#getStorageItem() || {}; // If the specified storage item doesn't already exist, create a new empty object
            
        //TODO I think the "storageItem[propertyKey] === 'undefined'" check is unnecessary because afaik if a property with an undefined value won't get set in chrome storage anyway
            //Yes but this is also, more importantly, checking that the property doesn't already exist, which is a possible scenario (if the storage item was just created above)
            //However, there may be a better check for this, such as Object.hasOwn()
            //Or even something smarter, since we could technically know if the storage object was just created or not. Brainstorm this, briefly. 
        if (typeof storageItem[propertyKey] === 'undefined' || overrideCurrentValue === true) { // If the given property doesn't already exist, or if overriding its current value is permitted, update the property's value and store the updated item 
            storageItem[propertyKey] = newPropertyValue; 
            await chrome.storage[this.#storageArea].set({[this.#storageItemKey]: storageItem});
        }

        // if (typeof propertyKey === 'string' && typeof newPropertyValue !== 'undefined') { // Ignore any requests if a new property value isn't provided. Otherwise, this would lead to the value getting set to undefined, and therefore the property getting removed from Chrome storage, which is undesireable unless there is an explicit request to remove the data.
        //     const storageItem = await this.#getStorageItem() || {}; // If the specified storage item doesn't already exist, create a new empty object
            
        //     // If the given property doesn't already exist, or if overriding its current value is permitted, update the property's value and store the updated item 
        //     if (typeof storageItem[propertyKey] === 'undefined' || overrideCurrentValue === true) {
        //         storageItem[propertyKey] = newPropertyValue; 
        //         await chrome.storage[this.#storageArea].set({[this.#storageItemKey]: storageItem});
        //     }
        // } else throw TypeError("Tried to set a property value for an item in Chrome storage, but an invalid property key or value was provided. The key must be of type 'string', and the value must not be 'undefined'.");
    }
}
