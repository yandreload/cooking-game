// Simmer & Serve — every sound is synthesized live with WebAudio: no audio
// files, no network. Short blips for actions, a sizzle loop while a patty
// cooks, and a small cheerful tune that loops under the shift.

const MUSIC_BPM = 112;
const MUSIC_BAR = 8; // eighth-notes per bar
// A bouncy little original loop: bass roots with pentatonic plucks on top.
const BASS_LINE = [0, 0, 5, 0, 3, 0, 5, 7];
const PLUCK_LINE = [0, 2, 4, 7, 4, 2, 0, -1];
const ROOT_FREQUENCY = 130.81; // C3
const SCALE = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2];

export function createSoundBank() {
  let context = null;
  let musicGain = null;
  let sizzleGain = null;
  let sizzleSource = null;
  let muted = false;
  let musicTimer = null;
  let nextNoteTime = 0;
  let noteIndex = 0;

  function ensureContext() {
    if (context) {
      if (context.state === 'suspended') context.resume().catch(() => {});
      return context;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
      musicGain = context.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(context.destination);
      return context;
    } catch {
      return null;
    }
  }

  function tone(frequency, duration, type, volume, when = 0) {
    if (!context || muted) return;
    const start = context.currentTime + when;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  function noiseBurst(duration, volume, filterFrequency) {
    if (!context || muted) return;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFrequency;
    const gain = context.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start();
  }

  function scheduleMusicNote() {
    if (!context || muted) return;
    const eighth = 60 / MUSIC_BPM / 2;
    while (nextNoteTime < context.currentTime + 0.25) {
      const step = noteIndex % MUSIC_BAR;
      const bar = Math.floor(noteIndex / MUSIC_BAR) % 2;
      const bassDegree = BASS_LINE[step];
      const bassFrequency = ROOT_FREQUENCY * Math.pow(2, bassDegree / 12);
      const pluckDegree = PLUCK_LINE[step] + (bar === 1 ? 2 : 0);
      const pluckFrequency = ROOT_FREQUENCY * 2 * SCALE[Math.max(0, Math.min(SCALE.length - 1, pluckDegree))];
      const when = nextNoteTime - context.currentTime;
      tone(bassFrequency, eighth * 1.8, 'triangle', 0.5, when);
      if (step % 2 === 0) tone(pluckFrequency, eighth * 0.9, 'sine', 0.28, when);
      nextNoteTime += eighth;
      noteIndex += 1;
    }
  }

  return {
    // Call on the first key or pointer gesture: browsers need one.
    unlock() {
      if (ensureContext() && !musicTimer) {
        nextNoteTime = context.currentTime + 0.1;
        noteIndex = 0;
        musicTimer = window.setInterval(scheduleMusicNote, 90);
      }
    },
    setMuted(value) {
      muted = value;
      if (musicGain) musicGain.gain.value = muted ? 0 : 0.16;
      if (muted) this.stopSizzle();
    },
    isMuted() {
      return muted;
    },
    pickup() {
      tone(520, 0.08, 'sine', 0.25);
    },
    place() {
      tone(220, 0.1, 'triangle', 0.3);
      noiseBurst(0.05, 0.12, 900);
    },
    chopTick() {
      noiseBurst(0.06, 0.3, 2400);
    },
    chopDone() {
      tone(660, 0.09, 'sine', 0.25);
      tone(880, 0.12, 'sine', 0.2, 0.07);
    },
    startSizzle() {
      if (!ensureContext() || sizzleSource || muted) return;
      const length = context.sampleRate;
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      sizzleSource = context.createBufferSource();
      sizzleSource.buffer = buffer;
      sizzleSource.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 3200;
      sizzleGain = context.createGain();
      sizzleGain.gain.value = 0.05;
      sizzleSource.connect(filter);
      filter.connect(sizzleGain);
      sizzleGain.connect(context.destination);
      sizzleSource.start();
    },
    stopSizzle() {
      if (sizzleSource) {
        try {
          sizzleSource.stop();
        } catch {
          // Already stopped.
        }
        sizzleSource = null;
        sizzleGain = null;
      }
    },
    serveDing(combo) {
      tone(784, 0.12, 'sine', 0.3);
      tone(1047, 0.18, 'sine', 0.3, 0.09);
      if (combo >= 3) tone(1319, 0.22, 'sine', 0.25, 0.18);
    },
    failBuzz() {
      tone(160, 0.25, 'sawtooth', 0.18);
      tone(120, 0.3, 'sawtooth', 0.15, 0.12);
    },
    tick() {
      tone(980, 0.05, 'square', 0.12);
    },
    dayClear() {
      [523, 659, 784, 1047].forEach((frequency, index) => {
        tone(frequency, 0.22, 'triangle', 0.28, index * 0.13);
      });
    },
  };
}
