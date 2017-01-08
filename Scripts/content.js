chrome.runtime.onMessage.addListener
(
    function(request, sender, sendResponse) 
    {
        console.log(sender.tab ? 'Message received from a content script:' + sender.tab.url : 'Message ' + request.greeting + ' received from the extension.'); 

        if (request.greeting == 'GetSongList')
        {   
            //ScrollToTrackCount();
            ScrollToElement(GetTrackCountElement());
            setTimeout(ListSongs(sendResponse), 250);
        }
        else if (request.greeting == 'GetTrackCount')
        {   
            sendResponse(GetTrackCount());
        }
        
        return true;
    }
);

function SongMetaData(title, duration, artist, album)
{
    this.title = title;
    this.duration = duration;
    this.artist = artist;
    this.album = album;
}

function ToggleScrolling(enable)
{
    //var container = document.querySelectorAll('html /deep/ #mainContainer');
    //TODO could this container be used for a different method of scrolling (when getting the song list)?
    var container = document.querySelectorAll('.paper-header-panel');
    
    if (enable)
    {
        container[1].style.overflowY = 'auto';
    }
    else
    {
        container[1].style.overflowY = 'hidden';
    }
}

function GetTrackListTitle()
{
    var container = document.querySelector('div.title.tooltip');
    
    if (container == null)
    {
        //TODO do we have to fix this?
        container = document.querySelectorAll('.text')[1];
        
        if (container == undefined)
        {
            console.log('Playlist name could not be determined');
            return null;
        }
    }

    return container.textContent;
}

function GetTrackCountElement()
{
    var element = document.querySelector('.song-count');
    
    if (element == null)
    {
        element = document.getElementById('countSummary');
    }
    
    return element;
}

//TODO: There is about a 5 second delay for the song-count element to get updated after adding a song to the playlist. (I don't see how you'd hit this unless you're adding a song that is already in that playlist).
function GetTrackCount() 
{
    var element = GetTrackCountElement();
    
    if (element == null)
    {
        console.log('Track count element returned null');
        return null;
    }
    else
    {
        var trackCountString = element.textContent.split(" ")[0];
        var trackCount = parseInt(trackCountString.replace(/,/g, ""));
        console.log('Current playlist\'s track count is %s.', trackCount);
        return trackCount;
    }
}

function ToggleScrubMode(on)
{
    if (on == true)
    {
        document.body.style.zoom= '.25';
        ToggleScrolling(false);
    }
    else
    {
        document.body.style.zoom= '1';
        ToggleScrolling(true);
    }
}

function ScrollToElement(element)
{
    if (element == null)
    {
        console.log('There is no element to scroll to');
    }
    else
    {
        element.scrollIntoView(true);
        console.log('Scrolled to element ' + element.textContent);
    }
}

function ListSongs(callback)
{    
    var list = [];
    var lastTrack;
    var elementToScrollTo;
    
    ToggleScrubMode(true);
    
    var scrollInterval = setInterval
    (
        function()
        {       
            console.log('About to query visible songs.');

            var songs = document.querySelectorAll('table.song-table tbody tr.song-row');

            if (songs != null && songs.length > 0)
            {
                //TODO could save some values (e.g. songs[songs.length-1]) in variables. More optimized and possibly better readability
                if (lastTrack != null && lastTrack === songs[songs.length-1])
                {
                    clearInterval(scrollInterval);
                    console.log('Finished collecting track list of length ' + list.length + '. The last track in the playlist is ' + list[list.length-1].title);
                    ToggleScrubMode(false);

                    if (list.length != GetTrackCount()) //This should never happen, but is good to have as an additional check.
                    {
                        console.log("The scrubbed songlist length does not match the playlist's track count. Something went wrong!");
                        return callback(null);
                    }

                    return callback(list);
                }

                console.log('Songs queried, returning a list of length: ' + songs.length + '. Not all songs in this playlist have been scrubbed yet.');
                
                for (var i = 0; i <= songs.length-1; i++)
                {      
                    //TODO could use list.length here or something like that, instead of lasttrack          
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

                //TODO It seems it may still possible to get in an infinite loop of scrolling. May need more investigation. 
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
