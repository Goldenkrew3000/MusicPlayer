/*
// 밤공원 유튜브 Inspired Music Player
// 고은별 2023년 07월
*/

'use strict';

// NPM Imports
const request = require('sync-request');
const chalk = require('chalk');
const dotenv =  require('dotenv').config();
const express = require('express');
const { execSync } = require('child_process');

// Initialization
const exprapp = express();
const log = console.log;

// Settings
var EXPR_Port = 10001;
const API_Lyrics = "https://spotify-lyric-api.herokuapp.com/?url=";
const SPOTDL_Location = "~/.local/bin/spotdl url ";
const SPOTIFY_ClientID = process.env.SPOTIFY_ClientID;
const SPOTIFY_ClientSecret = process.env.SPOTIFY_ClientSecret;
const SPOTIFY_TokenURL = "https://accounts.spotify.com/api/token";
const SPOTIFY_TrackURL = "https://api.spotify.com/v1/tracks/";
const SPOTIFY_AlbumURL = "https://api.spotify.com/v1/albums/";
const SPOTIFY_PlaylistURL = "https://api.spotify.com/v1/playlists/";
var SPOTIFY_AccessToken = "";

// Functions
async function SPOT_ReqAccessToken(ClientID, ClientSecret) {
    (function asyncRequestToken() {
        log(chalk.magenta("Spotify: Requesting Access Token..."));
        const RES_Spotify = request('POST', SPOTIFY_TokenURL, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `grant_type=client_credentials&client_id=${ClientID}&client_secret=${ClientSecret}`
        });
        SPOTIFY_AccessToken = JSON.parse(RES_Spotify.getBody('utf-8'))["access_token"];
        log(chalk.green("Spotify: Received Access Token."));
        setTimeout(asyncRequestToken, 2700000); // 45분
    })();
}

function SPOT_ReqTrackInfo(AuthToken, SongID) {
    log(chalk.magenta(`Spotify: Requesting info on song ${SongID}`));
    const URL_Spotify = SPOTIFY_TrackURL + SongID + "?locale=ko_KR";
    const RES_Spotify = request('GET', URL_Spotify, {
        headers: {
            'Authorization': `Bearer ${AuthToken}`
        }
    });
    log(chalk.green("Spotify: Received song info."));
    return RES_Spotify.getBody('utf-8');
}

function SPOT_ReqAlbumInfo(AuthToken, AlbumID) {
    log(chalk.magenta(`Spotify: Requesting info on album ${AlbumID}`));
    const URL_Spotify = SPOTIFY_AlbumURL + AlbumID + "?locale=ko_KR";
    const RES_Spotify = request('GET', URL_Spotify, {
        headers: {
            'Authorization': `Bearer ${AuthToken}`
        }
    });
    log(chalk.green("Spotify: Received album info."));
    return RES_Spotify.getBody('utf-8');
}

function SPOT_ReqPlaylistInfo(AuthToken, PlaylistID) {
    log(chalk.magenta(`Spotify: Requesting info on playlist ${PlaylistID}`));
    const URL_Spotify = SPOTIFY_PlaylistURL + PlaylistID + "?locale=ko_KR";
    const RES_Spotify = request('GET', URL_Spotify, {
        headers: {
            'Authorization': `Bearer ${AuthToken}`
        }
    });
    log(chalk.green("Spotify: Received playlist info."));
    return RES_Spotify.getBody('utf-8');
}

function separateTrack(URL) {
    var URL_Split = URL.split('/');
    URL_Split = URL_Split[URL_Split.length - 1]
    URL_Split = URL_Split.split('?');
    URL_Split = URL_Split[0];
    return URL_Split;
}

// Program Start
log("Music Player Starting");

// Start async spotify access token
SPOT_ReqAccessToken(SPOTIFY_ClientID, SPOTIFY_ClientSecret);

// Express Functions
exprapp.listen(EXPR_Port, () => {
    log(chalk.green(`Express: Listening on port ${EXPR_Port}`));
});

