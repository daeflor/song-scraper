var LatestTrackCountKey = 'LatestTrackCount';
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
            sendResponse(GetLatestTrackCount());
        }

        return true;
  });
  
function GetLatestTrackCount()
{
    var trackCountElement = GetTrackCountElement();    
    var trackCount = parseInt(trackCountElement.childNodes[0].nodeValue.split(" ")[0]);
    return trackCount;
}
  
function GetTracks(callback)
{
    var trackCountElement = GetTrackCountElement();
    trackCountElement.scrollIntoView(true);
    
    var trackCount = parseInt(trackCountElement.childNodes[0].nodeValue.split(" ")[0]);
    
	setTimeout(ListSongs(trackCount, callback), 1000);
}

/*
function GetSongs()
{
    var songs = document.querySelectorAll("table.song-table tbody tr.song-row");
    console.log(songs);   
}
*/

function ListSongs(trackCount, callback)
{    
    TrackList.length = 0; //TODO: need to actually clear the array in storage. 
    
    var scrollInterval = setInterval(
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
        500);
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
                //console.log("i : " + i + ".   j : " + j + ".   Text: " + node.nodeValue);  
                if (node.nodeValue == "My playlist")
                {
                    var playlistName = elements[i-3].childNodes[0].nodeValue;
                    return playlistName;
                }
            }
        }
    }
}




///////

function SaveList()
{
    var record = false;
    var songList = [];
    
    var elements = document.getElementsByTagName('*');
    
    for (var i = 0; i < elements.length; i++) 
    {
        var element = elements[i];
    
        for (var j = 0; j < element.childNodes.length; j++) 
        {
            var node = element.childNodes[j];
    
            if (node.nodeType === 3) 
            {
                var text = node.nodeValue;
                
                var startIndex = null;
                
                //console.log("i : " + i + ".   j : " + j + ".   Text: " + text);
                
                if (text == "Album")
                {
                    record = true;
                    startIndex = i + 3;
                    //console.log("Start Recording");
                }
                else if (text == "This playlist is empty")
                {
                    record = false;
                    //console.log("Stop Recording");
                }
                
                if (record && j == 1)
                {
                    //console.log(node.nodeValue);
                    songList.push(node.nodeValue);
                }
            }
        }
    }
       
    return songList;
}