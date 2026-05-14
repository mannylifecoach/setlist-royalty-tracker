const apiUrlInput = document.getElementById('apiUrl') as HTMLInputElement;
const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
const advancedFillCheckbox = document.getElementById('advancedFillEnabled') as HTMLInputElement;
const saveBtn = document.getElementById('save')!;
const testBtn = document.getElementById('test')!;
const statusEl = document.getElementById('status')!;

// Load saved settings
chrome.storage.local.get(['apiKey', 'apiUrl', 'advancedFillEnabled'], (result) => {
  if (result.apiUrl) apiUrlInput.value = result.apiUrl;
  if (result.apiKey) apiKeyInput.value = result.apiKey;
  // Default to true (advanced fill ON) for new installs — undefined means
  // "never set", treat as enabled.
  advancedFillCheckbox.checked = result.advancedFillEnabled !== false;
});

// Persist the toggle immediately on change — no Save click needed for it.
advancedFillCheckbox.addEventListener('change', () => {
  chrome.storage.local.set({ advancedFillEnabled: advancedFillCheckbox.checked });
});

saveBtn.addEventListener('click', () => {
  const apiUrl = apiUrlInput.value.trim().replace(/\/$/, '');
  const apiKey = apiKeyInput.value.trim();

  if (!apiUrl) {
    statusEl.className = 'status-error';
    statusEl.textContent = 'App URL is required';
    return;
  }

  if (!apiKey) {
    statusEl.className = 'status-error';
    statusEl.textContent = 'API key is required';
    return;
  }

  chrome.storage.local.set(
    { apiUrl, apiKey, advancedFillEnabled: advancedFillCheckbox.checked },
    () => {
      statusEl.className = 'status-success';
      statusEl.textContent = 'Settings saved';
      setTimeout(() => {
        statusEl.textContent = '';
      }, 2000);
    }
  );
});

testBtn.addEventListener('click', async () => {
  // Save first
  const apiUrl = apiUrlInput.value.trim().replace(/\/$/, '');
  const apiKey = apiKeyInput.value.trim();

  if (!apiUrl || !apiKey) {
    statusEl.className = 'status-error';
    statusEl.textContent = 'Fill in both fields first';
    return;
  }

  await chrome.storage.local.set({ apiUrl, apiKey });

  statusEl.className = 'status-info';
  statusEl.textContent = 'Testing connection...';

  const response = await chrome.runtime.sendMessage({ type: 'TEST_CONNECTION' });

  if (response?.success) {
    statusEl.className = 'status-success';
    statusEl.textContent = 'Connection successful!';
  } else {
    statusEl.className = 'status-error';
    statusEl.textContent = `Connection failed: ${response?.error || 'Unknown error'}`;
  }
});
