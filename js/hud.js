// Full-screen Driving Mode HUD & GPS Speedometer for CheckDan Thailand
class HUDManager {
  constructor() {
    this.isActive = false;
    this.currentSpeed = 0; // km/h
    this.speedLimit = 90; // Default limit km/h
    this.watchId = null;
    this.simInterval = null;
    this.isSimulating = false;
    this.simSpeed = 85;
    this.heading = 0;
    this.isMirrored = false;
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Open HUD Mode
    const openBtn = document.getElementById('btn-open-hud');
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        this.openHUD();
      });
    }

    // Close HUD Mode
    const closeBtn = document.getElementById('btn-close-hud');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeHUD(true);
      });
    }

    // Top-left Back button for Mobile HUD
    const backBtn = document.getElementById('btn-hud-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.closeHUD(true);
      });
    }

    // Keyboard Escape to exit HUD
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isActive) {
        this.closeHUD(true);
      }
    });

    // Mobile / Browser Hardware Back Button (PopState)
    window.addEventListener('popstate', (e) => {
      if (this.isActive) {
        this.closeHUD(true, false);
      }
    });

    // Mirror Flip Mode for Windshield Reflection
    const mirrorBtn = document.getElementById('btn-hud-mirror');
    if (mirrorBtn) {
      mirrorBtn.addEventListener('click', () => {
        this.toggleMirrorMode();
      });
    }

    // Toggle Speed Limit (90 vs 120 km/h)
    const limitBadge = document.getElementById('hud-speed-limit');
    if (limitBadge) {
      limitBadge.addEventListener('click', () => {
        this.speedLimit = this.speedLimit === 90 ? 120 : (this.speedLimit === 120 ? 80 : 90);
        limitBadge.textContent = this.speedLimit;
        window.app.showToast(`🚦 กำหนดจำกัดความเร็ว: ${this.speedLimit} กม./ชม.`, 'info');
      });
    }

    // Driving Simulation Toggle
    const simBtn = document.getElementById('btn-toggle-hud-sim');
    if (simBtn) {
      simBtn.addEventListener('click', () => {
        this.toggleDrivingSimulation();
      });
    }

    // Fullscreen Toggle
    const fsBtn = document.getElementById('btn-hud-fullscreen');
    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
          fsBtn.innerHTML = '<i class="fa-solid fa-compress"></i>';
        } else {
          document.exitFullscreen().catch(() => {});
          fsBtn.innerHTML = '<i class="fa-solid fa-expand"></i>';
        }
      });
    }
  }

  toggleMirrorMode() {
    const hudOverlay = document.getElementById('hud-driving-mode');
    const mirrorBtn = document.getElementById('btn-hud-mirror');
    if (!hudOverlay) return;

    this.isMirrored = !this.isMirrored;
    hudOverlay.classList.toggle('hud-mirrored', this.isMirrored);

    if (mirrorBtn) {
      mirrorBtn.classList.toggle('active', this.isMirrored);
      mirrorBtn.innerHTML = this.isMirrored 
        ? '<i class="fa-solid fa-arrows-split-up-and-left"></i> <span class="hud-btn-label">ปกติ</span>' 
        : '<i class="fa-solid fa-arrows-left-right"></i> <span class="hud-btn-label">สะท้อน</span>';
    }

    if (this.isMirrored) {
      window.app.showToast('🪞 เปิดโหมดสะท้อนกระจกหน้ารถ: วางโทรศัพท์หงายบนคอนโซลหน้ารถ', 'info');
      window.voiceManager.speak('เปิดโหมดสะท้อนกระจกหน้ารถ วางโทรศัพท์บนคอนโซลหน้ารถเพื่อมองภาพสะท้อนค่ะ');
    } else {
      window.app.showToast('📱 กลับสู่มุมมองหน้าจอปกติ', 'info');
    }
  }

  openHUD() {
    const hudOverlay = document.getElementById('hud-driving-mode');
    if (!hudOverlay) return;

    this.isActive = true;
    hudOverlay.classList.add('active');
    document.body.classList.add('in-hud-mode');

    // Update bottom nav tabs so 'hud' is active
    if (window.deviceManager) {
      window.deviceManager.activeMobileTab = 'hud';
      document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === 'hud');
      });
    }

    // Push state to browser history for Android / mobile back button handling
    try {
      if (!window.history.state || !window.history.state.hudActive) {
        window.history.pushState({ hudActive: true }, '');
      }
    } catch (e) {}

    // Start GPS high-precision watch
    this.startGPSWatch();

    // Prevent phone screen from turning off while driving (Screen Wake Lock)
    if (window.deviceManager) {
      window.deviceManager.requestWakeLock('โหมดขับขี่ HUD');
    }

    // Voice announcement
    window.voiceManager.speak('เข้าสู่โหมดขับขี่เสมือนจริง ขอให้เดินทางโดยสวัสดิภาพค่ะ');
    window.soundManager.playSuccess();

    this.updateHUDDisplay();
  }

  closeHUD(switchTab = true, handleHistory = true) {
    const hudOverlay = document.getElementById('hud-driving-mode');
    if (!hudOverlay) return;

    this.isActive = false;
    hudOverlay.classList.remove('active');
    document.body.classList.remove('in-hud-mode');

    // Release Screen Wake Lock
    if (window.deviceManager) {
      window.deviceManager.releaseWakeLock();
    }

    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.isSimulating) {
      this.stopDrivingSimulation();
    }

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    // Pop history if state was pushed
    if (handleHistory && window.history.state && window.history.state.hudActive) {
      try {
        window.history.back();
      } catch (e) {}
    }

    // Restore mobile bottom navigation state if on mobile
    if (switchTab && window.deviceManager && window.deviceManager.isMobileView) {
      const targetTab = window.deviceManager.isSheetOpen ? 'checkpoints' : 'map';
      window.deviceManager.switchMobileTab(targetTab);
    }
  }

  startGPSWatch() {
    if ('geolocation' in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (this.isSimulating) return; // Don't override simulator

          const speedMs = pos.coords.speed;
          if (speedMs !== null && speedMs >= 0) {
            this.currentSpeed = speedMs * 3.6; // Convert m/s to km/h
          } else {
            this.currentSpeed = 0;
          }

          if (pos.coords.heading !== null && !isNaN(pos.coords.heading)) {
            this.heading = pos.coords.heading;
          }

          window.mapManager.setUserLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
          if (window.locationManager) {
            window.locationManager.reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          }
          window.app.checkProximityAlerts();
          this.updateHUDDisplay();
        },
        (err) => {
          console.warn('GPS watch error:', err);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 1000 }
      );
    }
  }

  // Toggle driving simulator for testing at home
  toggleDrivingSimulation() {
    if (this.isSimulating) {
      this.stopDrivingSimulation();
    } else {
      this.startDrivingSimulation();
    }
  }

  startDrivingSimulation() {
    this.isSimulating = true;
    const simBtn = document.getElementById('btn-toggle-hud-sim');
    if (simBtn) {
      simBtn.classList.add('active');
      simBtn.innerHTML = '<i class="fa-solid fa-stop"></i> <span class="hud-btn-label">หยุดจำลอง</span>';
    }

    // Start simulation path heading towards Ratchada Checkpoint (cp-101)
    let currentLat = 13.7950;
    let currentLng = 100.5740;
    const targetLat = 13.7709;
    const targetLng = 13.5735;

    this.simSpeed = 82;
    window.app.showToast('🏎️ เริ่มต้นระบบจำลองการขับขี่รถจริง (Simulation Drive)', 'success');
    window.voiceManager.speak('เริ่มจำลองการขับขี่รถจริง ตรวจจับด่านล่วงหน้าค่ะ');

    this.simInterval = setInterval(() => {
      // Fluctuate speed naturally between 75 - 98 km/h
      this.simSpeed += (Math.random() * 6 - 3);
      this.simSpeed = Math.max(50, Math.min(115, this.simSpeed));
      this.currentSpeed = this.simSpeed;

      // Move coordinates gradually south towards the checkpoint
      currentLat -= 0.0006;
      this.heading = 180; // Heading South

      window.mapManager.setUserLocation(currentLat, currentLng, 10);
      window.app.checkProximityAlerts();
      this.updateHUDDisplay();

      // Check if speed exceeds limit
      if (this.currentSpeed > this.speedLimit + 5) {
        window.soundManager.playWarningAlert();
      }
    }, 1200);
  }

  stopDrivingSimulation() {
    this.isSimulating = false;
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
    const simBtn = document.getElementById('btn-toggle-hud-sim');
    if (simBtn) {
      simBtn.classList.remove('active');
      simBtn.innerHTML = '<i class="fa-solid fa-car-side"></i> <span class="hud-btn-label">จำลอง</span>';
    }
    this.currentSpeed = 0;
    this.updateHUDDisplay();
    window.app.showToast('🛑 หยุดการจำลองการขับขี่เรียบร้อย', 'info');
  }

  updateHUDDisplay() {
    if (!this.isActive) return;

    // 1. Speedometer
    const speedValEl = document.getElementById('hud-speed-value');
    const speedUnitEl = document.getElementById('hud-speed-unit');
    const overspeedWarning = document.getElementById('hud-overspeed-tag');

    const roundedSpeed = Math.round(this.currentSpeed);
    if (speedValEl) speedValEl.textContent = roundedSpeed;

    const isOverLimit = roundedSpeed > this.speedLimit;
    if (overspeedWarning) {
      overspeedWarning.style.display = isOverLimit ? 'inline-flex' : 'none';
      if (isOverLimit) {
        speedValEl.classList.add('danger');
      } else {
        speedValEl.classList.remove('danger');
      }
    }

    // 2. Next Checkpoint Widget
    const nearest = window.app.nearestCheckpoint;
    const cpCard = document.getElementById('hud-next-cp-card');
    const cpTitle = document.getElementById('hud-next-cp-title');
    const cpDist = document.getElementById('hud-next-cp-dist');
    const cpLoc = document.getElementById('hud-next-cp-loc');
    const cpEta = document.getElementById('hud-next-cp-eta');
    const cpBadge = document.getElementById('hud-next-cp-badge');

    if (nearest && cpCard) {
      cpCard.style.display = 'flex';
      if (cpTitle) cpTitle.textContent = nearest.title;
      if (cpLoc) cpLoc.textContent = nearest.locationName;
      if (cpBadge) {
        cpBadge.className = `card-type-badge ${nearest.type}`;
        cpBadge.textContent = nearest.typeLabel;
      }

      const distKm = nearest.distanceKm;
      const distStr = distKm < 1 ? `${Math.round(distKm * 1000)} ม.` : `${distKm.toFixed(1)} กม.`;
      if (cpDist) cpDist.textContent = distStr;

      // Estimate time to arrival
      if (this.currentSpeed > 5) {
        const timeSec = (distKm / this.currentSpeed) * 3600;
        const min = Math.floor(timeSec / 60);
        const sec = Math.round(timeSec % 60);
        if (cpEta) cpEta.textContent = min > 0 ? `~${min} นาที ${sec} วิ` : `~${sec} วินาที`;
      } else {
        if (cpEta) cpEta.textContent = '-';
      }

      // Check for proximity sound/voice trigger in HUD
      if (distKm <= 2.0 && distKm > 0) {
        cpCard.classList.add('urgent-pulse');
        // Voice alert
        window.voiceManager.announceCheckpointWarning(nearest, distKm);
      } else {
        cpCard.classList.remove('urgent-pulse');
      }
    } else if (cpCard) {
      cpCard.style.display = 'none';
    }

    // 3. Compass Heading
    const compassEl = document.getElementById('hud-compass-direction');
    if (compassEl) {
      compassEl.textContent = this.getCompassDirection(this.heading);
    }

    // 4. Current Area Display
    const hudAreaEl = document.getElementById('hud-location-text');
    if (hudAreaEl && window.locationManager) {
      hudAreaEl.textContent = window.locationManager.getShortAreaText() || 'กำลังระบุพิกัด...';
    }
  }

  getCompassDirection(degree) {
    const directions = ['N (เหนือ)', 'NE (ตะวันออกเฉียงเหนือ)', 'E (ตะวันออก)', 'SE (ตะวันออกเฉียงใต้)', 'S (ใต้)', 'SW (ตะวันตกเฉียงใต้)', 'W (ตะวันตก)', 'NW (ตะวันตกเฉียงเหนือ)'];
    const idx = Math.round(degree / 45) % 8;
    return directions[idx] || 'N (เหนือ)';
  }
}

window.hudManager = new HUDManager();
