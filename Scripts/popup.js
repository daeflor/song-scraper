/* global key */
/* global chrome */
var TrackCountKey = null; //TODO: use keys for all get/set methods

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

			if (key.indexOf('_TrackList') > -1) 
			{
				var playlistName = key.split('_TrackList')[0];
				
				if (storageChange.oldValue == undefined)
				{
					console.log('First time saving data for playlist "%s".', playlistName);
					return;
				}
				
				console.log('The track list of playlist "%s" has changed.', playlistName);
				//CompareTrackLists(storageChange.newValue, storageChange.oldValue);
				PrintTrackList(storageChange.newValue); //TODO: Do we want to print the list even if it hasn't changed? Do we even want to print the list?
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
			var playlistName = tabs[0].title.split(' - Google Play Music')[0];
			console.log('Playlist Name: ' + playlistName);
			document.getElementById('playlistName').textContent = document.getElementById('playlistName').textContent + playlistName; 
			//TODO: Eventually we'll split this into tables or headers or something pretty, and it won't all be one string.	
			
			TrackCountKey = playlistName + '_TrackCount';	
			
			GetCurrentTrackCount();
		}
	);
}

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
				{greeting: 'GetTrackCount'}, 
				function(response) 
				{
					console.log('Acquired Track Count: ' + response);
					document.getElementById('trackCount').textContent = document.getElementById('trackCount').textContent + response;
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
			chrome.tabs.sendMessage
			(
				tabs[0].id, 
				{greeting: 'GetSongList'}, 
				function(response) 
				{
					RenderStatus('Acquired Song List');
					console.log(response);
					//PrintTrackList(response);
					document.getElementById('button').disabled = false;
				}
			);
		});
}

function PrintTrackList(list)
{
    for (var i = 0; i < list.length; i++)
    {
		list[i] = i+1 + " " + list[i]; //TODO: this will mess up the list if we do this before comparing them.
        console.log(list[i]);
    }
	document.getElementById('trackList').textContent = list.join('\n');
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
/*
function CompareTrackCount(trackCount)
{
	chrome.storage.local.get
	(
		LatestTrackCountKey, //TODO: obviously this needs to change, because right now it's comparing LATEST to LATEST. We're not properly saving the previous count anymore/currently
		function(result)
		{
			if(chrome.runtime.lastError)
			{
				console.log('ERROR: ' + chrome.runtime.lastError.message);
				return;
			}
			//String renderText = ("The LATEST track count (storage) is {0}, and the LATEST track count (actual) is {1}. Duh.", result[LatestTrackCountKey], trackCount);
			//RenderStatus(renderText);
			console.log('The LATEST track count (storage) is {0}, and the LATEST track count (actual) is {1}. Duh.', result[LatestTrackCountKey], trackCount);
		}
	);
}
*/

function CompareTrackLists(latest, previous)
{
	for (var i = latest.length-1; i >= 0; i--)
	{
		for (var j = previous.length-1; j >= 0; j--)
		{
			if (latest[i] != null && previous[j] != null && latest[i] === previous[j])
			{
				latest[i] = null; //TODO: this will mess up the list if we do this before printing it.
				previous[j] = null;
			}
		}
	}
	
	console.log('New Tracks Added:');
	
	for (var i = 0; i < latest.length; i++)
	{
		if (latest[i] != null)
			{
				console.log(latest[i]);
			}
	}
	
	console.log('Tracks Removed: ');
	
	for (var j = 0; j < previous.length; j++)
	{
		if (previous[j] != null)
			{
				console.log(previous[j]);
			}
	}
}