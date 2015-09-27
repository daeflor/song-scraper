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
					console.log('New playlist stored: %s.', playlistName);
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
	VerifyTab
	(
		function(tab) 
		{
			HideErrorMessage();
			ShowTitle(GetPlaylistName(tab));
			CompareTrackCounts(GetPlaylistName(tab));
		}
	);
}

function GetPlaylistName(tab)
{
	return tab.title.split(' - Google Play Music')[0]; 
}

function VerifyTab(callback)
{
	chrome.tabs.query
	(
		{active: true, currentWindow: true}, 
		function(tabs) 
		{
			VerifyTabUrl
			(
				tabs[0],
				function(tab)
				{
					VerifyTabTitle(tab, callback);
				}
			);
		}
	);

}

function VerifyTabUrl(tab, callback)
{
	var url = tab.url;
	console.assert(typeof url == 'string', 'tab.url should be a string');

	if (url.indexOf('https://play.google.com/music/listen?u=0#/pl/') == -1
		&& url.indexOf('https://play.google.com/music/listen#/pl/') == -1)
	{
		console.log('Page is not a valid Google Music playlist url.');
		ShowErrorMessage('URL Invalid. Please open a valid Google Music playlist page and try again.');
	}
	else
	{
		callback(tab);
	}
}

function VerifyTabTitle(tab, callback) 
{
	if (tab.title.indexOf(' - Google Play Music') == -1)
	{
		ShowErrorMessage('Please open a valid Google Music playlist page and try again.');
	}
	else if ((tab.title.match(/-/g)).length >= 2)
	{
		ShowErrorMessage('Please pause music playback and try again.');
	}
	else
	{
		callback(tab); 
	}
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
/*
function IsNotNull(value)
{
	return value != null;
}
*/
function DisplayTrackTable(tableID, list, description)
{
	var table = document.getElementById(tableID);
	var tr;
	var td;	
		
	for (var i = 0; i < list.length; i++)
	{
		if (list[i] == null)
		{
			continue;
		}
		
		console.log(list[i].title);
		tr = document.createElement('TR');
		
		td = document.createElement('TD');
		td.textContent = i+1; 
		tr.appendChild(td);
		
		td = document.createElement('TD');
		td.textContent = list[i].title;
		tr.appendChild(td);
		
		td = document.createElement('TD');
		td.textContent = list[i].artist;
		tr.appendChild(td);
		
		td = document.createElement('TD');
		td.textContent = list[i].album;
		tr.appendChild(td);
		
		table.appendChild(tr);
	}
	
	//table.style.height = table.childElementCount * 20 + 'px';
	//console.log("Table hidden status B4: " + table.hidden);
	if (document.getElementById(tableID).childElementCount > 1)
	{
		table.hidden = false;
		description.hidden = true;
	}
	/*
	table.hidden = document.getElementById(tableID).childElementCount-1;
	//console.log("Table hidden status: " + table.hidden);
	//table.hidden = table.childElementCount-1;
	document.getElementById('tracksAddedEmpty').hidden = !table.hidden;
	*/
}
//TODO make each td scrollable, instead of the whole table, maybe. (That way outliers dont skew the whole table.)
	//Doesnt really work, cause what we want is every column to be x-scrollable, not every td.
/*function DisplayTrackTables(added, removed)
{
	var table;
	
	if (added.length > 0)
	{
		//document.getElementById('tracksAddedEmpty').hidden = true;
		table = document.getElementById('tracksAddedTable');
		//table.style.height = added.length * 20 + 'px';
		//table.hidden = false;
		console.log('Tracks added: ');
		PrintTrackTable(document.getElementById('tracksAddedTable'), added);
	}
	
	if (removed.length > 0)
	{
		document.getElementById('tracksRemovedEmpty').hidden = true;
		table = document.getElementById('tracksRemovedTable');
		table.style.height = removed.length * 20 + 'px';
		table.hidden = false;
		console.log('Tracks removed: ');
		PrintTrackTable(table, removed);
	}
}*/
	 
function CompareTrackLists(latest, previous)  
{		
	//TODO: Error checking needed
	//TODO filter?
	
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
	} //TODO removed track index wrong if there were duplicates
	
		//TODO should this be a callback?
	console.log('Tracks added: ----');
	DisplayTrackTable('tracksAddedTable', latest, document.getElementById('tracksAddedEmpty'));
	
	console.log('Tracks removed: ----');
	DisplayTrackTable('tracksRemovedTable', previous, document.getElementById('tracksRemovedEmpty'));
	

	//DisplayTrackTables(latest, previous);
	//DisplayTrackTables(latest.filter(IsNotNull), previous.filter(IsNotNull));
	
	/*
	console.log('doing what i think');
	var tracksAdded = latest.filter(IsNotNull);
	// var tracksAdded = latest.filter
	// (
	// 	function(value)
	// 	{
	// 		return value != null;
	// 	}
	// );
	//console.log('TTTracks added: ');
	//console.log(tracksAdded);
	
	var tracksRemoved = previous.filter
	(
		function(value)
		{
			return value != null;
		}
	);
	
	if (tracksAdded.length > 0)
	{
		console.log('Tracks added: ');
		console.log(tracksAdded);
		DisplayTracksAdded(tracksAdded);
	}

	if (tracksRemoved.length > 0)
	{
		console.log('Tracks removed:');
		console.log(tracksRemoved);
		DisplayTracksRemoved(tracksRemoved);
	}
	
	//DisplayTrackTables();
	
	//TODO finish implementing this
	
	/*var tracksAdded = [];
	
	for (var i = 0; i < latest.length; i++)
	{
		if (latest[i] != null)
		{
			tracksAdded.push(i+1 + " " + latest[i].title);
			console.log("Track Added: %s %s", i+1, latest[i].title);
		}
	}*/
	


	// var tracksRemoved = [];
	// 
	// for (var j = 0; j < previous.length; j++)
	// {
	// 	if (previous[j] != null)
	// 	{
	// 		tracksRemoved.push(j+1 + " " + previous[j].title);
	// 		console.log("Track Removed: %s %s", j+1, previous[j].title);
	// 	}
	// }
}

