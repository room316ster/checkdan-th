// Hands-Free Thai Voice Command Recognition Engine for CheckDan Thailand
// Uses Web Speech Recognition API (SpeechRecognition / webkitSpeechRecognition)
class VoiceCommandManager {
  constructor() {
    this.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    this.recognition = null;
    this.isListening = false;
    this.isSupported = !!this.SpeechRecognition;
    this.continuousMode = false;
    this.init();
  }

  init() {
    if (!this.isSupported) {
      console.log('[VoiceCommand] Web Speech Recognition API not supported in this browser.');
      return;
    }

    try {
      this.recognition = new this.SpeechRecognition();
      this.recognition.lang = 'th-TH';
      this.recognition.continuous = false; // Stop after each phrase for battery efficiency
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 3;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.updateUI(true);
        console.log('[VoiceCommand] 🎙️ Listening for Thai voice commands...');
      };

      this.recognition.onresult = (event) => {
        const results = event.results;
        if (!results || results.length === 0) return;
        
        const transcript = results[0][0].transcript.trim().toLowerCase();
        console.log('[VoiceCommand] Recognized:', transcript);
        this.processCommand(transcript);
      };

      this.recognition.onerror = (event) => {
        console.warn('[VoiceCommand] Recognition error:', event.error);
        this.isListening = false;
        this.updateUI(false);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.updateUI(false);
      };
    } catch (e) {
      console.warn('Voice command init failed:', e);
    }

