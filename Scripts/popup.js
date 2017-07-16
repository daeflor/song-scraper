/*** Listeners ***/

//document.addEventListener('DOMContentLoaded', Start);
document.addEventListener('DOMContentLoaded', function() { FadeIn(document.getElementById('popup'), PreparePopup, 0.2) } );					

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
				StoreObjectInLocalNamespace(TabManager.GetBackupKey(), storageChange.oldValue);
				CompareTrackLists(storageChange.newValue, storageChange.oldValue);	
			}
			else if(key.indexOf(TabManager.GetBackupKey()) > -1)
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

/*** Message Passing ***/

//TODO abstract any message passing to only do the minimum necessary
//TODO could we get the playlist name and track count in one go, and save them together? 
	//Then we could also store the trackcount in the TabManager and make the comparison code simpler
function RetrievePlaylistName(callback)
{	
	var messageGreeting;

	if (TabManager.GetTab().url.indexOf('https://play.google.com/music/listen#/all') > -1)
	{
		messageGreeting = 'greeting_GetNameOfAllSongsList';
	}
	else
	{
		messageGreeting = 'greeting_GetNameOfPlaylist';
	}

    chrome.tabs.sendMessage
    (
        TabManager.GetTab().id, 
        {greeting: messageGreeting}, 
        function(response) 
        {
			callback(response);
        }
    );
}

function RetrieveCurrentTrackCount(callback)
{	
    chrome.tabs.sendMessage
    (
        TabManager.GetTab().id, 
        {greeting: 'GetTrackCount'}, 
        function(response) 
        {
            callback(response); //TODO maybe get the element here and then calculate track count depending on type of track list
        }
    );
}

//TODO Merge these all into one generic method
function RetrieveSongList(callback) 
{
    chrome.tabs.sendMessage
    (
        TabManager.GetTab().id, 
        {greeting: 'greeting_GetSongList'},
		function(response)
		{
			callback(response);
		} 
    );
}

/*** Popup Setup ***/

function PreparePopup()
{
	VerifyAndSetTab
	(
		function()
		{
			GetPlaylistNameAndTrackCount
			(
				function() 
				{
					HideStatusMessage();
					ShowTitle(TabManager.GetPlaylistName());
					CompareTrackCounts(); 
				}
			);
		}
	);
}

function VerifyAndSetTab(callback)
{
	chrome.tabs.query
	(
		{active: true, currentWindow: true}, 
		function(tabs) 
		{	
			var url = tabs[0].url;
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
				TabManager.SetTab(tabs[0]);
				callback();
			}
		}
	);
}

function GetPlaylistNameAndTrackCount(callback)
{
	RetrievePlaylistName
	(
		function(playlistName)
		{
			console.log('Current playlist\'s name is %s.', playlistName);
            TabManager.SetPlaylistName(playlistName);

			RetrieveCurrentTrackCount
			(
				function(trackCount)
				{
					console.log('Current playlist\'s track count is %s.', trackCount);
					
					if (trackCount == null)
					{
						ShowStatusMessage('Track count could not be determined. Please open a valid playlist page and try again.');
						return;
					}

					TabManager.SetCurrentTrackCount(trackCount);
					callback();
				}
			);
		}
	);
}

/////////////

function Start()
{		
	SaveTabDetails
	(
		function()
		{
			VerifyTab
			(
				function() 
				{
					HideStatusMessage();
					ShowTitle(TabManager.GetPlaylistName());
					CompareTrackCounts(); 
				}
			)

		}
	);
}

//TODO change to verify and save tab details
function SaveTabDetails(callback)
{
	chrome.tabs.query
	(
		{active: true, currentWindow: true}, 
		function(tabs) 
		{
			TabManager.SetTab(tabs[0]);
			callback();
		}
	);
}

//TODO can this be part of prepareTab? Could PlaylistTitle and Key be all set at the same time as the tab?
function VerifyTab(callback)
{
	VerifyTabUrl
	(
		function()
		{
			RetrievePlaylistName(callback);
		}
	);
}

function VerifyTabUrl(callback)
{
	var url = TabManager.GetTab().url;
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
		callback();
	}
}

function CompareTrackCounts()
{
	GetPreviousTrackCount
	(
		function(previousTrackCount)
		{
			console.log('Compared track count. Playlist \'%s\' previously had %s tracks, and now has %s tracks.', TabManager.GetPlaylistName(), previousTrackCount, TabManager.GetCurrentTrackCount());
			SetTrackCountValue(TabManager.GetCurrentTrackCount(), previousTrackCount);
			PrepareLandingPage();
		}	
	);
}

/*** Buttons ***/

function PrepareLandingPage()
{
	//TODO is a simpler syntax possible?
    document.getElementById('buttonComparePlaylist').addEventListener('click', function() {InitiateComparison();});
    document.getElementById('buttonPrint').addEventListener('click', function() {PrintSavedList();});   
	document.getElementById('buttonBackup').addEventListener('click', function() {RevertToBackup();}); 
	document.getElementById('buttonExport').addEventListener('click', function() {ExportLocalStorageToFile();});


	ShowLandingPage();
}

