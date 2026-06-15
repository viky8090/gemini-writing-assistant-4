// Viky AI — YouTube Main World Bridge
// Runs in the MAIN world (page context) to access YouTube's internal player API.
// Communicates with content script via window.postMessage (avoids structured cloning issues with CustomEvent).
(function () {
  'use strict';

  function getPlayerData() {
    let data = null;

    // Method 1: Direct player API
    try {
      const player = document.getElementById('movie_player');
      if (player && typeof player.getPlayerResponse === 'function') {
        const resp = player.getPlayerResponse();
        if (resp) {
          // Extract only what we need — avoids structured cloning failures
          data = JSON.parse(JSON.stringify({
            videoDetails: resp.videoDetails || null,
            captions: resp.captions || null
          }));
        }
      }
    } catch (e) {
      console.warn('[Viky AI] getPlayerResponse failed:', e.message);
    }

    // Method 2: Global ytInitialPlayerResponse
    if (!data) {
      try {
        if (typeof ytInitialPlayerResponse !== 'undefined' && ytInitialPlayerResponse) {
          data = JSON.parse(JSON.stringify({
            videoDetails: ytInitialPlayerResponse.videoDetails || null,
            captions: ytInitialPlayerResponse.captions || null
          }));
        }
      } catch (e) {
        console.warn('[Viky AI] ytInitialPlayerResponse read failed:', e.message);
      }
    }

    // Method 3: ytplayer.config.args (older YouTube pages)
    if (!data) {
      try {
        if (typeof ytplayer !== 'undefined' && ytplayer?.config?.args?.raw_player_response) {
          const resp = ytplayer.config.args.raw_player_response;
          data = JSON.parse(JSON.stringify({
            videoDetails: resp.videoDetails || null,
            captions: resp.captions || null
          }));
        }
      } catch (e) {
        console.warn('[Viky AI] ytplayer.config fallback failed:', e.message);
      }
    }

    return data;
  }

  // Listen for requests from content script (via CustomEvent)
  document.addEventListener('VikyRequestPlayerResponse', () => {
    const data = getPlayerData();
    // Use window.postMessage with a known type tag — reliable across worlds
    window.postMessage({ type: 'VIKY_PLAYER_RESPONSE', payload: data }, '*');
  });
})();
