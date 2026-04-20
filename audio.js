/**
 * WAVECRAFT — audio.js
 * Custom Audio Control Interface
 * Uses only standard HTML Web APIs (HTMLMediaElement + Web Audio API)
 * No external libraries or frameworks.
 */

// ─── DOM References ────────────────────────────────────────────────────────────
const audio         = document.getElementById('audioEl');
const fileInput     = document.getElementById('fileInput');
const loaderZone    = document.getElementById('loaderZone');
const loaderName    = document.getElementById('loaderFilename');
const playerCtrls   = document.getElementById('playerControls');
const playBtn       = document.getElementById('playBtn');
const skipBackBtn   = document.getElementById('skipBackBtn');
const skipFwdBtn    = document.getElementById('skipFwdBtn');
const muteBtn       = document.getElementById('muteBtn');
const loopBtn       = document.getElementById('loopBtn');
const volumeSlider  = document.getElementById('volumeSlider');
const volumeDisplay = document.getElementById('volumeDisplay');
const progressBar   = document.getElementById('progressBar');
const progressFill  = document.getElementById('progressFill');
const progressTrack = document.getElementById('progressTrack');
const currentTimeEl = document.getElementById('currentTime');
const durationEl    = document.getElementById('duration');
const statusDot     = document.getElementById('statusDot');
const statusText    = document.getElementById('statusText');
const speedDisplay  = document.getElementById('speedDisplay');
const speedBtns     = document.querySelectorAll('.speed-btn');
const visualizerEl  = document.getElementById('visualizer');
const toastEl       = document.getElementById('toast');

// ─── Visualizer Setup ─────────────────────────────────────────────────────────
const BAR_COUNT = 32;
const visBars = [];

(function buildVisualizer() {
  for (let i = 0; i < BAR_COUNT; i++) {
    const bar = document.createElement('div');
    bar.className = 'vis-bar';
    visualizerEl.appendChild(bar);
    visBars.push(bar);
  }
})();

// ─── Web Audio API — Analyser ─────────────────────────────────────────────────
let audioCtx, analyser, mediaSource, dataArray, animFrameId;

/**
 * Initialise the Web Audio API context and frequency analyser.
 * Called lazily on first play (browsers require user gesture).
 */
function initAnalyser() {
  if (audioCtx) return; // already initialised

  audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
  analyser  = audioCtx.createAnalyser();
  analyser.fftSize = 64; // 32 frequency bins

  mediaSource = audioCtx.createMediaElementSource(audio);
  mediaSource.connect(analyser);
  analyser.connect(audioCtx.destination);

  dataArray = new Uint8Array(analyser.frequencyBinCount);
}

/** Animate visualizer bars from live frequency data. */
function startVisualizer() {
  function draw() {
    animFrameId = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);

    visBars.forEach((bar, i) => {
      const amplitude = (dataArray[i] || 0) / 255;
      const height    = Math.max(2, amplitude * 36);
      const hue       = 60 + amplitude * 120; // yellow → green
      bar.style.height     = height + 'px';
      bar.style.background = `hsl(${hue}, 90%, 60%)`;
    });
  }
  draw();
}

/** Reset visualizer bars to idle state. */
function stopVisualizer() {
  cancelAnimationFrame(animFrameId);
  visBars.forEach(bar => {
    bar.style.height     = '2px';
    bar.style.background = 'var(--border)';
  });
}

// ─── File Loading ─────────────────────────────────────────────────────────────

/**
 * Load an audio File object into the player.
 * @param {File} file
 */
function loadFile(file) {
  if (!file || !file.type.startsWith('audio/')) {
    showToast('⚠ Not a valid audio file');
    return;
  }

  // Revoke any previous object URL to free memory
  if (audio.src && audio.src.startsWith('blob:')) {
    URL.revokeObjectURL(audio.src);
  }

  audio.src = URL.createObjectURL(file);
  audio.load();

  loaderZone.classList.add('has-file');
  loaderName.textContent = file.name;

  updateStatus('READY');
  showToast('✓ ' + file.name + ' loaded');
}

// Click to open file picker
loaderZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => loadFile(e.target.files[0]));

// Drag-and-drop support
loaderZone.addEventListener('dragover', e => {
  e.preventDefault();
  loaderZone.style.borderColor = 'var(--accent)';
});
loaderZone.addEventListener('dragleave', () => {
  loaderZone.style.borderColor = '';
});
loaderZone.addEventListener('drop', e => {
  e.preventDefault();
  loaderZone.style.borderColor = '';
  loadFile(e.dataTransfer.files[0]);
});

// ─── Playback Controls ────────────────────────────────────────────────────────

/** Toggle between play and pause. */
function togglePlay() {
  if (!audio.src) {
    showToast('⚠ No audio loaded');
    return;
  }

  // Initialise Web Audio API on first interaction (requires user gesture)
  initAnalyser();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  if (audio.paused) {
    audio.play();
    startVisualizer();
    updateStatus('PLAYING');
  } else {
    audio.pause();
    stopVisualizer();
    updateStatus('PAUSED');
  }
}

/** Update play/pause button label and status dot. */
function updatePlayButton() {
  if (audio.paused) {
    playBtn.textContent  = '▶ PLAY';
    playBtn.classList.remove('playing');
    statusDot.classList.remove('playing');
  } else {
    playBtn.textContent = '⏸ PAUSE';
    playBtn.classList.add('playing');
    statusDot.classList.add('playing');
  }
}