function PrintListToTextArea(textArea, list)
{
	//document.getElementById('tracksAddedTable').
	textArea.textContent = list[0].title; //TODO: Error checking needed
   	//textArea.textContent = list.join('\n');
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
	//document.getElementById('popup').style.minHeight = '250px';
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

/*
function DisplayTracksAdded(list)
{
	PrintListToTextArea(document.getElementById('tracksAddedTable'), list);
	document.getElementById('tracksAddedEmpty').hidden = true;
	document.getElementById('tracksAddedList').style.height = list.length * 20 + 'px';
	document.getElementById('tracksAddedList').hidden = false;
}

function DisplayTracksRemoved(list)
{
	PrintListToTextArea(document.getElementById('tracksRemovedTable'), list);
	document.getElementById('tracksRemovedEmpty').hidden = true;
	document.getElementById('tracksRemovedList').style.height = list.length * 20 + 'px';
	document.getElementById('tracksRemovedList').hidden = false;
}
*/
							
function ReloadPopup()
{
	FadeOut(document.getElementById('popup'), function() { location.reload(true); });
}

/*
***** Notes *****

** Bugs **

	- Hit an issue where the same song showed up under Removed and Added, for unknown reasons. May be resolved by showing all info for the songs that have been removed/added. 
	- First time saving playlist very briefly shows the added/removed section before hiding it.
	- The popup is sometimes cut off. 
	- If multiple playlists have the same name, their info will likely just get overridden. 
	- The comparison can be wrong about which specific track was removed from a playlist. This happens when there were duplicates and only the earlier (lower index) of the two tracks was removed. 
	- Getting playlist name currently doesn't work if there's a hyphen in the name 
	
	
** Features **

V1:	
	- Store a list of all Playlists and check that the list of playlists is up to date. Let the user know if it's not. 
	- Allow user to view more than just the title of the tracks removed 
	- Make a song object and use that instead obj= {} 
	- May want to allow user to be playing audio when they use the extension (need different way of getting playlist name)
	- Have a better indicator that the compare button is disabled while the comparison is running. 

V2:
	- Have the user's track list info be accessible across devices so they can use the extension from anywhere
		- Extension Sync storage may not work because of the quota limits. 
		- Could consider Google Drive integration, or switching to a Packaged App
	- Allow user to save more than just playlists (e.g. All songs added to library, Uploaded & Purchased songs, and Subscription songs).
		- These all use this url: https://play.google.com/music/listen?u=0#/all
		- Made complicated because none of these lists have song index numbers, and the latter two don't have track counts
		- Would have to make sure to be able to distinguish these from playlists (e.g. what if a playlist is also called "Songs"?)
		- Consider using a different method to determine when you're at the bottom of the page/window, and maybe just use all track info to compare and find duplicates
	- Only store ONE object for the extension. And that object contains all the others... scary. 
		- This probably won't work because of the QUOTA_BYTES_PER_ITEM limit. 
	- Progress bar
	- Support comparison between Spotify playlists and google music (allowing the user to choose tracklist x and y to compare)
	- Consider feature which suggests listening to one of the albums/tracks in the 'test' playlists. 
	- Unit tests?	
	- Store an "all tracks removed" list and allow the user to select if they want to add them to that list or not after it lists which have been removed
	- Consider app vs extension possibilities
	- If scrolling is allowed while comparing a playlist, and the user scrolls, it's possible that the track list returned will be incorrect. 
		- deep query selector is going away soon; will need new a way of preventing user from scrolling while comparing playlist. 
	- Feature that checks for duplicates
	

** Tasks **

	- Save all playlists
	- Consider having all projects in one repo, under different branches


** Style **

	- Differentiate content script methods from similarly named Popup methods
	- MVC


** TEMP **

	document.querySelectorAll('div.tooltip.fade-out'); 3 -> length-1
	chrome.storage.local.get(null, function (e) { console.log(e); });
	location.reload(true);
	var index = songs[0].getAttribute('data-index');
*/
