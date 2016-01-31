chrome.runtime.onMessage.addListener
(
    function(request, sender, sendResponse) 
    {
        console.log(sender.tab ? 'Message received from a content script:' + sender.tab.url : 'Message ' + request.greeting + ' received from the extension.'); 

        if (request.greeting == 'GetSongList')
        {   
            ScrollToTrackCount();  
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

function ScrollToTrackCount()
{
    GetTrackCountElement().scrollIntoView(true);
}

function ListSongs(callback)
{    
    var list = [];
    var lastTrack;
    
    document.body.style.zoom= '.1';
    ToggleScrolling(false);
    
    var scrollInterval = setInterval
    (
        function()
        {         
            //TODO something here seems to be failing. make this simpler, if possible  
                //This failure may have been caused when the scroll disable stopped working. May now be resolved.
            var songs = document.querySelectorAll('table.song-table tbody tr.song-row');
            
            if (lastTrack === songs[songs.length-1])
            {
                console.log('Finished collecting track list. The last track in the playlist is ' + lastTrack.querySelector('td[data-col="title"] span').textContent);
                clearInterval(scrollInterval);
                ToggleScrolling(true);
                document.body.style.zoom= '1';
                return callback(list);
            }
            
            for (var i = 0; i <= songs.length-1; i++)
            {      
                //TODO could use list.length here or something like that, instead of lasttrack          
                if (lastTrack == null || parseInt(songs[i].getAttribute('data-index')) > parseInt(lastTrack.getAttribute('data-index'))) 
                {
                    console.log('Adding song %s - "%s" to track list.', songs[i].getAttribute('data-index'), songs[i].querySelector('td[data-col="title"] span').textContent);
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
            }
            
            lastTrack = songs[songs.length-1];
            console.log("last track set to " + lastTrack.getAttribute('data-index') + " " + lastTrack.querySelector('td[data-col="title"] span').textContent);
            lastTrack.scrollIntoView(true); 
        }, 
        750
    );
}
