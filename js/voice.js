// Thai Voice Speech Synthesis Engine (Web Speech API) for CheckDan Thailand
// Adapts automatically to device OS: Apple Siri (iOS), Google Natural (Android), Microsoft Natural (Windows)
class VoiceManager {
  constructor() {
    this.synth = window.speechSynthesis || null;
    this.enabled = true;
    this.thaiVoice = null;
    this.availableThaiVoices = [];
    this.platform = this.detectPlatform();
    this.isIOS = this.platform === 'ios';
    this.unlocked = false;
    this.lastSpokenText = '';
    this.lastSpokenTime = 0;
    this.speechQueue = [];
    this.isSpeaking = false;
    
    // Default style: on iOS default to 'siri', otherwise 'sweet'
    const savedStyle = localStorage.getItem('checkdan_voice_style');
    if (savedStyle) {
      this.currentStyle = savedStyle;
    } else {
      this.currentStyle = this.isIOS ? 'siri' : 'sweet';
    }

    this.init();
  }

  // Detect Device Platform (iOS / Android / Windows / Mac)
  detectPlatform() {
    const nav = (typeof window !== 'undefined' && window.navigator) ? window.navigator : (typeof navigator !== 'undefined' ? navigator : {});
    const ua = nav.userAgent || '';
    const platform = nav.platform || '';
    const maxTouchPoints = nav.maxTouchPoints || 0;

    // Detect iOS (iPhone, iPad, iPod, including iPadOS 13+ desktop mode)
    const isIOS = /iPad|iPhone|iPod/i.test(ua) || 
      (platform === 'MacIntel' && maxTouchPoints > 1) ||
      /iPhone|iPad|iPod/i.test(platform);
    
    const isAndroid = /Android/i.test(ua);
    const isMac = /Macintosh|MacIntel/i.test(ua) && !isIOS;
    const isWindows = /Windows|Win32|Win64/i.test(ua);

    if (isIOS) return 'ios';
    if (isAndroid) return 'android';
    if (isMac) return 'mac';
    if (isWindows) return 'windows';
    return 'other';
  }

  // Unlock Web Speech API on iOS / Safari via initial user gesture
  setupIOSUnlock() {
    if (this.unlocked || !this.synth) return;
    if (typeof window === 'undefined' || !window.addEventListener) return;

    const unlock = () => {
      if (this.unlocked || !this.synth) return;
      try {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0.01;
        u.rate = 2.0;
        if (this.thaiVoice) u.voice = this.thaiVoice;
        this.synth.speak(u);
        this.unlocked = true;
        console.log('[VoiceManager] 🔓 Web Speech API unlocked successfully for iOS/Safari');
      } catch (e) {
        console.warn('Speech unlock error:', e);
      }
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('touchend', unlock);
      window.removeEventListener('click', unlock);
    };

    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('touchend', unlock, { passive: true });
    window.addEventListener('click', unlock);
  }

  setVoiceStyle(style) {
    this.currentStyle = style;
    localStorage.setItem('checkdan_voice_style', style);

    // Refresh voice selection in case style requires Siri specifically
    if (this.availableThaiVoices.length > 0) {
      this.selectDeviceVoice(this.availableThaiVoices);
    }

    const previews = {
      siri: 'เปิดใช้งานเสียง Siri สำหรับอุปกรณ์ Apple iOS เรียบร้อยค่ะ ขอให้เดินทางโดยสวัสดิภาพค่ะ',
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
      if (!voices || voices.length === 0) return;

      this.availableThaiVoices = voices.filter(v => 
        v.lang === 'th-TH' || 
        v.lang === 'th_TH' || 
        v.lang.toLowerCase().startsWith('th')
      );

      this.selectDeviceVoice(voices);
      this.updateUI();
    };

    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }

    // Set up user gesture unlock for iOS Safari
    this.setupIOSUnlock();