// Serve Frontend
exprapp.use(express.static('frontend'));

// Get Data Function /getData?url=<Spotify Song URL>
exprapp.get('/getData', (req, res) => {
    // Get song URL from URL
    var USER_SpotifyUrl = req.query.url;
    log(chalk.green(`Express: getData Called, URL: ${USER_SpotifyUrl}`));

    // Get Lyrics
    log(chalk.magenta("Fetching Lyrics..."));
    const URL_Lyrics = API_Lyrics + USER_SpotifyUrl;
    var RES_Lyrics = "";
    try {
        const REQ_Lyrics = request('GET', URL_Lyrics);
        RES_Lyrics = REQ_Lyrics.getBody('utf-8');
        RES_Lyrics = JSON.parse(RES_Lyrics);
        log(chalk.green("Found Lyrics."));
    } catch {
        var OBJ_LyricsTemp = {};
        OBJ_LyricsTemp["syncType"] = "ERROR";
        var OBJ_LinesTemp = [];
        var OBJ_LyricsTempB = {};
        OBJ_LyricsTempB["startTimeMs"] = "0";
        OBJ_LyricsTempB["words"] = "이 노래 가사는 읽 수 없어요.";
        OBJ_LinesTemp.push(OBJ_LyricsTempB);
        OBJ_LyricsTemp["lines"] = OBJ_LinesTemp;
        RES_Lyrics = OBJ_LyricsTemp;
        log(chalk.red("Did not find lyrics."));
    }
    // RES_Lyrics has a JSON object that contains the lyrics

    // Get Stream URL
    log(chalk.magenta("Fetching Stream URL..."));
    const SPOTDL_Command = SPOTDL_Location + USER_SpotifyUrl;
    var SPOTDL_Res = execSync(SPOTDL_Command);
    SPOTDL_Res = SPOTDL_Res.toString();
    SPOTDL_Res = SPOTDL_Res.split('\n');
    for (let i = 0; i < SPOTDL_Res.length; i++) {
        if (SPOTDL_Res[i].startsWith("https://")) {
            if (SPOTDL_Res[i].startsWith("https://open.spotify.com")) {
                // Do nothing, wait for next URL
            } else {
                log(chalk.green(`Found Stream URL.`));
                SPOTDL_Res = SPOTDL_Res[i];
            }
        }
    }
    // SPOTDL_Res has the raw URL as a string

    // Get Name, Artist, and Banner
    const SPOT_TrackID = separateTrack(USER_SpotifyUrl);
    var RES_SpotTrackInfo = SPOT_ReqTrackInfo(SPOTIFY_AccessToken, SPOT_TrackID)
    RES_SpotTrackInfo = JSON.parse(RES_SpotTrackInfo);
    const SONG_ArtistName = RES_SpotTrackInfo["album"]["artists"][0]["name"];
    const SONG_Name = RES_SpotTrackInfo["name"];
    const SONG_BannerURL = RES_SpotTrackInfo["album"]["images"][0]["url"];
    log(chalk.yellow(`Song is ${SONG_Name} by ${SONG_ArtistName}`));

    // Format Lyrics
    const COUNT_Lyrics = RES_Lyrics["lines"].length;
    var OBJ_Lyrics = {};
    OBJ_Lyrics["syncType"] = RES_Lyrics["syncType"];
    var OBJ_LyricLines = [];
    for (let i = 0; i < COUNT_Lyrics; i++) {
        var OBJ_Temp = {};
        OBJ_Temp["startTimeMs"] = RES_Lyrics["lines"][i]["startTimeMs"];
        OBJ_Temp["words"] = RES_Lyrics["lines"][i]["words"];
        OBJ_LyricLines.push(OBJ_Temp);
    }
    OBJ_Lyrics["lines"] = OBJ_LyricLines;

    // Finalize data and send to frontend
    var OBJ_Final = {};
    OBJ_Final["song-name"] = SONG_Name;
    OBJ_Final["artist-name"] = SONG_ArtistName;
    OBJ_Final["banner-url"] = SONG_BannerURL;
    OBJ_Final["stream-url"] = SPOTDL_Res;
    OBJ_Final["lyrics"] = OBJ_Lyrics;
    OBJ_Final["lyrics-count"] = COUNT_Lyrics;
    log(chalk.green("Express: getData has sent response."));
    res.send(OBJ_Final);
});

