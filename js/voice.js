// Thai Voice Speech Synthesis Engine (Web Speech API) for CheckDan Thailand
class VoiceManager {
  constructor() {
    this.synth = window.speechSynthesis || null;
    this.enabled = true;
    this.thaiVoice = null;
    this.lastSpokenText = '';
    this.lastSpokenTime = 0;
    this.speechQueue = [];
    this.isSpeaking = false;
    this.init();
  }

  init() {
    if (!this.synth) {
      console.warn('Web Speech API is not supported in this browser.');
      return;
    }

    // Load available voices
    const loadVoices = () => {
      const voices = this.synth.getVoices();
      // Look for Thai voice
      this.thaiVoice = voices.find(v => v.lang === 'th-TH' || v.lang.startsWith('th')) || null;
      if (this.thaiVoice) {
        console.log('Selected Thai Voice:', this.thaiVoice.name);
      }
    };

    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }

    // Load saved settings
    const saved = localStorage.getItem('checkdan_voice_enabled');
    if (saved !== null) {
      this.enabled = saved === 'true';
    }
  }

  toggleVoice(enable) {
    this.enabled = enable !== undefined ? enable : !this.enabled;
    localStorage.setItem('checkdan_voice_enabled', this.enabled);
    if (!this.enabled && this.synth) {
      this.synth.cancel();
    }
    return this.enabled;
  }

  speak(text, priority = false) {
    if (!this.enabled || !this.synth) return;

    // Avoid repeating same speech within 45 seconds unless high priority
    const now = Date.now();
    if (!priority && this.lastSpokenText === text && now - this.lastSpokenTime < 45000) {
      return;
    }

    this.lastSpokenText = text;
    this.lastSpokenTime = now;

    if (priority) {
      this.synth.cancel(); // Cancel any ongoing speech for urgent warnings
      this.speechQueue = [];
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH';
    utterance.rate = 1.05; // Slightly brisk driving tempo
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    if (this.thaiVoice) {
      utterance.voice = this.thaiVoice;
    }

    utterance.onstart = () => { this.isSpeaking = true; };
    utterance.onend = () => { this.isSpeaking = false; };
    utterance.onerror = (e) => {
      this.isSpeaking = false;
      console.warn('Speech synthesis error:', e);
    };

    this.synth.speak(utterance);
  }

  // Voice announcement for proximity checkpoint
  announceCheckpointWarning(checkpoint, distanceKm) {
    const distText = distanceKm < 1 
      ? `อีก ${Math.round(distanceKm * 1000)} เมตร` 
      : `อีก ${distanceKm.toFixed(1)} กิโลเมตร`;
    
    const typeDescriptions = {
      alcohol: 'มีด่านตรวจวัดระดับแอลกอฮอล์',
      traffic: 'มีด่านกวดขันวินัยจราจรและตรวจหมวกกันน็อก',
      smoke: 'มีจุดตรวจควันดำและมลพิษ',
      speed: 'ข้างหน้ามีกล้องตรวจจับความเร็ว',
      security: 'ข้างหน้ามีจุดตรวจร่วมความมั่นคง',
      weigh: 'ข้างหน้ามีด่านชั่งน้ำหนักยานพาหนะ'
    };

    const typeDesc = typeDescriptions[checkpoint.type] || 'มีด่านตรวจ';
    const loc = checkpoint.locationName ? `บริเวณ ${checkpoint.locationName}` : '';
    const dir = checkpoint.direction ? `${checkpoint.direction}` : '';

    const text = `แจ้งเตือนค่ะ! ${distText} ${typeDesc} ${loc} ${dir}`;
    this.speak(text, true);
  }

  // Voice announcement for overspeed warning
  announceOverspeed(currentSpeed, speedLimit) {
    const text = `ความเร็วเกินกำหนดค่ะ! ความเร็วปัจจุบัน ${Math.round(currentSpeed)} กิโลเมตรต่อชั่วโมง กำหนดไม่เกิน ${speedLimit}`;
    this.speak(text, true);
  }

  // Test voice output
  testVoice() {
    this.speak('ยินดีต้อนรับสู่ระบบเช็คด่านไทย ระบบเสียงเตือนอัตโนมัติพร้อมทำงานแล้วค่ะ', true);
  }
}

window.voiceManager = new VoiceManager();
