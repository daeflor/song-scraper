/* global key */
/* global chrome */

document.addEventListener('DOMContentLoaded', Start);
//document.addEventListener('DOMContentLoaded', function() { FadeIn(document.getElementById('popup'), Start) } );					

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
					DisplayErrorMessage('First time saving data for this playlist.');			
					document.getElementById('trackLists').hidden = true;
					return;
				}
				
				console.log('Playlist "%s" has changed. It previously had %s tracks, and now has %s tracks.', playlistName, storageChange.oldValue.length, storageChange.newValue.length);
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
		}
	}
);

function Start()
{	
	VeryTabIsGoogleMusicPlaylist
	(
		function(tab) 
		{
			var playlistName = GetPlaylistName(tab);
			if (playlistName == null)
			{
				DisplayErrorMessage('Please open a valid Google Music playlist page and try again.');
				return;
			}
			
			document.getElementById('playlistName').textContent = playlistName; 
			document.getElementById('status').hidden = true; 
			document.getElementById('buttonComparePlaylist').hidden = false; 
			document.getElementById('buttonComparePlaylist').onclick = GetSongList;
			document.getElementById('playlistInfo').hidden = false;
			document.getElementById('playlistName').hidden = false;
			CompareTrackCounts(playlistName);
		}
	);
}

function GetPlaylistName(tab) 
{
	if (tab.title.indexOf(' - Google Play Music') == -1)
	{
		return null;
	}
	else
	{
		return tab.title.split(' - Google Play Music')[0]; 
	}
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

function GetSongList() 
{
	document.getElementById('buttonComparePlaylist').disabled = true;
	chrome.tabs.query
	(
		{active: true, currentWindow: true}, 
		function(tabs) 
		{
			chrome.tabs.sendMessage
			(
				tabs[0].id, 
				{greeting: 'GetSongList'}, 
				function(trackList)
				{
					FadeTransition //when the tracklist has been collected, begin the fade transition
					(
						function() //when the fade transition has completed...
						{
							document.getElementById('trackLists').hidden = false;
							document.getElementById('playlistInfo').hidden = true;
							
							var key = GetPlaylistName(tabs[0]) + '_TrackList'; 
							var trackListStorageObject= {};
							trackListStorageObject[key] = trackList;
							
							document.getElementById('buttonBack').hidden = false;
							document.getElementById('buttonBack').onclick = ReloadPopup;
							
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
								}
							);
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
			if (trackCount == null)
			{
				DisplayErrorMessage('Track count could not be determined. Please open a valid playlist page and try again.');
				document.getElementById('playlistInfo').hidden = true;
				return;
			}
				
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
	 
function CompareTrackLists(latest, previous)  
{	
	//TODO: Error checking needed
	
	for (var i = 0; i < latest.length; i++)
	{
		for (var j = 0; j < previous.length; j++)
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
		document.getElementById('tracksAddedEmpty').hidden = true;
		document.getElementById('tracksAddedList').hidden = false;
		document.getElementById('tracksAddedList').style.height = tracksAdded.length * 20 + 'px';
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
		PrintListToTextArea(document.getElementById('tracksRemovedList'), tracksRemoved);
		document.getElementById('tracksRemovedEmpty').hidden = true;
		document.getElementById('tracksRemovedList').hidden = false;
		document.getElementById('tracksRemovedList').style.height = tracksRemoved.length * 20 + 'px';
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

//TODO: The whole fade thing could be cleaner / more user friendly. Turning it into one function didn't really help but there might be other ways.
function FadeTransition(callback) 
{
	FadeOut
	(	
		document.getElementById('popup'),
		function()
		{
			callback();
			FadeIn(document.getElementById('popup'));
		}
	);	
}

//TODO: Fade out and in when pressing back button and also just when loading popup the first time. 
	//At a minimum, the popup initialization shouldn't be as aggressive and janky as it is now. Should be possible to make it smoother
function FadeOut(element, callback) //TODO: Error checking needed
{
	var targetOpacity = 1;
	var fadeInterval = setInterval
	(
		function()
		{
			element.style.opacity = targetOpacity;
			
			if (targetOpacity == 0)
            {
                clearInterval(fadeInterval);
				
				if(typeof callback !== "undefined")
				{
					callback();
				}
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
			
			if (targetOpacity == 1)
            {
                clearInterval(fadeInterval);
				
				if(typeof callback !== "undefined")
				{
					callback();
				}
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

function VeryTabIsGoogleMusicPlaylist(callback)
{
	chrome.tabs.query
	(
		{active: true, currentWindow: true}, 
		function(tabs) 
		{
			var url = tabs[0].url;
			console.assert(typeof url == 'string', 'tab.url should be a string');

			if (url.indexOf('https://play.google.com/music/listen?u=0#/pl/') == -1)
			{
				//document.getElementById('playlistInfo').hidden = true;
				//document.getElementById('playlistName').hidden = true;
				DisplayErrorMessage('Please open a valid Google Music playlist page and try again.');
			}
			else
			{
				callback(tabs[0]);
			}
		}
	);
}

function DisplayErrorMessage(text)
{
	document.getElementById('status').textContent = text;
	document.getElementById('status').hidden = false;
}

function ReloadPopup()
{
	FadeOut(document.getElementById('popup'), function() { location.reload(true); });
}

//TODO: Somehow standardize all UI error/notification messaging and layout. Plan out the order of events and make appropriate hide/show functions
//TODO: Check that the list of playlists is up to date
//TODO: Save all playlists

//TODO: Style: Differentiate content script methods from similarly named Popup methods
//TODO: Future: Progress bar
//TODO: Future: Support comparison between Spotify playlists and google music
//TODO: Future: Consider feature which suggests listening to one of the albums/tracks in the 'test' playlists. 
//TODO: Unit tests?

//chrome.storage.local.get(null, function (e) { console.log(e); });