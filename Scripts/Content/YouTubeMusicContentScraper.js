'use strict';
//window.YouTubeMusicContentScraper = 
(function() {

    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            console.log(sender.tab ? 'Message received from a content script:' + sender.tab.url : 'Message received from the extension: ' + request.greeting); 
            //console.log(sender.tab ? 'YouTube Music Content Scraper script received a message from: ' + sender.tab.url : '. Message received from the extension: ' + request.greeting); 

            // if (request.greeting == 'greeting_GetSongList') {   
            //     ScrollToElement(GetTrackCountElement());
            //     setTimeout(ListSongs(sendResponse), 250);
            // }
            // else if (request.greeting == 'GetTrackCount')
            // {   
            //     sendResponse(GetTrackCount());
            // }
            // else if (request.greeting == 'greeting_GetNameOfPlaylist')
            // {   
            //     sendResponse(GetPlaylistNameText());
            // }
            // else if (request.greeting == 'greeting_GetNameOfAllSongsList')
            // {   
            //     sendResponse(GetTextAllSongsName());
            // }
            if (request.greeting == 'greeting_ytm_GetTracklistName_Playlist') {   
                sendResponse(getPlaylistName(supportedApps.youtubeMusic));
            }
            else if (request.greeting == 'greeting_ytm_GetTrackList') {
                getTrackList(supportedApps.youtubeMusic, sendResponse);
            }
            
            //TODO is this necessary?
            return true;
        }
    );

    const supportedApps = {
        youtubeMusic: 'ytm'
    };

    const ElementsInDOM = {
        scrollContainer: {
            ytm: document.body
        },
        // playlistDetailsContainer: {
        //     ytm: document.querySelector('#header .metadata')
        // },
        playlistName: {
            ytm: document.querySelector('#header .metadata yt-formatted-string.title')
        },
        playlistTrackCount: {
            ytm: document.querySelector('#header .metadata .second-subtitle span')
        },
        trackRowContainer: {
            ytm: document.querySelector("[main-page-type='MUSIC_PAGE_TYPE_PLAYLIST'] div#contents ytmusic-playlist-shelf-renderer div#contents")
        }
    };

    // const youTubeMusicDOMElements = {
    //     scrollContainer: document.body
    // };
    
    // const youTubeMusicDOMElementSelectors = {
    //     playlistDetailsWrapper: '#header .metadata',
    //     playlistName: '.title'
    // };
    
    // function getYouTubeMusicElement_PlaylistDetailsWrapper()
    // {
    //     return document.querySelector(youTubeMusicDOMElementSelectors.playlistDetailsWrapper); 
    // }

    //TODO NEW - Would probably be better to set a persistent var in TabManager for the 'current' app at the beginning of the flow, instead of passing it as a param in all the functions
    function getPlaylistName(app) {
        console.log("Playlist name is: " + ElementsInDOM.playlistName[app].textContent)
        return ElementsInDOM.playlistName[app].textContent;
    }

    function getPlaylistTrackCount(app) {
        //Get the track count string from the DOM element and split off the trailing text after the actual number
        const _trackCountString = ElementsInDOM.playlistTrackCount[app].textContent.split(" ")[0];

        //Remove any commas from the track count string (e.g. for counts > 999), and then get the count value as an integer
        const _trackCount = parseInt(_trackCountString.replace(/,/g, ""));
        
        console.log('Current playlist\'s track count is %s.', _trackCount);
        return _trackCount;
    }
    
    // function getYouTubeMusicElement_PlaylistName()
    // {
    //     return getYouTubeMusicElement_PlaylistDetailsWrapper().querySelector(youTubeMusicDOMElementSelectors.playlistName); 
    // }
    
    // function getYouTubeMusicPlaylistName()
    // {
    //     return getYouTubeMusicElement_PlaylistName().textContent;
    // }

    function scrollToElement(element) {
        if (element != null) {
            element.scrollIntoView(true);
            //console.log('Scrolled to element ' + element.textContent);
        }
        else {
            //TODO would be good to set up a DebugController to better handle warnings, errors, etc.
            console.log('There is no element to scroll to');
        }
    }

    /*
    function zoomOut(enabled) {
        //TODO style.zoom is deprecated (but still works). Could switch to using style.transform = 'scale(.x,.x)', but this actually seems to work less well.
        if (enabled == true) {
            document.body.style.zoom= '.25'; //TODO need to figure out what to do instead of zoom, since it's deprecated
            //toggleScrolling(false);
        }
        else {
            document.body.style.zoom= '1';
            //toggleScrolling(true);
        }
    }
    */

    function allowManualScrolling(app, enabled) {
        //TODO could this container be used for a different method of scrolling (when getting the song list)?
        const _container = ElementsInDOM.scrollContainer[app];

        //If a valid container element was found...
        if (_container != null) {
            //If manual scrolling should be enabled (which is the default), set to 'auto', otherwise set to 'hidden'
            if (enabled == true) {
                _container.style.overflowY = 'auto';
            }
            else {
                _container.style.overflowY = 'hidden';
            }
        }
        else {
            console.log('Error: The scroll container for the page could not be found.');
        }
    }

    function getTrackList(app, callback)
    {
        scrollToElement(ElementsInDOM.playlistName[app]);
        
        const _trackRowContainer = ElementsInDOM.trackRowContainer[app];
        const _trackCount = getPlaylistTrackCount(app);
        let _trackList = [];

        const _onScrollComplete = function() {
            //For each track row loaded in the DOM...
            for (let i = 0; i < _trackRowContainer.childElementCount; i++) {
                let _track = {
                    title: _trackRowContainer.children[i].querySelector('div.title-column yt-formatted-string.title').title,
                    //duration: songs[i].querySelector('td[data-col="duration"]').textContent,
                    artist: _trackRowContainer.children[i].querySelectorAll('div.secondary-flex-columns yt-formatted-string')[0].title,
                    album: _trackRowContainer.children[i].querySelectorAll('div.secondary-flex-columns yt-formatted-string')[1].title
                };
                
                _trackList.push(_track); 
            }

            callback(_trackList);
        };
        
        //Wait a short amount of time to allow the page to scroll to the top of the tracklist, and then start the scroll and scrape process
        setTimeout(scrollToEndOfTracklist(_trackRowContainer, _trackCount, _onScrollComplete), 500);
    }

    function scrollToEndOfTracklist(trackRowContainer, trackCount, callback)
    {  
        //Temporarily disable manual scrolling to avoid any interference from the user during the scrape process
        allowManualScrolling(supportedApps.youtubeMusic, false);

        const _scrollInterval = setInterval(
            function() {
                if (trackRowContainer.childElementCount == trackCount) {
                    console.log('Finished scrolling to the end of the track list');
                   
                    //Stop the scrolling process
                    clearInterval(_scrollInterval);

                    //Allow the user to scroll manually again
                    allowManualScrolling(supportedApps.youtubeMusic, true);

                    //Execute the provided callback function
                    callback();
                }
                else {
                    console.log("Still Srolling. Track Row Container Child Count: " + trackRowContainer.childElementCount);
                    scrollToElement(trackRowContainer.children[trackRowContainer.childElementCount-1]);
                }
            },
            1500
        );
    }

