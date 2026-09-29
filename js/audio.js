// Web Audio API sound synthesizer for CheckDan Radar alerts
class SoundManager {
  constructor() {
    this.audioCtx = null;
    this.enabled = true;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleSound(enable) {
    this.enabled = enable !== undefined ? enable : !this.enabled;
    return this.enabled;
  }

  // Play a soft radar sonar ping
  playRadarPing() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, this.audioCtx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.36);
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  // Play proximity alert chime (when within 2km of a checkpoint)
  playWarningAlert() {
    // Trigger mobile haptic vibration
    if (window.deviceManager) {
      window.deviceManager.vibrateRadarAlert();
    }

    if (!this.enabled) return;
    try {
      this.init();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      [0, 0.15, 0.3].forEach((offset, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'triangle';
        const freqs = [587.33, 783.99, 1046.5]; // D5, G5, C6
        osc.frequency.setValueAtTime(freqs[idx % freqs.length], now + offset);

        gain.gain.setValueAtTime(0.12, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.2);
      });
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  // Distinctive Speed Camera & Laser Radar Detector Alert Tone (Fast sharp chirps)
  playSpeedRadarAlert() {
    // Trigger mobile haptic vibration for speed camera / laser
    if (window.deviceManager) {
      window.deviceManager.vibrateSpeedCameraAlert();
    }

    if (!this.enabled) return;
    try {
      this.init();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      // 4 rapid laser radar pulses (1200Hz -> 1800Hz)
      [0, 0.09, 0.18, 0.27].forEach((offset) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1400, now + offset);
        osc.frequency.exponentialRampToValueAtTime(1850, now + offset + 0.06);

        gain.gain.setValueAtTime(0.16, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.07);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.08);
      });
    } catch (e) {
      console.warn('Speed radar audio error:', e);
    }
  }

  // Success confirmation tone (e.g. checkpoint reported or voted)
  playSuccess() {
    // Trigger mobile haptic confirmation
    if (window.deviceManager) {
      window.deviceManager.vibrateSuccess();
    }

    if (!this.enabled) return;
    try {
      this.init();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, i) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0.08, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.16);
      });
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  // Progressive Proximity Radar Beep (Frequency increases as distance closes like a Geiger counter)
  updateProximityBeep(distanceKm, type = 'checkpoint') {
    if (!this.enabled || !distanceKm || distanceKm > 1.6) {
      this.stopProximityBeep();
      return;
    }

    // Determine interval (ms) based on distance
    let intervalMs = 2800; // Far (1.2 - 1.6 km)
    if (distanceKm <= 0.15) {
      intervalMs = 200; // Right on target (< 150m) rapid beeps!
    } else if (distanceKm <= 0.35) {
      intervalMs = 450; // Very close (150m - 350m)
    } else if (distanceKm <= 0.70) {
      intervalMs = 850; // Close (350m - 700m)
    } else if (distanceKm <= 1.20) {
      intervalMs = 1700; // Medium (700m - 1200m)
    }

    // If interval changed or not running, restart pulse timer
    if (this.currentBeepInterval !== intervalMs) {
      this.currentBeepInterval = intervalMs;
      this.stopProximityBeep();
      
      // Play immediately once
      this.playRadarBeepChirp(type, distanceKm);
      
      this.proximityBeepTimer = setInterval(() => {
        this.playRadarBeepChirp(type, distanceKm);
      }, intervalMs);
    }
  }

  stopProximityBeep() {
    if (this.proximityBeepTimer) {
      clearInterval(this.proximityBeepTimer);
      this.proximityBeepTimer = null;
    }
    this.currentBeepInterval = null;
  }

  playRadarBeepChirp(type, distanceKm) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      // Sharper and higher frequency for speed radar
      const isSpeed = type === 'speed';
      const baseFreq = isSpeed ? 1400 : 960;
      const targetFreq = isSpeed ? 1850 : 1250;
      const duration = distanceKm < 0.2 ? 0.045 : 0.065;

      osc.type = isSpeed ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(targetFreq, now + duration);

      const vol = isSpeed ? 0.14 : 0.10;
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.01);

      // Light haptic pulse when very close
      if (distanceKm < 0.3 && window.deviceManager) {
        window.deviceManager.vibrate(25);
      }
    } catch (e) {
      console.warn('Radar chirp error:', e);
    }
  }
}

window.soundManager = new SoundManager();
