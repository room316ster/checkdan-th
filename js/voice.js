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
    this.currentStyle = localStorage.getItem('checkdan_voice_style') || 'sweet';
    this.init();
  }

  setVoiceStyle(style) {
    this.currentStyle = style;
    localStorage.setItem('checkdan_voice_style', style);
    const previews = {
      sweet: 'เปลี่ยนเสียงเตือนเป็น สาวหวานผู้ช่วย เรียบร้อยค่ะ ขอให้เดินทางปลอดภัยนะคะ',
      police: 'เปลี่ยนเป็นเสียง ผู้การทางหลวง ชัดเจน! ขับขี่ปลอดภัย มีวินัย เคารพกฎจราจร!',
      esan: 'เปลี่ยนเป็น สำเนียงอีสาน แล้วเด้อพี่น้อง! ไปไสมาไส ขับรถระวังด่านแนเด้อ!'
    };
    this.speak(previews[style] || 'เปลี่ยนรูปแบบเสียงเรียบร้อยค่ะ', true);
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

    // Avoid repeating same speech within 30 seconds unless high priority
    const now = Date.now();
    if (!priority && this.lastSpokenText === text && now - this.lastSpokenTime < 30000) {
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
    
    // Adjust pitch and rate according to active voice personality
    if (this.currentStyle === 'police') {
      utterance.rate = 1.15;
      utterance.pitch = 0.85;
    } else if (this.currentStyle === 'esan') {
      utterance.rate = 1.05;
      utterance.pitch = 1.1;
    } else {
      utterance.rate = 1.02;
      utterance.pitch = 1.05;
    }
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
      traffic: 'มีด่านกวดขันวินัยจราจร',
      smoke: 'มีจุดตรวจควันดำและมลพิษ',
      speed: 'ข้างหน้ามีกล้องตรวจจับความเร็ว',
      security: 'ข้างหน้ามีจุดตรวจร่วมความมั่นคง',
      weigh: 'ข้างหน้ามีด่านชั่งน้ำหนักยานพาหนะ'
    };

    const typeDesc = typeDescriptions[checkpoint.type] || 'มีด่านตรวจ';
    const loc = checkpoint.locationName ? `บริเวณ ${checkpoint.locationName}` : '';
    const dir = checkpoint.direction ? `${checkpoint.direction}` : '';

    let text = '';
    if (this.currentStyle === 'police') {
      text = `ผู้การสั่งการ! ${distText} ${typeDesc} ${loc} เตรียมตรวจเอกสาร ชะลอความเร็ว!`;
    } else if (this.currentStyle === 'esan') {
      text = `ระวังเด้อพี่น้อง! ${distText} ${typeDesc} ${loc} ขับระวังแนเด้อ!`;
    } else {
      text = `แจ้งเตือนค่ะ! ${distText} ${typeDesc} ${loc} ${dir}`;
    }
    this.speak(text, true);
  }

  // Voice announcement for speed camera alert
  announceSpeedCamera(camera, distanceKm, speedLimit = 90) {
    const distText = distanceKm < 1 
      ? `อีก ${Math.round(distanceKm * 1000)} เมตร` 
      : `อีก ${distanceKm.toFixed(1)} กิโลเมตร`;

    let text = '';
    if (this.currentStyle === 'police') {
      text = `ด่วน! ตรวจพบสัญญาณเรดาร์กล้องจับความเร็ว ${distText} จำกัดความเร็ว ${speedLimit} กิโลเมตรต่อชั่วโมง ลดความเร็วทันที!`;
    } else if (this.currentStyle === 'esan') {
      text = `กล้องจับความเร็วเด้อพี่น้อง! ${distText} ข้างหน้า จำกัดเก้าสิบ อย่าฟ่าวเหยียบหลาย ชะลอแน!`;
    } else {
      text = `ระวังค่ะ! ${distText} ข้างหน้ามีกล้องตรวจจับความเร็ว จำกัดความเร็ว ${speedLimit} กิโลเมตรต่อชั่วโมง กรุณาชะลอความเร็วค่ะ`;
    }
    this.speak(text, true);
  }

  // Voice announcement for accident blackspot & sharp curves
  announceBlackspot(blackspot, distanceKm) {
    const distText = distanceKm < 1 
      ? `อีก ${Math.round(distanceKm * 1000)} เมตร` 
      : `อีก ${distanceKm.toFixed(1)} กิโลเมตร`;

    let text = '';
    if (this.currentStyle === 'police') {
      text = `เขตอันตราย! ${distText} ${blackspot.title} เป็นจุดเสี่ยงอุบัติเหตุรุนแรง ห้ามประมาท!`;
    } else if (this.currentStyle === 'esan') {
      text = `ทางโค้งอันตรายเด้อ! ${distText} ${blackspot.title} อย่าขับไว ค่อยๆ เลี้ยว!`;
    } else {
      text = `ระวังค่ะ! ${distText} ข้างหน้าเป็นจุดเสี่ยงอุบัติเหตุและทางโค้งอันตราย ${blackspot.title} กรุณาลดความเร็วและใช้ความระมัดระวังค่ะ`;
    }
    this.speak(text, true);
  }

  // Turn-by-Turn Navigation Instruction Announcement (like Google Maps)
  announceNavigationManeuver(instructionText, distanceMeters) {
    let distStr = '';
    if (distanceMeters > 0) {
      distStr = distanceMeters < 1000 
        ? `อีก ${Math.round(distanceMeters)} เมตร ` 
        : `อีก ${(distanceMeters / 1000).toFixed(1)} กิโลเมตร `;
    }

    let text = '';
    if (this.currentStyle === 'police') {
      text = `${distStr}${instructionText} ชัดเจน ปฏิบัติตาม!`;
    } else if (this.currentStyle === 'esan') {
      text = `${distStr}${instructionText} เด้อพี่น้อง`;
    } else {
      text = `${distStr}${instructionText} ค่ะ`;
    }
    this.speak(text, true);
  }

  // Voice announcement for overspeed warning
  announceOverspeed(currentSpeed, speedLimit) {
    let text = '';
    if (this.currentStyle === 'police') {
      text = `ขับเร็วเกินกำหนด! ความเร็วขณะนี้ ${Math.round(currentSpeed)} จำกัดเพียง ${speedLimit} ลดความเร็วเดี๋ยวนี้!`;
    } else if (this.currentStyle === 'esan') {
      text = `แล่นเร็วโพดแล้ว! ความเร็ว ${Math.round(currentSpeed)} เกินกำหนดแล้ว เบาคันเร่งแนเด้อ!`;
    } else {
      text = `ความเร็วเกินกำหนดค่ะ! ความเร็วปัจจุบัน ${Math.round(currentSpeed)} กิโลเมตรต่อชั่วโมง กำหนดไม่เกิน ${speedLimit} ค่ะ`;
    }
    this.speak(text, true);
  }

  // Test voice output
  testVoice() {
    this.speak('ยินดีต้อนรับสู่ระบบเช็คด่านไทย ระบบเสียงเตือนอัตโนมัติพร้อมทำงานแล้วค่ะ', true);
  }
}

window.voiceManager = new VoiceManager();

