/**
 * audio.js
 * Audio player — standard HTMLMediaElement API only, no libraries.
 */

const audio        = document.getElementById('audioEl');
const fileInput    = document.getElementById('fileInput');
const loaderZone   = document.getElementById('loaderZone');
const loaderName   = document.getElementById('loaderFilename');
const playBtn      = document.getElementById('playBtn');
const skipBackBtn  = document.getElementById('skipBackBtn');
const skipFwdBtn   = document.getElementById('skipFwdBtn');
const muteBtn      = document.getElementById('muteBtn');
const loopBtn      = document.getElementById('loopBtn');
const volumeSlider = document.getElementById('volumeSlider');
const volumeVal    = document.getElementById('volumeVal');
const speedSelect  = document.getElementById('speedSelect');
const seekBar      = document.getElementById('seekBar');
const currentTimeEl= document.getElementById('currentTime');
const durationEl   = document.getElementById('duration');
const statusText   = document.getElementById('statusText');

// ── File loading ──────────────────────────────────────────────────────────────

function loadFile(file) {
  if (!file || !file.type.startsWith('audio/')) {
    setStatus('Not a valid audio file.');
    return;
  }
  if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
  audio.src = URL.createObjectURL(file);
  audio.load();
  loaderZone.classList.add('loaded');
  loaderName.textContent = file.name;
  setStatus('Loaded: ' + file.name);
}

// File picker — <label> wrapping the <input> already handles clicks natively.
// We only need to listen for the change event.
fileInput.addEventListener('change', function () {
  if (this.files.length) loadFile(this.files[0]);
});

// Drag-and-drop
loaderZone.addEventListener('dragover', function (e) {
  e.preventDefault();
  e.stopPropagation();
  this.style.background = '#f0f0f0';
});
loaderZone.addEventListener('dragleave', function (e) {
  e.stopPropagation();
  this.style.background = '';
});
loaderZone.addEventListener('drop', function (e) {
  e.preventDefault();
  e.stopPropagation();
  this.style.background = '';
  if (e.dataTransfer.files.length) loadFile(e.dataTransfer.files[0]);
});

// ── Play / Pause ──────────────────────────────────────────────────────────────

function togglePlay() {
  if (!audio.src) { setStatus('No file loaded.'); return; }
  if (audio.paused) { audio.play(); } else { audio.pause(); }
}

playBtn.addEventListener('click', togglePlay);

audio.addEventListener('play', function () {
  playBtn.textContent = '⏸ Pause';
  playBtn.classList.add('active');
  setStatus('Playing');
});
audio.addEventListener('pause', function () {
  playBtn.textContent = '▶ Play';
  playBtn.classList.remove('active');
  setStatus('Paused');
});
audio.addEventListener('ended', function () {
  playBtn.textContent = '▶ Play';
  playBtn.classList.remove('active');
  setStatus('Ended');
});

// ── Skip ─────────────────────────────────────────────────────────────────────

skipBackBtn.addEventListener('click', function () {
  audio.currentTime = Math.max(0, audio.currentTime - 10);
});
skipFwdBtn.addEventListener('click', function () {
  audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
});

// ── Seek bar ──────────────────────────────────────────────────────────────────

audio.addEventListener('loadedmetadata', function () {
  seekBar.max = audio.duration;
  durationEl.textContent = fmt(audio.duration);
});
audio.addEventListener('timeupdate', function () {
  if (!audio.duration) return;
  seekBar.value = audio.currentTime;
  currentTimeEl.textContent = fmt(audio.currentTime);
});
seekBar.addEventListener('input', function () {
  audio.currentTime = parseFloat(this.value);
});

// ── Volume ────────────────────────────────────────────────────────────────────

volumeSlider.addEventListener('input', function () {
  var v = parseFloat(this.value);
  audio.volume = v;
  volumeVal.textContent = Math.round(v * 100) + '%';
  if (v === 0) {
    audio.muted = true;
    muteBtn.textContent = 'Unmute';
    muteBtn.classList.add('active');
  } else if (audio.muted) {
    audio.muted = false;
    muteBtn.textContent = 'Mute';
    muteBtn.classList.remove('active');
  }
});

// ── Mute ─────────────────────────────────────────────────────────────────────

function toggleMute() {
  audio.muted = !audio.muted;
  muteBtn.textContent = audio.muted ? 'Unmute' : 'Mute';
  muteBtn.classList.toggle('active', audio.muted);
  setStatus(audio.muted ? 'Muted' : 'Unmuted');
}
muteBtn.addEventListener('click', toggleMute);

// ── Loop ─────────────────────────────────────────────────────────────────────

loopBtn.addEventListener('click', function () {
  audio.loop = !audio.loop;
  loopBtn.classList.toggle('active', audio.loop);
  setStatus('Loop: ' + (audio.loop ? 'On' : 'Off'));
});

// ── Speed ─────────────────────────────────────────────────────────────────────

speedSelect.addEventListener('change', function () {
  audio.playbackRate = parseFloat(this.value);
  setStatus('Speed: ' + this.value + '×');
});

// ── Keyboard controls ─────────────────────────────────────────────────────────

document.addEventListener('keydown', function (e) {
  var tag = document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

  if (e.code === 'Space')      { e.preventDefault(); togglePlay(); }
  else if (e.code === 'KeyM')  { toggleMute(); }
  else if (e.code === 'KeyL')  { loopBtn.click(); }
  else if (e.code === 'ArrowLeft')  { e.preventDefault(); skipBackBtn.click(); }
  else if (e.code === 'ArrowRight') { e.preventDefault(); skipFwdBtn.click(); }
  else if (e.code === 'ArrowUp') {
    e.preventDefault();
    volumeSlider.value = Math.min(1, parseFloat(volumeSlider.value) + 0.05);
    volumeSlider.dispatchEvent(new Event('input'));
  } else if (e.code === 'ArrowDown') {
    e.preventDefault();
    volumeSlider.value = Math.max(0, parseFloat(volumeSlider.value) - 0.05);
    volumeSlider.dispatchEvent(new Event('input'));
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(s) {
  if (!isFinite(s)) return '0:00';
  var m   = Math.floor(s / 60);
  var sec = Math.floor(s % 60).toString().padStart(2, '0');
  return m + ':' + sec;
}

function setStatus(msg) {
  statusText.textContent = 'Status: ' + msg;
}
