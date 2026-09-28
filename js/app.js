// Main Application Controller for CheckDan Thailand (Full Ecosystem)
class CheckDanApp {
  constructor() {
    this.checkpoints = [];
    this.activeFilter = 'all';
    this.selectedProvince = 'all';
    this.searchQuery = '';
    this.selectedCheckpoint = null;
    this.nearestCheckpoint = null;
    this.radarDistanceThresholdKm = 3.0;
    this.activeTab = 'checkpoints';
    this.deferredPwaPrompt = null;
  }

  async init() {
    console.log('Initializing CheckDan App with Voice, Driving HUD, SOS & PWA...');
    
    // 1. Initialize Map
    window.mapManager.init('map');
    window.mapManager.onMapClickCallback = (latlng) => {
      this.openReportModalWithCoords(latlng.lat, latlng.lng);
    };

    // 2. Populate 77 Provinces in Dropdowns
    this.populateProvinceDropdowns();

    // 3. Load Checkpoint Data (GitHub / LocalStorage / Fallback)
    await this.refreshData();

    // 4. Initialize Extension Modules
    if (window.hudManager) window.hudManager.init();
    if (window.sosManager) window.sosManager.init();

    // 5. Bind UI Events
    this.bindEvents();

    // 6. Register PWA Service Worker & Install Prompt
    this.initPWA();

    // 7. Update UI stats
    this.updateStats();

    // 8. Request user geolocation automatically
    this.requestUserLocation(false);
  }

