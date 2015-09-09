var TrackListKey = null;
var TrackList = []; //TODO: there has to be a clean way to avoid needing this but still look prettty.

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
                function()
                {
                    var trackListStorageObject= {};
                    trackListStorageObject[TrackListKey] = TrackList;
                    
                    chrome.storage.local.set
                    (
                        trackListStorageObject, 
                        function()
                        {
                            if(chrome.runtime.lastError)
                            {
                                console.log('ERROR: ' + chrome.runtime.lastError.message);
                                return;
                            }
                            
                            sendResponse({farewell: request.greeting + '- Result: Saved tracklist under: ' + TrackListKey});
                        }
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

function GetTrackCount()
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
	setTimeout(ListSongs(callback), 600);
}

function ListSongs(callback)
{    
    TrackList.length = 0;
    var trackCount = GetTrackCount();
    console.log('Scrolling through %s tracks.', trackCount);
    
    var scrollInterval = setInterval
    (
        function()
        {            
            //console.log("TrackList count: " + TrackList.length); 
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
                
                AddSongToTrackList(TrackList, trackObject);
            }
            
            songs[songs.length-1].scrollIntoView(true); 
            
            if (TrackList.length >= trackCount)
            {
                clearInterval(scrollInterval);
                TrackListKey = GetPlaylistName() + '_TrackList'; 
                console.log('Finished collecting track list.');
                callback();
            }
        }, 
        500
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
        TrackList.push(trackObject);
    }
}