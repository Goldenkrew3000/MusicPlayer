const log = console.log;

// Default Spotify URL (아이브 - Love Dive)
var gSpotifyUrl = "https://open.spotify.com/track/0Q5VnK2DYzRyfqQRJuUtvi?si=45c22498d42c4f93";

// Settings
var currentVolume = 0.5;
var playlistMode = 0; // 0 is single song mode, 1 is playlist mode
var cursorTimeout = 2000;

// Storage
var arrayTime = new Array();
var arrayWords = new Array();
var playlistLinks = new Array();
var totalLines = 0;
var isPlaying = 0;
var fullSongDuration = 0;
var currentDuration = 0;
var isInLoop = 0;
var isInPlaylistLoop = 0;
var USER_PlayUrl = "";

// Stuff to allow jumping around the playlist
var gAudioPlayer;
var currentSong = 0;
var manualJumpTrigger = false;

document.addEventListener('DOMContentLoaded', function() {
    // DOM is loaded
    log("DOM is loaded.");

    // Run function to hide cursor
    hideCursor();

    // Launch website
    websiteHandler();
});

async function hideCursor() {
    function resetCursorTimer() {
        clearTimeout(timeoutId);
        document.body.classList.remove('hideCursor');
        
        timeoutId = setTimeout(() => {
            document.body.classList.add('hideCursor');
        }, cursorTimeout);
      }

    document.addEventListener('mousemove', resetCursorTimer);
    document.addEventListener('keydown', resetCursorTimer);
}

async function websiteHandler() {
    USER_PlayUrl = prompt("Enter playlist/album/song url: ");
    if (USER_PlayUrl.includes("playlist")) {
        while (true) {
            playlistMode = 1;
            await runPlaylist(USER_PlayUrl);
        }
    } else if (USER_PlayUrl.includes("album")) {
        while (true) {
            playlistMode = 1;
            await runPlaylist(USER_PlayUrl);
        }
    } else if (USER_PlayUrl.includes("track")) {
        while (true) {
            playlistMode = 0;
            await runWebsite(USER_PlayUrl);
        }
    }
}

// This function is a debug command to jump to any song in the playlist
function jumpSong(songIndex) {
    log("DEBUG: Jumping song")
    songIndex -= 1;
    gAudioPlayer.pause();
    currentSong = songIndex;
    manualJumpTrigger = true;
    isInLoop = 0;
}
window.jumpSong = jumpSong;

async function runPlaylist(SpotifyURL) {
    isInPlaylistLoop = 1;
    var isPlaylist = 0; // For future use (0 = is album, 1 = is playlist)

    // Get album/playlist URL, and format an API URL
    //const USER_PlaylistUrl = prompt("Enter playlist/album url: ");
    var REQ_Url = "";
    if (SpotifyURL.includes("playlist")) {
        log("User entered playlist.");
        REQ_Url = `/playlist?url=${SpotifyURL}`
        isPlaylist = 1;
    } else {
        log("User entered album.");
        REQ_Url = `/album?url=${SpotifyURL}`
    }

    // Get API response, and put the song links into an array
    var RES_Api = await getApiResponse(REQ_Url);
    RES_Api = JSON.parse(RES_Api);
    for (let i = 0; i < RES_Api["total-songs"]; i++) {
        playlistLinks.push(RES_Api["songs"][i]["songLink"]);
    }

    // Play song (The extra stuff is for skipping around by debug command jumpSong())
    for (let i = 0; i < RES_Api["total-songs"]; i++) {
        log(`Loading song ${i}`)
        if (!manualJumpTrigger) {
            currentSong = i;
            await runWebsite(playlistLinks[currentSong]);
        } else {
            manualJumpTrigger = false;
            i = currentSong;
            await runWebsite(playlistLinks[currentSong]);
        }
    }

    // Wait for loop to exit
    return new Promise (resolve => {
        const checkVariable = () => {
            if (isInPlaylistLoop === 0) {
                log("Exiting playlist loop");
                resolve();
            } else {
                setTimeout(checkVariable, 200);
            }
        };
        checkVariable();
    });
}

