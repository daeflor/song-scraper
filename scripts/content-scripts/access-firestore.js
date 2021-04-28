// const src = chrome.runtime.getURL("Scripts/Modules/Utilities/LocalStorage.js");
// const contentMain = await import(src);
// contentMain.main();

// chrome.storage.local.get(null, result => {
//     console.log("TESTING GETTING LOCAL STORAGE FROM CONTENT SCRIPT:");
//     console.log(result);
// });

// import('/Scripts/Modules/Utilities/LocalStorage.js')
//     .then((module) => {
//         console.log("DID I IMPORT A MODULE?");

//         module.get('songScraperTestData', resultAtKey => {
//             console.log(resultAtKey);
//         });
//     });

let _firestoreDatabase = undefined;

//TODO could use awaits here instead
import('/node_modules/firebase/firebase-app.js').then(firebaseModule => {
    import('/node_modules/firebase/firebase-firestore.js').then(firestoreModule => {
        import('/node_modules/firebase/firebase-auth.js').then(authModule => {

            console.log("Imported Firebase Module");

            console.log(firebase.apps);

            initializeFirebase(firebase);

            console.log(firebase.apps);
            console.log(firebase.auth());

            //const _tracklistCollection = _firestoreDatabase.collection('manualtest-tracklists');
            
            // const _currentUserDocument = _firestoreDatabase.collection('manualtest-users').doc('EKCls-randomUserID');
            // const _tracklistCollection = _currentUserDocument.collection('tracklists');
            
            const _tracklistCollection = _firestoreDatabase.collection('manueltesting-users/EKCls-randomUserID/tracklists');
            
            const _query = _tracklistCollection.where('type', '==', 'playlist').where('includesCommon', '==', true);

            //_tracklistsCollection.where('type', '==', 'playlist')
            _query.get()
                .then((querySnapshot) => {
                    querySnapshot.forEach((doc) => {
                        // doc.data() is never undefined for query doc snapshots
                        console.log(doc.id, " => ", doc.data());
                        console.table(doc.data().tracks);
                    });
                })
                .catch((error) => {
                    console.log("Error getting documents: ", error);
                });

            // const storeDataInUserDocument = function(userId, data) {
            //     console.info("Storing data under user id: " + userId);
            //     //Get a reference to a new or exisiting document in the 'UserListData' collection for the primary account signed into Chrome
            //     const _documentName = userId || 'fallback';
                
            //     const _userListData = _firestoreDatabase.collection("test").doc(_documentName);
            
            //     //Add the provided list data to the document, merging it with any existing data in the document, if applicable
            //     _userListData.set({testData:data}, { merge: true })
            //     .catch(function(error) {
            //         console.error("Error writing document to storage:" + error);
            //     });
            // };

            // storeData(['cat','dog']);
        });
    });
});

function initializeFirebase(firebase) {
    const _firebaseConfig = Object.freeze({
        apiKey: "AIzaSyD180e_WjWWr3BSPUVXAcD_fX5lNteHewI",
        authDomain: "song-scraper.firebaseapp.com",
        projectId: "song-scraper",
        storageBucket: "song-scraper.appspot.com",
        messagingSenderId: "1014109245057",
        appId: "1:1014109245057:web:6bc9ec2ef8e52973bc0780"
    });

    if (Array.isArray(firebase.apps) && firebase.apps.length === 0) {
        console.info("Initializing Firebase and Firestore database.");
        firebase.initializeApp(_firebaseConfig); //Initialize Firebase
        _firestoreDatabase = firebase.firestore();
    }
    
    if (_firestoreDatabase == null) {    
        console.info("Initializing Firestore database.");        
        _firestoreDatabase = firebase.firestore();
    }
}