// Split album into individual songs /album?url=<Spotify Album URL>
exprapp.get('/album', (req, res) => {
    // Get album URL from URL
    var USER_SpotifyUrl = req.query.url;
    log(chalk.green(`Express: album Called, URL: ${USER_SpotifyUrl}`));

    // Get Song list from Album
    const AlbumID = separateTrack(USER_SpotifyUrl);
    var RES_Album = SPOT_ReqAlbumInfo(SPOTIFY_AccessToken, AlbumID);
    RES_Album = JSON.parse(RES_Album);
    const COUNT_Album = RES_Album["total_tracks"];
    var JSON_Res = {};
    var JSON_ArrayTemp = [];
    JSON_Res["name"] = RES_Album["name"];
    JSON_Res["label"] = RES_Album["label"];
    JSON_Res["banner-url"] = RES_Album["images"][0]["url"];
    JSON_Res["total-songs"] = COUNT_Album;
    for (let i = 0; i < COUNT_Album; i++) {
        var JSON_SongTemp = {};
        JSON_SongTemp["songId"] = RES_Album["tracks"]["items"][i]["id"];
        JSON_SongTemp["songLink"] = RES_Album["tracks"]["items"][i]["external_urls"]["spotify"];
        JSON_ArrayTemp.push(JSON_SongTemp);
    }
    JSON_Res["songs"] = JSON_ArrayTemp;
    log(chalk.green("Express: /album has sent response."));
    res.send(JSON_Res);
});

// Split playlist into individual songs /playlist?url=<Spotify Playlist URL>
exprapp.get('/playlist', (req, res) => {
    // Get playlist URL from URL
    var USER_SpotifyUrl = req.query.url;
    log(chalk.green(`Express: playlist Called, URL: ${USER_SpotifyUrl}`));

    // Get Song list from Playlist
    const PlaylistID = separateTrack(USER_SpotifyUrl);
    var RES_Playlist = SPOT_ReqPlaylistInfo(SPOTIFY_AccessToken, PlaylistID);
    RES_Playlist = JSON.parse(RES_Playlist);
    var COUNT_Playlist = RES_Playlist["tracks"]["total"];
    if (COUNT_Playlist >= 100) { COUNT_Playlist = 100; } // Spotify's API limits the API view to 100
    var JSON_Res = {};
    var JSON_ArrayTemp = [];
    JSON_Res["name"] = RES_Playlist["name"];
    JSON_Res["description"] = RES_Playlist["description"];
    JSON_Res["owner-name"] = RES_Playlist["owner"]["display_name"];
    JSON_Res["owner-url"] = RES_Playlist["owner"]["external_urls"]["spotify"];
    JSON_Res["banner-url"] = RES_Playlist["images"][0]["url"];
    JSON_Res["total-songs"] = COUNT_Playlist;
    for (let i = 0; i < COUNT_Playlist; i++) {
        if (i >= 100) { break; } // Spotify's API limits the API view to 100
        var JSON_SongTemp = {};
        JSON_SongTemp["songId"] = RES_Playlist["tracks"]["items"][i]["track"]["id"];
        JSON_SongTemp["songLink"] = RES_Playlist["tracks"]["items"][i]["track"]["external_urls"]["spotify"];
        JSON_ArrayTemp.push(JSON_SongTemp);
    }
    JSON_Res["songs"] = JSON_ArrayTemp;
    log(chalk.green("Express: /playlist has sent response."));
    res.send(JSON_Res);
})
