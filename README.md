# Song Scraper

Song Scraper is an extension for Chrome that adds various functionality to the web version of YouTube Music. Primarily, it can track any undesired removal of songs in your YouTube Music playlists. 

### History
I started this Chrome extension about 8 years ago to solve a problem with Google Play Music (GPM) that caused me a lot of frustration. Frequently, songs would be removed from your playlists without any indication that it happened. Sometimes they would re-appear weeks later, sometimes not. While it is somewhat common for certain songs to become unavailable on various music apps now and then, it happened incredibly frequently on GPM. Also, some competitor apps grey out and disable the songs but don't outright remove them, so it's more obvious that it happened, but on GPM they would just disappear. 

As my first personal JavaScript app and Chrome extension, it started fairly messily, but got the job done. I used it frequenlty over the course of the years, making some tweaks now and then. In 2020, the dreaded shutdown of Google Play Music finally came and all its remaining users were switched over to YouTube Music (YTM), which was somewhat lacking in features. Also, while there was a mechanism to transfer all your library and playlist data over to YTM, there were a lot of tracks that were either missing or incorrect versions after the transition. So I decided to re-write my app from the ground up so that I could cater it more to helping me transition to using YTM, and so that I could leverage the JavaScript knowledge and experience I'd gained from working on other apps the past few years and create a more robust and complex app with a slew of new features, and better code practices and organization. 

Since this has been a passion project of mine for years, even after I transitioned over to YouTube Music, I've continued to add features to the extension. This is both because I enjoy doing it and can get some use out of them, but also so I can challenge myself to learn new things. The extension started simply as a popup script littered with callback hell, a content script, and some calls to the Chrome local storage API. Now it leverages ES6 modules with a pseudo-MVC pattern, Firebase storage (Firestore), Async/Await & Promises, Service Workers, multiple types of user authentication, Mutation Observers, JSON & CSV serialization, Chrome context menus, etc. I've also had to navigate numerous Chromium bugs with the switch to Manifest Version 3, which has been fun. All of these things I've learnt on my own and it's been a really fulfilling experience, and I have a long to-do list ahead of me!

## Main Extension Features

Here I'll document the main features of the extension. There are a lot more specific features that are very catered to my particular use of YouTube Music and how I organize my music library, so I will omit those for the time being. 

### Login

When you first use the extension, or if you've manually logged out, the extension icon will prompt you to login. I decided to use an old Google Play Music symbol for my extension icon, as a sort of homage. In its current state, logging in with a Google account is the only allowed method of authentication. 

<img width="337" alt="Login - Wide Shot" src="https://user-images.githubusercontent.com/2702971/197151325-42d7c29a-4fc9-4fba-a6c2-caebe05caf74.png">

Once you've logged in, you will have various options. One of those is to view a scrollable list of tracks for the current playlist that you've previously stored. Each playlist has to be stored manually, and this data is saved in Firestore, so the list would be empty if this is the first time using the extension for this playlist. 

<img width="985" alt="Stored Tracks - Close Up" src="https://user-images.githubusercontent.com/2702971/197154382-87d9e0da-b6ae-4e9b-b5f5-6b8f61d16359.png">

### 'Scrape' the Playlist

You also have the option to 'scrape' the current playlist, which will cause an automatic scroll through the list so the extension can get the complete list of songs by extracting it from the DOM. 

![Scrape In Progress Dialog](https://user-images.githubusercontent.com/2702971/197155693-b17f285e-4f80-49c0-abab-174a0e345731.jpg)

### Observing changes to a Playlist

After a playlist has been scraped, you can view a list of tracks that have been added to, removed from, or been disabled in the playlist. This is done by comparing the scraped tracklist with the version stored in Firestore. Some of the changes may have been user-prompted, but some possibly not. 

<img width="991" alt="Removed - Close Up" src="https://user-images.githubusercontent.com/2702971/197156491-8a80994c-2383-4db9-a161-2148ad7fd205.png">

In the case above, two tracks were removed. Note the extension icon also shows a red "-2", so even without opening the extension you can tell if some songs have been removed. 

<img width="1024" alt="Added - Close Up" src="https://user-images.githubusercontent.com/2702971/197156823-aa8d78d4-0d7c-46bd-90de-baab531bcdd8.png">

In the case above, two tracks were added to the playlist. Again, the extension icon reflects this. 

You can store the latest version of the playlist in Firestore with the corresponding button. 

### Other Options

In addition to viewing a list of stored, scraped, added, or removed tracks within the extension's popup itself, you can also copy these lists to the clipboard or download them as CSV files instead. 

<img width="352" alt="Buttons - Clipboard   Download" src="https://user-images.githubusercontent.com/2702971/197157267-583ae3de-8c58-46c7-a795-103e13af7408.png">

There are also buttons at the top right to log out and to modify the extension's options/settings. 

<img width="785" alt="Buttons - Top Section" src="https://user-images.githubusercontent.com/2702971/197158696-ebb075e3-0e71-4c2c-acdb-f64e1c3457bb.png">

On the YouTube Music "Playlists" page, a context menu is available that allows you to get a list of playlists. 

<img width="525" alt="Context Menu" src="https://user-images.githubusercontent.com/2702971/197158920-5c501d71-1bdb-4e33-8c90-703d8ff79a6a.png">

### More

The rest of the features are so specific to my particular method of music library organization and the transition/recovery of multiple thousand long tracklists from Google Play Music to YouTube Music, that they are quite complex and wouldn't be of interest to anyone else. In the future I may upload the extension and limit it to only features that could be useful to anyone, but for the time being I'm focusing on my personal use. 