    document.addEventListener('DOMContentLoaded', () => {
      this.bindButtons();
    });
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(() => this.bindButtons(), 150);
    }
  }

  bindButtons() {
    const micBtns = document.querySelectorAll('.btn-voice-command, #btn-voice-command, #btn-hud-voice-cmd');
    micBtns.forEach(btn => {
      if (btn._bound) return;
      btn._bound = true;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleListening();
      });
    });
  }

  toggleListening() {
    if (!this.isSupported) {
      if (window.app) {
        window.app.showToast('⚠️ เบราว์เซอร์นี้ยังไม่รองรับระบบสั่งการด้วยเสียง', 'warning');
      }
      return;
    }

    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  startListening() {
    if (!this.recognition || this.isListening) return;
    try {
      this.recognition.start();
      if (window.app) {
        window.app.showToast('🎙️ กำลังฟังคำสั่งเสียง... (เช่น "เช็คด่าน", "พิกัดฉัน", "เปิด HUD")', 'info');
      }
      if (window.soundManager) {
        window.soundManager.playRadarPing();
      }
    } catch (e) {
      console.warn('Start listening failed:', e);
    }
  }

  stopListening() {
    if (!this.recognition || !this.isListening) return;
    try {
      this.recognition.stop();
    } catch (e) {
      console.warn('Stop listening failed:', e);
    }
    this.isListening = false;
    this.updateUI(false);
  }

  updateUI(listening) {
    const micBtns = document.querySelectorAll('.btn-voice-command, #btn-voice-command, #btn-hud-voice-cmd');
    micBtns.forEach(btn => {
      btn.classList.toggle('listening', listening);
      if (listening) {
        btn.setAttribute('title', 'กำลังฟังเสียง... (พูดคำสั่งได้เลย)');
      } else {
        btn.setAttribute('title', 'กดเพื่อสั่งงานด้วยเสียง (Hands-Free)');
      }
    });

    const statusBadge = document.getElementById('voice-cmd-status-pill');
    if (statusBadge) {
      statusBadge.style.display = listening ? 'inline-flex' : 'none';
    }
  }

  // Parse & Execute Thai Driving Voice Commands
  processCommand(text) {
    if (window.app) {
      window.app.showToast(`🗣️ ได้ยินคำสั่ง: "${text}"`, 'success');
    }

    // 1. Checkpoint & Radar inquiry
    if (text.includes('ด่าน') || text.includes('กล้อง') || text.includes('เรดาร์') || text.includes('เช็ค')) {
      const nearest = window.app ? window.app.nearestCheckpoint : null;
      if (nearest && nearest.distanceKm <= 5.0) {
        const distStr = nearest.distanceKm < 1 ? `${Math.round(nearest.distanceKm * 1000)} เมตร` : `${nearest.distanceKm.toFixed(1)} กิโลเมตร`;
        window.voiceManager.speak(`ด่านที่ใกล้ที่สุดคือ ${nearest.title} ระยะทางอีก ${distStr} ข้างหน้าค่ะ`);
      } else {
        window.voiceManager.speak('ตรวจสอบแล้ว ในรัศมี 5 กิโลเมตรข้างหน้าไม่มีด่านตรวจหรือกล้องความเร็วค่ะ ขอให้เดินทางปลอดภัยค่ะ');
      }
      return;
    }

    // 2. Current Location & Coordinates
    if (text.includes('พิกัด') || text.includes('ตำแหน่ง') || text.includes('อยู่ที่ไหน') || text.includes('แถวไหน')) {
      if (window.locationManager) {
        window.locationManager.speakCurrentLocation();
      }
      return;
    }

    // 3. Current Driving Speed
    if (text.includes('ความเร็ว') || text.includes('กี่โล') || text.includes('ขับเท่าไหร่')) {
      const speed = window.app && window.app.currentLiveSpeed ? window.app.currentLiveSpeed : 0;
      window.voiceManager.speak(`ความเร็วของท่านขณะนี้ ${speed} กิโลเมตรต่อชั่วโมงค่ะ`);
      return;
    }

    // 4. Open HUD Mode
    if (text.includes('เปิด hud') || text.includes('โหมดขับขี่') || text.includes('เปิดโหมดขับขี่') || text.includes('หน้าปัด')) {
      if (window.hudManager) {
        window.hudManager.openHUD();
      }
      return;
    }

    // 5. Close HUD Mode
    if (text.includes('ปิด hud') || text.includes('ออกจาก hud') || text.includes('ปิดโหมด')) {
      if (window.hudManager) {
        window.hudManager.closeHUD();
      }
      return;
    }

    // 6. Mirror Windshield Mode
    if (text.includes('กระจก') || text.includes('สะท้อน') || text.includes('มิลเลอร์')) {
      if (window.hudManager) {
        if (!window.hudManager.isActive) window.hudManager.openHUD();
        window.hudManager.toggleMirrorMode();
      }
      return;
    }

    // 7. Emergency SOS
    if (text.includes('ฉุกเฉิน') || text.includes('ช่วยด้วย') || text.includes('ตำรวจ') || text.includes('รถเสีย') || text.includes('กู้ภัย')) {
      if (window.sosManager) {
        window.sosManager.openSOSModal();
        window.voiceManager.speak('เปิดศูนย์รวมเบอร์โทรฉุกเฉินทางหลวงและกู้ภัยแล้วค่ะ');
      }
      return;
    }

    // 8. Tourist Attractions & Travel Destinations
    if (text.includes('เที่ยว') || text.includes('สถานที่ท่องเที่ยว') || text.includes('แหล่งท่องเที่ยว') || text.includes('ที่เที่ยว')) {
      if (window.app && typeof window.app.openAttractionsTab === 'function') {
        window.app.openAttractionsTab();
        window.voiceManager.speak('เปิดระบบค้นหาแหล่งท่องเที่ยว 77 จังหวัดทั่วไทยให้แล้วค่ะ มีทั้งธรรมชาติ ทะเล วัด และแลนด์มาร์กค่ะ');
      } else if (window.attractionsManager) {
        window.attractionsManager.toggleLayer(true);
        window.voiceManager.speak('แสดงจุดท่องเที่ยวสำคัญบนแผนที่แล้วค่ะ');
      }
      return;
    }

    // 9. Navigation & Route Scan
    if (text.includes('นำทาง') || text.includes('สแกนทาง') || text.includes('ไปที่') || text.includes('ไป') || text.includes('เริ่มเดินทาง') || text.includes('วางแผน')) {
      let destQuery = '';
      const patterns = [
        /สแกนทาง(?:ไป)?\s*(.+)/,
        /นำทาง(?:ไป)?\s*(.+)/,
        /ไปที่\s*(.+)/,
        /ไป\s*(.+)/,
        /ค้นหาเส้นทาง(?:ไป)?\s*(.+)/
      ];
      for (const p of patterns) {
        const match = text.match(p);
        if (match && match[1]) {
          destQuery = match[1].trim();
          break;
        }
      }

      if (window.app && typeof window.app.openRoutePlanner === 'function') {
        window.app.openRoutePlanner(destQuery);
        if (destQuery) {
          window.voiceManager.speak(`เปิดเมนูสแกนทาง และค้นหา "${destQuery}" ให้แล้วค่ะ`);
        } else {
          window.voiceManager.speak('เปิดเมนูสแกนทางแล้วค่ะ ท่านสามารถพิมพ์ค้นหาจุดหมายปลายทางได้เลยค่ะ');
        }
        return;
      } else if (window.navigationManager) {
        window.voiceManager.speak('กรุณาเลือกจุดหมายปลายทางในแผนที่เพื่อเริ่มนำทางค่ะ');
        return;
      }
    }

    // Unrecognized command
    window.voiceManager.speak(`รับคำสั่ง "${text}" ยังไม่พบคำสั่งที่ตรงกันค่ะ สามารถสั่ง "เช็คด่าน", "ค้นหาแหล่งท่องเที่ยว", "พิกัดฉัน" หรือ "เปิด HUD" ได้ค่ะ`);
  }
}

window.voiceCommandManager = new VoiceCommandManager();