function InitiateComparison()
{		
	document.getElementById('buttonComparePlaylist').disabled = true;
	HideLandingPage();
	ShowStatusMessage('Song list comparison in progress.');

	RetrieveSongList
	(
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
                    HideStatusMessage();
					ShowComparisonPage();
                    ShowTrackLists();
                    ShowBackButton();
					StoreObjectInLocalNamespace(TabManager.GetKey(), trackList);
                }
            );
        }
	);
}

function PrintSavedList()
{
    //console.log("Key is: " + TabManager.GetKey());
    chrome.storage.local.get
    (
        TabManager.GetKey(), //TODO: Error checking needed
        function(result)
        {
            if(chrome.runtime.lastError)
            {
                console.log('ERROR!: ' + chrome.runtime.lastError.message);
                return;
            }
            
            if (result[TabManager.GetKey()] == undefined)
            {
                console.log('There is currently no track list saved under key "%s"', TabManager.GetKey());
            }
            else
            {
                var list = result[TabManager.GetKey()];
				HidePrintButton();
                DisplayTrackTable('tableSavedList', list);
            }
        }
    );
}

function RevertToBackup()
{
	HideLandingPage();
	
	chrome.storage.local.get
	(
		TabManager.GetBackupKey(), 
		function (result) 
		{ 			
			StoreObjectInLocalNamespace
			(
				TabManager.GetKey(),
				result[TabManager.GetBackupKey()],
				function()
				{
					ShowStatusMessage('Song list reverted to backup');
					ShowBackButton();
				}
			);
		}
	);
}

function ExportLocalStorageToFile()
{
	chrome.storage.local.get
	(
		null, 
		function(result) 
		{ 
			//Generate the file name
			var date = new Date();
			var dateStamp = date.getFullYear() + '-' + (date.getMonth()+1) + '-' + date.getDate();
			var fileName = 'LocalStorageExport' + '_' + dateStamp + '.json';

			//Convert object to a string. (To do the opposite, use JSON.parse).
			var resultString = JSON.stringify(result);

			//Save as file
			var url = 'data:application/json;base64,' + btoa(unescape(encodeURIComponent(resultString)));
			chrome.downloads.download
			(
				{
					url: url,
					filename: fileName
				}
			);
		}
	);
}

/***  ***/

//TODO rename these to make it clearer we're getting something from Local Storage?
function GetPreviousTrackCount(callback)
{
	chrome.storage.local.get
	(
		TabManager.GetKey(), //TODO: Error checking needed
		function(result)
		{
			if(chrome.runtime.lastError)
			{
				console.log('ERROR: ' + chrome.runtime.lastError.message);
				return;
			}
			
			if (result[TabManager.GetKey()] == undefined)
			{
				console.log('There is currently no track list saved under key "%s"', TabManager.GetKey());
				callback(null);
			}
			else
			{
                console.log('Previous track count: "%s"', result[TabManager.GetKey()].length);
				callback(result[TabManager.GetKey()].length); 
			}
		}
	);
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

function ReloadPopup()
{
	FadeOut(document.getElementById('popup'), function() { location.reload(true); });
}

function PrintListToTextArea(textArea, list)
{
   	textArea.textContent = list.join('\n');
}

/***** Helper Functions *****/

function StoreObjectInLocalNamespace(key, value, callback)
{
	var storageObject = {};
	storageObject[key] = value;

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

			if (callback != null)
			{
				callback();
			}
		}
	);
}

function PrintList(list)
{
    for (var i = 0; i < list.length; i++)
    {
        console.log(list[i].index + " " + list[i].title);
    }
}

/***** Fade Functions *****/

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

function FadeIn(element, callback, increment)
{
	if (increment == null)
	{
		increment = 0.1;
	}
	var targetOpacity = 0;
	var fadeInterval = setInterval
	(
		function()
		{
			element.style.opacity = targetOpacity;
			
			if (targetOpacity == 1)
            {
                clearInterval(fadeInterval);
				
				if(typeof callback !== "undefined") //TODO can we abstract all the null checks for all the callbacks?
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
				targetOpacity += increment;
			}
		},
		60
	);
}

//TODO Should probably move this to a separate file
/***** User Interface *****/

function ShowStatusMessage(text)
{
	document.getElementById('status').textContent = text;
	document.getElementById('status').hidden = false;
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
	document.getElementById('divBack').hidden = false;
	document.getElementById('buttonBack').onclick = ReloadPopup; //TODO: maybe could assign all buttons in one function
}

/*

** TEMP **

	document.querySelectorAll('div.tooltip.fade-out'); 3 -> length-1
	chrome.storage.local.get(null, function (e) { console.log(e); });
	location.reload(true);
	var index = songs[0].getAttribute('data-index');
*/
