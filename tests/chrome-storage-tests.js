import { ChromeStorageAccessor } from '../scripts/storage/chrome-storage.js';

setTimeout(runAllTests, 500);

export async function runAllTests() {
    console.group();
    console.info("Running Chrome Storage Tests");
    for (let i = 0; i <= 12; i++) {
        await testChromeStorageAccessor(i);
    }
    console.info("Tests Complete");
    console.groupEnd();
}

async function testChromeStorageAccessor(testNumber) {
    let testAccessor = undefined;
    let error = undefined;
    let expectedErrorMessageSnippet = undefined;
    let assertMessage = "Chrome Storage Test #%s Failed";

    switch(testNumber) {
    case 0: // Storage Area incorrect (Should result in error)
        try {
            testAccessor = new ChromeStorageAccessor('xsync', 'testItem');
        } catch (caughtError) {
            error = caughtError;
        } 

        expectedErrorMessageSnippet = "An invalid storage area was provided for accessing Chrome storage";
        assertMessage = `Test #${testNumber}: Expected Error "${expectedErrorMessageSnippet}" but instead got: ${error || 'No Error'}`;
        console.assert(error?.name === 'RangeError' && error?.message.includes(expectedErrorMessageSnippet) === true, assertMessage);
        console.info("Test #%s Completed", testNumber);
        return;
    case 1: // Get Property when Storage Item doesn't exist (Should result in error)
        try {
            testAccessor = new ChromeStorageAccessor('sync', 'xtestItem');
            await testAccessor.getProperty('testKey');
        } catch (caughtError) {
            error = caughtError;
        }

        expectedErrorMessageSnippet = "there is no item associated with the key provided";
        assertMessage = `Test #${testNumber}: Expected Error "${expectedErrorMessageSnippet}" but instead got: ${error || 'No Error'}`;
        console.assert(error?.message.includes(expectedErrorMessageSnippet) === true, assertMessage);
        console.info("Test #%s Completed", testNumber);
        return;
    case 2: // Set Property without passing key (Should result in error)
        try {
            testAccessor = new ChromeStorageAccessor('sync', 'testItem');
            await testAccessor.setProperty();
        } catch (caughtError) {
            error = caughtError;
        }

        expectedErrorMessageSnippet = "an invalid property key was provided";
        assertMessage = `Test #${testNumber}: Expected Error "${expectedErrorMessageSnippet}" but instead got: ${error || 'No Error'}`;
        console.assert(error?.message.includes(expectedErrorMessageSnippet) === true, assertMessage);
        console.info("Test #%s Completed", testNumber);
        return;
    case 3: { // Set Property when Storage Item doesn't exist, with override implicitly allowed (Acceptable Usage - should add a new storage item with the given key and property kvp)
        await chrome.storage.sync.remove('testItem'); // Hard-code the initial state in Chrome storage

        testAccessor = new ChromeStorageAccessor('sync', 'testItem');
        await testAccessor.setProperty('testPropertyKey', 'testPropertyValue');
        const chromeStorageItems = await chrome.storage.sync.get(null);
        const testProperty = chromeStorageItems.testItem?.testPropertyKey;

        assertMessage = `Test #${testNumber}: Expected property value 'testPropertyValue', but instead got: ${testProperty}`;
        console.assert(testProperty === 'testPropertyValue', assertMessage);
        console.info("Test #%s Completed", testNumber);
        return;
    }
    case 4: // Get Property without passing key (Should result in error)
        try {
            testAccessor = new ChromeStorageAccessor('sync', 'testItem');
            await testAccessor.getProperty();
        } catch (caughtError) {
            error = caughtError;
        }

        expectedErrorMessageSnippet = "an invalid property key was provided";
        assertMessage = `Test #${testNumber}: Expected Error "${expectedErrorMessageSnippet}" but instead got: ${error || 'No Error'}`;
        console.assert(error?.message.includes(expectedErrorMessageSnippet) === true, assertMessage);
        console.info("Test #%s Completed", testNumber);
        return;
    case 5: { // Get Property with nonexistent key (Should return undefined)
        testAccessor = new ChromeStorageAccessor('sync', 'testItem');
        const testProperty = await testAccessor.getProperty('wrongkey');
        
        assertMessage = `Test #${testNumber}: Expected 'undefined' property value but instead got: ${testProperty}`;
        console.assert(typeof testProperty === 'undefined', assertMessage);
        console.info("Test #%s Completed", testNumber);
        return;
    }
    case 6: { // Get Property with valid key (Correct Usage - should result in expected value)
        testAccessor = new ChromeStorageAccessor('sync', 'testItem');
        await testAccessor.setProperty('testPropertyKey', 'testPropertyValue');
        const testProperty = await testAccessor.getProperty('testPropertyKey');

        assertMessage = `Test #${testNumber}: Expected property value 'testPropertyValue', but instead got: ${testProperty}`;
        console.assert(testProperty === 'testPropertyValue', assertMessage);
        console.info("Test #%s Completed", testNumber);
        return;
    }
    case 7: // Set Property with empty/undefined value parameter (Acceptable Usage - should result in property getting removed from storage)
        testAccessor = new ChromeStorageAccessor('sync', 'testItem');
        await testAccessor.setProperty('testPropertyKey');
        const testProperty = await testAccessor.getProperty('testPropertyKey');

        assertMessage = `Test #${testNumber}: Expected property to be undefined, but instead got: ${testProperty}`;
        console.assert(typeof testProperty === 'undefined', assertMessage);
        console.info("Test #%s Completed", testNumber);
        return;
    case 8: { // Set Property when Storage Item exists but Property doesn't (Acceptable usage - should result in value getting set)
        await chrome.storage.sync.set({'testItem' : {}}); // Hard-code the initial state in Chrome storage
        
        testAccessor = new ChromeStorageAccessor('sync', 'testItem');
        await testAccessor.setProperty('testPropertyKey', 'testPropertyValue');
        const chromeStorageItems = await chrome.storage.sync.get(null);
        const testProperty = chromeStorageItems.testItem?.testPropertyKey;

        assertMessage = `Test #${testNumber}: Expected property value 'testPropertyValue', but instead got: ${testProperty}`;
        console.assert(testProperty === 'testPropertyValue', assertMessage);
        console.info("Test #%s Completed", testNumber);
        return;
    }
    case 9: { // Set Property when Property does exist but override implicitly allowed (Correct Usage - should result in value getting set)
        await chrome.storage.sync.set({'testItem' : {'testPropertyKey': 'testPropertyValue'}}); // Hard-code the initial state in Chrome storage
        
        testAccessor = new ChromeStorageAccessor('sync', 'testItem');
        await testAccessor.setProperty('testPropertyKey', 'newPropertyValue');
        const chromeStorageItems = await chrome.storage.sync.get(null);
        const testProperty = chromeStorageItems.testItem?.testPropertyKey;

        assertMessage = `Test #${testNumber}: Expected property value 'newPropertyValue', but instead got: ${testProperty}`;
        console.assert(testProperty === 'newPropertyValue', assertMessage);
        console.info("Test #%s Completed", testNumber);
        return;
    }
    case 10: { // Set Property when Property exists but override disallowed (Acceptable Usage for trying to set a default value - should result in existing property value remaining the same)
        await chrome.storage.sync.set({'testItem' : {'testPropertyKey': 'testPropertyValue'}}); // Hard-code the initial state in Chrome storage
        
        testAccessor = new ChromeStorageAccessor('sync', 'testItem');
        await testAccessor.setProperty('testPropertyKey', 'newPropertyValue', false);
        const chromeStorageItems = await chrome.storage.sync.get(null);
        const testProperty = chromeStorageItems.testItem?.testPropertyKey;

        assertMessage = `Test #${testNumber}: Expected property value 'testPropertyValue', but instead got: ${testProperty}`;
        console.assert(testProperty === 'testPropertyValue', assertMessage);
        console.info("Test #%s Completed", testNumber);
        return;
    }
    case 11: { // Set Property when override disallowed but property does not exist (Acceptable Usage for setting a default value - should result in property value getting set)
        await chrome.storage.sync.set({'testItem' : {}}); // Hard-code the initial state in Chrome storage
        
        testAccessor = new ChromeStorageAccessor('sync', 'testItem');
        await testAccessor.setProperty('testPropertyKey', 'newPropertyValue', false);
        const chromeStorageItems = await chrome.storage.sync.get(null);
        const testProperty = chromeStorageItems.testItem?.testPropertyKey;

        assertMessage = `Test #${testNumber}: Expected property value 'newPropertyValue', but instead got: ${testProperty}`;
        console.assert(testProperty === 'newPropertyValue', assertMessage);
        console.info("Test #%s Completed", testNumber);
        return;
    }
    case 12: { // Set Property when Storage Item doesn't exist, with override explicitly disallowed (Acceptable usage for setting a default value - should add a new storage item with the given key and property kvp)
        await chrome.storage.sync.remove('testItem'); // Hard-code the initial state in Chrome storage

        testAccessor = new ChromeStorageAccessor('sync', 'testItem');
        await testAccessor.setProperty('testPropertyKey', 'testPropertyValue', false);
        const chromeStorageItems = await chrome.storage.sync.get(null);
        const testProperty = chromeStorageItems.testItem?.testPropertyKey;

        assertMessage = `Test #${testNumber}: Expected property value 'testPropertyValue', but instead got: ${testProperty}`;
        console.assert(testProperty === 'testPropertyValue', assertMessage);
        console.info("Test #%s Completed", testNumber);
        return;
    }
    default: 
        console.error("An invalid test case was provided.");
    }
}
