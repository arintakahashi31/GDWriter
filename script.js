/**
 * GD Writer — Core Logic
 * Handles real-time metrics, auto-save, background management, UI adjustments, and exports.
 */

// Storage Keys
const STORAGE_TEXT = 'gd_writer_content';
const STORAGE_FONT = 'gd_writer_font_size';
const STORAGE_BLUR = 'gd_writer_bg_blur';
const STORAGE_BRIGHTNESS = 'gd_writer_bg_brightness';
const STORAGE_BG = 'gd_writer_custom_bg';

// DOM Element References
const editor = document.getElementById('editor');
const bgLayer = document.getElementById('bg-layer');
const appShell = document.getElementById('app-shell');
const bgUploadInput = document.getElementById('bg-upload-input');
const sliderBlur = document.getElementById('slider-blur');
const sliderBright = document.getElementById('slider-bright');
const btnFontInc = document.getElementById('btn-font-inc');
const btnFontDec = document.getElementById('btn-font-dec');
const fontSizeIndicator = document.getElementById('font-size-indicator');
const statWords = document.getElementById('stat-words');
const statChars = document.getElementById('stat-chars');
const saveStatus = document.getElementById('save-status');
const btnFocusToggle = document.getElementById('btn-focus-toggle');
const btnExitFocus = document.getElementById('btn-exit-focus');
const btnExportTxt = document.getElementById('btn-export-txt');
const btnExportHtml = document.getElementById('btn-export-html');

let currentFontSize = 18;
let autoSaveTimer = null;

// Initialize Application State
function initApp() {
  loadSavedContent();
  loadBackgroundSettings();
  loadFontSize();
  updateWordStats();
  registerServiceWorker();
}

// 1. Content Management & Autosave
function loadSavedContent() {
  const savedContent = localStorage.getItem(STORAGE_TEXT);
  if (savedContent !== null) {
    editor.value = savedContent;
  }
}

function triggerAutoSave() {
  saveStatus.textContent = 'Saving...';
  saveStatus.style.color = '#f59e0b';

  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    localStorage.setItem(STORAGE_TEXT, editor.value);
    saveStatus.textContent = 'Saved';
    saveStatus.style.color = '#10b981';
  }, 1000);
}

// 2. Metrics (Word & Character Counter)
function updateWordStats() {
  const text = editor.value.trim();
  const characters = editor.value.length;
  const words = text === '' ? 0 : text.split(/\s+/).filter(Boolean).length;

  statWords.textContent = words;
  statChars.textContent = characters;
}

editor.addEventListener('input', () => {
  updateWordStats();
  triggerAutoSave();
});

// 3. Background Controls & Custom Upload
function loadBackgroundSettings() {
  const savedBg = localStorage.getItem(STORAGE_BG);
  const savedBlur = localStorage.getItem(STORAGE_BLUR) || '8';
  const savedBright = localStorage.getItem(STORAGE_BRIGHTNESS) || '60';

  if (savedBg) {
    bgLayer.style.backgroundImage = `url(${savedBg})`;
  }

  sliderBlur.value = savedBlur;
  sliderBright.value = savedBright;
  applyBackgroundFilters(savedBlur, savedBright);
}

function applyBackgroundFilters(blurVal, brightVal) {
  document.documentElement.style.setProperty('--bg-blur', `${blurVal}px`);
  document.documentElement.style.setProperty('--bg-brightness', `${brightVal}%`);
}

sliderBlur.addEventListener('input', (e) => {
  const val = e.target.value;
  document.documentElement.style.setProperty('--bg-blur', `${val}px`);
  localStorage.setItem(STORAGE_BLUR, val);
});

sliderBright.addEventListener('input', (e) => {
  const val = e.target.value;
  document.documentElement.style.setProperty('--bg-brightness', `${val}%`);
  localStorage.setItem(STORAGE_BRIGHTNESS, val);
});

// Handle phone gallery upload & base64 storage
bgUploadInput.addEventListener('change', function () {
  const file = this.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (event) {
      const base64Image = event.target.result;
      try {
        localStorage.setItem(STORAGE_BG, base64Image);
        bgLayer.style.backgroundImage = `url(${base64Image})`;
      } catch (err) {
        alert('Image is too large to save in local storage. Please pick a smaller image or compressed wallpaper.');
      }
    };
    reader.readAsDataURL(file);
  }
});

// 4. Font Sizing Controls
function loadFontSize() {
  const savedSize = localStorage.getItem(STORAGE_FONT);
  if (savedSize) {
    currentFontSize = parseInt(savedSize, 10);
  }
  applyFontSize(currentFontSize);
}

function applyFontSize(size) {
  document.documentElement.style.setProperty('--editor-font-size', `${size}px`);
  fontSizeIndicator.textContent = `${size}px`;
  localStorage.setItem(STORAGE_FONT, size);
}

btnFontInc.addEventListener('click', () => {
  if (currentFontSize < 36) {
    currentFontSize += 2;
    applyFontSize(currentFontSize);
  }
});

btnFontDec.addEventListener('click', () => {
  if (currentFontSize > 12) {
    currentFontSize -= 2;
    applyFontSize(currentFontSize);
  }
});

// 5. Fullscreen Focus Mode
function toggleFocusMode(enable) {
  if (enable) {
    appShell.classList.add('focus-mode');
    btnExitFocus.classList.remove('hidden');
  } else {
    appShell.classList.remove('focus-mode');
    btnExitFocus.classList.add('hidden');
  }
}

btnFocusToggle.addEventListener('click', () => toggleFocusMode(true));
btnExitFocus.addEventListener('click', () => toggleFocusMode(false));

// 6. Export Handlers
function downloadFile(filename, mimeType, content) {
  const blob = new Blob([content], { type: mimeType });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}

btnExportTxt.addEventListener('click', () => {
  const text = editor.value;
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadFile(`GD-Writer-${timestamp}.txt`, 'text/plain;charset=utf-8', text);
});

btnExportHtml.addEventListener('click', () => {
  const text = editor.value.replace(/\n/g, '<br/>');
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>GD Writer Document</title>
<style>
  body { font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #222; }
</style>
</head>
<body>
  ${text}
</body>
</html>`;
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadFile(`GD-Writer-${timestamp}.html`, 'text/html;charset=utf-8', htmlContent);
});

// 7. Offline Service Worker Registration
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    });
  }
}

// Start application
initApp();

