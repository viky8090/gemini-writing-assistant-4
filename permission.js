// permission.js - Prompt browser microphone access dialog

document.addEventListener('DOMContentLoaded', () => {
    const requestBtn = document.getElementById('request-btn');
    const statusAlert = document.getElementById('status-alert');
    const descText = document.getElementById('description-text');

    async function requestMicrophone() {
        statusAlert.style.display = 'none';
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Permission granted! Stop all tracks immediately and close tab.
            stream.getTracks().forEach(track => track.stop());
            window.close();
        } catch (err) {
            console.error('Microphone permission request failed:', err);
            statusAlert.style.display = 'block';
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                statusAlert.innerHTML = `<strong>Permission Denied:</strong> Microphone access was blocked. Please click the site settings/microphone icon in the address bar (top left of Chrome), toggle access to 'Allow', and click 'Request Access' to retry.`;
            } else {
                statusAlert.innerHTML = `<strong>Error requesting access:</strong> ${err.message}. Please verify your device microphone is connected.`;
            }
        }
    }

    // Auto-trigger request on load
    requestMicrophone();

    // Click handler to retry
    if (requestBtn) {
        requestBtn.addEventListener('click', requestMicrophone);
    }
});
