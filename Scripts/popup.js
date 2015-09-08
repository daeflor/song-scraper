/* global key */
/* global chrome */
//TODO: use keys for all get/set methods

document.addEventListener('DOMContentLoaded', Start);

chrome.storage.onChanged.addListener
(
	function(changes, namespace) 
	{
		for (key in changes) 
		{
			var storageChange = changes[key];

			if (key.indexOf('_TrackList') > -1) 
			{
				var playlistName = key.split('_TrackList')[0];
				
				if (storageChange.oldValue == undefined)
				{
					RenderStatus('First time saving data for playlist ' + playlistName + '.');
					//TODO: Will want to print this and NOT show the empty tracklists
					return;
				}
				
				console.log('Playlist "%s" has changed. It previously had %s tracks, and now has %s tracks.', playlistName, storageChange.oldValue.length, storageChange.newValue.length);
				//console.log('The track list of playlist "%s" has changed.', playlistName);
				//PrintList(storageChange.newValue);
				CompareTrackLists(storageChange.newValue, storageChange.oldValue);
			}
			else
			{
				console.log
				(
					'Storage key "%s" in namespace "%s" changed. Old value was "%s", new value is "%s".',
					key, namespace, storageChange.oldValue, storageChange.newValue
				);
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
		function(tabs) 
		{
			var playlistName = tabs[0].title.split(' - Google Play Music')[0];
			//console.log('Playlist Name: ' + playlistName);
			document.getElementById('playlistName').textContent = playlistName; 
			document.getElementById('status').hidden = true; 
			
			CompareTrackCounts(playlistName);
		}
	);
}

function GetCurrentTrackCount(callback)
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
					callback(response);
				}
			);
		}
	);
}

function GetPreviousTrackCount(key, callback) //TODO: cannot get this length if the key does not exist. Error checking. 
{
	chrome.storage.local.get
	(
		key, //TODO: could use error checking
		function(result)
		{
			if(chrome.runtime.lastError)
			{
				console.log('ERROR: ' + chrome.runtime.lastError.message);
				return;
			}
			
			if (result[key] == undefined)
			{
				console.log('There is currently no track list saved under key "%s"', key);
				callback(null);
			}
			else
			{
				callback(result[key].length); 
			}
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
						//Often there may be some added but none removed, or vice versa. Bear that in mind
				}
			);
		}
	);
}

function CompareTrackCounts(playlistName)
{
	GetCurrentTrackCount
	(
		function(trackCount)
		{			
			var trackListKey = playlistName + '_TrackList';	
					
			GetPreviousTrackCount
			(
				trackListKey,
				function(previousTrackCount)
				{
					var trackCountText = 'Track Count: ' + trackCount;
					
					if (previousTrackCount == null)
					{
						document.getElementById('trackCount').textContent = trackCountText;
						return;
						//TODO may want to just return here and skip everything else, depending how we want to present this in the UI
						//TODO add sub text (decription) about this likely being the first time the current playlist is being inspected (and that is hasn't been saved yet).
					}
					
					console.log('Playlist "%s" previously had %s tracks, and now has %s tracks.', playlistName, previousTrackCount, trackCount);
		
					var difference = trackCount - previousTrackCount;
			
					if (difference < 0)
					{
						trackCountText = 'Track Count: ' + trackCount + ' (' + difference + ')';
					}
					else if (difference > 0)
					{
						trackCountText = 'Track Count: ' + trackCount + ' (+ ' + difference + ')';
					}
					
					//TODO should inform the user if the track count has changed at all (even if it increased), to recommend they save/compare the differences. 
					
					document.getElementById('trackCount').textContent = trackCountText;
				}	
			);
		}			
	);
}

function CompareTrackLists(latest, previous) //TODO: Need to compare more than just the song titles now
{	
	//TODO: should have error checking
	
	for (var i = latest.length-1; i >= 0; i--)
	{
		for (var j = previous.length-1; j >= 0; j--)
		{
			if (latest[i] != null && previous[j] != null && 
				latest[i].title === previous[j].title && latest[i].album === previous[j].album && latest[i].duration === previous[j].duration)
			{
				latest[i] = null; //TODO: this will mess up the list if we do this before printing it.
				previous[j] = null;
				break;
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
	
	PrintListToTextArea(document.getElementById('tracksRemovedList'), tracksRemoved);
}

function PrintListToTextArea(textArea, list)
{
   	textArea.textContent = list.join('\n');
}

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