playBtn.addEventListener('click', togglePlay);
audio.addEventListener('play',  updatePlayButton);
audio.addEventListener('pause', updatePlayButton);

audio.addEventListener('ended', () => {
  stopVisualizer();
  updatePlayButton();
  updateStatus('ENDED');
});

// ─── Skip Forward / Backward ──────────────────────────────────────────────────
const SKIP_SECONDS = 10;

skipBackBtn.addEventListener('click', () => {
  audio.currentTime = Math.max(0, audio.currentTime - SKIP_SECONDS);
  showToast('← −' + SKIP_SECONDS + 's');
});

skipFwdBtn.addEventListener('click', () => {
  audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + SKIP_SECONDS);
  showToast('→ +' + SKIP_SECONDS + 's');
});

// ─── Progress Bar & Time Display ──────────────────────────────────────────────

audio.addEventListener('loadedmetadata', () => {
  durationEl.textContent = formatTime(audio.duration);
  progressBar.max        = audio.duration;
});

audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;

  const pct = (audio.currentTime / audio.duration) * 100;
  progressFill.style.width = pct + '%';
  progressBar.value        = audio.currentTime;
  currentTimeEl.textContent = formatTime(audio.currentTime);
});

// Seek via the hidden range input (dragging)
progressBar.addEventListener('input', () => {
  audio.currentTime = parseFloat(progressBar.value);
});

// Seek via click on the visible track
progressTrack.addEventListener('click', e => {
  if (!audio.duration) return;
  const rect = progressTrack.getBoundingClientRect();
  const frac = (e.clientX - rect.left) / rect.width;
  audio.currentTime = frac * audio.duration;
});

// ─── Volume Control ───────────────────────────────────────────────────────────

volumeSlider.addEventListener('input', () => {
  const vol = parseFloat(volumeSlider.value);
  audio.volume          = vol;
  volumeDisplay.textContent = Math.round(vol * 100) + '%';

  // Sync mute state with slider
  if (vol === 0) {
    audio.muted = true;
    setMuteUI(true);
  } else if (audio.muted) {
    audio.muted = false;
    setMuteUI(false);
  }
});

// ─── Mute / Unmute ────────────────────────────────────────────────────────────

/** Toggle mute on the audio element. */
function toggleMute() {
  audio.muted = !audio.muted;
  setMuteUI(audio.muted);
  showToast(audio.muted ? '🔇 Muted' : '🔊 Unmuted');
}

/**
 * Update the mute button appearance.
 * @param {boolean} isMuted
 */
function setMuteUI(isMuted) {
  if (isMuted) {
    muteBtn.textContent = '🔇 UNMUTE';
    muteBtn.classList.add('active', 'danger');
  } else {
    muteBtn.textContent = '🔊 MUTE';
    muteBtn.classList.remove('active', 'danger');
  }
}

muteBtn.addEventListener('click', toggleMute);

// ─── Loop / Repeat ────────────────────────────────────────────────────────────

loopBtn.addEventListener('click', () => {
  audio.loop = !audio.loop;
  loopBtn.classList.toggle('active', audio.loop);
  showToast(audio.loop ? '↺ Loop ON' : 'Loop OFF');
});

// ─── Playback Speed ───────────────────────────────────────────────────────────

speedBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const speed = parseFloat(btn.dataset.speed);
    audio.playbackRate       = speed;
    speedDisplay.textContent = speed + '×';

    speedBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    showToast('Speed: ' + speed + '×');
  });
});

// ─── Keyboard Controls ────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  // Ignore when typing in an input field
  const tag = document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  switch (e.code) {
    case 'Space':
      e.preventDefault();
      togglePlay();
      break;

    case 'KeyM':
      toggleMute();
      break;

    case 'KeyL':
      loopBtn.click();
      break;

    case 'ArrowLeft':
      e.preventDefault();
      skipBackBtn.click();
      break;

    case 'ArrowRight':
      e.preventDefault();
      skipFwdBtn.click();
      break;

    case 'ArrowUp':
      e.preventDefault();
      volumeSlider.value = Math.min(1, parseFloat(volumeSlider.value) + 0.05);
      volumeSlider.dispatchEvent(new Event('input'));
      break;

    case 'ArrowDown':
      e.preventDefault();
      volumeSlider.value = Math.max(0, parseFloat(volumeSlider.value) - 0.05);
      volumeSlider.dispatchEvent(new Event('input'));
      break;
  }
});

// ─── Utility Helpers ──────────────────────────────────────────────────────────

/**
 * Format seconds into M:SS string.
 * @param {number} seconds
 * @returns {string}
 */
function formatTime(seconds) {
  if (!isFinite(seconds)) return '0:00';
  const m   = Math.floor(seconds / 60);
  const s   = Math.floor(seconds % 60).toString().padStart(2, '0');
  return m + ':' + s;
}

/**
 * Update the status text label.
 * @param {string} msg
 */
function updateStatus(msg) {
  statusText.textContent = msg;
}

/** Toast notification timer handle. */
let toastTimer;

/**
 * Show a brief toast notification.
 * @param {string} message
 */
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
}
