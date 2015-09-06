/* global key */
/* global chrome */
var TrackCountKey = null; //TODO: use keys for all get/set methods
//var PlaylistNameKey = 'PlaylistName_'; 

//TODO: playlist array key has to be different for each playlist? key should probably be equal to the playlist name
//TODO: prefix storage data with appropriate playlist names, etc. 

document.addEventListener('DOMContentLoaded', Start);

chrome.storage.onChanged.addListener
(
	function(changes, namespace) 
	{
		for (key in changes) 
		{
			var storageChange = changes[key];
			console.log
			(
				'Storage key "%s" in namespace "%s" changed. ' +
				'Old value was "%s", new value is "%s".',
				key,
				namespace,
				storageChange.oldValue,
				storageChange.newValue
			);
			
			if (key == "Hot Jams_TrackList") //TODO: hacked in. fix.
			{
				console.log("The Hot Jams playlist has changed");
				PrintTrackList(storageChange.newValue);
				//TODO: Finish implementing this.		
			}
			//TODO: When the popup opens it should check and report if the track count has changed
		}
	}
);

//TODO: Differentiate content script methods from similarly named Popup methods

function Start()
{
	document.getElementById('button').onclick = GetSongList;
	
	chrome.tabs.query
	(
		{active: true, currentWindow: true}, 
		function (tabs) 
		{
			var playlistName = tabs[0].title.split(" - Google Play Music")[0];
			console.log("Playlist Name: " + playlistName);
			document.getElementById('playlistName').textContent = document.getElementById('playlistName').textContent + playlistName; 
			//TODO: Eventually we'll split this into tables or headers or something pretty, and it won't all be one string.	
			
			TrackCountKey = playlistName + '_TrackCount';	
			
			GetCurrentTrackCount();
		}
	);

	//GetCurrentPlaylistName(GetCurrentTrackCount);	
}
/*
function GetCurrentPlaylistName(callback)
{
	chrome.tabs.query
	(
		{active: true, currentWindow: true}, 
		function(tabs) 
		{
			chrome.tabs.sendMessage
			(
				tabs[0].id, 
				{greeting: "GetPlaylistName"}, 
				function(response) 
				{
					//TODO: I don't like that this function does these actions, rather than just returning the playlist name.
					document.getElementById('playlistName').textContent = document.getElementById('playlistName').textContent + response;	
					TrackCountKey = response + '_TrackCount';					
					callback();
				}
			);
		}
	);
}
*/
function GetCurrentTrackCount()
{	
	chrome.tabs.query
	(
		{active: true, currentWindow: true}, 
		function(tabs) 
		{
			chrome.tabs.sendMessage
			(
				tabs[0].id, 
				{greeting: "GetTrackCount"}, 
				function(response) 
				{
					console.log("Acquired Track Count: " + response);
					document.getElementById('trackCount').textContent = document.getElementById('trackCount').textContent + response;

					//document.getElementById('trackCount').textContent = document.getElementById('trackCount').textContent + response;
					/*
					chrome.storage.local.get
					(
						LatestTrackCountKey, 
						function(result)
						{
							if(chrome.runtime.lastError)
							{
								console.log("ERROR: " + chrome.runtime.lastError.message);
								return;
							}

							document.getElementById('trackCount').textContent = document.getElementById('trackCount').textContent + result[LatestTrackCountKey];
						}
					);
					*/
				}
			);
		}
	);
}

function GetSongList()
{
	document.getElementById('button').disabled = true;
	chrome.tabs.query(
		{active: true, currentWindow: true}, 
		function(tabs) 
		{
			chrome.tabs.sendMessage(
				tabs[0].id, 
				{greeting: "GetSongList"}, 
				function(response) 
				{
					RenderStatus("Acquired Song List");
					console.log(response);
					//PrintTrackList(response);
					document.getElementById('button').disabled = false;
					/*
					chrome.storage.local.get
					(
						'MusicList', 
						function(result)
						{
							if(chrome.runtime.lastError)
							{
								console.log("ERROR: " + chrome.runtime.lastError.message);
								return;
							}
							
							PrintTrackList(result.MusicList);
							//RenderStatus(result.MusicList);
							document.getElementById('button').disabled = false;
						}
					);
					*/
					
					/*
					console.log(response.farewell);
					if (response.farewell == "Success")
					{
						
					}*/
				});
		});
}

function PrintTrackList(list)
{
    for (var i = 0; i < list.length; i++)
    {
		list[i] = i+1 + " " + list[i];
        console.log(list[i]);
    }
	document.getElementById('trackList').textContent = list.join("\n");
}

function PrintList(list)
{
    for (var i = 0; i < list.length; i++)
    {
        console.log(list[i]);
    }
}

function RenderStatus(statusText) 
{
	document.getElementById('status').textContent = statusText;
	console.log(statusText);
}

function CompareTrackCount(trackCount)
{
	chrome.storage.local.get
	(
		LatestTrackCountKey, //TODO: obviously this needs to change, because right now it's comparing LATEST to LATEST. We're not properly saving the previous count anymore/currently
		function(result)
		{
			if(chrome.runtime.lastError)
			{
				console.log("ERROR: " + chrome.runtime.lastError.message);
				return;
			}
			//String renderText = ("The LATEST track count (storage) is {0}, and the LATEST track count (actual) is {1}. Duh.", result[LatestTrackCountKey], trackCount);
			//RenderStatus(renderText);
			console.log("The LATEST track count (storage) is {0}, and the LATEST track count (actual) is {1}. Duh.", result[LatestTrackCountKey], trackCount);
		}
	);
}

function CompareTrackLists(latest, previous)
{
	for (var i = latest.length-1; i >= 0; i--)
	{
		for (var j = previous.length-1; j >= 0; j--)
		{
			if (latest[i] != null && previous[j] != null && latest[i] === previous[j])
			{
				latest[i] = null;
				previous[j] = null;
			}
		}
	}
	
	console.log("New Tracks Added:");
	
	for (var i = 0; i < latest.length; i++)
	{
		if (latest[i] != null)
			{
				console.log(latest[i]);
			}
	}
	
	console.log("Tracks Removed: ");
	
	for (var j = 0; j < previous.length; j++)
	{
		if (previous[j] != null)
			{
				console.log(previous[j]);
			}
	}
}