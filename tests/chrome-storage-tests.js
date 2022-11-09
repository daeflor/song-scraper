import { ChromeStorageAccessor } from '../scripts/storage/chrome-storage.js';

async function testChromeStorageAccessor(testNumber) {
    let testAccessor = undefined;
    let error = undefined;
    let expectedErrorMessageSnippet = undefined;
    const assertMessage = "Chrome Storage Test #%s Failed";
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
        console.assert(error?.name === 'RangeError' && error?.message.includes("An invalid storage area was provided for accessing Chrome storage") === true, "Chrome Storage Test #0 Failed");
        
        //console.assert(typeof error !== 'undefined', "Chrome Storage Test #0 Failed");
        
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
    case 3: // Set Property when Storage Item doesn't exist (Should add a new storage item with the given key and property kvp)
        await chrome.storage.sync.remove('testItem');
        testAccessor = new ChromeStorageAccessor('sync', 'testItem');
        await testAccessor.setProperty('testPropertyKey', 'testPropertyValue');
        const chromeStorageItems = await chrome.storage.sync.get(null);

        //console.assert(Object.hasOwn(chromeStorageItems.testItem, 'testPropertyKey') === true, assertMessage, testNumber);
        //console.assert(Object.hasOwn(chromeStorageItems, 'testItem') === true && Object.hasOwn(chromeStorageItems.testItem, 'testPropertyKey') === true, assertMessage, testNumber);
        console.assert(chromeStorageItems.testItem?.testPropertyKey === 'testPropertyValue', assertMessage, testNumber);
        console.info("Test #%s Completed", testNumber);
        return;
    case 4: // Get Property without passing key (Should result in error)
        testAccessor = new ChromeStorageAccessor('sync', 'testItem');
        console.log(await testAccessor.getProperty());
        return;
    case 5: // Get Property with nonexistent key (Should return undefined)
        testAccessor = new ChromeStorageAccessor('sync', 'testItem');
        console.log(await testAccessor.getProperty('wrongkey'));
        return;
    case 6: // Get Property with valid key (Correct Usage - should result in expected value)
        testAccessor = new ChromeStorageAccessor('sync', 'testItem');
        console.log(await testAccessor.getProperty('testPropertyKey'));
        return;
    case 7: // Set Property without passing value (Should result in error)
        testAccessor = new ChromeStorageAccessor('sync', 'testItem');
        await testAccessor.setProperty('testPropertyKey');
        console.log(await chrome.storage.sync.get(null));
        return;
    case 8: // Set Property when Storage Item exists but Property doesn't (Unexpected but acceptable usage - should result in value getting set)
        testAccessor = new ChromeStorageAccessor('sync', 'testItem');
        await chrome.storage.sync.set({'testItem' : {}});
        console.log(await chrome.storage.sync.get(null));
        await testAccessor.setProperty('testPropertyKey', 'testPropertyValue');
        console.log(await chrome.storage.sync.get(null));
        return;
    case 9: // Set Property when Property does exist but override allowed (Correct Usage - should result in value getting set)
        testAccessor = new ChromeStorageAccessor('sync', 'testItem');
        await chrome.storage.sync.set({'testItem' : {'testPropertyKey': 'testPropertyValue'}});
        console.log(await chrome.storage.sync.get(null));
        await testAccessor.setProperty('testPropertyKey', 'newPropertValue');
        console.log(await chrome.storage.sync.get(null));
        return;
    case 10: // Set Property when Property does exist but override disallowed (Correct Usage for setting a default value - should result in existing property value remaining the same)
        testAccessor = new ChromeStorageAccessor('sync', 'testItem');
        await chrome.storage.sync.set({'testItem' : {'testPropertyKey': 'testPropertyValue'}});
        console.log(await chrome.storage.sync.get(null));
        await testAccessor.setProperty('testPropertyKey', 'newPropertValue', false);
        console.log(await chrome.storage.sync.get(null));
        return;
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
    await testChromeStorageAccessor(0);
    await testChromeStorageAccessor(1);
    await testChromeStorageAccessor(2);
    await testChromeStorageAccessor(3);
    console.info("Tests Complete");
    console.groupEnd();
}