  populateProvinceDropdowns() {
    const filterSelect = document.getElementById('province-filter-select');
    const originSelect = document.getElementById('route-origin-select');
    const destSelect = document.getElementById('route-dest-select');
    const reportSelect = document.getElementById('report-province-select');

    if (!window.THAILAND_PROVINCES) return;

    const regions = ['central', 'north', 'northeast', 'east', 'west', 'south'];
    
    regions.forEach(regionKey => {
      const regionName = window.REGION_LABELS[regionKey] || regionKey;
      const provsInRegion = window.THAILAND_PROVINCES.filter(p => p.region === regionKey);

      const createOptGroup = (title) => {
        const group = document.createElement('optgroup');
        group.label = `--- ${title} ---`;
        provsInRegion.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = p.name;
          group.appendChild(opt);
        });
        return group;
      };

      if (filterSelect) {
        const grp = document.createElement('optgroup');
        grp.label = `--- ${regionName} ---`;
        provsInRegion.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.name;
          opt.textContent = p.name;
          grp.appendChild(opt);
        });
        filterSelect.appendChild(grp);
      }

      if (originSelect) originSelect.appendChild(createOptGroup(regionName));
      if (destSelect) destSelect.appendChild(createOptGroup(regionName));
      
      if (reportSelect) {
        const grp = document.createElement('optgroup');
        grp.label = `--- ${regionName} ---`;
        provsInRegion.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.name;
          opt.textContent = p.name;
          if (p.id === 'BKK') opt.selected = true;
          grp.appendChild(opt);
        });
        reportSelect.appendChild(grp);
      }
    });
  }

  async refreshData() {
    this.checkpoints = await window.githubSync.loadCheckpoints();
    this.render();
  }

  bindEvents() {
    // Tab Switching (Checkpoints vs Route)
    const tabCheckpoints = document.getElementById('tab-btn-checkpoints');
    const tabRoute = document.getElementById('tab-btn-route');
    const viewCheckpoints = document.getElementById('view-checkpoints');
    const viewRoute = document.getElementById('view-route');

    if (tabCheckpoints && tabRoute) {
      tabCheckpoints.addEventListener('click', () => {
        tabCheckpoints.classList.add('active');
        tabRoute.classList.remove('active');
        viewCheckpoints.classList.add('active');
        viewRoute.classList.remove('active');
        this.activeTab = 'checkpoints';
      });

      tabRoute.addEventListener('click', () => {
        tabRoute.classList.add('active');
        tabCheckpoints.classList.remove('active');
        viewRoute.classList.add('active');
        viewCheckpoints.classList.remove('active');
        this.activeTab = 'route';
      });
    }

    // Voice Alert Toggle Button
    const voiceToggle = document.getElementById('btn-voice-toggle');
    if (voiceToggle) {
      voiceToggle.addEventListener('click', () => {
        const isEnabled = window.voiceManager.toggleVoice();
        voiceToggle.classList.toggle('active', isEnabled);
        voiceToggle.classList.toggle('muted', !isEnabled);
        if (isEnabled) {
          window.voiceManager.testVoice();
          this.showToast('🗣️ เปิดระบบเสียงพูดเตือนภาษาไทยอัตโนมัติเรียบร้อย', 'success');
        } else {
          this.showToast('🔇 ปิดเสียงพูดเตือนภาษาไทย', 'info');
        }
      });
    }

    // Audio Sound Synthesizer Toggle
    const soundToggle = document.getElementById('btn-sound-toggle');
    if (soundToggle) {
      soundToggle.addEventListener('click', () => {
        const isEnabled = window.soundManager.toggleSound();
        soundToggle.innerHTML = isEnabled 
          ? '<i class="fa-solid fa-volume-high"></i>' 
          : '<i class="fa-solid fa-volume-xmark"></i>';
        soundToggle.classList.toggle('muted', !isEnabled);
        if (isEnabled) window.soundManager.playSuccess();
      });
    }

    // Province Filter Dropdown
    const provFilterSelect = document.getElementById('province-filter-select');
    if (provFilterSelect) {
      provFilterSelect.addEventListener('change', (e) => {
        this.selectedProvince = e.target.value;
        if (this.selectedProvince !== 'all') {
          const found = window.THAILAND_PROVINCES.find(p => p.name === this.selectedProvince);
          if (found) {
            window.mapManager.flyTo(found.lat, found.lng, 10);
            this.showToast(`🇹🇭 เลือกดูจุดตรวจในจังหวัด: ${found.name}`, 'info');
          }
        } else {
          window.mapManager.flyTo(13.7563, 100.5018, 7);
        }
        this.render();
      });
    }

    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.render();
      });
    }

    // Filter pills
    const filterButtons = document.querySelectorAll('.filter-chip');
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeFilter = btn.dataset.filter;
        this.render();
      });
    });

    // Locate Me Button
    const locateBtn = document.getElementById('btn-locate-me');
    if (locateBtn) {
      locateBtn.addEventListener('click', () => {
        this.requestUserLocation(true);
      });
    }

    // Map Theme Selectors
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        themeButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        window.mapManager.setMapTheme(btn.dataset.theme);
      });
    });

    // Radar Range Selector
    const radarRangeSelect = document.getElementById('radar-range');
    if (radarRangeSelect) {
      radarRangeSelect.addEventListener('change', (e) => {
        const km = parseFloat(e.target.value);
        this.radarDistanceThresholdKm = km;
        window.mapManager.setRadarRadius(km * 1000);
        this.checkProximityAlerts();
      });
    }

    // Route Calculate Button
    const btnCalcRoute = document.getElementById('btn-calculate-route');
    if (btnCalcRoute) {
      btnCalcRoute.addEventListener('click', () => {
        this.handleCalculateRoute();
      });
    }

    // Quick Route Preset Buttons
    const presetButtons = document.querySelectorAll('.preset-route-btn');
    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const originId = btn.dataset.origin;
        const destId = btn.dataset.dest;

        const originSelect = document.getElementById('route-origin-select');
        const destSelect = document.getElementById('route-dest-select');

        if (originSelect) originSelect.value = originId;
        if (destSelect) destSelect.value = destId;

        this.handleCalculateRoute();
      });
    });

    // Route Share Button
    const btnRouteShare = document.getElementById('btn-route-share');
    if (btnRouteShare) {
      btnRouteShare.addEventListener('click', () => {
        if (window.routeManager.activeRoute) {
          window.socialManager.shareRoute(
            window.routeManager.activeRoute,
            window.routeManager.activeRoute.detectedCheckpoints || []
          );
        }
      });
    }

    // Clear Route Button
    const btnClearRoute = document.getElementById('btn-clear-route');
    if (btnClearRoute) {
      btnClearRoute.addEventListener('click', () => {
        window.routeManager.clearRoute(window.mapManager.map);
        const resultWrap = document.getElementById('route-result-wrapper');
        if (resultWrap) resultWrap.style.display = 'none';
        this.showToast('🧹 ล้างเส้นทางเรียบร้อยแล้ว', 'info');
      });
    }

    // Report Checkpoint Modal Openers
    const reportButtons = document.querySelectorAll('.btn-open-report');
    reportButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.openReportModal();
      });
    });

    // GitHub Modal Triggers
    const githubBtn = document.getElementById('btn-github-settings');
    if (githubBtn) {
      githubBtn.addEventListener('click', () => {
        this.openGitHubModal();
      });
    }

    // Checkpoint Detail Modal Share Button
    const btnDetailShare = document.getElementById('btn-detail-share');
    if (btnDetailShare) {
      btnDetailShare.addEventListener('click', () => {
        if (this.selectedCheckpoint) {
          window.socialManager.shareCheckpoint(this.selectedCheckpoint);
        }
      });
    }

    // Quick Simulation Location buttons
    const simButtons = document.querySelectorAll('.sim-preset-btn');
    simButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const lat = parseFloat(btn.dataset.lat);
        const lng = parseFloat(btn.dataset.lng);
        const label = btn.innerText;
        this.simulateUserLocation(lat, lng, label);
      });
    });

    // Form submission for reporting checkpoint
    const reportForm = document.getElementById('report-form');
    if (reportForm) {
      reportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitCheckpointReport();
      });
    }

    // Modal close buttons
    document.querySelectorAll('.modal-close, .modal-backdrop').forEach((el) => {
      el.addEventListener('click', () => {
        this.closeAllModals();
      });
    });
  }

  // Progressive Web App (PWA) Initialization
  initPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then((reg) => {
          reg.update();
          console.log('[PWA] Service Worker registered and updating:', reg.scope);
        }).catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
      });
    }

    // Intercept BeforeInstallPrompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPwaPrompt = e;
      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.classList.add('show');
    });

    const btnInstall = document.getElementById('btn-pwa-install');
    if (btnInstall) {
      btnInstall.addEventListener('click', () => {
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.classList.remove('show');
        if (this.deferredPwaPrompt) {
          this.deferredPwaPrompt.prompt();
          this.deferredPwaPrompt.userChoice.then((choice) => {
            console.log('[PWA] User choice:', choice.outcome);
            this.deferredPwaPrompt = null;
          });
        }
      });
    }

    const btnClosePwa = document.getElementById('btn-pwa-close');
    if (btnClosePwa) {
      btnClosePwa.addEventListener('click', () => {
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.classList.remove('show');
      });
    }
  }

  // Handle Route Calculation & Checkpoint Scanning
  async handleCalculateRoute() {
    const originSelect = document.getElementById('route-origin-select');
    const destSelect = document.getElementById('route-dest-select');
    const btnCalc = document.getElementById('btn-calculate-route');

    const originVal = originSelect ? originSelect.value : 'current';
    const destVal = destSelect ? destSelect.value : '';

    if (!destVal) {
      this.showToast('⚠️ กรุณาเลือกจุดหมายปลายทาง', 'warning');
      return;
    }

    let originCoords = null;
    if (originVal === 'current') {
      if (window.mapManager.userCoords) {
        originCoords = window.mapManager.userCoords;
      } else {
        originCoords = { lat: 13.7563, lng: 100.5018 };
      }
    } else {
      const origProv = window.THAILAND_PROVINCES.find(p => p.id === originVal);
      if (origProv) originCoords = { lat: origProv.lat, lng: origProv.lng };
    }

    let destCoords = null;
    const destProv = window.THAILAND_PROVINCES.find(p => p.id === destVal);
    if (destProv) {
      destCoords = { lat: destProv.lat, lng: destProv.lng };
    }

    if (!originCoords || !destCoords) {
      this.showToast('⚠️ ไม่สามารถระบุพิกัดเส้นทางได้', 'warning');
      return;
    }

    if (btnCalc) {
      btnCalc.disabled = true;
      btnCalc.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังคำนวณเส้นทาง & สแกนด่าน...';
    }

    try {
      const result = await window.routeManager.calculateRoute(originCoords, destCoords, this.checkpoints);
      window.routeManager.drawRouteOnMap(window.mapManager.map);
      this.renderRouteResults(result);
      window.soundManager.playSuccess();

      const count = (result.detectedCheckpoints || []).length;
      if (count > 0) {
        window.voiceManager.speak(`คำนวณเส้นทางเรียบร้อย ระยะทาง ${Math.round(result.distanceKm)} กิโลเมตร ตรวจพบด่านตรวจตลอดสายทาง ${count} จุดค่ะ`);
      } else {
        window.voiceManager.speak(`คำนวณเส้นทางเรียบร้อย ระยะทาง ${Math.round(result.distanceKm)} กิโลเมตร ไม่พบจุดตรวจด่านตลอดสายทาง ขอให้เดินทางโดยสวัสดิภาพค่ะ`);
      }

      this.showToast(`🚗 คำนวณเส้นทางสำเร็จ! ระยะทาง ${result.distanceKm.toFixed(1)} กม.`, 'success');
    } catch (err) {
      console.error('Routing calculation failed:', err);
      this.showToast('❌ ไม่สามารถคำนวณเส้นทางได้ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      if (btnCalc) {
        btnCalc.disabled = false;
        btnCalc.innerHTML = '<i class="fa-solid fa-magnifying-glass-location"></i> สแกนด่านตามเส้นทางนี้';
      }
    }
  }

  renderRouteResults(route) {
    const wrapper = document.getElementById('route-result-wrapper');
    const distEl = document.getElementById('route-stat-distance');
    const durEl = document.getElementById('route-stat-duration');
    const bannerEl = document.getElementById('route-warning-banner');
    const timelineEl = document.getElementById('route-timeline-list');

    if (!wrapper) return;
    wrapper.style.display = 'block';

    if (distEl) distEl.textContent = `${route.distanceKm.toFixed(1)} กม.`;
    if (durEl) durEl.textContent = window.routeManager.formatDuration(route.durationMin);

    const detected = route.detectedCheckpoints || [];

    if (bannerEl) {
      if (detected.length > 0) {
        bannerEl.className = 'route-checkpoint-warning-box has-checkpoints';
        bannerEl.innerHTML = `
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 18px;"></i>
          <span>ตรวจพบด่านตรวจบนเส้นทางนี้ ${detected.length} จุด! โปรดระมัดระวัง</span>
        `;
      } else {
        bannerEl.className = 'route-checkpoint-warning-box clear';
        bannerEl.innerHTML = `
          <i class="fa-solid fa-circle-check" style="font-size: 18px;"></i>
          <span>เส้นทางปลอดโปร่ง ไม่พบด่านตรวจตลอดสายทาง</span>
        `;
      }
    }

    if (timelineEl) {
      if (detected.length === 0) {
        timelineEl.innerHTML = '<div style="font-size: 12px; color: var(--text-dim); padding: 8px;">ไม่มีจุดตรวจด่านที่ตรงกับเส้นทางนี้</div>';
      } else {
        timelineEl.innerHTML = detected.map((cp) => {
          return `
            <div class="route-checkpoint-item" onclick="window.app.flyToAndOpen('${cp.id}')">
              <div class="item-header">
                <span class="card-type-badge ${cp.type}">${cp.typeLabel}</span>
                <span class="item-progress">กม. ที่ ~${Math.round((cp.routeProgressPercent / 100) * route.distanceKm)}</span>
              </div>
              <div class="item-title">${cp.title}</div>
              <div style="font-size: 11px; color: var(--text-muted); display: flex; justify-content: space-between;">
                <span><i class="fa-solid fa-location-dot"></i> ${cp.locationName} (${cp.province})</span>
                <span style="color: var(--neon-cyan); cursor: pointer;" onclick="event.stopPropagation(); window.socialManager.shareCheckpoint(window.app.checkpoints.find(c => c.id === '${cp.id}'));"><i class="fa-solid fa-share-nodes"></i></span>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  requestUserLocation(showNotice = false) {
    if ('geolocation' in navigator) {
      const locateBtn = document.getElementById('btn-locate-me');
      if (locateBtn) locateBtn.classList.add('loading');

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (locateBtn) locateBtn.classList.remove('loading');
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          window.mapManager.setUserLocation(lat, lng, pos.coords.accuracy);
          window.soundManager.playRadarPing();
          this.checkProximityAlerts();
          this.renderList();
          this.showToast('📍 ได้รับตำแหน่ง GPS ปัจจุบันของคุณเรียบร้อยแล้ว', 'success');
        },
        (err) => {
          if (locateBtn) locateBtn.classList.remove('loading');
          console.warn('Geolocation error or denied:', err);
          if (showNotice) {
            this.showToast('⚠️ ไม่สามารถเข้าถึงตำแหน่ง GPS ได้ คุณสามารถใช้ปุ่ม "พิกัดตัวอย่าง" ด้านล่างเพื่อทดสอบระบบได้ครับ', 'warning');
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
      );
    }
  }

  simulateUserLocation(lat, lng, name) {
    window.mapManager.setUserLocation(lat, lng, 20);
    window.soundManager.playRadarPing();
    this.checkProximityAlerts();
    this.renderList();
    this.showToast(`🎯 พิกัดตัวอย่าง: ${name}`, 'info');
  }

  // Check if any active checkpoint or speed camera is within proximity
  checkProximityAlerts() {
    const userCoords = window.mapManager.userCoords;
    const alertBanner = document.getElementById('proximity-radar-hud');
    const speedBanner = document.getElementById('speed-radar-hud');
    if (!userCoords) return;

    let nearest = null;
    let minDistance = Infinity;

    let nearestSpeed = null;
    let minSpeedDistance = Infinity;

    this.checkpoints.forEach((cp) => {
      if (cp.status === 'active') {
        const dist = window.mapManager.calculateDistance(userCoords.lat, userCoords.lng, cp.lat, cp.lng);
        
        // Track speed cameras specifically
        if (cp.type === 'speed') {
          if (dist < minSpeedDistance) {
            minSpeedDistance = dist;
            nearestSpeed = { ...cp, distanceKm: dist };
          }
        } else {
          // Track general checkpoints (alcohol, traffic, smoke, etc.)
          if (dist < minDistance) {
            minDistance = dist;
            nearest = { ...cp, distanceKm: dist };
          }
        }
      }
    });

    this.nearestCheckpoint = nearest || nearestSpeed;

    // 1. Dedicated Speed Camera & Radar Detection Warning
    if (nearestSpeed && nearestSpeed.distanceKm <= 2.5 && speedBanner) {
      const distStr = nearestSpeed.distanceKm < 1 
        ? `${Math.round(nearestSpeed.distanceKm * 1000)} เมตร` 
        : `${nearestSpeed.distanceKm.toFixed(1)} กิโลเมตร`;

      const currentDriverSpeed = window.hudManager ? Math.round(window.hudManager.currentSpeed) : 0;
      const speedLimit = 90;
      const isOverspeed = currentDriverSpeed > speedLimit;

      speedBanner.className = `speed-camera-radar-banner visible ${isOverspeed ? 'overspeed' : ''}`;
      speedBanner.innerHTML = `
        <div class="speed-radar-icon-box">
          <i class="fa-solid fa-camera-retro"></i>
        </div>
        <div class="speed-radar-info">
          <div class="speed-radar-badge-row">
            <span class="radar-pill cyan"><i class="fa-solid fa-satellite-dish"></i> ตรวจจับสัญญาณเรดาร์</span>
            <span class="radar-pill ${isOverspeed ? 'red' : 'cyan'}">
              ${isOverspeed ? '⚠️ ขับเร็วเกินกำหนด!' : '⚡ เรดาร์กล้องจับความเร็ว'}
            </span>
          </div>
          <div class="speed-radar-title">${nearestSpeed.title}</div>
          <div class="speed-radar-loc">${nearestSpeed.locationName} (${nearestSpeed.direction || 'จำกัด 90 กม./ชม.'})</div>
        </div>
        <div class="speed-radar-limit-box">
          <div class="mini-speed-limit">${speedLimit}</div>
          <div class="speed-dist-tag"><i class="fa-solid fa-crosshairs"></i> ${distStr}</div>
        </div>
      `;

      // Trigger Laser Speed Radar Detector Audio
      window.soundManager.playSpeedRadarAlert();

      // Voice warning for speed camera
      window.voiceManager.speak(`ระวังค่ะ! อีก ${distStr} ข้างหน้ามีกล้องตรวจจับความเร็ว จำกัดความเร็ว ${speedLimit} กิโลเมตรต่อชั่วโมง กรุณาชะลอความเร็วค่ะ`);
    } else if (speedBanner) {
      speedBanner.classList.remove('visible', 'overspeed');
    }

    // 2. General Checkpoint Warning (Alcohol, Traffic, Smoke, etc.)
    if (nearest && nearest.distanceKm <= this.radarDistanceThresholdKm && alertBanner) {
      const distStr = nearest.distanceKm < 1 
        ? `${Math.round(nearest.distanceKm * 1000)} เมตร` 
        : `${nearest.distanceKm.toFixed(1)} กิโลเมตร`;

      alertBanner.classList.add('visible', 'pulse-alert');
      alertBanner.innerHTML = `
        <div class="hud-alert-inner">
          <div class="hud-siren"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <div class="hud-content">
            <div class="hud-tag">🚨 ตรวจพบด่านในรัศมีใกล้ตัว (${distStr})</div>
            <div class="hud-title">${nearest.title}</div>
            <div class="hud-sub">${nearest.locationName} (${nearest.direction || 'ไม่ระบุฝั่ง'})</div>
          </div>
          <button class="hud-view-btn" onclick="window.app.flyToAndOpen('${nearest.id}')">
            <i class="fa-solid fa-crosshairs"></i> ส่องจุดด่าน
          </button>
        </div>
      `;

      window.soundManager.playWarningAlert();
      window.voiceManager.announceCheckpointWarning(nearest, nearest.distanceKm);
    } else if (alertBanner) {
      alertBanner.classList.remove('visible', 'pulse-alert');
    }

    // Update HUD display if active
    if (window.hudManager && window.hudManager.isActive) {
      window.hudManager.updateHUDDisplay();
    }
  }

  getFilteredCheckpoints() {
    return this.checkpoints.filter((cp) => {
      if (this.selectedProvince && this.selectedProvince !== 'all') {
        if (cp.province !== this.selectedProvince) return false;
      }

      if (this.activeFilter === 'cleared') {
        if (cp.status !== 'cleared') return false;
      } else if (this.activeFilter !== 'all') {
        if (cp.type !== this.activeFilter || cp.status === 'cleared') return false;
      }

      if (this.searchQuery) {
        const text = `${cp.title} ${cp.locationName} ${cp.province} ${cp.district || ''} ${cp.typeLabel} ${cp.description || ''}`.toLowerCase();
        if (!text.includes(this.searchQuery)) return false;
      }

      return true;
    });
  }

  render() {
    const filtered = this.getFilteredCheckpoints();
    
    const userCoords = window.mapManager.userCoords;
    if (userCoords) {
      filtered.sort((a, b) => {
        const distA = window.mapManager.calculateDistance(userCoords.lat, userCoords.lng, a.lat, a.lng);
        const distB = window.mapManager.calculateDistance(userCoords.lat, userCoords.lng, b.lat, b.lng);
        return distA - distB;
      });
    }

    window.mapManager.renderCheckpoints(filtered, (cp) => {
      this.highlightCheckpointInList(cp.id);
    });

    this.renderList(filtered);
    this.updateStats();
  }

  renderList(items = null) {
    const list = items || this.getFilteredCheckpoints();
    const container = document.getElementById('checkpoint-cards-list');
    const emptyState = document.getElementById('empty-state');
    const counterEl = document.getElementById('results-count');

    if (counterEl) counterEl.textContent = `พบ ${list.length} รายการ`;
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    const userCoords = window.mapManager.userCoords;

    const cardsHtml = list.map((cp) => {
      let distanceBadge = '';
      if (userCoords) {
        const dist = window.mapManager.calculateDistance(userCoords.lat, userCoords.lng, cp.lat, cp.lng);
        const distFormatted = dist < 1 ? `${Math.round(dist * 1000)} ม.` : `${dist.toFixed(1)} กม.`;
        distanceBadge = `<span class="card-dist-pill"><i class="fa-solid fa-location-arrow"></i> ${distFormatted}</span>`;
      }

      const isCleared = cp.status === 'cleared';
      const statusPill = isCleared
        ? '<span class="card-status cleared"><i class="fa-solid fa-circle-check"></i> เคลียร์แล้ว</span>'
        : '<span class="card-status active"><i class="fa-solid fa-circle-dot"></i> กำลังตั้งด่าน</span>';

      const typeBadgeClass = isCleared ? 'cleared' : cp.type;
      const timeAgo = this.formatRelativeTime(cp.reportedAt);

      return `
        <div class="checkpoint-card ${isCleared ? 'is-cleared' : ''}" id="card-${cp.id}" onclick="window.app.flyToAndOpen('${cp.id}')">
          <div class="card-top">
            <div class="card-type-row">
              <span class="card-type-badge ${typeBadgeClass}">${cp.typeLabel}</span>
              ${statusPill}
            </div>
            ${distanceBadge}
          </div>
          <h4 class="card-title">${cp.title}</h4>
          <div class="card-location">
            <i class="fa-solid fa-location-dot"></i>
            <span>${cp.locationName}</span>
          </div>
          ${cp.direction ? `<div class="card-direction"><i class="fa-solid fa-arrow-turn-up"></i> ${cp.direction}</div>` : ''}
          ${cp.description ? `<p class="card-notes">${cp.description}</p>` : ''}
          <div class="card-bottom">
            <div class="card-meta">
              <span class="meta-time"><i class="fa-regular fa-clock"></i> ${timeAgo}</span>
              <span class="meta-prov"><i class="fa-solid fa-map"></i> ${cp.province}</span>
            </div>
            <div class="card-voting">
              <button class="btn-card-share" title="แชร์ด่านนี้" onclick="event.stopPropagation(); window.socialManager.shareCheckpoint(window.app.checkpoints.find(c => c.id === '${cp.id}'));">
                <i class="fa-solid fa-share-nodes"></i>
              </button>
              <button class="vote-mini-btn up" title="ยืนยันว่าด่านยังอยู่" onclick="event.stopPropagation(); window.app.voteCheckpoint('${cp.id}', 'up')">
                <i class="fa-solid fa-thumbs-up"></i> <span>${cp.verifiedCount || 0}</span>
              </button>
              <button class="vote-mini-btn down" title="รายงานว่าเคลียร์แล้ว" onclick="event.stopPropagation(); window.app.voteCheckpoint('${cp.id}', 'down')">
                <i class="fa-solid fa-thumbs-down"></i> <span>${cp.clearedCount || 0}</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = cardsHtml;
  }

  updateStats() {
    const total = this.checkpoints.length;
    const active = this.checkpoints.filter((c) => c.status === 'active').length;
    const cleared = this.checkpoints.filter((c) => c.status === 'cleared').length;

    const elTotal = document.getElementById('stat-total');
    const elActive = document.getElementById('stat-active');
    const elCleared = document.getElementById('stat-cleared');

    if (elTotal) elTotal.textContent = total;
    if (elActive) elActive.textContent = active;
    if (elCleared) elCleared.textContent = cleared;
  }

  flyToAndOpen(checkpointId) {
    const cp = this.checkpoints.find((c) => c.id === checkpointId);
    if (!cp) return;

    window.mapManager.flyTo(cp.lat, cp.lng, 15);
    this.highlightCheckpointInList(cp.id);
    this.showCheckpointDetails(checkpointId);
  }

  highlightCheckpointInList(checkpointId) {
    document.querySelectorAll('.checkpoint-card').forEach((c) => c.classList.remove('selected'));
    const target = document.getElementById(`card-${checkpointId}`);
    if (target) {
      target.classList.add('selected');
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  showCheckpointDetails(checkpointId) {
    const cp = this.checkpoints.find((c) => c.id === checkpointId);
    if (!cp) return;
    this.selectedCheckpoint = cp;

    const modal = document.getElementById('detail-modal');
    if (!modal) return;

    const isCleared = cp.status === 'cleared';
    const distText = window.mapManager.userCoords
      ? `${(window.mapManager.calculateDistance(window.mapManager.userCoords.lat, window.mapManager.userCoords.lng, cp.lat, cp.lng)).toFixed(1)} กม. จากคุณ`
      : 'ไม่ได้เปิด GPS';

    document.getElementById('detail-type-badge').className = `card-type-badge ${isCleared ? 'cleared' : cp.type}`;
    document.getElementById('detail-type-badge').textContent = cp.typeLabel;
    
    document.getElementById('detail-status-badge').className = `card-status ${isCleared ? 'cleared' : 'active'}`;
    document.getElementById('detail-status-badge').innerHTML = isCleared 
      ? '<i class="fa-solid fa-circle-check"></i> เคลียร์/ยกเลิกแล้ว' 
      : '<i class="fa-solid fa-circle-dot"></i> กำลังตั้งด่าน (Active)';

    document.getElementById('detail-title').textContent = cp.title;
    document.getElementById('detail-location').textContent = cp.locationName;
    document.getElementById('detail-direction').textContent = cp.direction || 'ไม่ระบุ';
    document.getElementById('detail-province').textContent = `${cp.province} ${cp.district ? `(${cp.district})` : ''}`;
    document.getElementById('detail-time').textContent = this.formatRelativeTime(cp.reportedAt);
    document.getElementById('detail-distance').textContent = distText;
    document.getElementById('detail-notes').textContent = cp.description || 'ไม่มีรายละเอียดเพิ่มเติม';
    document.getElementById('detail-reporter').textContent = cp.reportedBy || 'ผู้ใช้ไม่ระบุนาม';

    document.getElementById('detail-count-up').textContent = cp.verifiedCount || 0;
    document.getElementById('detail-count-down').textContent = cp.clearedCount || 0;

    const btnVoteUp = document.getElementById('modal-btn-vote-up');
    const btnVoteDown = document.getElementById('modal-btn-vote-down');
    btnVoteUp.onclick = () => {
      this.voteCheckpoint(cp.id, 'up');
      this.showCheckpointDetails(cp.id);
    };
    btnVoteDown.onclick = () => {
      this.voteCheckpoint(cp.id, 'down');
      this.showCheckpointDetails(cp.id);
    };

    const gmapsBtn = document.getElementById('detail-gmaps-link');
    if (gmapsBtn) {
      gmapsBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${cp.lat},${cp.lng}`;
    }

    modal.classList.add('show');
  }

  voteCheckpoint(id, type) {
    const cp = this.checkpoints.find((c) => c.id === id);
    if (!cp) return;

    if (type === 'up') {
      cp.verifiedCount = (cp.verifiedCount || 0) + 1;
      if (cp.status === 'cleared') cp.status = 'active';
      this.showToast('👍 ขอบคุณที่ร่วมยืนยันสถานะด่าน!', 'success');
      window.soundManager.playSuccess();
    } else if (type === 'down') {
      cp.clearedCount = (cp.clearedCount || 0) + 1;
      if (cp.clearedCount >= (cp.verifiedCount || 0) + 3) {
        cp.status = 'cleared';
        this.showToast('✅ ด่านนี้ถูกบันทึกสถานะว่า "เคลียร์แล้ว"', 'info');
      } else {
        this.showToast('👎 ได้รับข้อมูลรายงานการสลายตัวของด่านแล้ว', 'info');
      }
      window.soundManager.playSuccess();
    }

    window.githubSync.saveLocalCache(this.checkpoints);
    this.render();
  }

  openReportModal() {
    const modal = document.getElementById('report-modal');
    if (!modal) return;

    const userCoords = window.mapManager.userCoords;
    if (userCoords) {
      document.getElementById('report-lat').value = userCoords.lat.toFixed(6);
      document.getElementById('report-lng').value = userCoords.lng.toFixed(6);
    } else {
      document.getElementById('report-lat').value = '13.7563';
      document.getElementById('report-lng').value = '100.5018';
    }

    modal.classList.add('show');
  }

  openReportModalWithCoords(lat, lng) {
    this.openReportModal();
    document.getElementById('report-lat').value = lat.toFixed(6);
    document.getElementById('report-lng').value = lng.toFixed(6);
    this.showToast(`📌 กำหนดพิกัดจากจุดที่คลิกบนแผนที่: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, 'info');
  }

  submitCheckpointReport() {
    const title = document.getElementById('report-title').value.trim();
    const type = document.getElementById('report-type').value;
    const locationName = document.getElementById('report-location').value.trim();
    const province = document.getElementById('report-province-select').value;
    const direction = document.getElementById('report-direction').value.trim();
    const description = document.getElementById('report-notes').value.trim();
    const reportedBy = document.getElementById('report-reporter').value.trim() || 'พลเมืองดี';
    const lat = parseFloat(document.getElementById('report-lat').value);
    const lng = parseFloat(document.getElementById('report-lng').value);

    if (!title || !locationName || isNaN(lat) || isNaN(lng)) {
      this.showToast('⚠️ กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'warning');
      return;
    }

    const typeLabels = {
      alcohol: 'ตรวจวัดแอลกอฮอล์',
      traffic: 'กวดขันวินัยจราจร',
      smoke: 'ตรวจควันดำ/มลพิษ',
      speed: 'กล้องจับความเร็ว',
      security: 'จุดตรวจร่วมความมั่นคง',
      weigh: 'ด่านชั่งน้ำหนักรถบรรทุก'
    };

    const newCheckpoint = {
      id: `cp-${Date.now()}`,
      title,
      type,
      typeLabel: typeLabels[type] || 'ด่านตรวจ',
      locationName,
      province: province || 'กรุงเทพมหานคร',
      lat,
      lng,
      direction,
      status: 'active',
      verifiedCount: 1,
      clearedCount: 0,
      reportedAt: new Date().toISOString(),
      description,
      reportedBy,
      severity: 'medium'
    };

    this.checkpoints.unshift(newCheckpoint);
    window.githubSync.saveLocalCache(this.checkpoints);

    this.closeAllModals();
    this.render();
    this.flyToAndOpen(newCheckpoint.id);

    window.soundManager.playSuccess();
    window.voiceManager.speak(`บันทึกรายงาน ${newCheckpoint.title} เรียบร้อยแล้วค่ะ ขอบคุณที่ร่วมแบ่งปันข้อมูลค่ะ`);
    this.showToast('🎉 แจ้งจุดตรวจด่านสำเร็จแล้ว! ข้อมูลถูกบันทึกลงระบบเรียบร้อย', 'success');

    document.getElementById('report-form').reset();
  }

  openGitHubModal() {
    const modal = document.getElementById('github-modal');
    if (!modal) return;

    const config = window.githubSync.getConfig();
    document.getElementById('gh-owner').value = config.owner || '';
    document.getElementById('gh-repo').value = config.repo || '';
    document.getElementById('gh-branch').value = config.branch || 'main';
    document.getElementById('gh-path').value = config.filePath || 'data/checkpoints.json';
    document.getElementById('gh-token').value = config.token || '';

    const btnExport = document.getElementById('btn-export-json');
    if (btnExport) {
      btnExport.onclick = () => {
        window.githubSync.exportJsonFile(this.checkpoints);
        this.showToast('📥 ดาวน์โหลดไฟล์ checkpoints.json สำเร็จ นำไป commit ขึ้น GitHub ได้ทันที', 'success');
      };
    }

    const formConfig = document.getElementById('github-config-form');
    if (formConfig) {
      formConfig.onsubmit = async (e) => {
        e.preventDefault();
        const newConfig = {
          owner: document.getElementById('gh-owner').value.trim(),
          repo: document.getElementById('gh-repo').value.trim(),
          branch: document.getElementById('gh-branch').value.trim() || 'main',
          filePath: document.getElementById('gh-path').value.trim() || 'data/checkpoints.json',
          token: document.getElementById('gh-token').value.trim()
        };
        window.githubSync.saveConfig(newConfig);
        this.showToast('💾 บันทึกการตั้งค่า GitHub เรียบร้อยแล้ว', 'success');
        await this.refreshData();
      };
    }

    const btnPushAPI = document.getElementById('btn-push-github-api');
    if (btnPushAPI) {
      btnPushAPI.onclick = async () => {
        try {
          btnPushAPI.disabled = true;
          btnPushAPI.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลัง Commit ขึ้น GitHub...';
          await window.githubSync.pushToGitHubAPI(this.checkpoints);
          this.showToast('🚀 Commit ข้อมูลด่านล่าสุดขึ้น GitHub Repository สำเร็จ!', 'success');
        } catch (err) {
          this.showToast(`❌ ผิดพลาด: ${err.message}`, 'error');
        } finally {
          btnPushAPI.disabled = false;
          btnPushAPI.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> บันทึกข้อมูลขึ้น GitHub Repo (ผ่าน API)';
        }
      };
    }

    const btnReset = document.getElementById('btn-reset-data');
    if (btnReset) {
      btnReset.onclick = () => {
        if (confirm('คุณต้องการรีเซ็ตข้อมูลด่านกลับเป็นค่าเริ่มต้นหรือไม่?')) {
          this.checkpoints = window.githubSync.resetToDefault();
          this.render();
          this.showToast('🔄 รีเซ็ตข้อมูลกลับสู่ค่าเริ่มต้นเรียบร้อย', 'info');
        }
      };
    }

    modal.classList.add('show');
  }

  closeAllModals() {
    document.querySelectorAll('.app-modal').forEach((m) => m.classList.remove('show'));
  }

  showToast(message, type = 'info') {
    const toast = document.getElementById('app-toast');
    if (!toast) return;

    toast.className = `toast ${type} show`;
    toast.innerHTML = message;

    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 4500);
  }

  formatRelativeTime(isoString) {
    if (!isoString) return 'เมื่อสักครู่';
    try {
      const then = new Date(isoString).getTime();
      const now = Date.now();
      const diffSec = Math.floor((now - then) / 1000);

      if (diffSec < 60) return 'เมื่อสักครู่';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr} ชั่วโมงที่แล้ว`;
      const diffDay = Math.floor(diffHr / 24);
      return `${diffDay} วันที่แล้ว`;
    } catch (e) {
      return 'วันนี้';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new CheckDanApp();
  window.app.init();
});
