/* global key */
/* global chrome */

document.addEventListener('DOMContentLoaded', Start);
//document.addEventListener('DOMContentLoaded', function() { FadeIn(document.getElementById('popup'), Start) } );					

//TODO do this or dont do this, but finish it.
/*
function CurrentTab()
{
    this.tab;
    this.id;
    this.tracklistName;
    this.key;
}

var currentTab = new CurrentTab();
*/

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
				
				console.log('Stored song list for %s has changed. It previously had %s tracks, and now has %s tracks.', playlistName, storageChange.oldValue.length, storageChange.newValue.length);
				SaveTrackList(storageChange.oldValue);
				CompareTrackLists(storageChange.newValue, storageChange.oldValue);	
			}
			else if(key.indexOf(chrome.runtime.id + '_Backup') > -1)
			{
				console.log('The Backup song list has been modified. It previously had %s tracks, and now has %s tracks.', storageChange.oldValue.length, storageChange.newValue.length);
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
			HideStatusMessage();
			ShowTitle(GetPlaylistName(tab));
			CompareTrackCounts(tab);
		}
	);
}

function GetPlaylistName(tab)
{
	return tab.title.split(' - Google Play Music')[0]; 
	//TODO finish updating this. Also need to update getting the track count for "All Songs, etc"
        //Finish using GetTrackListTitle
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
		&& url.indexOf('https://play.google.com/music/listen#/pl/') == -1
		&& url.indexOf('https://play.google.com/music/listen#/all') == -1
		&& url.indexOf('https://play.google.com/music/listen#/ap/auto-playlist') == -1)
	{
		console.log('Page is not a valid Google Music playlist url.');
		ShowStatusMessage('URL Invalid. Please open a valid Google Music playlist page and try again.');
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
		ShowStatusMessage('Please open a valid Google Music playlist page and try again.');
	}
	//TODO: Does not work if music is muted in the g music tab
		//Maybe could use volume slider?
	else if (tab.audible) 
	{
		ShowStatusMessage('Please pause music playback and try again.');
	} 
	else
	{
		callback(tab); 
	}
}

function CompareTrackCounts(tab)
{
	//TODO is this necessary? We already have tab
    PerformFunctionOnCurrentTab
    (
        function()
        {
            GetCurrentTrackCount
            (
                tab, 
                function(trackCount)
                {		
                    if (trackCount == null)
                    {
                        ShowStatusMessage('Track count could not be determined. Please open a valid playlist page and try again.');
                        return;
                    }
                        
                    var key = GenerateTrackListKey(tab);	
                            
                    GetPreviousTrackCount
                    (
                        key,
                        function(previousTrackCount)
                        {
                            console.log('Compared track count. Playlist \'%s\' previously had %s tracks, and now has %s tracks.', GetPlaylistName(tab), previousTrackCount, trackCount);
                            SetTrackCountValue(trackCount, previousTrackCount);
                            PrepareLandingPage();
                        }	
                    );
                }			
            )
        }
    );
}

function PrepareLandingPage()
{
    document.getElementById('buttonComparePlaylist').addEventListener('click', function() {PerformFunctionOnCurrentTab(GetSongList)});
    document.getElementById('buttonPrint').addEventListener('click', function() {PerformFunctionOnCurrentTab(PrintSavedList)});   
	document.getElementById('buttonBackup').addEventListener('click', function() {RevertToBackup();});
	
	ShowLandingPage();
}

function RevertToBackup()
{
	var backupKey = chrome.runtime.id + '_Backup';
	
	PerformFunctionOnCurrentTab
    (
        function(tab)
        {
			var currentKey = GenerateTrackListKey(tab);

			var storageObject = {};

			chrome.storage.local.get
			(
				backupKey, 
				function (result) 
				{ 
					storageObject[currentKey] = result[backupKey];

					//TODO should make this a method to avoid repeated code
					chrome.storage.local.set
					(
						storageObject, 
						function()
						{
							if(chrome.runtime.lastError)
							{
								console.log('ERROR: ' + chrome.runtime.lastError.message);
								//TODO: Error checking needed. Should report to user somehow that playlists didn't get stored properly. 
								return;
							}

							ShowStatusMessage('Song list reverted to backup');
						}
					);
				}
			);
        }
    );
}

