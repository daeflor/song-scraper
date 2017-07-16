//TODO could change var to window
var TabManager = function()
{
    var currentTab;
    var playlistName;
    var key;
    var backupKey = chrome.runtime.id + '_Backup';
    var currentTrackCount;

    return { 
        GetTab : function()
        {
            return currentTab; 
        },
        GetPlaylistName : function()
        {
            return playlistName;
        },
        GetKey : function()
        {
            return key; 
        },
        GetBackupKey : function()
        {
            return backupKey; 
        },
        GetCurrentTrackCount : function()
        {
            return currentTrackCount; 
        },
        SetTab : function(tab)
        {
            currentTab = tab;
        },
        SetPlaylistName : function(name)
        {
            playlistName = name;
            key = chrome.runtime.id + '_Playlist_\'' + playlistName + '\'';
            console.log("Playlist name set to: " + playlistName + ". Key set to: " + key);
        },
        SetCurrentTrackCount : function(count)
        {
            currentTrackCount = count;
        }
    };
}();