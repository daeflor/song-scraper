/*
document.onreadystatechange = function()
{
    if (document.readyState === "complete")
    {
        console.log("2 second countdown starting.");
    }
    
    //chrome.storage.local.get(null, function (e) { console.log(e); });
}
*/
chrome.runtime.onMessage.addListener
(
    function(request, sender, sendResponse) 
    {
        //console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
              
        if (request.greeting == 'GetSongList')
        {   
            GetTracks
            (
                function(playlistName, trackList)
                {
                    sendResponse
                    (
                        {name: playlistName, list: trackList}
                    );
                }
            );
        }
        else if (request.greeting == 'GetTrackCount')
        {   
            sendResponse(GetTrackCount());
        }
        
        return true;
    }
);
  
function GetPlaylistName()
{
    return document.title.split(' - Google Play Music')[0]; //TODO: We should first verify that the current tab is a google music playlist tab. We already sort of have code for this in another extension. 
}

function GetTrackCount() //TODO: There is about a 5 second delay for the song-count element to get updated after adding a song to the playlist. (I don't see how you'd hit this unless you're adding a song that is already in that playlist).
{
    return parseInt(document.querySelector('.song-count').textContent.split(" ")[0]);
}

function ScrollToTrackCount()
{
    document.querySelector('.song-count').scrollIntoView(true);
}
  
function GetTracks(callback)
{
    ScrollToTrackCount();  
	setTimeout(ListSongs(callback), 500);
}

function ListSongs(callback)
{    
    var list = [];
    var trackCount = GetTrackCount();
    console.log('Scrolling through %s tracks.', trackCount);
    
    var scrollInterval = setInterval
    (
        function()
        {            
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
                console.log('Finished collecting track list.');
                callback(GetPlaylistName(), list);
            }
        }, 
        300
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