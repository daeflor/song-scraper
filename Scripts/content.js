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

function ToggleScrolling(enabled)
{
    var container = document.querySelectorAll('html /deep/ #mainContainer');
    if (enabled)
    {
        container[1].style.overflowY = 'auto';
    }
    else
    {
        container[1].style.overflowY = 'hidden';
    }
}

function SongMetaData(title, duration, artist, album)
{
    this.title = title;
    this.duration = duration;
    this.artist = artist;
    this.album = album;
}

function GetTrackCountElement()
{
    return document.querySelector('.song-count');
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
        return parseInt(trackCountString.replace(/,/g, ""));
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
            var songs = document.querySelectorAll('table.song-table tbody tr.song-row');
            
            if (lastTrack === songs[songs.length-1])
            {
                console.log('Finished collecting track list.');
                clearInterval(scrollInterval);
                ToggleScrolling(true);
                document.body.style.zoom= '1';
                return callback(list);
            }
            
            for (var i = 0; i <= songs.length-1; i++)
            {                
                if (lastTrack == null || parseInt(songs[i].getAttribute('data-index')) > parseInt(lastTrack.getAttribute('data-index')))
                {
                    console.log('Adding song %s - "%s" to track list.', songs[i].getAttribute('data-index'), songs[i].querySelector('td[data-col="title"] .content').textContent);
                    list.push
                    (
                        new SongMetaData
                        (
                            songs[i].querySelector('td[data-col="title"] .content').textContent,
                            songs[i].querySelector('td[data-col="duration"]').textContent,
                            songs[i].querySelector('td[data-col="artist"] .content').textContent,
                            songs[i].querySelector('td[data-col="album"] .content').textContent
                        ) 
                    );                    
                }
            }
            
            lastTrack = songs[songs.length-1];
            lastTrack.scrollIntoView(true); 
        }, 
        250
    );
}
