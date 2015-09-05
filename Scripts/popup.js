var TrackCountKey = 'TrackCount'; //TODO: use keys for all get/set methods
var PlaylistNameKey = 'PlaylistName'; 

//TODO: playlist array key has to be different for each playlist? key should probably be equal to the playlist name
//TODO: prefix storage data with appropriate playlist names, etc. 

document.addEventListener('DOMContentLoaded', Start);

chrome.storage.onChanged.addListener
(
	function(changes, namespace) 
	{
		for (TrackCountKey in changes) 
		{
			var storageChange = changes[TrackCountKey];
			console.log('Storage key "%s" in namespace "%s" changed. ' +
						'Old value was "%s", new value is "%s".',
						TrackCountKey,
						namespace,
						storageChange.oldValue,
						storageChange.newValue);
		}
	}
);

//TODO: Differentiate content script methods from similarly named Popup methods

function Start()
{
	document.getElementById('button').onclick = GetSongList;
	
	PrintCurrentPlaylistName();
	GetTrackCount();
	
	//CompareTrackCount(trackCount);
	
	//PrintPreviousTrackCount();
	
	//TODO: When the popup opens it should check if the track count has changed
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
					RenderStatus("ITS HAPPENING");
					PrintTrackList(response);
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

function GetTrackCount()
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
					document.getElementById('trackCount').textContent = document.getElementById('trackCount').textContent + response;
					
					chrome.storage.local.set
					(
						{TrackCountKey: response}, 
						function()
						{
							if(chrome.runtime.lastError)
							{
								console.log("ERROR: " + chrome.runtime.lastError.message);
								return;
							}
							
							console.log("Just Saved the trackcount: " + response);
						}
					);
					
					
					
					//CompareTrackCount(response);



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

function PrintCurrentPlaylistName()
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
					document.getElementById('playlistName').textContent = document.getElementById('playlistName').textContent + response;
					
					chrome.storage.local.set
					(
						{PlaylistNameKey: response}, 
						function()
						{
							if(chrome.runtime.lastError)
							{
								console.log("ERROR: " + chrome.runtime.lastError.message);
								return;
							}
							
							console.log("Just saved the playlist name: " + response);
						}
					);
				}
			);
		}
	);
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

/*
function PrintPreviousTrackCount()
{
	chrome.tabs.query
	(
		{active: true, currentWindow: true}, 
		function(tabs) 
		{
			chrome.tabs.sendMessage(
				tabs[0].id, 
				{greeting: "GetPlaylistName"}, 
				function(response) 
				{
					chrome.storage.local.get
					(
						'CurrentPlaylistName', 
						function(result)
						{							
							if(chrome.runtime.lastError)
							{
								console.log("ERROR: " + chrome.runtime.lastError);
								return;
							}

							document.getElementById('playlistName').textContent = document.getElementById('playlistName').textContent + result.CurrentPlaylistName;
						}
					);
				}
			);
		}
	);
}
*/