import { ChromeStorageAccessor } from '../scripts/storage/chrome-storage.js';

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

            // if (caughtError.name === 'RangeError' && caughtError.message.includes("An invalid storage area was provided for accessing Chrome storage") === true) {
            //     error = caughtError;
            // }
        } 
        //console.assert(typeof error !== 'undefined', "Chrome Storage Test #0 Failed");

        expectedErrorMessageSnippet = "An invalid storage area was provided for accessing Chrome storage";
        assertMessage = `Test #${testNumber}: Expected a specific error but instead got: ${error || 'No Error'}`;
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
        console.assert(error?.message.includes(expectedErrorMessageSnippet) === true, assertMessage, testNumber);
        console.info("Test #%s Completed", testNumber);
        return;
    case 2: // Set Property without passing key (Should result in error)
        try {
            testAccessor = new ChromeStorageAccessor('sync', 'testItem');
            await testAccessor.setProperty();
        } catch (caughtError) {
            error = caughtError;
        }

        expectedErrorMessageSnippet = "an invalid property key or value was provided";
        console.assert(error?.message.includes(expectedErrorMessageSnippet) === true, assertMessage, testNumber);
        console.info("Test #%s Completed", testNumber);
        return;
    case 3: { // Set Property when Storage Item doesn't exist (Should add a new storage item with the given key and property kvp)
        await chrome.storage.sync.remove('testItem'); // Hard-code the initial state in Chrome storage

        testAccessor = new ChromeStorageAccessor('sync', 'testItem');
        await testAccessor.setProperty('testPropertyKey', 'testPropertyValue');
        const chromeStorageItems = await chrome.storage.sync.get(null);

        //console.assert(Object.hasOwn(chromeStorageItems.testItem, 'testPropertyKey') === true, assertMessage, testNumber);
        //console.assert(Object.hasOwn(chromeStorageItems, 'testItem') === true && Object.hasOwn(chromeStorageItems.testItem, 'testPropertyKey') === true, assertMessage, testNumber);
        console.assert(chromeStorageItems.testItem?.testPropertyKey === 'testPropertyValue', assertMessage, testNumber);
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
    case 7: // Set Property without passing value (Should result in error)
        try {
            testAccessor = new ChromeStorageAccessor('sync', 'testItem');
            await testAccessor.setProperty('testPropertyKey');
        } catch (caughtError) {
            error = caughtError;
        }

        expectedErrorMessageSnippet = "an invalid property key or value was provided";
        assertMessage = `Test #${testNumber}: Expected Error "${expectedErrorMessageSnippet}" but instead got: ${error || 'No Error'}`;
        console.assert(error?.name === 'TypeError' && error?.message.includes(expectedErrorMessageSnippet) === true, assertMessage);
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
        await testAccessor.setProperty('testPropertyKey', 'newPropertValue');
        const chromeStorageItems = await chrome.storage.sync.get(null);
        const testProperty = chromeStorageItems.testItem?.testPropertyKey;

        assertMessage = `Test #${testNumber}: Expected property value 'newPropertValue', but instead got: ${testProperty}`;
        console.assert(testProperty === 'newPropertValue', assertMessage);
        console.info("Test #%s Completed", testNumber);
        return;
    }
    case 10: { // Set Property when Property exists but override disallowed (Acceptable Usage for setting a default value - should result in existing property value remaining the same)
        await chrome.storage.sync.set({'testItem' : {'testPropertyKey': 'testPropertyValue'}}); // Hard-code the initial state in Chrome storage
        
        testAccessor = new ChromeStorageAccessor('sync', 'testItem');
        await testAccessor.setProperty('testPropertyKey', 'newPropertValue', false);
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

chrome.alarms.create({ when: Date.now() + 500 });

chrome.alarms.onAlarm.addListener(() => {
    runAllTests();
});

export async function runAllTests() {
    console.group();
    console.info("Running Chrome Storage Tests");
    for (let i = 0; i <= 10; i++) {
        await testChromeStorageAccessor(i);
    }
    console.info("Tests Complete");
    console.groupEnd();
}
