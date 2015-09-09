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
			//TODO Fade in??
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

function GetPreviousTrackCount(key, callback)
{
	chrome.storage.local.get
	(
		key, //TODO: Error checking needed
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

function GetSongList() //TODO: Are we handling properly if the button is pressed a second time? Elements hiding and displaying, for example. 
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
					console.log(response);
					
					FadeTransition
					(
						function()
						{
							document.getElementById('buttonComparePlaylist').disabled = false;
							document.getElementById('trackLists').hidden = false;
							document.getElementById('trackCountSubtext').hidden = true;
							//TODO: I think make the text areas not areas, just print all the tracks added or removed under their respective section. There shouldnt be sooo many that the lists are very long.. 
								//although sometimes albums will be added at a time. Maybe we just need to make the text areas prettier, if that's an option. 
						}
					);	
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
					var trackCountValue = document.getElementById('trackCountValue');
					var trackCountSubtext = document.getElementById('trackCountSubtext');
					
					trackCountValue.textContent = 'Track Count: ' + trackCount;
					trackCountSubtext.hidden = false;
					
					if (previousTrackCount == null)
					{
						trackCountSubtext.textContent = 'This playlist does not seem to be stored yet. It is recommended to save it now.';

						//trackCountSubtext.className = 'withfadeout';
						//trackCountSubtext.style.opacity = 0.2;
						return;
					}
					
					console.log('Playlist "%s" previously had %s tracks, and now has %s tracks.', playlistName, previousTrackCount, trackCount);
		
					var difference = trackCount - previousTrackCount;
			
					if (difference < 0) //if the track count has decreased
					{
						trackCountValue.textContent = 'Track Count: ' + trackCount + ' ( ' + difference + ' )';
						trackCountSubtext.style.backgroundColor = '#ff0000';
						trackCountSubtext.textContent = 'This playlist\'s track count has decreased. It is recommended to compare and save it now.';
					}
					else if (difference > 0) //if the track count has increased
					{
						trackCountValue.textContent = 'Track Count: ' + trackCount + ' ( + ' + difference + ' )';
						trackCountSubtext.textContent = 'This playlist\'s track count has increased. It is recommended to save it now.';
					}
					else //if the track count has not changed
					{
						trackCountSubtext.style.backgroundColor = '#339933';
						trackCountSubtext.textContent = 'This playlist\'s track count has not changed. It\'s still possible that the track list has changed.';
					}
				}	
			);
		}			
	);
}

function CompareTrackLists(latest, previous)  //TODO what happens if you remove and add the same tracks? It should just work, but test it.
{	
	//TODO: The displayed track count should be updated
	
	//TODO: Error checking needed
	
	for (var i = latest.length-1; i >= 0; i--)
	{
		for (var j = previous.length-1; j >= 0; j--)
		{
			if (latest[i] != null && previous[j] != null && 
				latest[i].title === previous[j].title && latest[i].album === previous[j].album && latest[i].duration === previous[j].duration)
			{
				latest[i] = null;
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
	
	if (tracksAdded.length > 0)
	{
		PrintListToTextArea(document.getElementById('tracksAddedList'), tracksAdded);
		document.getElementById('tracksAddedList').hidden = false;
		document.getElementById('tracksAddedEmpty').hidden = true;
	}

	var tracksRemoved = [];
	
	for (var j = 0; j < previous.length; j++)
	{
		if (previous[j] != null)
		{
			tracksRemoved.push(j+1 + " " + previous[j].title);
			console.log("Track Removed: %s %s", j+1, previous[j].title);
		}
	}
	
	if (tracksRemoved.length > 0)
	{
		document.getElementById('tracksRemovedList').hidden = false;
		PrintListToTextArea(document.getElementById('tracksRemovedList'), tracksRemoved);
		document.getElementById('tracksRemovedEmpty').hidden = true;
	}
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

function FadeTransition(callback) 
{
	FadeOut
	(	
		document.getElementById('popup'),
		function()
		{
			callback();
			FadeIn
			(
				document.getElementById('popup'), 
				function()
				{
					console.log("Fade transition complete."); //TODO maybe make this an optional parameter since we don't really need it. 
				}
			);

		}
	);	
}

function FadeOut(element, callback) //TODO: Error checking needed
{
	var targetOpacity = 1;
	var fadeInterval = setInterval
	(
		function()
		{
			element.style.opacity = targetOpacity;
			//console.log("target opacity " + targetOpacity);
			
			if (targetOpacity == 0)
            {
                clearInterval(fadeInterval);
                //console.log('Finished fading out.');
                callback();
            }	
			else if (targetOpacity < 0)
			{
				targetOpacity = 0;
			}
			else
			{
				targetOpacity -= 0.1;
			}
		},
		60
	);
}

function FadeIn(element, callback)
{
	var targetOpacity = 0;
	var fadeInterval = setInterval
	(
		function()
		{
			element.style.opacity = targetOpacity;
			//console.log("target opacity " + targetOpacity);
			
			if (targetOpacity == 1)
            {
                clearInterval(fadeInterval);
                //console.log('Finished fading in.');
                callback();
            }	
			else if (targetOpacity > 1)
			{
				targetOpacity = 1;
			}
			else
			{
				targetOpacity += 0.1;
			}
		},
		60
	);
}

function RenderStatus(statusText) 
{
	document.getElementById('status').textContent = statusText;
	console.log(statusText);
	document.getElementById('status').hidden = false;
	//TODO: probably don't really want to be using this anymore
}

//TODO: Future: Progress bar
//TODO: Future: Consider feature which suggests listening to one of the albums/tracks in the 'test' playlists. 
//TODO: Unit tests?