    // Load saved settings
    const saved = localStorage.getItem('checkdan_voice_enabled');
    if (saved !== null) {
      this.enabled = saved === 'true';
    }

    document.addEventListener('DOMContentLoaded', () => {
      this.updateUI();
    });
  }

  // Select optimal voice based on device platform
  selectDeviceVoice(voices) {
    if (!voices || voices.length === 0) return;

    const thaiVoices = voices.filter(v => 
      v.lang === 'th-TH' || 
      v.lang === 'th_TH' || 
      v.lang.toLowerCase().startsWith('th')
    );

    if (thaiVoices.length === 0) {
      console.warn('[VoiceManager] No Thai TTS voice detected in browser.');
      return;
    }

    let chosen = null;

    // 1. Device: iOS or Mac, or style explicitly set to 'siri'
    if (this.platform === 'ios' || this.platform === 'mac' || this.currentStyle === 'siri') {
      // Priority A: Siri Thai Voice
      chosen = thaiVoices.find(v => 
        /siri/i.test(v.name) || 
        /siri/i.test(v.voiceURI)
      );
      // Priority B: Apple Kanya (Siri Thai native TTS voice on iOS/iPadOS) or Narisa
      if (!chosen) {
        chosen = thaiVoices.find(v => 
          /kanya|narisa/i.test(v.name) || 
          /kanya|narisa/i.test(v.voiceURI)
        );
      }
      // Priority C: Any Apple-tagged Thai voice
      if (!chosen) {
        chosen = thaiVoices.find(v => 
          /apple|com\.apple/i.test(v.voiceURI) || 
          /apple/i.test(v.name)
        );
      }
      if (chosen) {
        console.log(`[VoiceManager] 🍎 Apple iOS/Siri Voice selected: ${chosen.name} (${chosen.voiceURI})`);
      }
    }

    // 2. Device: Android
    if (!chosen && this.platform === 'android') {
      // Priority A: Google Thai Natural/Neural voice
      chosen = thaiVoices.find(v => 
        /google/i.test(v.name) || 
        /google/i.test(v.voiceURI)
      );
      // Priority B: Samsung Thai TTS
      if (!chosen) {
        chosen = thaiVoices.find(v => 
          /samsung/i.test(v.name) || 
          /samsung/i.test(v.voiceURI)
        );
      }
      if (chosen) {
        console.log(`[VoiceManager] 🤖 Android Google/Samsung Voice selected: ${chosen.name}`);
      }
    }

    // 3. Device: Windows PC
    if (!chosen && this.platform === 'windows') {
      // Priority A: Microsoft Premwadee / Niwat Online (Natural Thai)
      chosen = thaiVoices.find(v => 
        /natural/i.test(v.name) && 
        /premwadee|niwat/i.test(v.name)
      );
      // Priority B: Any Microsoft Natural Thai voice
      if (!chosen) {
        chosen = thaiVoices.find(v => 
          /natural/i.test(v.name) || 
          /microsoft/i.test(v.name)
        );
      }
      if (chosen) {
        console.log(`[VoiceManager] 💻 Windows Microsoft Natural Voice selected: ${chosen.name}`);
      }
    }

    // 4. Default / Fallback: Pick first available Thai voice
    if (!chosen) {
      chosen = thaiVoices[0];
      console.log(`[VoiceManager] Default Thai voice selected: ${chosen.name}`);
    }

    this.thaiVoice = chosen;
  }

  // Get info about current device voice
  getDeviceVoiceInfo() {
    const platformNames = {
      ios: 'Apple iOS (iPhone/iPad)',
      android: 'Android',
      windows: 'Windows PC',
      mac: 'Apple macOS',
      other: 'อุปกรณ์ทั่วไป'
    };

    const currentVoiceName = this.thaiVoice ? this.thaiVoice.name : 'ค่าเริ่มต้น';
    const isSiri = /siri|kanya|narisa|apple/i.test(currentVoiceName) || this.platform === 'ios';
    
    let engineBadge = 'ค่าเริ่มต้น';
    if (isSiri) {
      engineBadge = '🍎 Siri (Apple iOS)';
    } else if (this.platform === 'android') {
      engineBadge = '🤖 Google Thai (Android)';
    } else if (this.platform === 'windows') {
      engineBadge = '💻 Windows Natural';
    } else if (this.thaiVoice) {
      engineBadge = this.thaiVoice.name;
    }

    return {
      platform: this.platform,
      platformLabel: platformNames[this.platform] || 'อุปกรณ์ทั่วไป',
      voiceName: currentVoiceName,
      isSiri,
      engineBadge
    };
  }

  updateUI() {
    const info = this.getDeviceVoiceInfo();

    // 1. Update voice tag in mobile slide-out menu
    const menuTag = document.getElementById('menu-device-voice-tag');
    if (menuTag) {
      menuTag.textContent = info.engineBadge;
      menuTag.title = `อุปกรณ์: ${info.platformLabel} | เสียง: ${info.voiceName}`;
    }

    // 2. Synchronize select dropdown
    const voiceSelect = document.getElementById('voice-style-select');
    if (voiceSelect && this.currentStyle) {
      voiceSelect.value = this.currentStyle;
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
    if (this.currentStyle === 'siri') {
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
    } else if (this.currentStyle === 'police') {
      utterance.rate = 1.15;
      utterance.pitch = 0.85;
    } else if (this.currentStyle === 'esan') {
      utterance.rate = 1.05;
      utterance.pitch = 1.1;
    } else {
      // Sweet / Default (Smooth assistant tone)
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
  announceCheckpointWarning(checkpoint, distanceKm, currentArea = '') {
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

    const areaText = currentArea || (window.locationManager ? window.locationManager.getVoiceAreaText() : '');
    const areaPrefix = areaText ? `ขณะนี้พิกัดอยู่ที่ ${areaText} ` : '';
    const policeAreaPrefix = areaText ? `พิกัดปัจจุบัน ${areaText}! ` : '';
    const esanAreaPrefix = areaText ? `ตอนนี้อยู่ ${areaText} เด้อ! ` : '';

    let text = '';
    if (this.currentStyle === 'siri') {
      text = `แจ้งเตือนค่ะ! ${areaPrefix}${distText} ข้างหน้ามี${typeDesc} ${loc} ${dir}`;
    } else if (this.currentStyle === 'police') {
      text = `ผู้การสั่งการ! ${policeAreaPrefix}${distText} ${typeDesc} ${loc} เตรียมตรวจเอกสาร ชะลอความเร็ว!`;
    } else if (this.currentStyle === 'esan') {
      text = `ระวังเด้อพี่น้อง! ${esanAreaPrefix}${distText} ${typeDesc} ${loc} ขับระวังแนเด้อ!`;
    } else {
      text = `แจ้งเตือนค่ะ! ${areaPrefix}${distText} ${typeDesc} ${loc} ${dir}`;
    }
    this.speak(text, true);
  }

  // Voice announcement for speed camera alert
  announceSpeedCamera(camera, distanceKm, speedLimit = 90, currentArea = '') {
    const distText = distanceKm < 1 
      ? `อีก ${Math.round(distanceKm * 1000)} เมตร` 
      : `อีก ${distanceKm.toFixed(1)} กิโลเมตร`;

    const areaText = currentArea || (window.locationManager ? window.locationManager.getVoiceAreaText() : '');
    const areaPrefix = areaText ? `ขณะนี้พิกัดอยู่ที่ ${areaText} ` : '';
    const policeAreaPrefix = areaText ? `พิกัดปัจจุบัน ${areaText}! ` : '';
    const esanAreaPrefix = areaText ? `ตอนนี้อยู่ ${areaText} เด้อ! ` : '';

    let text = '';
    if (this.currentStyle === 'siri') {
      text = `ระวังค่ะ! ${areaPrefix}${distText} ข้างหน้ามีกล้องตรวจจับความเร็ว จำกัดความเร็ว ${speedLimit} กิโลเมตรต่อชั่วโมงค่ะ`;
    } else if (this.currentStyle === 'police') {
      text = `ด่วน! ${policeAreaPrefix}ตรวจพบสัญญาณเรดาร์กล้องจับความเร็ว ${distText} จำกัดความเร็ว ${speedLimit} กิโลเมตรต่อชั่วโมง ลดความเร็วทันที!`;
    } else if (this.currentStyle === 'esan') {
      text = `กล้องจับความเร็วเด้อพี่น้อง! ${esanAreaPrefix}${distText} ข้างหน้า จำกัดความเร็ว ${speedLimit} อย่าฟ่าวเหยียบหลาย ชะลอแน!`;
    } else {
      text = `ระวังค่ะ! ${areaPrefix}${distText} ข้างหน้ามีกล้องตรวจจับความเร็ว จำกัดความเร็ว ${speedLimit} กิโลเมตรต่อชั่วโมง กรุณาชะลอความเร็วค่ะ`;
    }
    this.speak(text, true);
  }

  // Voice announcement for accident blackspot & sharp curves
  announceBlackspot(blackspot, distanceKm, currentArea = '') {
    const distText = distanceKm < 1 
      ? `อีก ${Math.round(distanceKm * 1000)} เมตร` 
      : `อีก ${distanceKm.toFixed(1)} กิโลเมตร`;

    const areaText = currentArea || (window.locationManager ? window.locationManager.getVoiceAreaText() : '');
    const areaPrefix = areaText ? `ขณะนี้พิกัดอยู่ที่ ${areaText} ` : '';
    const policeAreaPrefix = areaText ? `พิกัดปัจจุบัน ${areaText}! ` : '';
    const esanAreaPrefix = areaText ? `ตอนนี้อยู่ ${areaText} เด้อ! ` : '';

    let text = '';
    if (this.currentStyle === 'siri') {
      text = `ระวังค่ะ! ${areaPrefix}${distText} ข้างหน้าเป็นจุดเสี่ยงอุบัติเหตุ ${blackspot.title} กรุณาลดความเร็วค่ะ`;
    } else if (this.currentStyle === 'police') {
      text = `เขตอันตราย! ${policeAreaPrefix}${distText} ${blackspot.title} เป็นจุดเสี่ยงอุบัติเหตุรุนแรง ห้ามประมาท!`;
    } else if (this.currentStyle === 'esan') {
      text = `ทางโค้งอันตรายเด้อ! ${esanAreaPrefix}${distText} ${blackspot.title} อย่าขับไว ค่อยๆ เลี้ยว!`;
    } else {
      text = `ระวังค่ะ! ${areaPrefix}${distText} ข้างหน้าเป็นจุดเสี่ยงอุบัติเหตุและทางโค้งอันตราย ${blackspot.title} กรุณาลดความเร็วค่ะ`;
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
    if (this.currentStyle === 'siri') {
      text = `ความเร็วเกินกำหนดค่ะ ความเร็วปัจจุบัน ${Math.round(currentSpeed)} จำกัด ${speedLimit} กิโลเมตรต่อชั่วโมงค่ะ`;
    } else if (this.currentStyle === 'police') {
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
    const info = this.getDeviceVoiceInfo();
    const prefix = info.isSiri ? 'ระบบเสียง Siri ภาษาไทย สำหรับ Apple iOS พร้อมทำงานแล้วค่ะ' : 'ยินดีต้อนรับสู่ระบบเช็คด่านไทย ระบบเสียงเตือนอัตโนมัติพร้อมทำงานแล้วค่ะ';
    this.speak(prefix, true);
  }
}

window.voiceManager = new VoiceManager();
