var TrackListKey = null;
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
                            
                            //console.log("Saved tracklist under: " + TrackListKey);
                            sendResponse({farewell: request.greeting + '- Result: Saved tracklist under: ' + TrackListKey});
                        }
                    );
                }
            );
        }
        else if (request.greeting == 'GetTrackCount')
        {   
            var key = GetPlaylistName() + '_TrackCount';
            var trackCount = GetTrackCount();
            var trackCountStorageObject= {};
            trackCountStorageObject[key] = trackCount;
            
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
                        console.log('ERROR: ' + chrome.runtime.lastError.message);
                        return;
                    }
                    
                    console.log('Saved track count "%s" under key "%s"', trackCount, key);
                    sendResponse(trackCount);
                    //TODO: Have better error messaging for if/when this is returning undefined. 
                }
            );
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
                if (node.nodeValue == 'My playlist')
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
    
    console.log('Scrolling through %s tracks.', trackCount);
	setTimeout(ListSongs(trackCount, callback), 1000);
}

function ListSongs(trackCount, callback)
{    
    TrackList.length = 0;
    
    var scrollInterval = setInterval
    (
        function()
        {             
            var songs = document.querySelectorAll('table.song-table tbody tr.song-row');

            for (var i = 0; i < songs.length; i++)
            {
                var track = songs[i];
                var trackTitle = track.querySelector('td[data-col="title"] .content').textContent;
                
                //TODO: Definitely needs to be addressed. 
                    //If a playlist has duplicate tracks, this extension will not work properly. Need to have some kind of check/warning for duplicates.
                    //Could possibly bypass this if we have a different way of seeing if we're at the bottom of the window
                    //Also, may be able to leverage the track number to work around this (those can't be duplicate). Instead of an array, maybe we have a kvp list.
                    //Also, this will be especially problematic for when there are different songs with the same name. 
                if (TrackList.indexOf(trackTitle) < 0)
                {
                   TrackList.push(trackTitle); 
                }
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