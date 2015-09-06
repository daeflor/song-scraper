var TrackCountKey = null;
var TrackList = [];

/*
document.onreadystatechange = function()
{
    if (document.readyState === "complete")
    {
        console.log("2 second countdown starting.");
    }
}
*/
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) 
    {
        //console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
              
        if (request.greeting == "GetSongList")
        {            
            GetTracks(function()
            {
                console.log(TrackList);
                sendResponse(TrackList);
                /*
                chrome.storage.local.set
                (
                    {'MusicList': TrackList}, 
                     function()
                    {
                        if(chrome.runtime.lastError)
                        {
                            console.log("ERROR: " + chrome.runtime.lastError.message);
                            return;
                            //TODO: If it fails, could send a different response
                        }
                        sendResponse({farewell: request.greeting + ": Success"})
                    }
                );
                */
            }); 
        }
        else if (request.greeting == "GetPlaylistName")
        {            
            sendResponse(GetPlaylistName());
        }
        else if (request.greeting == "GetTrackCount")
        {   
            var trackCount = GetTrackCount();
            var trackCountStorageObject= {};
            trackCountStorageObject[TrackCountKey] = trackCount;
            
            //TODO: It may make more sense to only store the trackcount when the track list gets updated. 
                //Otherwise, the track count and number of songs in the track list could get out of sync, which could be confusing.
                //Could also compare current track count to the length of the stored track list, and not store the trackcount at all. 
            chrome.storage.local.set
            (
                trackCountStorageObject, 
                function()
                {
                    if(chrome.runtime.lastError)
                    {
                        console.log("ERROR: " + chrome.runtime.lastError.message);
                        return;
                        //TODO: If it fails, could send a different response
                    }
                    
                    console.log("Saved under: " + TrackCountKey);
                    sendResponse(trackCount);
                }
            );
        }

        return true;
    }
);
  
function GetPlaylistName()
{
    var elements = document.getElementsByTagName('*');
    
    for (var i = 0; i < elements.length; i++) 
    {
        var element = elements[i];
    
        for (var j = 0; j < element.childNodes.length; j++) 
        {
            var node = element.childNodes[j];
    
            if (node.nodeType === 3) 
            {                
                if (node.nodeValue == "My playlist")
                {
                    var playlistName = elements[i-3].childNodes[0].nodeValue;
                    TrackCountKey = playlistName + '_TrackCount';
                    return playlistName;
                }
            }
        }
    }
}
  
function GetTrackCount()
{
    var trackCountElement = GetTrackCountElement();    
    var trackCount = parseInt(trackCountElement.childNodes[0].nodeValue.split(" ")[0]);
    return trackCount;
}

function GetTrackCountElement()
{
    var elements = document.getElementsByTagName('*');
    
    for (var i = 0; i < elements.length; i++) 
    {
        var element = elements[i];
    
        for (var j = 0; j < element.childNodes.length; j++) 
        {
            var node = element.childNodes[j];
    
            if (node.nodeType === 3) 
            {                
                if (node.nodeValue == "My playlist")
                {
                    return elements[i+2];
                }
            }
        }
    }
}
  
function GetTracks(callback)
{
    var trackCountElement = GetTrackCountElement();
    trackCountElement.scrollIntoView(true);
    
    var trackCount = parseInt(trackCountElement.childNodes[0].nodeValue.split(" ")[0]);
    
	setTimeout(ListSongs(trackCount, callback), 1000);
}

function ListSongs(trackCount, callback)
{    
    TrackList.length = 0;
    
    var scrollInterval = setInterval
    (
        function()
        { 
            var songs = document.querySelectorAll("table.song-table tbody tr.song-row");

            for (var i = 0; i < songs.length; i++)
            {
                var track = songs[i];
                var trackTitle = track.querySelector('td[data-col="title"] .content').textContent;
                
                if (TrackList.indexOf(trackTitle) < 0)
                {
                   TrackList.push(trackTitle); 
                }
            }
            
            songs[songs.length-1].scrollIntoView(true); 
            
            if (TrackList.length >= trackCount)
            {
                clearInterval(scrollInterval);
                callback();
            }
        }, 
        500
    );
}