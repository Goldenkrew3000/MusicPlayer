API Map:

GET: /getData?url=<Spotify Song URL>
RES:
{
    "banner-url": "<Direct link to image of banner>",
    "stream-url": "<Direct link to song stream>",
    "song-name": "Song name",
    "artist-name": "Artist name",
    "lyrics": {
        "syncType": "<Whether the lyrics are matched to timings or not>",
        "lines": [
            {
                "startTimeMs": "5000",
                "words": "말들"
            }
        ]
    },
    "lyrics-count": "How many lines"
}

GET: /album?url=<Spotify Album URL>
RES:
{
    "label": "<Label of album>",
    "name": "<Name of album>",
    "banner-url": "<Direct link to image of banner>",
    "total-songs": "<Number of songs>",
    "songs": [
        {
            "songId": "<Spotify ID of individual song>",
            "songLink": "<Spotify URL of individual song>"
        }
    ]
}

GET: /playlist?url=<Spotify Playlist URL>
RES:
{
    "name": "<Playlist Name>",
    "description": "<Playlist Description>",
    "owner-name": "<Name of playlist owner's account>",
    "owner-url": "<URL to playlist owner's account>",
    "banner-url": "<Direct link to image of banner>",
    "total-songs": "<Number of songs>",
    "songs": [
        {
            "songId": "<Spotify ID of individual song>",
            "songList": "<Spotify URL of individual song>"
        }
    ]
}