// This function controls every part of the frontend. Just provide it a Spotify song URL
async function runWebsite(SpotifyURL) {
    log("In main function.");
    isInLoop = 1;
    isPlaying = 0;

    // Empty arrays
    arrayTime.length = 0;
    arrayWords.length = 0;
    
    // Get response from backend for spotify url
    const REQ_Url = `/getData?url=${SpotifyURL}`;
    const RES_Api = await getApiResponse(REQ_Url);
    const JSON_Api = JSON.parse(RES_Api);

    // Set background image
    const bannerUrl = JSON_Api["banner-url"];
    log(`Banner URL: ${bannerUrl}`)
    document.body.style.backgroundImage = `url(${bannerUrl})`;

    // Set album art image
    const albumArt = document.getElementById('albumArt');
    albumArt.src = bannerUrl;

    // Set title
    const titleSpan = document.getElementById('titleSpan');
    titleSpan.textContent = JSON_Api["song-name"];

    // Set artist
    const artistSpan = document.getElementById('artistSpan');
    artistSpan.textContent = JSON_Api["artist-name"];

    // Create objects for the lyrics and progress bar
    const progressedContainer = document.getElementById('progressedContainer');
    const lyricsA = document.getElementById('lyricsA');
    const lyricsB = document.getElementById('lyricsB');

    // Pull lyrics from JSON and put them in arrays
    for (let i = 0; i < JSON_Api["lyrics-count"]; i++) {
        arrayTime.push(JSON_Api["lyrics"]["lines"][i]["startTimeMs"]);
        arrayWords.push(JSON_Api["lyrics"]["lines"][i]["words"]);
    }
    totalLines = JSON_Api["lyrics-count"];

    // Create audio player
    const audioPlayer = document.getElementById('audioPlayer');
    audioPlayer.style.display = 'none';
    audioPlayer.src = JSON_Api["stream-url"];
    audioPlayer.volume = currentVolume;
    audioPlayer.addEventListener('loadedmetadata', () => {
        fullSongDuration = audioPlayer.duration * 1000;

        // If playlist mode is activated, automatically play song when loaded
        // Note: This is expected to fail the first song, due to autoplay protection
        if (playlistMode == 1) {
            audioPlayer.play();
        }
    });
    
    // Make global link to audio player object
    gAudioPlayer = audioPlayer;

    // Add pause button
    const pauseButton = document.getElementById('pauseButton');
    const pauseButtonHandler = () => {
        log("Pause button clicked.");
        if (isPlaying == 0) {
            audioPlayer.play();
            pauseButton.src = 'Images/btn_pause.png';
            isPlaying = 1;
        } else if (isPlaying == 1) {
            audioPlayer.pause();
            pauseButton.src = 'Images/btn_play.png';
            isPlaying = 0;
        }
    };
    pauseButton.addEventListener('click', pauseButtonHandler);

    // Create volume button
    const volumeButton = document.getElementById('volumeButton');
    const volumeButtonHandler = () => {
        log("Volume button clicked.");
        var userVolume = prompt("Volume (0 - 1): ");
        audioPlayer.volume = userVolume;
        currentVolume = userVolume;
    };
    volumeButton.addEventListener('click', volumeButtonHandler);

    // Create playlist button
    const playlistButton = document.getElementById('playlistButton');
    const playlistButtonHandler = () => {
        log("Playlist button clicked.");
        var userFile = prompt("Enter spotify url: ");
        gSpotifyUrl = userFile;
        USER_PlayUrl = userFile;
        audioPlayer.pause();
        isInLoop = 0;
    };
    playlistButton.addEventListener('click', playlistButtonHandler);

    // Create back button
    const backButton = document.getElementById('backButton');
    const backButtonHandler = () => {
        log("Back button clicked.");
        audioPlayer.currentTime -= 10;
    };
    backButton.addEventListener('click', backButtonHandler);

    // Create forward button
    const fastForwardButton = document.getElementById('fastForwardButton');
    const fastForwardHandler = () => {
        log("Fast forward button clicked.");
        audioPlayer.currentTime += 10;
    };
    fastForwardButton.addEventListener('click', fastForwardHandler);;

    // Create progress bar
    const progressBarContainer = document.getElementById('progressBarContainer');
    const progressBarHandler = () => {
        log("Progress bar clicked");
        const width = progressBarContainer.offsetWidth;
        const clickPos = event.offsetX;
        var progress = (clickPos / width);
        progress = progress.toFixed(4);
        const fullSong = audioPlayer.duration * 1000;
        audioPlayer.currentTime = (fullSong * progress) / 1000;
    }
    progressBarContainer.addEventListener('click', progressBarHandler);

    // Set the first 2 lines of lyrics
    lyricsA.textContent = arrayWords[0];
    lyricsB.textContent = arrayWords[1];

    // Run the runtime loop (Update every 200ms)
    const runtimeLoop = setInterval(() => {
        // Get current time in milliseconds
        currentDuration = Math.floor(audioPlayer.currentTime * 1000);

        // Update progress bar
        var currentDone = currentDuration / fullSongDuration * 100;
        currentDone = currentDone.toFixed(2);
        progressedContainer.style.width = `${currentDone}%`;

        // Check if the playback is paused and update (This can happen if paused from headphones / keyboard shortcuts)
        if (audioPlayer.paused) {
            pauseButton.src = 'Images/btn_play.png';
            isPlaying = 0;
        } else {
            pauseButton.src = 'Images/btn_pause.png';
            isPlaying = 1;
        }

        // Update lyrics on the go
        var closestIndex = 0;
        var minDifference = Infinity;
        for (let i = 0; i < totalLines; i++) {
            var difference = currentDuration - arrayTime[i];
            if (difference >= 0 && difference < minDifference) {
                minDifference = difference;
                closestIndex = i;
            }
        }
        if (closestIndex % 2 === 0) {
            lyricsA.textContent = arrayWords[closestIndex];
            lyricsB.textContent = arrayWords[closestIndex + 1];
        }

        // If playlist mode is activated, automatically exit this async function back to the playlist manager
        if (playlistMode == 1) {
            if (audioPlayer.currentTime >= audioPlayer.duration) {
                log("Song finished");
                audioPlayer.pause();
                isInLoop = 0;
            }
        }

        // Log progress in console
        log(`Current: ${currentDuration} ms / ${fullSongDuration} ms (${currentDone}%) - Closest Lyrics Index: ${closestIndex} - Play Status: ${isPlaying} - Loop: ${isInLoop}`);
    }, 200);

    // Wait for loop to exit
    return new Promise (resolve => {
        const checkVariable = () => {
            if (isInLoop === 0) {
                log("Exiting loop");

                // Remove Event Listeners
                volumeButton.removeEventListener('click', volumeButtonHandler);
                pauseButton.removeEventListener('click', pauseButtonHandler);
                fastForwardButton.removeEventListener('click', fastForwardHandler);
                backButton.removeEventListener('click', backButtonHandler);
                playlistButton.removeEventListener('click', playlistButtonHandler);
                progressBarContainer.removeEventListener('click', progressBarHandler);

                // Stop Runtime Loop
                clearInterval(runtimeLoop);
                resolve();
            } else {
                setTimeout(checkVariable, 200);
            }
        };
        checkVariable();
    });
}

// Function to get response from the backend
async function getApiResponse(url) {
    log(`Loading API ${url}`);

    return new Promise((resolve, reject) => {
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load api: ${response.status}`);
                }
                return response.text();
            })
            .then(componentHtml => {
                resolve(componentHtml);
            })
            .catch(error => {
                console.error(error);
                reject(error);
            });
    });
}
