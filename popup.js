// Viky AI — Premium Popup Script

(async function init() {
  const statusDot = document.getElementById('status-dot');
  const themeLabel = document.getElementById('theme-label');
  const themeBtn = document.getElementById('toggle-theme-mini');

  // Check auth status
  try {
    const token = await new Promise((resolve) => {
      chrome.identity.getAuthToken({ interactive: false }, (t) => resolve(t));
    });
    if (token) {
      statusDot.classList.remove('inactive');
      statusDot.setAttribute('title', 'Signed in');
    } else {
      statusDot.classList.add('inactive');
      statusDot.setAttribute('title', 'Offline');
    }
  } catch (e) {
    statusDot.classList.add('inactive');
  }

  // Theme read from storage
  chrome.storage.local.get(['theme'], (res) => {
    const isDark = res.theme !== 'light';
    themeLabel.textContent = isDark ? 'Dark Mode' : 'Light Mode';
  });

  // Toggle theme
  themeBtn.addEventListener('click', () => {
    chrome.storage.local.get(['theme'], (res) => {
      const next = res.theme === 'light' ? 'dark' : 'light';
      chrome.storage.local.set({ theme: next });
      themeLabel.textContent = next === 'light' ? 'Light Mode' : 'Dark Mode';
    });
  });

  // Open Side Panel
  document.getElementById('open-sidepanel').addEventListener('click', async () => {
    try {
      const win = await chrome.windows.getCurrent();
      await chrome.sidePanel.open({ windowId: win.id });
    } catch (e) {
      // Fallback: if API unavailable, open options or ignore
      console.warn('Side panel open failed', e);
    }
    window.close();
  });
})();
