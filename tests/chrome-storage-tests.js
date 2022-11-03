import { ChromeStorageAccessor } from '../scripts/storage/chrome-storage.js';

export async function testChromeStorageAccessor(test) {
    let testAccessor = undefined;
    switch(test) {
    case 0: // Storage Area incorrect (Should result in error)
        testAccessor = new ChromeStorageAccessor('xsync', 'testItem');
        return;
    case 1: // Get Property when Storage Item doesn't exist (Should result in error)
        testAccessor = new ChromeStorageAccessor('sync', 'xtestItem');
        await testAccessor.getProperty('testKey');
        return;
    case 2: // Set Property without passing key (Should result in error)
        testAccessor = new ChromeStorageAccessor('sync', 'testItem');
        await testAccessor.setProperty();
        return;
    case 3: // Set Property when Storage Item doesn't exist
        testAccessor = new ChromeStorageAccessor('sync', 'testItem');
        await testAccessor.setProperty('testPropertyKey', 'testPropertyValue');
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

testChromeStorageAccessor(9);