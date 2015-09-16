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

			if (key.indexOf(chrome.runtime.id + '_Playlist') > -1) 
			{
				
				var playlistName = key.split('_')[2];
				
				if (storageChange.oldValue == undefined)
				{	
					ShowStorageResultText();	
					HideTrackLists();		
					return;
				}
				
				console.log('Playlist %s has changed. It previously had %s tracks, and now has %s tracks.', playlistName, storageChange.oldValue.length, storageChange.newValue.length);
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
				console.log('Playlist name not found. Page has likely not finished loading yet.');
				ShowErrorMessage('Please open a valid Google Music playlist page and try again!');
				return;
			}

			HideErrorMessage();
			ShowTitle(playlistName);
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
					console.log('Current playlist\'s track count is %s.', response);
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

function CompareTrackCounts(playlistName)
{
	GetCurrentTrackCount
	(
		function(trackCount)
		{		
			if (trackCount == null)
			{
				ShowErrorMessage('Track count could not be determined. Please open a valid playlist page and try again.');
				return;
			}
				
			var trackListKey = chrome.runtime.id + '_Playlist_\'' + playlistName + '\'';	
					
			GetPreviousTrackCount
			(
				trackListKey,
				function(previousTrackCount)
				{
					console.log('Playlist \'%s\' previously had %s tracks, and now has %s tracks.', playlistName, previousTrackCount, trackCount);
		
					SetTrackCountValue(trackCount, previousTrackCount);
					document.getElementById('buttonComparePlaylist').onclick = GetSongList;
					ShowLandingPage();
				}	
			);
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
							HideLandingPage();
							ShowComparisonPage();
							ShowTrackLists();
							ShowBackButton();
							
							var key = chrome.runtime.id + '_Playlist_\'' + GetPlaylistName(tabs[0]) + '\'';
							var trackListStorageObject= {};
							trackListStorageObject[key] = trackList;
							
							chrome.storage.local.set
							(
								trackListStorageObject, 
								function()
								{
									if(chrome.runtime.lastError)
									{
										console.log('ERROR: ' + chrome.runtime.lastError.message);
										//TODO: Error checking needed. Should report to user somehow that playlists didn't get stored properly. 
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
		DisplayTracksAdded(tracksAdded);
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
		DisplayTracksRemoved(tracksRemoved);
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

//TODO: Fade out and in when loading popup the first time. 
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
				console.log('Page is not a valid Google Music playlist url.');
				ShowErrorMessage('Please open a valid Google Music playlist page and try again.');
			}
			else
			{
				callback(tabs[0]);
			}
		}
	);
}

/***** User Interface *****/

function ShowErrorMessage(text)
{
	document.getElementById('error').textContent = text;
	document.getElementById('error').hidden = false;
}

function HideErrorMessage()
{
	document.getElementById('error').hidden = true;
}

function ShowTitle(title)
{
	document.getElementById('title').textContent = title;
	document.getElementById('title').hidden = false;
}

function ShowLandingPage()
{
	//document.getElementById('popup').style.minHeight = '250px';
	document.getElementById('landingPage').hidden = false;
}

function HideLandingPage()
{
	document.getElementById('landingPage').hidden = true;
}

function SetTrackCountValue(currentCount, previousCount)
{
	var countText = 'Track Count: ' + currentCount;
	SetTrackCountText('This playlist\'s track count has not changed. It\'s still possible that the track list has changed.');
	
	if (previousCount == null)
	{
		SetTrackCountText('This playlist does not seem to be stored yet. It is recommended to save it now.', '#FFCC66');
	}
	else
	{
		var difference = currentCount - previousCount;
	
		if (difference < 0) //if the track count has decreased
		{
			countText = 'Track Count: ' + currentCount + ' ( ' + difference + ' )';
			SetTrackCountText('This playlist\'s track count has decreased. It is recommended to compare and save it now.', '#ff0000');
		}
		else if (difference > 0) //if the track count has increased
		{
			countText = 'Track Count: ' + currentCount + ' ( + ' + difference + ' )';
			SetTrackCountText('This playlist\'s track count has increased. It is recommended to save it now.', '#FFCC66');
		}
	}
		
	document.getElementById('trackCountValue').textContent = countText;
}

function SetTrackCountText(text, backgroundcolor)
{
	document.getElementById('trackCountSubtext').textContent = text;
	
	if(typeof backgroundcolor !== "undefined")
	{
		document.getElementById('trackCountSubtext').style.backgroundColor = backgroundcolor;
	}
}

function ShowComparisonPage()
{
	document.getElementById('comparisonPage').hidden = false;
}

function ShowStorageResultText()
{
	document.getElementById('storageResultText').hidden = false;
}

function ShowTrackLists()
{
	document.getElementById('trackLists').hidden = false;
}

function HideTrackLists()
{
	document.getElementById('trackLists').hidden = true;
}

function ShowBackButton()
{
	document.getElementById('buttonBack').hidden = false;
	document.getElementById('buttonBack').onclick = ReloadPopup; //TODO: maybe could assign all buttons in one function
}

function DisplayTracksAdded(list)
{
	PrintListToTextArea(document.getElementById('tracksAddedList'), list);
	document.getElementById('tracksAddedEmpty').hidden = true;
	document.getElementById('tracksAddedList').style.height = list.length * 20 + 'px';
	document.getElementById('tracksAddedList').hidden = false;
}

function DisplayTracksRemoved(list)
{
	PrintListToTextArea(document.getElementById('tracksRemovedList'), list);
	document.getElementById('tracksRemovedEmpty').hidden = true;
	document.getElementById('tracksRemovedList').style.height = list.length * 20 + 'px';
	document.getElementById('tracksRemovedList').hidden = false;
}
							
function ReloadPopup()
{
	FadeOut(document.getElementById('popup'), function() { location.reload(true); });
}

/*
***** Notes *****

** Bugs **

	- Hit an issue where the same song showed up under Removed and Added, for unknown reasons. May be resolved by showing all info for the songs that have been removed/added. 
	- First time saving playlist very briefly shows the added/removed section before hiding it.
	- The popup is sometimes cutoff. 


** Features **

V1:
	- Allow user to save "all songs" / songs added to library, etc, not just Playlists. 
		- Allow "uplaoded/purchased" and "subscription" songs to be saved separately. (except these don't have track counts)
			- Could use url + divs to determine this (https://play.google.com/music/listen?u=0#/all)
	- Start using Sync storage
		- This may not work because of the QUOTA_BYTES_PER_ITEM limit. 
	- Store a list of all Playlists and check that the list of playlists is up to date. Let the user know if it's not. 
	- Allow user to view more than just the title of the tracks removed 
	- What if multiple playlists have the same name, or one of them is called "Songs"?
	- What if the song list has more then 999 songs and has a comma in the number. 

V2:
	- Only store ONE object for the extension. And that object contains all the others... scary. 
		- This probably won't work because of the QUOTA_BYTES_PER_ITEM limit. 
	- Progress bar
	- Support comparison between Spotify playlists and google music
	- Consider feature which suggests listening to one of the albums/tracks in the 'test' playlists. 
	- Unit tests?	
	- Store an "all tracks removed" list and allow the user to select if they want to add them to that list or not after it lists which have been removed
	- Consider app vs extension possibilities


** Tasks **

	- Save all playlists


** Style **

	- Differentiate content script methods from similarly named Popup methods
	- MVC


chrome.storage.local.get(null, function (e) { console.log(e); });
location.reload(true);
*/