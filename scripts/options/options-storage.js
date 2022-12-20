import ChromeStorageAccessor from '../storage/chrome-storage.js'
export { comparisonMethod };

//TODO consider passing a list of supported values, so that they can then be accessed following a pattern such as the following: options.comparisonMethod.values.x, where x corresponds to the potential string value of the option
    //For example, could pass an object to the constructor like the following, which then gets saved as this.values: { alwaysYTM: 'alwaysYTM', preferYTM: 'preferYTM', alwaysGPM: 'alwaysGPM' }
class Option { 
    #key;
    #storageAccessor;

    constructor(storageAccessor, key) {
        if (typeof storageAccessor === 'object' && typeof key === 'string') {
            this.#storageAccessor = storageAccessor;
            this.#key = key;
        } else throw TypeError("An invalid key was provided for accessing a Chrome storage item's property.");
    }
    
    /**
     * @returns {Promise} A promise with the option's value, fetched from Chrome Storage
     */
    async getValue() {
        return await this.#storageAccessor.getProperty(this.#key);
    }
    
    /**
     * Updates the option's value in Chrome Sync Storage
     * @param {string} newValue The option's new value
     */
    async setValue(newValue) {
        await this.#storageAccessor.setProperty(this.#key, newValue);
    }
    
    /**
     * Sets a default value for the option, in Chrome Storage. Doesn't override an existing value if one has already been set. 
     * @param {string} newValue The default value to which the option should be set
     */
    async setDefaultValue(newValue) {
        await this.#storageAccessor.setProperty(this.#key, newValue, false);
    }
}

// Instantiate a Chrome Storage Accessor for the 'preferences' property in Chrome Sync Storage
const storageAccessor = new ChromeStorageAccessor('sync', 'preferences');

// Instantiate options classes
const comparisonMethod = new Option(storageAccessor, 'Comparison Method');

// Set default values for options
comparisonMethod.setDefaultValue('preferYTM');
