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
					RenderStatus('First time saving data for playlist ' + playlistName + '.');
					//TODO: Will want to print this and NOT show the empty tracklists
					return;
				}
				
				console.log('The track list of playlist "%s" has changed.', playlistName);
				PrintList(storageChange.newValue);
				CompareTrackLists(storageChange.newValue, storageChange.oldValue);
			}
		

			//TODO: When the popup opens it should check and report if the track count has changed
		}
	}
);

//TODO: Differentiate content script methods from similarly named Popup methods

function Start() //TODO: What happens when the user changes the page without reloading the popup. is that possible?
{
	document.getElementById('buttonComparePlaylist').onclick = GetSongList;
	
	chrome.tabs.query
	(
		{active: true, currentWindow: true}, 
		function (tabs) 
		{
			var playlistName = tabs[0].title.split(' - Google Play Music')[0];
			//console.log('Playlist Name: ' + playlistName);
			document.getElementById('playlistName').textContent = playlistName; 
			document.getElementById('status').hidden = true; 
			
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
	document.getElementById('buttonComparePlaylist').disabled = true;
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
					document.getElementById('buttonComparePlaylist').disabled = false;
					document.getElementById('tracksAdded').hidden = false;
					document.getElementById('tracksRemoved').hidden = false;
					//TODO: May look better to just print a 'no tracks added or removed message'.
				}
			);
		}
	);
}

/*
function PrintTrackList(list)
{
    for (var i = 0; i < list.length; i++)
    {
		list[i] = i+1 + " " + list[i]; //TODO: this will mess up the list if we do this before comparing them.
        console.log(list[i]);
    }
	document.getElementById('trackList').textContent = list.join('\n');
}*/

function PrintList(list)
{
    for (var i = 0; i < list.length; i++)
    {
        console.log(list[i].index + " " + list[i].title);
    }
}

function RenderStatus(statusText) 
{
	document.getElementById('status').textContent = statusText;
	console.log(statusText);
	document.getElementById('status').hidden = false;
	//TODO: probably don't really want to be using this anymore
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

function CompareTrackLists(latest, previous) //TODO: Need to compare more than just the song titles now
{	
	//TODO: should have error checking
	
	for (var i = latest.length-1; i >= 0; i--)
	{
		for (var j = previous.length-1; j >= 0; j--)
		{
			if (latest[i] != null && previous[j] != null && latest[i].title === previous[j].title && latest[i].album === previous[j].album)
			{
				latest[i] = null; //TODO: this will mess up the list if we do this before printing it.
				previous[j] = null;
				
				//TODO: Still have a duplicate problem. If the playlist intentionally has an actual duplicate track, this comparison might not work.
					//Might get around this by breaking after setting to null here. Each track can only match up with one other track.
					//This way the duplicates might not be matched with their exact correct pair (if for some reason the playlist was re-arranged) but that shouldn't really matter. 
					//Actually should break anyway cause once latest[i] is null it's just gonna spin through the rest of the loop and do nothing. 
					//And because of the null set or break, this shouldn't be an issue after all. 
			}
		}
	}
	
	var tracksAdded = [];
	
	for (var i = 0; i < latest.length; i++)
	{
		if (latest[i] != null)
		{
			tracksAdded.push(i+1 + " " + latest[i].title);
			console.log("Track Added: %s %s", i+1, latest[i].title);
		}
	}
	
	//document.getElementById('tracksAddedList').textContent = tracksAdded.join('\n');	
	PrintListToTextArea(document.getElementById('tracksAddedList'), tracksAdded);
	
	var tracksRemoved = [];
	
	for (var j = 0; j < previous.length; j++)
	{
		if (previous[j] != null)
		{
			tracksRemoved.push(j+1 + " " + previous[j].title);
			console.log("Track Removed: %s %s", j+1, previous[j].title);
		}
	}
	
	//document.getElementById('tracksRemovedList').textContent = tracksRemoved.join('\n');	
	PrintListToTextArea(document.getElementById('tracksRemovedList'), tracksRemoved);
}

function PrintListToTextArea(textArea, list)
{
   	textArea.textContent = list.join('\n');
}