/*
//TODO when working on this for YTM, make it asbtracted such that it could work for GPM too. Want to avoid having duplicated code for too long. 
    //i.e. avoid hard-coding html/css details

    function listTracks(callback) {   
        const _ytm_trackRowSelectors = 'ytmusic-responsive-list-item-renderer.ytmusic-playlist-shelf-renderer';
        

        let _trackList = [];
        let _lastTrack = null;
        let _elementToScrollTo;

        let _trackRowElements = [];
        
        toggleScrapeMode(true);
        
        const _scrollInterval = setInterval(
            function() {       
                console.log('About to query visible songs.');

                //const songs = document.querySelectorAll('table.song-table tbody tr.song-row');
                const _scrapeQueryResults = document.querySelectorAll(_ytm_trackRowSelectors);

                //If at least one track row was found within the page...
                if (_scrapeQueryResults != null && _scrapeQueryResults.length > 0)
                {
                    const _lastTrackInCurrentScrape = _scrapeQueryResults[_scrapeQueryResults.length-1];
                    const _lastTrackInPreviousScrapes = _trackRowElements[_trackRowElements.length-1];

                    //TODO could save some values (e.g. songs[songs.length-1]) in variables. More optimized and possibly better readability
                    
                    //If at least one full scrape iteration has been performed, and the last track row element is the same in both the previous and current scrape...
                    if (_lastTrackInPreviousScrapes != null && _lastTrackInCurrentScrape === _lastTrackInPreviousScrapes)
                    {
                        //Stop the scrape
                        clearInterval(_scrollInterval);
                        console.log('Finished collecting track row elements. Number of elements: ' + _trackRowElements.length + '. The last track in the tracklist is ' + _lastTrackInPreviousScrapes.title);
                        
                        //Disable scrape mode (which resets the page to the default zoom level and stops scrolling)
                        toggleScrapeMode(false);

                        //If the number of track row elements is less than the list's official track count, print an error, as this should never happen
                        //TODO NEW - Need function to get track count to exist
                        if (_trackRowElements.length != GetTrackCount()) {
                            console.log("The scraped tracklist length does not match the tracklist's track count. Something went wrong!");
                            return callback(null);
                        }

                        //TODO NEW need to convert track row elements to a proper track list still
                        return callback(_trackRowElements);
                    }












                    

                    console.log('Track rows queried, returning a scraped list of length: ' + _scrapeQueryResults.length + '. Not all track rows in this tracklist have been scraped yet.');
                    
                    //For each track row in the scrape query results...
                    for (let i = 0; i <= _scrapeQueryResults.length-1; i++) {
                        //If the list of track row elements collected so far does not contain the current row element...
                        if (_trackRowElements.includes(_scrapeQueryResults[i]) == false) {
                            //Add the current track row element to the list of track row elements being collected
                            _trackRowElements.push(_scrapeQueryResults[i]);
                        }
                    }

                    //For each track in the current scrape's results...
                    for (let i = 0; i <= _scrapedTracks.length-1; i++) {      
                        //TODO could use list.length here or something like that, instead of lasttrack          
                        
                        //TODO - NEW - this won't work for YTM because there is no data-index attribute.
                            //Would it work to compare all tracks in the current scrape to find the one that === the last track from the previous scrape?
                            //And then start a second for loop from that point onward?
                            //It's inefficient, and potentially(?) prone to error, but might be the best way around the issue.
                            //Alternatively, could we check if _trackList contains _scrapedTracks[i], then ignore it, otherwise add _scrapedTracks[i] to the list?
                            //Not sure if this is possible or how inefficient it would be, if it is even possible?
                                //Well this idea won't work as-is because tracklist isn't a list of the elements.
                                //But we could change the logic/flow and first gather a list of the elements and only later...
                                //use the final list to put together a clean list of track metadata
                                //If we go this route, could do: if(_trackRowElementList.includes(_scrapedTracks[i]) == false) ...then _trackRowElementList.push(_scrapedTracks[i]);
                                    //Idk what exactly happens if an element later becomes unloaded, or if that is even possible


                        //If there was no previous scrape, or the index of the current track is greater than the index of the last track from the previous scrape...
                        if (lastTrack == null || parseInt(songs[i].getAttribute('data-index')) > parseInt(lastTrack.getAttribute('data-index'))) 
                        {
                            //console.log('Adding song %s - "%s" to track list.', songs[i].getAttribute('data-index'), songs[i].querySelector('td[data-col="title"] span').textContent);
                            list.push
                            (
                                new SongMetaData
                                (
                                    songs[i].querySelector('td[data-col="title"] span').textContent,
                                    songs[i].querySelector('td[data-col="duration"]').textContent,
                                    songs[i].querySelector('td[data-col="artist"] .text').textContent,
                                    songs[i].querySelector('td[data-col="album"] .text').textContent
                                ) 
                            );                    
                        }
                        else
                        {
                            console.log("LastTrack (%s %s) exists, and its index is greater than the current song's. Skipping over duplicate song.", lastTrack.getAttribute('data-index'), lastTrack.querySelector('td[data-col="title"] span').textContent);
                        }

                        //This is TEMP for debugging purposes
                        if (list.length%30 == 0)
                        {
                            console.log('Adding song %s - "%s" to track list.', songs[i].getAttribute('data-index'), songs[i].querySelector('td[data-col="title"] span').textContent);
                        }
                        //TODO This could print even if the song wasn't added to the tracklist because it was a duplicate. Should be moved above into 'if' statement.
                    }
                
                    console.log('There are no queried songs left to add to the Song List. About to set LastTrack');
                
                    if (lastTrack == null || parseInt(songs[songs.length-1].getAttribute('data-index')) > parseInt(lastTrack.getAttribute('data-index'))) 
                    {
                        lastTrack = songs[songs.length-1];
                        //TODO lastTrack is being set to an element. (Verify this is correct), maybe rename the variable, or change functionality 
                        console.log("last track set to " + lastTrack.getAttribute('data-index') + " " + lastTrack.querySelector('td[data-col="title"] span').textContent);
                        elementToScrollTo = lastTrack;
                    }
                    else
                    {
                        elementToScrollTo = songs[songs.length-1];
                        console.log('LastTrack not changed. Will scroll to end of current song query list.');
                    }

                    ScrollToElement(elementToScrollTo);

                    //TODO It's still possible to get in an infinite loop of scrolling if the Queue has been opened. 
                }
                else
                {
                    //This *should not* happen, but unfortunately could happen on occasion. A better solution may be possible but this should suffice for now. 
                    console.log("Query for songs returned an empty list, which means something went wrong. This could be due to a page refresh. Waiting 750ms then querying again.")
                }
            }, 
            750
        );
    }
    */
})();