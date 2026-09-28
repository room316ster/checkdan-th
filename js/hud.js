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
        this.closeHUD();
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

  openHUD() {
    const hudOverlay = document.getElementById('hud-driving-mode');
    if (!hudOverlay) return;

    this.isActive = true;
    hudOverlay.classList.add('active');
    document.body.classList.add('in-hud-mode');

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

  closeHUD() {
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
      simBtn.innerHTML = '<i class="fa-solid fa-stop"></i> หยุดจำลองการขับ';
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
      simBtn.innerHTML = '<i class="fa-solid fa-car-side"></i> จำลองขับรถ';
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
  }

  getCompassDirection(degree) {
    const directions = ['N (เหนือ)', 'NE (ตะวันออกเฉียงเหนือ)', 'E (ตะวันออก)', 'SE (ตะวันออกเฉียงใต้)', 'S (ใต้)', 'SW (ตะวันตกเฉียงใต้)', 'W (ตะวันตก)', 'NW (ตะวันตกเฉียงเหนือ)'];
    const idx = Math.round(degree / 45) % 8;
    return directions[idx] || 'N (เหนือ)';
  }
}

window.hudManager = new HUDManager();
