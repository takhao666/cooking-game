// audio.js — every sound in the game is synthesized with WebAudio. No audio files.
// One file, one job: bleeps, sizzles and a little bistro tune.

export function createAudio() {
  const state = {
    context: null,
    master: null,
    musicGain: null,
    sizzle: null,
    muted: false,
    musicTimer: null,
    step: 0,
  };

  // AudioContext may only start after a user gesture; call from the first input.
  function ensure() {
    if (state.context) {
      if (state.context.state === 'suspended') void state.context.resume();
      return true;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      state.context = new AudioContext();
      state.master = state.context.createGain();
      state.master.gain.value = state.muted ? 0 : 0.5;
      state.master.connect(state.context.destination);
      state.musicGain = state.context.createGain();
      state.musicGain.gain.value = 0.16;
      state.musicGain.connect(state.master);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, seconds, type, volume, when = 0, slideTo = null) {
    if (!ensure()) return;
    const start = state.context.currentTime + when;
    const osc = state.context.createOscillator();
    const gain = state.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    osc.connect(gain).connect(state.master);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  }

  function noise(seconds, volume, filterFreq, when = 0) {
    if (!ensure()) return;
    const start = state.context.currentTime + when;
    const length = Math.max(1, Math.floor(state.context.sampleRate * seconds));
    const buffer = state.context.createBuffer(1, length, state.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = state.context.createBufferSource();
    source.buffer = buffer;
    const filter = state.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 0.8;
    const gain = state.context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    source.connect(filter).connect(gain).connect(state.master);
    source.start(start);
  }

  const api = {
    unlock() {
      ensure();
    },
    setMuted(muted) {
      state.muted = muted;
      if (state.master) state.master.gain.value = muted ? 0 : 0.5;
    },
    isMuted() {
      return state.muted;
    },
    pickup() {
      tone(520, 0.07, 'triangle', 0.25);
      tone(780, 0.09, 'triangle', 0.2, 0.05);
    },
    chop() {
      noise(0.06, 0.5, 900);
      tone(180, 0.06, 'sine', 0.4, 0, 90);
    },
    chopped() {
      tone(660, 0.08, 'triangle', 0.3);
      tone(990, 0.12, 'triangle', 0.25, 0.07);
    },
    sizzleStart() {
      tone(1200, 0.15, 'sine', 0.08, 0, 900);
    },
    ding() {
      tone(880, 0.35, 'sine', 0.3);
      tone(1318, 0.4, 'sine', 0.22, 0.08);
    },
    serve() {
      tone(523, 0.12, 'triangle', 0.3);
      tone(659, 0.12, 'triangle', 0.3, 0.09);
      tone(784, 0.2, 'triangle', 0.3, 0.18);
      tone(1046, 0.3, 'triangle', 0.25, 0.27);
    },
    error() {
      tone(160, 0.18, 'square', 0.18, 0, 110);
    },
    miss() {
      tone(392, 0.2, 'sawtooth', 0.15, 0, 196);
      tone(311, 0.3, 'sawtooth', 0.15, 0.15, 155);
    },
    tick() {
      tone(1000, 0.05, 'square', 0.12);
    },
    dayComplete() {
      [523, 659, 784, 1046, 1318].forEach((freq, i) => tone(freq, 0.25, 'triangle', 0.28, i * 0.11));
    },
    gameOver() {
      [392, 370, 349, 311].forEach((freq, i) => tone(freq, 0.35, 'triangle', 0.25, i * 0.18));
    },
    // A quiet looping sizzle while any burner cooks; call every frame with the count.
    setSizzle(count) {
      if (!ensure()) return;
      if (count > 0 && !state.sizzle) {
        const length = state.context.sampleRate;
        const buffer = state.context.createBuffer(1, length, state.context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
        const source = state.context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const filter = state.context.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 3800;
        const gain = state.context.createGain();
        gain.gain.value = 0.05;
        source.connect(filter).connect(gain).connect(state.master);
        source.start();
        state.sizzle = { source, gain };
      } else if (count === 0 && state.sizzle) {
        try {
          state.sizzle.source.stop();
        } catch { /* already stopped */ }
        state.sizzle = null;
      } else if (state.sizzle) {
        state.sizzle.gain.gain.value = 0.03 + 0.02 * Math.min(count, 2);
      }
    },
    startMusic() {
      if (!ensure() || state.musicTimer !== null) return;
      // A cheerful little loop in C major: bass note then a short melody.
      const melody = [
        523, 0, 659, 784, 0, 784, 880, 0,
        784, 659, 523, 0, 587, 659, 0, 0,
        523, 0, 659, 784, 880, 0, 784, 659,
        587, 0, 659, 523, 0, 0, 0, 0,
      ];
      const bass = [131, 0, 0, 0, 165, 0, 0, 0, 175, 0, 0, 0, 196, 0, 196, 0];
      const beatMs = 210;
      state.musicTimer = window.setInterval(() => {
        if (state.muted) {
          state.step += 1;
          return;
        }
        const index = state.step % melody.length;
        const note = melody[index];
        const low = bass[index];
        if (note) {
          const osc = state.context.createOscillator();
          const gain = state.context.createGain();
          osc.type = 'triangle';
          osc.frequency.value = note;
          gain.gain.setValueAtTime(0.5, state.context.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, state.context.currentTime + 0.2);
          osc.connect(gain).connect(state.musicGain);
          osc.start();
          osc.stop(state.context.currentTime + 0.22);
        }
        if (low) {
          const osc = state.context.createOscillator();
          const gain = state.context.createGain();
          osc.type = 'sine';
          osc.frequency.value = low;
          gain.gain.setValueAtTime(0.6, state.context.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, state.context.currentTime + 0.4);
          osc.connect(gain).connect(state.musicGain);
          osc.start();
          osc.stop(state.context.currentTime + 0.42);
        }
        state.step += 1;
      }, beatMs);
    },
    stopMusic() {
      if (state.musicTimer !== null) {
        window.clearInterval(state.musicTimer);
        state.musicTimer = null;
      }
    },
  };
  return api;
}