function GetCurrentTrackCount(tab, callback)
{	
    chrome.tabs.sendMessage
    (
        tab.id, 
        {greeting: 'GetTrackCount'}, 
        function(response) 
        {
            console.log('Current playlist\'s track count is %s.', response);
            callback(response);
            //TODO maybe get the element here and then calculate track count depending on type of track list
        }
    );
}

function PerformFunctionOnCurrentTab(callback)
{
    //console.log("About to perform a function on the current tab.");
    chrome.tabs.query
	(
		{active: true, currentWindow: true}, 
		function(tabs) 
		{
            callback(tabs[0]);
		}
	); //TODO finishing transitioning to using this
}

function PrintSavedList(tab)
{
    var key = GenerateTrackListKey(tab);
    console.log("Key is: " + key);
    
    chrome.storage.local.get
    (
        key, //TODO: Error checking needed
        function(result)
        {
            if(chrome.runtime.lastError)
            {
                console.log('ERROR!: ' + chrome.runtime.lastError.message);
                return;
            }
            
            if (result[key] == undefined)
            {
                console.log('There is currently no track list saved under key "%s"', key);
            }
            else
            {
                var list = result[key];
				HidePrintButton();
                DisplayTrackTable('tableSavedList', list);
            }
        }
    );
}

//TODO I broke this
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
                console.log('Previous track count: "%s"', result[key].length);
				callback(result[key].length); 
			}
		}
	);
}

function GetSongList(tab) 
{
	document.getElementById('buttonComparePlaylist').disabled = true;
	HideLandingPage();
	ShowStatusMessage('Song list comparison in progress.');

    chrome.tabs.sendMessage
    (
        tab.id, 
        {greeting: 'GetSongList'}, 
        function(trackList)
        {
			if (trackList == null)
			{
				ShowStatusMessage('Failed to retrieve track list.');
				return;
			}

            FadeTransition //when the tracklist has been collected, begin the fade transition
            (
                function() //when the fade transition has completed...
                {
                    ShowComparisonPage();
                    ShowTrackLists();
                    ShowBackButton();
                    
                    var key = GenerateTrackListKey(tab);
                    var trackListStorageObject = {};
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

function GenerateTrackListKey(tab)
{
    return chrome.runtime.id + '_Playlist_\'' + GetPlaylistName(tab) + '\'';
}

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
	
	if (table.childElementCount > 1)
	{
		table.hidden = false;

		if (description != null)
		{
			description.hidden = true;
		}
	}
}
	 
function CompareTrackLists(latest, previous)  
{		
	//TODO: Error checking needed?
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
	
	console.log('Tracks added: ----');
	DisplayTrackTable('tracksAddedTable', latest, document.getElementById('tracksAddedEmpty'));
	
	console.log('Tracks removed: ----');
	DisplayTrackTable('tracksRemovedTable', previous, document.getElementById('tracksRemovedEmpty'));
}

//TODO could make more use of this by generalizing it
function SaveTrackList(list) 
{
	var key = chrome.runtime.id + '_Backup';;
    var trackListStorageObject = {};
    trackListStorageObject[key] = list;
	
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

function ReloadPopup()
{
	FadeOut(document.getElementById('popup'), function() { location.reload(true); });
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

/***** User Interface *****/

function ShowStatusMessage(text)
{
	document.getElementById('status').textContent = text;
	document.getElementById('status').hidden = false;

	HideLandingPage();
	HideComparisonPage();
}

function HideStatusMessage()
{
	document.getElementById('status').hidden = true;
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

function HidePrintButton()
{
	document.getElementById('buttonPrint').hidden = true;
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

function HideComparisonPage()
{
	document.getElementById('comparisonPage').hidden = true;
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

** TEMP **

	document.querySelectorAll('div.tooltip.fade-out'); 3 -> length-1
	chrome.storage.local.get(null, function (e) { console.log(e); });
	location.reload(true);
	var index = songs[0].getAttribute('data-index');
*/
