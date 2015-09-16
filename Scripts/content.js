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
    var trackCount = GetTrackCount();
    console.log('Scrolling through %s tracks.', trackCount);
    
    document.body.style.zoom= '.1';
    
    var scrollInterval = setInterval
    (
        function()
        {            
            //TODO: this won't work for the All Songs list because it doesn't have indexes... 
            var songs = document.querySelectorAll('table.song-table tbody tr.song-row');
            
            for (var i = 0; i < songs.length; i++)
            {
                var track = songs[i];
                var index = track.querySelector('td[data-col="index"] .content').textContent;
                var title = track.querySelector('td[data-col="title"] .content').textContent;
                var duration= track.querySelector('td[data-col="duration"]').textContent;
                var artist = track.querySelector('td[data-col="artist"] .content').textContent;
                var album = track.querySelector('td[data-col="album"] .content').textContent;
                
                var trackObject = { index, title, duration, artist, album };
                
                AddSongToTrackList(list, trackObject);
            }
            
            songs[songs.length-1].scrollIntoView(true); 
            
            if (list.length >= trackCount)
            {
                clearInterval(scrollInterval);
                document.body.style.zoom= '1'; //TODO why arent we zoooooming sooner? 
                console.log('Finished collecting track list.');
                callback(list);
            }
        }, 
        250
    );
}

function AddSongToTrackList(list, trackObject) 
{
    var duplicate = false;
    var i = list.length;
    
    while (i--) 
    {
       if (list[i].index === trackObject.index) //TODO: Error checking needed
       {
           duplicate = true;
           break;
       }
    }
    
    if (!duplicate)
    {
        list.push(trackObject);
    }
}