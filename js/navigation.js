// ==========================================================================
// Google Maps Style Turn-by-Turn Navigation Engine for CheckDan Thailand
// Supports Real-Time GPS Tracking, Route Steps Tab Sheet & Interactive Demo Simulation
// ==========================================================================

class NavigationManager {
  constructor() {
    this.isActive = false;
    this.isSimulating = false;
    this.navMode = 'gps'; // 'gps' (real vehicle movement) or 'sim' (demo simulation)
    this.watchId = null;
    this.activeRoute = null;
    this.steps = [];
    this.currentStepIndex = 0;
    this.carMarker = null;
    this.currentCarIndex = 0;
    this.simInterval = null;
    this.currentHeading = 0;
    this.currentSpeed = 0; // Starts at 0 km/h until real vehicle or demo moves!
    this.remainingDistanceKm = 0;
    this.remainingDurationMin = 0;
    this.lastAnnouncedStepIndex = -1;
    this.lastAnnouncedDistanceBucket = null;
    this.isRouteSheetOpen = false;
    this.activeSheetFilter = 'all';
    this.lastGPSCoords = null;
  }

  init() {
    console.log('[Navigation] Google Maps Navigation Engine initialized.');
    this.bindEvents();
  }

  // Bind UI event listeners for drawer, simulation toggle, filters & stops
  bindEvents() {
    // Bottom Sheet Open / Close toggles
    const btnToggleSheet = document.getElementById('btn-toggle-steps-sheet');
    const navSheetHandle = document.getElementById('nav-sheet-handle');
    const btnCloseSheet = document.getElementById('btn-close-route-sheet');
    const sheetCloseHandle = document.getElementById('sheet-close-handle');
    const btnShowStepsTop = document.getElementById('btn-show-steps-top');
    const btnSidebarSteps = document.getElementById('btn-view-route-steps-sidebar');

    const openSheetFn = () => this.toggleRouteSheet(true);
    const closeSheetFn = () => this.toggleRouteSheet(false);

    if (btnToggleSheet) btnToggleSheet.addEventListener('click', () => this.toggleRouteSheet());
    if (navSheetHandle) navSheetHandle.addEventListener('click', openSheetFn);
    if (btnShowStepsTop) btnShowStepsTop.addEventListener('click', openSheetFn);
    if (btnSidebarSteps) btnSidebarSteps.addEventListener('click', openSheetFn);
    if (btnCloseSheet) btnCloseSheet.addEventListener('click', closeSheetFn);
    if (sheetCloseHandle) sheetCloseHandle.addEventListener('click', closeSheetFn);

    // Simulation Demo Toggle Button
    const btnSim = document.getElementById('btn-toggle-nav-sim');
    if (btnSim) {
      btnSim.addEventListener('click', () => {
        this.toggleSimulation();
      });
    }

    // Sheet Filter Buttons
    const filterButtons = document.querySelectorAll('.sheet-filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeSheetFilter = btn.dataset.filter || 'all';
        this.renderRouteSheet();
      });
    });
  }

  // ==========================================================================
  // Start Turn-by-Turn Navigation (Waits for Real Vehicle Movement by Default)
  // ==========================================================================
  startNavigation(route) {
    if (!route || !route.latLngs || route.latLngs.length < 2) {
      if (window.app) window.app.showToast('⚠️ ไม่พบข้อมูลเส้นทางสำหรับการนำทาง', 'warning');
      return;
    }

    this.activeRoute = route;
    this.isActive = true;
    this.isSimulating = false;
    this.navMode = 'gps'; // REAL GPS by default!
    this.currentCarIndex = 0;
    this.currentStepIndex = 0;
    this.currentSpeed = 0;
    this.lastAnnouncedStepIndex = -1;
    this.lastAnnouncedDistanceBucket = null;

    // Generate comprehensive turn-by-turn maneuver steps with associated alerts
    this.steps = this.generateTurnSteps(route);
    this.remainingDistanceKm = route.distanceKm;
    this.remainingDurationMin = route.durationMin;

    // Show navigation UI overlays
    const navTopBanner = document.getElementById('nav-turn-banner');
    const navBottomBar = document.getElementById('nav-bottom-bar');
    if (navTopBanner) navTopBanner.classList.add('active');
    if (navBottomBar) navBottomBar.classList.add('active');

    // Create navigation vehicle marker at initial position
    const startCoord = route.latLngs[0];
    this.createCarMarker(startCoord);

    // Zoom into driver perspective view
    if (window.mapManager && window.mapManager.map) {
      window.mapManager.map.setView(startCoord, 16, { animate: true });
    }

    // Start Trip Logger session
    if (window.tripLogger) {
      window.tripLogger.startTrip(route);
    }

    // Update navigation UI & render Google Maps Route Steps drawer
    this.updateNavUI();
    this.renderRouteSheet();
    this.updateModeBadge(false);

    // Initial voice instruction
    const startStep = this.steps[0];
    const initialText = `เริ่มระบบนำทาง มุ่งหน้าสู่จุดหมายปลายทาง ระยะทาง ${Math.round(route.distanceKm)} กิโลเมตร ระบบอยู่ในโหมดติดตาม GPS รอการเคลื่อนที่ของยานพาหนะค่ะ ${startStep ? startStep.instruction : ''}`;
    window.voiceManager.speak(initialText, true);

    if (window.app) {
      window.app.showToast('🛰️ โหมดนำทาง GPS จริงพร้อมใช้งาน (รอรถเคลื่อนที่)', 'success');
    }

    // Keep mobile screen awake throughout navigation
    if (window.deviceManager) {
      window.deviceManager.requestWakeLock('การนำทางแบบเลี้ยวต่อเลี้ยว');
    }

    // Begin Real GPS Tracking (Does NOT move on its own)
    this.startGPSMode();
  }

  // ==========================================================================
  // Real GPS Tracking Mode (Listens to actual phone/vehicle movement)
  // ==========================================================================
  startGPSMode() {
    this.navMode = 'gps';
    this.isSimulating = false;
    if (this.simInterval) clearInterval(this.simInterval);
    this.updateModeBadge(false);

    if ('geolocation' in navigator) {
      if (this.watchId) navigator.geolocation.clearWatch(this.watchId);
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => this.handleGPSUpdate(pos),
        (err) => this.handleGPSError(err),
        { enableHighAccuracy: true, maximumAge: 1500, timeout: 12000 }
      );
    } else {
      console.warn('[Navigation] Geolocation not supported, falling back to static point.');
    }
  }

  handleGPSUpdate(pos) {
    if (!this.isActive) return;
    if (this.navMode !== 'gps') return; // In simulation mode, ignore real GPS

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const rawSpeed = pos.coords.speed; // meters per second
    const rawHeading = pos.coords.heading;

    // Convert speed to km/h (fallback to 0 if stationary or null)
    let speedKmH = (rawSpeed !== null && rawSpeed > 0.5) ? Math.round(rawSpeed * 3.6) : 0;

    // Calculate heading from consecutive GPS updates if device heading is unavailable
    if (rawHeading !== null && !isNaN(rawHeading) && rawHeading >= 0) {
      this.currentHeading = rawHeading;
    } else if (this.lastGPSCoords) {
      const d = window.mapManager.calculateDistance(this.lastGPSCoords.lat, this.lastGPSCoords.lng, lat, lng);
      if (d > 0.005) { // Moved at least 5 meters
        this.currentHeading = this.calculateBearing(this.lastGPSCoords.lat, this.lastGPSCoords.lng, lat, lng);
        if (speedKmH === 0 && d > 0.01) {
          speedKmH = Math.min(120, Math.round((d / 0.0015))); // approx km/h
        }
      }
    }
    this.lastGPSCoords = { lat, lng };
    this.currentSpeed = speedKmH;

    // Project user GPS coordinate to the closest point along route polyline
    const currentCoord = [lat, lng];
    this.updateVehiclePosition(currentCoord);

    // If speed > 5 km/h, record progress in trip logger
    if (window.tripLogger) {
      window.tripLogger.recordProgress(currentCoord, this.currentSpeed);
    }

    // Check step progression & trigger voice cues
    this.checkStepProgression(currentCoord);

    // Check proximity alerts for checkpoints, cameras & blackspots
    if (window.app) {
      window.mapManager.userCoords = { lat, lng };
      window.app.checkProximityAlerts();
    }

    this.updateNavUI();
  }

  handleGPSError(err) {
    console.warn('[Navigation] Geolocation error:', err.message);
    const modeText = document.getElementById('nav-mode-text');
    if (modeText) modeText.textContent = '🛰️ GPS: รอจับสัญญาณ';
  }

  // ==========================================================================
  // Demo Simulation Mode (Allows user to preview/test drive along the road)
  // ==========================================================================
  toggleSimulation() {
    if (!this.isActive) {
      const route = window.routeManager?.activeRoute || window.lastCalculatedRoute;
      if (route) {
        this.startNavigation(route);
      } else {
        if (window.app) window.app.showToast('⚠️ กรุณาสแกนเส้นทางก่อน', 'warning');
        return;
      }
    }

    if (this.isSimulating) {
      // Pause simulation and revert to real GPS
      this.isSimulating = false;
      this.navMode = 'gps';
      if (this.simInterval) clearInterval(this.simInterval);
      this.currentSpeed = 0;
      this.updateModeBadge(false);
      this.updateNavUI();
      if (window.app) window.app.showToast('⏸️ พักการจำลอง สลับกลับสู่โหมด GPS จริง', 'info');
    } else {
      // Start simulation
      this.startSimulation();
      if (window.app) window.app.showToast('▶️ เริ่มการจำลองการขับขี่ตัวอย่าง (Demo Simulation)', 'success');
      window.voiceManager.speak('เริ่มทดสอบขับเคลื่อนจำลองเสมือนจริงบนเส้นทางค่ะ', true);
    }
  }

  startSimulation() {
    this.isSimulating = true;
    this.navMode = 'sim';
    if (this.simInterval) clearInterval(this.simInterval);
    this.updateModeBadge(true);

    const latLngs = this.activeRoute.latLngs;
    const totalPoints = latLngs.length;

    this.simInterval = setInterval(() => {
      if (!this.isActive || !this.isSimulating) {
        clearInterval(this.simInterval);
        return;
      }

      this.currentCarIndex++;
      if (this.currentCarIndex >= totalPoints) {
        this.finishNavigation();
        return;
      }

      const prevCoord = latLngs[Math.max(0, this.currentCarIndex - 1)];
      const currentCoord = latLngs[this.currentCarIndex];

      // Calculate bearing angle from route points
      this.currentHeading = this.calculateBearing(prevCoord[0], prevCoord[1], currentCoord[0], currentCoord[1]);

      // Dynamic speed simulation (60 - 95 km/h)
      this.currentSpeed = 70 + Math.sin(this.currentCarIndex / 4) * 20;

      // Update position
      this.updateVehiclePosition(currentCoord);

      // Record in trip logger
      if (window.tripLogger) {
        window.tripLogger.recordProgress(currentCoord, this.currentSpeed);
      }

      // Check progression & proximity
      this.checkStepProgression(currentCoord);

      if (window.app) {
        window.mapManager.userCoords = { lat: currentCoord[0], lng: currentCoord[1] };
        window.app.checkProximityAlerts();
      }

      this.updateNavUI();
    }, 750);
  }

  // Common vehicle position updater
  updateVehiclePosition(coord) {
    if (this.carMarker) {
      this.carMarker.setLatLng(coord);
      const iconDiv = document.getElementById('nav-car-icon');
      if (iconDiv) {
        iconDiv.style.transform = `rotate(${this.currentHeading}deg)`;
      }
    }

    // Auto-pan map following car smoothly
    if (window.mapManager && window.mapManager.map) {
      window.mapManager.map.panTo(coord, { animate: true, duration: 0.4 });
    }

    // Recalculate remaining distance & duration
    const totalPoints = this.activeRoute.latLngs.length;
    const progressPercent = Math.min(1, Math.max(0, this.currentCarIndex / totalPoints));
    this.remainingDistanceKm = Math.max(0, this.activeRoute.distanceKm * (1 - progressPercent));
    this.remainingDurationMin = Math.max(0, this.activeRoute.durationMin * (1 - progressPercent));
  }

  // Update Status Badge (GPS vs Simulation)
  updateModeBadge(isSim) {
    const badgeEl = document.getElementById('nav-mode-badge');
    const textEl = document.getElementById('nav-mode-text');
    const btnSimText = document.getElementById('nav-sim-btn-text');
    const btnSim = document.getElementById('btn-toggle-nav-sim');

    if (badgeEl) {
      badgeEl.classList.toggle('sim-mode', isSim);
    }
    if (textEl) {
      textEl.textContent = isSim ? '🚗 โหมดจำลอง' : '🛰️ GPS สด (รอเคลื่อนที่)';
    }
    if (btnSimText) {
      btnSimText.textContent = isSim ? 'พักจำลอง' : 'ขับจำลอง';
    }
    if (btnSim) {
      btnSim.innerHTML = isSim 
        ? '<i class="fa-solid fa-pause"></i> <span id="nav-sim-btn-text">พักจำลอง</span>'
        : '<i class="fa-solid fa-play"></i> <span id="nav-sim-btn-text">ขับจำลอง</span>';
    }
  }

  // ==========================================================================
  // Generate Detailed Turn Steps with Attached Checkpoints & Blackspots
  // ==========================================================================
  generateTurnSteps(route) {
    const latLngs = route.latLngs;
    const totalPoints = latLngs.length;
    const steps = [];

    // Step 0: Departure
    steps.push({
      index: 0,
      type: 'depart',
      icon: 'fa-arrow-up',
      instruction: 'เริ่มต้นการเดินทาง มุ่งหน้าตรงไปตามถนนสายหลัก',
      subInstruction: 'ตรงไปตามแนวเส้นทาง',
      distanceMeters: 450,
      latLng: latLngs[0],
      checkpoints: [],
      cameras: [],
      blackspots: []
    });

    const segmentCount = Math.min(10, Math.max(4, Math.floor(totalPoints / 20)));
    const interval = Math.floor(totalPoints / (segmentCount + 1));

    const maneuverPool = [
      { type: 'slight-right', icon: 'fa-arrow-turn-up-right', text: 'เบี่ยงขวา เข้าสู่ทางหลวงสายหลัก (ทล.1/ทล.2)', sub: 'เตรียมเข้าช่องจราจรด้านขวา' },
      { type: 'turn-left', icon: 'fa-arrow-turn-left', text: 'เลี้ยวซ้าย เข้าสู่ทางคู่ขนาน/ทางหลวงชนบท', sub: 'ชะลอความเร็วก่อนเลี้ยว' },
      { type: 'straight', icon: 'fa-arrow-up', text: 'ตรงต่อไปตามแนวเส้นทางหลวงสายเอเชีย', sub: 'ใช้ความเร็วตามกฎหมายกำหนด' },
      { type: 'slight-left', icon: 'fa-arrow-turn-up-left', text: 'เบี่ยงซ้าย ขึ้นสะพานข้ามทางแยก/ทางยกระดับ', sub: 'มุ่งหน้าตามป้ายบอกทาง' },
      { type: 'turn-right', icon: 'fa-arrow-turn-right', text: 'เลี้ยวขวา มุ่งหน้าสู่ถนนบายพาสเลี่ยงเมือง', sub: 'เปิดสัญญาณไฟเลี้ยว' },
      { type: 'straight', icon: 'fa-arrow-up', text: 'ขับตรงต่อไปในเส้นทางหลัก', sub: 'รักษาระยะห่างจากคันหน้า' }
    ];

    for (let i = 1; i <= segmentCount; i++) {
      const idx = Math.min(totalPoints - 2, i * interval);
      const stepCoord = latLngs[idx];
      const stepDistMeters = Math.round((route.distanceKm * 1000) / (segmentCount + 1));
      const tpl = maneuverPool[(i - 1) % maneuverPool.length];

      // Find checkpoints or cameras near this segment
      const nearbyCps = (route.detectedCheckpoints || []).filter(cp => {
        const d = window.mapManager.calculateDistance(stepCoord[0], stepCoord[1], cp.lat, cp.lng);
        return d <= 3.5;
      });

      // Find blackspots near this segment
      const nearbyBs = (window.blackspotManager?.blackspots || []).filter(bs => {
        const d = window.mapManager.calculateDistance(stepCoord[0], stepCoord[1], bs.lat, bs.lng);
        return d <= 3.0;
      });

      steps.push({
        index: i,
        type: tpl.type,
        icon: tpl.icon,
        instruction: tpl.text,
        subInstruction: tpl.sub,
        distanceMeters: stepDistMeters,
        latLng: stepCoord,
        checkpoints: nearbyCps.filter(c => c.type !== 'speed'),
        cameras: nearbyCps.filter(c => c.type === 'speed'),
        blackspots: nearbyBs
      });
    }

    // Final Arrival Step
    const destName = (route.dest && route.dest.name) ? route.dest.name : 'จุดหมายปลายทาง';
    steps.push({
      index: steps.length,
      type: 'arrive',
      icon: 'fa-flag-checkered',
      instruction: `คุณจะถึงจุดหมายปลายทาง (${destName})`,
      subInstruction: 'เตรียมหาที่จอดรถอย่างปลอดภัย',
      distanceMeters: 200,
      latLng: latLngs[totalPoints - 1],
      checkpoints: [],
      cameras: [],
      blackspots: []
    });

    return steps;
  }

  // ==========================================================================
  // Google Maps Style Route Steps Sheet (Tab Drawer)
  // ==========================================================================
  toggleRouteSheet(forceState) {
    const sheet = document.getElementById('nav-route-sheet');
    if (!sheet) return;

    if (forceState !== undefined) {
      this.isRouteSheetOpen = forceState;
    } else {
      this.isRouteSheetOpen = !this.isRouteSheetOpen;
    }

    sheet.classList.toggle('active', this.isRouteSheetOpen);

    if (this.isRouteSheetOpen) {
      this.renderRouteSheet();
      // Scroll to current active step
      setTimeout(() => {
        const activeCard = document.querySelector('.nav-step-card.active');
        if (activeCard) {
          activeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);
    }
  }

  renderRouteSheet() {
    const listContainer = document.getElementById('nav-route-steps-list');
    if (!listContainer) return;

    const route = this.activeRoute || window.routeManager?.activeRoute || window.lastCalculatedRoute;
    if (!route || !this.steps || this.steps.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 30px 10px;">
          <i class="fa-solid fa-route" style="font-size: 32px; color: var(--border-highlight); margin-bottom: 8px;"></i>
          <p>ยังไม่มีข้อมูลขั้นตอนเส้นทาง กรุณาคำนวณเส้นทางก่อนค่ะ</p>
        </div>
      `;
      return;
    }

    // Update Header Meta
    const destName = route.dest?.name || 'จุดหมายปลายทาง';
    const titleEl = document.getElementById('sheet-dest-title');
    const distEl = document.getElementById('sheet-total-dist');
    const timeEl = document.getElementById('sheet-total-time');
    const etaEl = document.getElementById('sheet-eta-time');

    if (titleEl) titleEl.textContent = `มุ่งหน้าสู่: ${destName}`;
    if (distEl) distEl.textContent = `${this.remainingDistanceKm.toFixed(1)} กม.`;
    if (timeEl) timeEl.textContent = `${Math.max(1, Math.round(this.remainingDurationMin))} นาที`;

    if (etaEl) {
      const etaDate = new Date(Date.now() + this.remainingDurationMin * 60000);
      const hours = String(etaDate.getHours()).padStart(2, '0');
      const mins = String(etaDate.getMinutes()).padStart(2, '0');
      etaEl.textContent = `${hours}:${mins} น.`;
    }

    // Counts for filter pills
    let totalCps = 0;
    let totalCams = 0;
    let totalBs = 0;

    this.steps.forEach(s => {
      totalCps += (s.checkpoints || []).length;
      totalCams += (s.cameras || []).length;
      totalBs += (s.blackspots || []).length;
    });

    const countAllEl = document.getElementById('sheet-count-all');
    const countCpEl = document.getElementById('sheet-count-cp');
    const countCamEl = document.getElementById('sheet-count-cam');
    const countBsEl = document.getElementById('sheet-count-bs');

    if (countAllEl) countAllEl.textContent = this.steps.length;
    if (countCpEl) countCpEl.textContent = totalCps;
    if (countCamEl) countCamEl.textContent = totalCams;
    if (countBsEl) countBsEl.textContent = totalBs;

    // Filter Steps based on active filter
    let filteredSteps = this.steps;
    if (this.activeSheetFilter === 'checkpoints') {
      filteredSteps = this.steps.filter(s => (s.checkpoints || []).length > 0);
    } else if (this.activeSheetFilter === 'cameras') {
      filteredSteps = this.steps.filter(s => (s.cameras || []).length > 0);
    } else if (this.activeSheetFilter === 'blackspots') {
      filteredSteps = this.steps.filter(s => (s.blackspots || []).length > 0);
    }

    if (filteredSteps.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 30px 10px;">
          <i class="fa-solid fa-circle-check" style="font-size: 32px; color: #10b981; margin-bottom: 8px;"></i>
          <p>ไม่พบรายการตามตัวกรองนี้ ปลอดภัยตลอดสายทาง!</p>
        </div>
      `;
      return;
    }

    let html = '';
    filteredSteps.forEach((step) => {
      const isCurrent = step.index === this.currentStepIndex;
      const isPassed = step.index < this.currentStepIndex;

      let cardClass = 'nav-step-card';
      if (isCurrent) cardClass += ' active';
      if (isPassed) cardClass += ' passed';

      const d = step.distanceMeters;
      const distStr = d < 1000 ? `${Math.round(d)} ม.` : `${(d / 1000).toFixed(1)} กม.`;

      // Alert tags
      let alertsHtml = '';
      (step.checkpoints || []).forEach(cp => {
        alertsHtml += `<span class="step-alert-badge checkpoint"><i class="fa-solid fa-shield-halved"></i> ด่าน: ${cp.title}</span>`;
      });
      (step.cameras || []).forEach(cam => {
        alertsHtml += `<span class="step-alert-badge camera"><i class="fa-solid fa-camera"></i> กล้องจับความเร็ว: ${cam.title}</span>`;
      });
      (step.blackspots || []).forEach(bs => {
        alertsHtml += `<span class="step-alert-badge blackspot"><i class="fa-solid fa-triangle-exclamation"></i> จุดเสี่ยง: ${bs.title}</span>`;
      });

      // Status tag
      let statusTag = '';
      if (isCurrent) {
        statusTag = `<span class="step-status-tag active">📍 กำลังเดินทางถึงจุดนี้</span>`;
      } else if (isPassed) {
        statusTag = `<span class="step-status-tag passed">✓ ผ่านแล้ว</span>`;
      }

      html += `
        <div class="${cardClass}" style="flex-shrink: 0;" onclick="window.navigationManager.focusStepOnMap(${step.index})">
          <div class="step-icon-col">
            <i class="fa-solid ${step.icon}"></i>
          </div>
          <div class="step-info-col">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="step-dist-text">${distStr}</span>
              ${statusTag}
            </div>
            <div class="step-inst-text">${step.instruction}</div>
            <div class="step-sub-text">${step.subInstruction || ''}</div>
            ${alertsHtml ? `<div class="step-alerts-row">${alertsHtml}</div>` : ''}
          </div>
        </div>
      `;
    });

    listContainer.innerHTML = html;
  }

  // Pan and highlight a specific step on the map
  focusStepOnMap(stepIndex) {
    const step = this.steps[stepIndex];
    if (step && step.latLng && window.mapManager && window.mapManager.map) {
      window.mapManager.map.setView(step.latLng, 16, { animate: true });
      if (window.app) {
        window.app.showToast(`🔍 ดูจุดเลี้ยว: ${step.instruction}`, 'info');
      }
    }
  }

  // Check progression towards next turn step and announce voice
  checkStepProgression(currentCoord) {
    const nextStep = this.steps[this.currentStepIndex + 1];
    if (!nextStep) return;

    const dist = window.mapManager.calculateDistance(
      currentCoord[0], currentCoord[1],
      nextStep.latLng[0], nextStep.latLng[1]
    );
    const distMeters = dist * 1000;

    const currentStep = this.steps[this.currentStepIndex];
    if (currentStep) {
      currentStep.distanceMeters = distMeters;
    }

    // Voice announcement triggers: 500m, 150m, and immediate maneuver
    if (distMeters <= 550 && distMeters > 300 && this.lastAnnouncedDistanceBucket !== 500) {
      this.lastAnnouncedDistanceBucket = 500;
      window.voiceManager.announceNavigationManeuver(nextStep.instruction, 500);
      window.soundManager.playRadarPing();
    } else if (distMeters <= 180 && distMeters > 50 && this.lastAnnouncedDistanceBucket !== 150) {
      this.lastAnnouncedDistanceBucket = 150;
      window.voiceManager.announceNavigationManeuver(nextStep.instruction, 150);
      window.soundManager.playWarningAlert();
    } else if (distMeters <= 50) {
      // Advance to next step!
      this.currentStepIndex++;
      this.lastAnnouncedDistanceBucket = null;
      window.voiceManager.announceNavigationManeuver(`${nextStep.instruction} ทันที`, 0);
      this.renderRouteSheet();
    }
  }

  // Create customized animated Car Marker
  createCarMarker(latLng) {
    if (this.carMarker && window.mapManager && window.mapManager.map) {
      window.mapManager.map.removeLayer(this.carMarker);
    }

    const carIconHtml = `
      <div class="nav-car-marker" id="nav-car-icon" style="transform: rotate(${this.currentHeading}deg);">
        <div class="car-halo"></div>
        <div class="car-body">
          <i class="fa-solid fa-location-arrow"></i>
        </div>
      </div>
    `;

    const icon = L.divIcon({
      className: 'nav-car-div-icon',
      html: carIconHtml,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    this.carMarker = L.marker(latLng, { icon, zIndexOffset: 2000 });
    this.carMarker.addTo(window.mapManager.map);
  }

  // Update top turn maneuver banner and bottom stats bar
  updateNavUI() {
    const currentStep = this.steps[this.currentStepIndex] || this.steps[this.steps.length - 1];
    const nextStep = this.steps[this.currentStepIndex + 1] || null;

    // Top Turn Banner
    const iconEl = document.getElementById('nav-maneuver-icon');
    const distEl = document.getElementById('nav-maneuver-dist');
    const titleEl = document.getElementById('nav-maneuver-text');
    const subEl = document.getElementById('nav-next-maneuver');

    if (currentStep) {
      if (iconEl) iconEl.className = `fa-solid ${currentStep.icon}`;
      if (distEl) {
        const d = currentStep.distanceMeters;
        distEl.textContent = d < 1000 ? `${Math.round(d)} ม.` : `${(d / 1000).toFixed(1)} กม.`;
      }
      if (titleEl) titleEl.textContent = currentStep.instruction;
      if (subEl) {
        subEl.textContent = nextStep ? `จากนั้น: ${nextStep.instruction}` : (currentStep.subInstruction || 'มุ่งหน้าสู่จุดหมายปลายทาง');
      }
    }

    // Bottom Stats Bar
    const remDistEl = document.getElementById('nav-stat-rem-dist');
    const remTimeEl = document.getElementById('nav-stat-rem-time');
    const etaEl = document.getElementById('nav-stat-eta');
    const speedEl = document.getElementById('nav-stat-speed');

    if (remDistEl) remDistEl.textContent = `${this.remainingDistanceKm.toFixed(1)} กม.`;
    if (remTimeEl) remTimeEl.textContent = `${Math.max(1, Math.round(this.remainingDurationMin))} นาที`;
    if (speedEl) speedEl.textContent = `${Math.round(this.currentSpeed)} กม./ชม.`;

    if (etaEl) {
      const etaDate = new Date(Date.now() + this.remainingDurationMin * 60000);
      const hours = String(etaDate.getHours()).padStart(2, '0');
      const mins = String(etaDate.getMinutes()).padStart(2, '0');
      etaEl.textContent = `${hours}:${mins} น.`;
    }
  }

  // Calculate bearing angle between two lat/lng coordinates
  calculateBearing(lat1, lng1, lat2, lng2) {
    const toRad = Math.PI / 180;
    const toDeg = 180 / Math.PI;
    const phi1 = lat1 * toRad;
    const phi2 = lat2 * toRad;
    const deltaLambda = (lng2 - lng1) * toRad;

    const y = Math.sin(deltaLambda) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
    const theta = Math.atan2(y, x);
    return ((theta * toDeg) + 360) % 360;
  }

  // Finish navigation upon arrival
  finishNavigation() {
    this.stopNavigation();
    window.soundManager.playSuccess();
    window.voiceManager.speak('คุณได้เดินทางถึงจุดหมายปลายทางโดยสวัสดิภาพแล้วค่ะ ระบบได้บันทึกสรุปข้อมูลการเดินทางให้เรียบร้อยแล้วค่ะ', true);

    if (window.tripLogger) {
      window.tripLogger.finishTrip();
    }

    if (window.app) {
      window.app.showToast('🎉 คุณถึงจุดหมายปลายทางเรียบร้อยแล้ว!', 'success');
    }
  }

  // Stop / Exit turn-by-turn navigation
  stopNavigation() {
    this.isActive = false;
    this.isSimulating = false;
    if (this.simInterval) clearInterval(this.simInterval);
    if (this.watchId && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.carMarker && window.mapManager && window.mapManager.map) {
      window.mapManager.map.removeLayer(this.carMarker);
      this.carMarker = null;
    }

    const navTopBanner = document.getElementById('nav-turn-banner');
    const navBottomBar = document.getElementById('nav-bottom-bar');
    const navRouteSheet = document.getElementById('nav-route-sheet');

    if (navTopBanner) navTopBanner.classList.remove('active');
    if (navBottomBar) navBottomBar.classList.remove('active');
    if (navRouteSheet) navRouteSheet.classList.remove('active');

    this.isRouteSheetOpen = false;
    this.currentSpeed = 0;

    // Release Screen Wake Lock
    if (window.deviceManager) {
      window.deviceManager.releaseWakeLock();
    }

    if (window.app) window.app.showToast('🛑 สิ้นสุดระบบนำทางแล้ว', 'info');
  }
}

window.navigationManager = new NavigationManager();
