
const audio         = document.getElementById('audioEl');
const fileInput     = document.getElementById('fileInput');
const loaderZone    = document.getElementById('loaderZone');
const loaderFilename= document.getElementById('loaderFilename');
const playBtn       = document.getElementById('playBtn');
const skipBackBtn   = document.getElementById('skipBackBtn');
const skipFwdBtn    = document.getElementById('skipFwdBtn');
const muteBtn       = document.getElementById('muteBtn');
const loopBtn       = document.getElementById('loopBtn');
const volumeSlider  = document.getElementById('volumeSlider');
const volumeVal     = document.getElementById('volumeVal');
const speedSelect   = document.getElementById('speedSelect');
const seekBar       = document.getElementById('seekBar');
const currentTimeEl = document.getElementById('currentTime');
const durationEl    = document.getElementById('duration');
const statusText    = document.getElementById('statusText');
───

function loadFile(file) {
  if (!file || !file.type.startsWith('audio/')) {
    setStatus('Not a valid audio file.');
    return;
  }
  if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
  audio.src = URL.createObjectURL(file);
  audio.load();
  loaderZone.classList.add('has-file');
  loaderFilename.textContent = file.name;
  setStatus('Loaded: ' + file.name);
}

loaderZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => loadFile(e.target.files[0]));

loaderZone.addEventListener('dragover', e => {
  e.preventDefault();
  loaderZone.style.background = '#f0f0f0';
});
loaderZone.addEventListener('dragleave', () => {
  loaderZone.style.background = '';
});
loaderZone.addEventListener('drop', e => {
  e.preventDefault();
  loaderZone.style.background = '';
  loadFile(e.dataTransfer.files[0]);
});



function togglePlay() {
  if (!audio.src) { setStatus('No file loaded.'); return; }
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
}

audio.addEventListener('play', () => {
  playBtn.textContent = '⏸ Pause';
  playBtn.classList.add('active');
  setStatus('Playing');
});

audio.addEventListener('pause', () => {
  playBtn.textContent = '▶ Play';
  playBtn.classList.remove('active');
  setStatus('Paused');
});

audio.addEventListener('ended', () => {
  playBtn.textContent = '▶ Play';
  playBtn.classList.remove('active');
  setStatus('Ended');
});

playBtn.addEventListener('click', togglePlay);



skipBackBtn.addEventListener('click', () => {
  audio.currentTime = Math.max(0, audio.currentTime - 10);
});

skipFwdBtn.addEventListener('click', () => {
  audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
});

audio.addEventListener('loadedmetadata', () => {
  durationEl.textContent = formatTime(audio.duration);
  seekBar.max = audio.duration;
});

audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  seekBar.value = audio.currentTime;
  currentTimeEl.textContent = formatTime(audio.currentTime);
});

seekBar.addEventListener('input', () => {
  audio.currentTime = parseFloat(seekBar.value);
});



volumeSlider.addEventListener('input', () => {
  const v = parseFloat(volumeSlider.value);
  audio.volume = v;
  volumeVal.textContent = Math.round(v * 100) + '%';
  // Keep mute button in sync
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



function toggleMute() {
  audio.muted = !audio.muted;
  muteBtn.textContent = audio.muted ? 'Unmute' : 'Mute';
  muteBtn.classList.toggle('active', audio.muted);
  setStatus(audio.muted ? 'Muted' : 'Unmuted');
}

muteBtn.addEventListener('click', toggleMute);



loopBtn.addEventListener('click', () => {
  audio.loop = !audio.loop;
  loopBtn.classList.toggle('active', audio.loop);
  setStatus('Loop: ' + (audio.loop ? 'On' : 'Off'));
});

// ── Playback speed ────────────────────────────────────────────────────────────

speedSelect.addEventListener('change', () => {
  audio.playbackRate = parseFloat(speedSelect.value);
  setStatus('Speed: ' + speedSelect.value + '×');
});



function formatTime(s) {
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return m + ':' + sec;
}

function setStatus(msg) {
  statusText.textContent = 'Status: ' + msg;
}
