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
    this.isAdmin = false;
    this.currentLiveSpeed = 0;
    this.liveGpsWatchId = null;
    this.lastLivePos = null;
    this.lastLivePosTime = 0;
    this.lastSpeedAlertId = null;
    this.lastSpeedAlertTime = 0;
    this.lastCheckpointAlertId = null;
    this.lastCheckpointAlertTime = 0;
    this.selectedOriginCoords = null;
    this.selectedDestCoords = null;
    this.isPickingMapLocation = false;
    this.mapPickTarget = 'dest';
    this.destPreviewMarker = null;
    this.placeSearchDebounce = null;
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

    // 3. Bind UI Events, Place Search & Admin Security immediately
    this.bindEvents();
    this.initAdminSecurity();
    this.initPlaceSearch();

    // 4. Initialize Extension Modules
    if (window.deviceManager) window.deviceManager.init();
    if (window.hudManager) window.hudManager.init();
    if (window.sosManager) window.sosManager.init();
    if (window.blackspotManager) await window.blackspotManager.init(window.mapManager.map);
    if (window.trafficManager) window.trafficManager.init(window.mapManager.map);
    if (window.highwayServiceManager) window.highwayServiceManager.init(window.mapManager.map);
    if (window.weatherRadarManager) window.weatherRadarManager.init(window.mapManager.map);
    if (window.attractionsManager) window.attractionsManager.init(window.mapManager);
    if (window.voiceCommandManager) window.voiceCommandManager.init();
    if (window.navigationManager) window.navigationManager.init();

    // Initialize Attractions & Install Analytics
    this.initAttractionsTab();
    this.initInstallTracker();

    // 5. Load Checkpoint Data (GitHub / LocalStorage / Fallback)
    await this.refreshData();

    // 6. Register PWA Service Worker & Install Prompt
    this.initPWA();

    // 7. Update UI stats
    this.updateStats();

    // 8. Request user geolocation automatically
    this.requestUserLocation(false);
  }

  populateProvinceDropdowns() {
    const filterSelect = document.getElementById('province-filter-select');
    const attractionSelect = document.getElementById('attraction-province-select');
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

      if (attractionSelect) {
        const grp = document.createElement('optgroup');
        grp.label = `--- ${regionName} ---`;
        provsInRegion.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.name;
          opt.textContent = p.name;
          grp.appendChild(opt);
        });
        attractionSelect.appendChild(grp);
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

  async refreshData(showToastNotice = false) {
    this.checkpoints = await window.githubSync.loadCheckpoints(true);
    this.render();
    this.checkProximityAlerts();
    this.updateStats();
    this.updateLiveRadarUI();
    if (showToastNotice) {
      window.soundManager.playSuccess();
      this.showToast(`🔄 อัปเดตข้อมูลด่านและเรดาร์ความเร็วสดเรียบร้อยแล้ว (${this.checkpoints.length} จุด)`, 'success');
    }
  }

  bindEvents() {
    // Tab Switching (Checkpoints vs Attractions vs Route)
    const tabCheckpoints = document.getElementById('tab-btn-checkpoints');
    const tabAttractions = document.getElementById('tab-btn-attractions');
    const tabRoute = document.getElementById('tab-btn-route');
    const viewCheckpoints = document.getElementById('view-checkpoints');
    const viewAttractions = document.getElementById('view-attractions');
    const viewRoute = document.getElementById('view-route');

    const switchTab = (target) => {
      [tabCheckpoints, tabAttractions, tabRoute].forEach(t => {
        if (t) t.classList.toggle('active', t.dataset.tab === target);
      });
      if (viewCheckpoints) viewCheckpoints.classList.toggle('active', target === 'checkpoints');
      if (viewAttractions) viewAttractions.classList.toggle('active', target === 'attractions');
      if (viewRoute) viewRoute.classList.toggle('active', target === 'route');
      this.activeTab = target;

      if (target === 'attractions') {
        this.renderAttractionsList();
      }
    };

    if (tabCheckpoints) tabCheckpoints.addEventListener('click', () => switchTab('checkpoints'));
    if (tabAttractions) tabAttractions.addEventListener('click', () => switchTab('attractions'));
    if (tabRoute) tabRoute.addEventListener('click', () => switchTab('route'));

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
        this.requestUserLocation(true, true);
      });
    }

    // Live Refresh Button
    const btnRefreshLive = document.getElementById('btn-refresh-live-data');
    if (btnRefreshLive) {
      btnRefreshLive.addEventListener('click', async () => {
        btnRefreshLive.classList.add('rotating');
        await this.refreshData(true);
        setTimeout(() => btnRefreshLive.classList.remove('rotating'), 600);
      });
    }

    // TrafficD Modal Button
    const btnOpenTrafficD = document.getElementById('btn-open-trafficd-modal');
    if (btnOpenTrafficD) {
      btnOpenTrafficD.addEventListener('click', () => {
        this.openTrafficDModal();
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

        const origProv = window.THAILAND_PROVINCES?.find(p => p.id === originId) || { name: 'กรุงเทพมหานคร', lat: 13.7563, lng: 100.5018 };
        const destProv = window.THAILAND_PROVINCES?.find(p => p.id === destId);

        const originInput = document.getElementById('route-origin-input');
        const destInput = document.getElementById('route-dest-input');

        if (originInput && origProv) {
          originInput.value = `จ.${origProv.name}`;
          this.selectedOriginCoords = { lat: origProv.lat, lng: origProv.lng, name: `จ.${origProv.name}` };
          const btnClear = document.getElementById('btn-origin-clear');
          if (btnClear) btnClear.style.display = 'flex';
          const btnGps = document.getElementById('btn-origin-gps');
          if (btnGps) btnGps.classList.remove('active');
        }
        if (destInput && destProv) {
          destInput.value = `จ.${destProv.name}`;
          this.selectedDestCoords = { lat: destProv.lat, lng: destProv.lng, name: `จ.${destProv.name}` };
          const btnClear = document.getElementById('btn-dest-clear');
          if (btnClear) btnClear.style.display = 'flex';
          this.previewDestinationMarker(destProv.lat, destProv.lng, `จ.${destProv.name}`);
        }

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

    // Start Turn-by-Turn Navigation Button
    const btnStartNav = document.getElementById('btn-start-navigation');
    if (btnStartNav) {
      btnStartNav.addEventListener('click', () => {
        const route = window.routeManager?.activeRoute || window.lastCalculatedRoute;
        if (route) {
          window.navigationManager.startNavigation(route);
        } else {
          this.showToast('⚠️ กรุณาสแกนเส้นทางก่อนเริ่มการนำทาง', 'warning');
        }
      });
    }

    // View Route Steps Tab from Sidebar
    const btnSidebarSteps = document.getElementById('btn-view-route-steps-sidebar');
    if (btnSidebarSteps) {
      btnSidebarSteps.addEventListener('click', () => {
        if (window.navigationManager) {
          window.navigationManager.toggleRouteSheet(true);
        }
      });
    }

    // Stop / Exit Navigation Buttons
    const btnStopNav = document.getElementById('btn-stop-navigation');
    const btnExitTop = document.getElementById('btn-exit-nav-top');
    [btnStopNav, btnExitTop].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          window.navigationManager.stopNavigation();
        });
      }
    });

    // Voice Personality Style Selector
    const voiceStyleSelect = document.getElementById('voice-style-select');
    if (voiceStyleSelect) {
      voiceStyleSelect.value = window.voiceManager.currentStyle || 'sweet';
      voiceStyleSelect.addEventListener('change', (e) => {
        window.voiceManager.setVoiceStyle(e.target.value);
        this.showToast(`🗣️ เปลี่ยนรูปแบบเสียง: ${e.target.options[e.target.selectedIndex].text}`, 'info');
      });
    }

    // Live Traffic Toggle
    const btnTraffic = document.getElementById('btn-toggle-traffic');
    if (btnTraffic) {
      btnTraffic.addEventListener('click', () => {
        const isEnabled = window.trafficManager.toggleTraffic(window.mapManager.map);
        btnTraffic.classList.toggle('active', isEnabled);
      });
    }

    // Blackspots Hazard Toggle
    const btnBlackspots = document.getElementById('btn-toggle-blackspots');
    if (btnBlackspots) {
      btnBlackspots.addEventListener('click', () => {
        const isVisible = window.blackspotManager.toggleLayer(window.mapManager.map);
        btnBlackspots.classList.toggle('active', isVisible);
        this.showToast(isVisible ? '⚠️ แสดงหมุดจุดเสี่ยงอุบัติเหตุ' : 'ซ่อนหมุดจุดเสี่ยงอุบัติเหตุ', 'info');
      });
    }

    // Trip Summary Share Actions
    const btnShareLine = document.getElementById('btn-share-trip-line');
    if (btnShareLine) {
      btnShareLine.addEventListener('click', () => {
        const dist = document.getElementById('trip-stat-dist')?.textContent || '0 กม.';
        const time = document.getElementById('trip-stat-time')?.textContent || '0 นาที';
        const text = encodeURIComponent(`🚗 สรุปการเดินทางด้วย CheckDan TH\nระยะทาง: ${dist} | เวลา: ${time}\nเดินทางปลอดภัย ไร้ด่าน ตรวจเช็กเรียลไทม์ที่: https://checkdan.th`);
        window.open(`https://line.me/R/msg/text/?${text}`, '_blank');
      });
    }

    const btnShareFb = document.getElementById('btn-share-trip-fb');
    if (btnShareFb) {
      btnShareFb.addEventListener('click', () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
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
      el.addEventListener('click', (e) => {
        const changeModal = el.closest('#admin-change-password-modal');
        if (changeModal) {
          e.stopPropagation();
          changeModal.classList.remove('show');
          return;
        }
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

  // Open Route Planning tab & focus/search destination
  openRoutePlanner(destinationText = '') {
    // Switch desktop view tab
    const tabRoute = document.getElementById('tab-btn-route');
    const tabCheckpoints = document.getElementById('tab-btn-checkpoints');
    const tabAttractions = document.getElementById('tab-btn-attractions');
    const viewCheckpoints = document.getElementById('view-checkpoints');
    const viewAttractions = document.getElementById('view-attractions');
    const viewRoute = document.getElementById('view-route');
    if (tabRoute && viewRoute) {
      tabRoute.classList.add('active');
      if (tabCheckpoints) tabCheckpoints.classList.remove('active');
      if (tabAttractions) tabAttractions.classList.remove('active');
      viewRoute.classList.add('active');
      if (viewCheckpoints) viewCheckpoints.classList.remove('active');
      if (viewAttractions) viewAttractions.classList.remove('active');
      this.activeTab = 'route';
    }

    // Switch mobile bottom navigation / sheet if active
    if (window.deviceManager && typeof window.deviceManager.openMobileSheet === 'function') {
      window.deviceManager.openMobileSheet('route');
    }

    if (destinationText) {
      const destInput = document.getElementById('route-dest-input');
      if (destInput) {
        destInput.value = destinationText;
        const btnClear = document.getElementById('btn-dest-clear');
        if (btnClear) btnClear.style.display = 'flex';
        this.debouncePlaceSearch(destinationText, 'dest');
      }
    }
  }

  // Open Attractions Explorer tab
  openAttractionsTab(provinceId = 'all', query = '') {
    const tabRoute = document.getElementById('tab-btn-route');
    const tabCheckpoints = document.getElementById('tab-btn-checkpoints');
    const tabAttractions = document.getElementById('tab-btn-attractions');
    const viewCheckpoints = document.getElementById('view-checkpoints');
    const viewAttractions = document.getElementById('view-attractions');
    const viewRoute = document.getElementById('view-route');

    if (tabAttractions && viewAttractions) {
      tabAttractions.classList.add('active');
      if (tabCheckpoints) tabCheckpoints.classList.remove('active');
      if (tabRoute) tabRoute.classList.remove('active');
      viewAttractions.classList.add('active');
      if (viewCheckpoints) viewCheckpoints.classList.remove('active');
      if (viewRoute) viewRoute.classList.remove('active');
      this.activeTab = 'attractions';
    }

    if (window.deviceManager && typeof window.deviceManager.openMobileSheet === 'function') {
      window.deviceManager.openMobileSheet('attractions');
    }

    if (provinceId && provinceId !== 'all') {
      const provSelect = document.getElementById('attraction-province-select');
      if (provSelect) provSelect.value = provinceId;
    }

    if (query) {
      const searchInput = document.getElementById('attractions-search-input');
      if (searchInput) searchInput.value = query;
    }

    this.renderAttractionsList();
  }

  // Initialize Interactive Place Search & Nearby Intelligence
  initPlaceSearch() {
    const originInput = document.getElementById('route-origin-input');
    const destInput = document.getElementById('route-dest-input');
    const originSugList = document.getElementById('origin-suggestions');
    const destSugList = document.getElementById('dest-suggestions');
    const btnOriginGps = document.getElementById('btn-origin-gps');
    const btnOriginClear = document.getElementById('btn-origin-clear');
    const btnDestClear = document.getElementById('btn-dest-clear');
    const btnDestVoice = document.getElementById('btn-dest-voice');
    const btnSwap = document.getElementById('btn-swap-route-points');
    const quickChips = document.querySelectorAll('.quick-place-chip');

    // Default origin to current GPS location
    this.setOriginToCurrentLocation(false);

    // Origin Input Events
    if (originInput) {
      originInput.addEventListener('input', () => {
        const val = originInput.value.trim();
        if (btnOriginClear) btnOriginClear.style.display = val ? 'flex' : 'none';
        if (btnOriginGps) btnOriginGps.classList.toggle('active', val.includes('ตำแหน่งปัจจุบัน') || val.includes('GPS'));
        this.debouncePlaceSearch(val, 'origin');
      });

      originInput.addEventListener('focus', () => {
        const val = originInput.value.trim();
        if (val && !val.includes('ตำแหน่งปัจจุบัน')) {
          this.debouncePlaceSearch(val, 'origin');
        }
      });
    }

    // Destination Input Events
    if (destInput) {
      destInput.addEventListener('input', () => {
        const val = destInput.value.trim();
        if (btnDestClear) btnDestClear.style.display = val ? 'flex' : 'none';
        this.debouncePlaceSearch(val, 'dest');
      });

      destInput.addEventListener('focus', () => {
        const val = destInput.value.trim();
        if (val) {
          this.debouncePlaceSearch(val, 'dest');
        } else {
          this.showQuickSuggestions('dest');
        }
      });
    }

    // Clear Origin Button
    if (btnOriginClear && originInput) {
      btnOriginClear.addEventListener('click', () => {
        originInput.value = '';
        this.selectedOriginCoords = null;
        btnOriginClear.style.display = 'none';
        if (btnOriginGps) btnOriginGps.classList.remove('active');
        if (originSugList) originSugList.style.display = 'none';
        originInput.focus();
      });
    }

    // Reset Origin to GPS Button
    if (btnOriginGps) {
      btnOriginGps.addEventListener('click', () => {
        this.setOriginToCurrentLocation(true);
        if (originSugList) originSugList.style.display = 'none';
      });
    }

    // Clear Dest Button
    if (btnDestClear && destInput) {
      btnDestClear.addEventListener('click', () => {
        destInput.value = '';
        this.selectedDestCoords = null;
        btnDestClear.style.display = 'none';
        if (destSugList) destSugList.style.display = 'none';
        if (this.destPreviewMarker && window.mapManager?.map) {
          window.mapManager.map.removeLayer(this.destPreviewMarker);
          this.destPreviewMarker = null;
        }
        destInput.focus();
      });
    }

    // Voice Search for Destination
    if (btnDestVoice) {
      btnDestVoice.addEventListener('click', () => {
        this.startVoicePlaceSearch();
      });
    }

    // Swap Origin & Destination
    if (btnSwap && originInput && destInput) {
      btnSwap.addEventListener('click', () => {
        const tempText = originInput.value;
        originInput.value = destInput.value;
        destInput.value = tempText;

        const tempCoords = this.selectedOriginCoords;
        this.selectedOriginCoords = this.selectedDestCoords;
        this.selectedDestCoords = tempCoords;

        if (btnOriginClear) btnOriginClear.style.display = originInput.value ? 'flex' : 'none';
        if (btnDestClear) btnDestClear.style.display = destInput.value ? 'flex' : 'none';
        if (btnOriginGps) btnOriginGps.classList.toggle('active', originInput.value.includes('GPS') || originInput.value.includes('ตำแหน่งปัจจุบัน'));

        this.showToast('🔄 สลับจุดเริ่มต้นและจุดหมายปลายทางแล้ว', 'info');
      });
    }

    // Quick Category Chips
    quickChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const category = chip.dataset.category;
        quickChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        setTimeout(() => chip.classList.remove('active'), 1200);

        if (category === 'map_pick') {
          this.startPickOnMapMode('dest');
        } else {
          this.handleQuickCategorySelect(category);
        }
      });
    });

    // Close suggestions dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#route-origin-input') && !e.target.closest('#origin-suggestions')) {
        if (originSugList) originSugList.style.display = 'none';
      }
      if (!e.target.closest('#route-dest-input') && !e.target.closest('#dest-suggestions') && !e.target.closest('.quick-place-chip')) {
        if (destSugList) destSugList.style.display = 'none';
      }
    });
  }

  setOriginToCurrentLocation(showToastNotice = true) {
    const originInput = document.getElementById('route-origin-input');
    const btnOriginGps = document.getElementById('btn-origin-gps');
    const btnOriginClear = document.getElementById('btn-origin-clear');

    const userCoords = window.mapManager?.userCoords || { lat: 13.7563, lng: 100.5018 };
    this.selectedOriginCoords = {
      lat: userCoords.lat,
      lng: userCoords.lng,
      name: 'ตำแหน่งปัจจุบันของฉัน (GPS)'
    };

    if (originInput) {
      originInput.value = '📍 ตำแหน่งปัจจุบันของฉัน (GPS)';
    }
    if (btnOriginGps) btnOriginGps.classList.add('active');
    if (btnOriginClear) btnOriginClear.style.display = 'none';

    if (showToastNotice) {
      this.showToast('📍 กำหนดจุดเริ่มต้นเป็นตำแหน่งปัจจุบัน (GPS)', 'info');
    }
  }

  debouncePlaceSearch(query, target = 'dest') {
    const listEl = document.getElementById(target === 'origin' ? 'origin-suggestions' : 'dest-suggestions');
    if (!listEl) return;

    if (!query || query.trim() === '') {
      listEl.style.display = 'none';
      return;
    }

    listEl.innerHTML = '<div style="padding: 10px; text-align: center; color: var(--text-muted); font-size: 11px;"><i class="fa-solid fa-spinner fa-spin"></i> กำลังค้นหาสถานที่...</div>';
    listEl.style.display = 'flex';

    if (this.placeSearchDebounce) clearTimeout(this.placeSearchDebounce);
    this.placeSearchDebounce = setTimeout(async () => {
      if (!window.placeSearchManager) return;
      const userCoords = window.mapManager?.userCoords || { lat: 13.7563, lng: 100.5018 };
      const results = await window.placeSearchManager.search(query, userCoords);
      this.renderSuggestions(results, target);
    }, 260);
  }

  showQuickSuggestions(target = 'dest') {
    const listEl = document.getElementById(target === 'origin' ? 'origin-suggestions' : 'dest-suggestions');
    if (!listEl) return;

    const quickItems = [
      { name: '7/11 ใกล้เคียง (ร้านสะดวกซื้อ)', subtitle: 'ค้นหา 7-Eleven สาขาที่ใกล้ที่สุดรอบตัวคุณ', category: '7eleven', icon: 'fa-store', badgeColor: '#10b981', action: 'category_7eleven' },
      { name: 'ปั๊มน้ำมันใกล้เคียง (ปตท., บางจาก ฯลฯ)', subtitle: 'ค้นหาปั๊มน้ำมันที่ใกล้ที่สุดพร้อมจุดพักรถ', category: 'gas', icon: 'fa-gas-pump', badgeColor: '#f59e0b', action: 'category_gas' },
      { name: 'สถานที่ท่องเที่ยวยอดนิยมทั่วไทย', subtitle: 'สยามพารากอน, วัดพระแก้ว, พัทยา, เขาใหญ่ ฯลฯ', category: 'attraction', icon: 'fa-umbrella-beach', badgeColor: '#06b6d4', action: 'category_attraction' },
      { name: 'คาเฟ่ / Cafe Amazon ใกล้ฉัน', subtitle: 'ร้านกาแฟและจุดแวะพักระหว่างทาง', category: 'cafe', icon: 'fa-mug-saucer', badgeColor: '#ec4899', action: 'category_cafe' },
      { name: 'จุดชาร์จรถยนต์ไฟฟ้า (EV Charger)', subtitle: 'EV Station PluZ, PEA Volta ชาร์จเร็ว', category: 'ev', icon: 'fa-bolt', badgeColor: '#3b82f6', action: 'category_ev' },
      { name: 'เลือกจุดหมายโดยแตะบนแผนที่...', subtitle: 'คลิกจุดใดก็ได้บนแผนที่เพื่อนำทาง', category: 'map', icon: 'fa-map-pin', badgeColor: '#ef4444', action: 'pick_map' }
    ];

    listEl.innerHTML = quickItems.map(item => `
      <div class="route-suggestion-item" data-action="${item.action}" data-name="${item.name}">
        <div class="suggestion-icon-wrap" style="background: ${item.badgeColor}20; color: ${item.badgeColor};">
          <i class="fa-solid ${item.icon}"></i>
        </div>
        <div class="suggestion-text-wrap">
          <span class="suggestion-title">${item.name}</span>
          <span class="suggestion-sub">${item.subtitle}</span>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.route-suggestion-item').forEach(el => {
      el.addEventListener('click', () => {
        const action = el.dataset.action;
        if (action === 'pick_map') {
          listEl.style.display = 'none';
          this.startPickOnMapMode(target);
        } else if (action && action.startsWith('category_')) {
          const cat = action.replace('category_', '');
          this.handleQuickCategorySelect(cat);
        }
      });
    });

    listEl.style.display = 'flex';
  }

  async handleQuickCategorySelect(category) {
    const destInput = document.getElementById('route-dest-input');
    const destSugList = document.getElementById('dest-suggestions');
    if (!destInput || !destSugList || !window.placeSearchManager) return;

    const userCoords = window.mapManager?.userCoords || { lat: 13.7563, lng: 100.5018 };
    destSugList.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--neon-cyan); font-size: 12px;"><i class="fa-solid fa-spinner fa-spin"></i> กำลังค้นหาสถานที่ใกล้เคียง...</div>';
    destSugList.style.display = 'flex';

    const categoryTitles = {
      '7eleven': '7/11 ใกล้เคียง',
      'gas': 'ปั้มน้ำมันใกล้เคียง',
      'attraction': 'สถานที่ท่องเที่ยวยอดนิยม',
      'cafe': 'คาเฟ่ / อเมซอน ใกล้เคียง',
      'ev': 'จุดชาร์จ EV ใกล้เคียง'
    };
    destInput.value = categoryTitles[category] || '';
    const btnDestClear = document.getElementById('btn-dest-clear');
    if (btnDestClear) btnDestClear.style.display = 'flex';

    const results = await window.placeSearchManager.getQuickCategory(category, userCoords);
    this.renderSuggestions(results, 'dest');
  }

  startPickOnMapMode(target = 'dest') {
    this.isPickingMapLocation = true;
    this.mapPickTarget = target;

    // Switch to map view so user can tap
    if (window.deviceManager && window.deviceManager.isMobileView) {
      window.deviceManager.closeMobileSheet(false);
    }

    const mapContainer = document.getElementById('map');
    if (mapContainer) mapContainer.style.cursor = 'crosshair';

    this.showToast('🗺️ แตะจุดใดก็ได้บนแผนที่เพื่อเลือกตำแหน่ง', 'info');

    // Show floating cancel banner on map if not present
    let banner = document.getElementById('map-pick-indicator-bar');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'map-pick-indicator-bar';
      banner.className = 'map-pick-indicator-bar';
      banner.style.cssText = 'position: fixed; top: calc(var(--header-height) + 12px); left: 50%; transform: translateX(-50%); z-index: 1500; display: flex; align-items: center; gap: 10px; background: rgba(15, 23, 42, 0.95); border: 2px solid var(--neon-cyan); padding: 8px 16px; border-radius: 30px; color: #fff; font-size: 13px; font-weight: 600; box-shadow: 0 8px 25px rgba(0,0,0,0.6);';
      banner.innerHTML = `
        <i class="fa-solid fa-map-pin" style="color: var(--neon-cyan);"></i>
        <span>แตะบนแผนที่เพื่อเลือกจุดหมาย</span>
        <button id="btn-cancel-map-pick-banner" style="background: rgba(255,255,255,0.1); border: none; color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 11px; cursor: pointer;">ยกเลิก</button>
      `;
      document.body.appendChild(banner);

      document.getElementById('btn-cancel-map-pick-banner').addEventListener('click', () => {
        this.cancelPickOnMapMode();
      });
    } else {
      banner.style.display = 'flex';
    }

    // Set callback on mapManager
    window.mapManager.onMapClickCallback = async (latlng) => {
      if (this.isPickingMapLocation) {
        this.handleMapLocationPicked(latlng.lat, latlng.lng);
      } else {
        this.openReportModalWithCoords(latlng.lat, latlng.lng);
      }
    };
  }

  async handleMapLocationPicked(lat, lng) {
    this.cancelPickOnMapMode();

    let placeName = `พิกัด ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    try {
      if (window.locationManager) {
        const loc = await window.locationManager.reverseGeocode(lat, lng, true);
        if (loc) {
          const road = loc.road ? `${loc.road}, ` : '';
          placeName = `${road}${loc.district || ''} ${loc.province || ''}`.trim() || placeName;
        }
      }
    } catch (e) {}

    if (this.mapPickTarget === 'origin') {
      const originInput = document.getElementById('route-origin-input');
      if (originInput) originInput.value = `📍 ${placeName}`;
      this.selectedOriginCoords = { lat, lng, name: placeName };
      const btnOriginClear = document.getElementById('btn-origin-clear');
      if (btnOriginClear) btnOriginClear.style.display = 'flex';
      const btnGps = document.getElementById('btn-origin-gps');
      if (btnGps) btnGps.classList.remove('active');
    } else {
      const destInput = document.getElementById('route-dest-input');
      if (destInput) destInput.value = `🏁 ${placeName}`;
      this.selectedDestCoords = { lat, lng, name: placeName };
      const btnDestClear = document.getElementById('btn-dest-clear');
      if (btnDestClear) btnDestClear.style.display = 'flex';
      this.previewDestinationMarker(lat, lng, placeName);
    }

    // If on mobile, expand the sheet back to route
    if (window.deviceManager && window.deviceManager.isMobileView) {
      window.deviceManager.openMobileSheet('route');
    }

    this.showToast(`📍 กำหนดตำแหน่งสำเร็จ: ${placeName}`, 'success');
  }

  cancelPickOnMapMode() {
    this.isPickingMapLocation = false;
    const mapContainer = document.getElementById('map');
    if (mapContainer) mapContainer.style.cursor = '';
    const banner = document.getElementById('map-pick-indicator-bar');
    if (banner) banner.style.display = 'none';

    // Restore standard report click callback
    window.mapManager.onMapClickCallback = (latlng) => {
      this.openReportModalWithCoords(latlng.lat, latlng.lng);
    };
  }

  renderSuggestions(results, target = 'dest') {
    const listEl = document.getElementById(target === 'origin' ? 'origin-suggestions' : 'dest-suggestions');
    const inputEl = document.getElementById(target === 'origin' ? 'route-origin-input' : 'route-dest-input');
    if (!listEl) return;

    if (!results || results.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 14px; text-align: center; color: var(--text-muted); font-size: 12px;">
          <i class="fa-solid fa-magnifying-glass" style="margin-bottom: 4px; display: block;"></i>
          ไม่พบสถานที่ตรงกับคำค้นหา
          <div style="font-size: 10px; color: var(--text-dim); margin-top: 2px;">กด "เลือกจากแผนที่" หรือพิมพ์ชื่อสถานที่ท่องเที่ยว/จังหวัดได้ค่ะ</div>
        </div>
      `;
      listEl.style.display = 'flex';
      return;
    }

    listEl.innerHTML = results.map(item => {
      const distBadge = item.distanceKm !== undefined && item.distanceKm !== null
        ? `<span class="suggestion-dist-badge">${window.placeSearchManager?.formatDistance(item.distanceKm) || ''}</span>`
        : '';
      const color = item.badgeColor || '#38bdf8';

      return `
        <div class="route-suggestion-item" data-lat="${item.lat}" data-lng="${item.lng}" data-name="${item.name}">
          <div class="suggestion-icon-wrap" style="background: ${color}20; color: ${color};">
            <i class="fa-solid ${item.icon || 'fa-location-dot'}"></i>
          </div>
          <div class="suggestion-text-wrap">
            <span class="suggestion-title">${item.name}</span>
            <span class="suggestion-sub">${item.subtitle || ''}</span>
          </div>
          ${distBadge}
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.route-suggestion-item').forEach(el => {
      el.addEventListener('click', () => {
        const lat = parseFloat(el.dataset.lat);
        const lng = parseFloat(el.dataset.lng);
        const name = el.dataset.name;

        if (target === 'origin') {
          inputEl.value = name;
          this.selectedOriginCoords = { lat, lng, name };
          const btnClear = document.getElementById('btn-origin-clear');
          if (btnClear) btnClear.style.display = 'flex';
          const btnGps = document.getElementById('btn-origin-gps');
          if (btnGps) btnGps.classList.remove('active');
        } else {
          inputEl.value = name;
          this.selectedDestCoords = { lat, lng, name };
          const btnClear = document.getElementById('btn-dest-clear');
          if (btnClear) btnClear.style.display = 'flex';
          this.previewDestinationMarker(lat, lng, name);
        }

        listEl.style.display = 'none';
      });
    });

    listEl.style.display = 'flex';
  }

  previewDestinationMarker(lat, lng, name) {
    if (!window.mapManager || !window.mapManager.map) return;
    if (this.destPreviewMarker) {
      window.mapManager.map.removeLayer(this.destPreviewMarker);
      this.destPreviewMarker = null;
    }

    const icon = L.divIcon({
      className: 'dest-preview-icon',
      html: `
        <div style="background: #ef4444; color: #fff; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(239, 68, 68, 0.8); border: 2px solid #fff; font-size: 15px;">
          <i class="fa-solid fa-flag-checkered"></i>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 34]
    });

    this.destPreviewMarker = L.marker([lat, lng], { icon })
      .addTo(window.mapManager.map)
      .bindPopup(`<div style="font-weight: 700; color: #0b0f19;">🏁 ${name}</div>`)
      .openPopup();

    window.mapManager.map.panTo([lat, lng]);
  }

  startVoicePlaceSearch() {
    const destInput = document.getElementById('route-dest-input');
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      this.showToast('⚠️ เบราว์เซอร์นี้ไม่รองรับการค้นหาด้วยเสียง', 'warning');
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRec();
    recognition.lang = 'th-TH';
    recognition.interimResults = false;

    this.showToast('🎙️ กำลังฟัง... พูดชื่อสถานที่ เช่น "7-Eleven ใกล้เคียง", "ปั๊มน้ำมัน", "สยามพารากอน"', 'info');
    const btnVoice = document.getElementById('btn-dest-voice');
    if (btnVoice) btnVoice.classList.add('active');

    recognition.onresult = (event) => {
      const speechText = event.results[0][0].transcript;
      if (btnVoice) btnVoice.classList.remove('active');
      if (destInput) {
        destInput.value = speechText;
        const btnClear = document.getElementById('btn-dest-clear');
        if (btnClear) btnClear.style.display = 'flex';
        this.debouncePlaceSearch(speechText, 'dest');
      }
      this.showToast(`🗣️ ค้นหา: "${speechText}"`, 'success');
    };

    recognition.onerror = () => {
      if (btnVoice) btnVoice.classList.remove('active');
      this.showToast('⚠️ ไม่ได้ยินเสียงพูด กรุณาลองใหม่อีกครั้งค่ะ', 'warning');
    };

    recognition.onend = () => {
      if (btnVoice) btnVoice.classList.remove('active');
    };

    recognition.start();
  }

  // Handle Route Calculation & Checkpoint Scanning
  async handleCalculateRoute() {
    const originInput = document.getElementById('route-origin-input');
    const destInput = document.getElementById('route-dest-input');
    const btnCalc = document.getElementById('btn-calculate-route');

    let originText = originInput ? originInput.value.trim() : '';
    let destText = destInput ? destInput.value.trim() : '';

    if (!destText) {
      this.showToast('⚠️ กรุณาพิมพ์หรือเลือกจุดหมายปลายทาง (เช่น 7/11ใกล้เคียง, ปั้มน้ำมัน, สยามพารากอน)', 'warning');
      if (destInput) destInput.focus();
      return;
    }

    if (btnCalc) {
      btnCalc.disabled = true;
      btnCalc.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังค้นหาพิกัด & คำนวณเส้นทาง...';
    }

    try {
      // 1. Resolve Origin Coordinates
      let originCoords = this.selectedOriginCoords;
      if (!originCoords || originText.includes('ตำแหน่งปัจจุบัน') || originText.includes('GPS')) {
        if (window.mapManager?.userCoords) {
          originCoords = { lat: window.mapManager.userCoords.lat, lng: window.mapManager.userCoords.lng, name: 'ตำแหน่งปัจจุบัน (GPS)' };
        } else {
          originCoords = { lat: 13.7563, lng: 100.5018, name: 'กรุงเทพมหานคร' };
        }
      } else if (!originCoords.lat || !originCoords.lng) {
        originCoords = await window.placeSearchManager.resolveBestCoordinate(originText);
      }

      // 2. Resolve Destination Coordinates
      let destCoords = this.selectedDestCoords;
      if (!destCoords || !destCoords.lat || !destCoords.lng) {
        destCoords = await window.placeSearchManager.resolveBestCoordinate(destText, originCoords);
      }

      if (!destCoords || !destCoords.lat || !destCoords.lng) {
        this.showToast(`⚠️ ไม่พบพิกัดของ "${destText}" กรุณาเลือกจากรายการแนะนำหรือจิ้มบนแผนที่`, 'warning');
        if (destInput) destInput.focus();
        return;
      }

      // 3. Compute Route via RouteManager
      const result = await window.routeManager.calculateRoute(originCoords, destCoords, this.checkpoints);
      window.routeManager.drawRouteOnMap(window.mapManager.map);
      this.renderRouteResults(result);
      window.soundManager.playSuccess();

      const count = (result.detectedCheckpoints || []).length;
      const destDisplayName = destCoords.name || destText;
      if (count > 0) {
        window.voiceManager.speak(`สแกนเส้นทางสู่ ${destDisplayName} เรียบร้อย ระยะทาง ${Math.round(result.distanceKm)} กิโลเมตร ตรวจพบด่านตรวจตลอดสายทาง ${count} จุดค่ะ`);
      } else {
        window.voiceManager.speak(`สแกนเส้นทางสู่ ${destDisplayName} เรียบร้อย ระยะทาง ${Math.round(result.distanceKm)} กิโลเมตร ไม่พบจุดตรวจด่านตลอดสายทาง ขอให้เดินทางโดยสวัสดิภาพค่ะ`);
      }

      this.showToast(`🚗 คำนวณเส้นทางสู่ ${destDisplayName} สำเร็จ! (${result.distanceKm.toFixed(1)} กม.)`, 'success');

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

  // Calculate route and start Turn-by-Turn navigation directly to specified coordinates
  startNavigationToCoords(lat, lng, title) {
    let originCoords = window.mapManager.userCoords || { lat: 13.7563, lng: 100.5018 };
    this.showToast(`🚗 กำลังคำนวณเส้นทางไป ${title}...`, 'info');
    window.routeManager.calculateRoute(originCoords, { lat, lng }, this.checkpoints).then(route => {
      window.routeManager.drawRouteOnMap(window.mapManager.map);
      window.navigationManager.startNavigation(route);
    }).catch(err => {
      console.warn('Navigation route failed:', err);
      this.showToast('❌ ไม่สามารถคำนวณเส้นทางนำทางได้', 'error');
    });
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

    // Pre-populate NavigationManager steps & route sheet
    if (window.navigationManager) {
      window.navigationManager.activeRoute = route;
      window.navigationManager.steps = window.navigationManager.generateTurnSteps(route);
      window.navigationManager.remainingDistanceKm = route.distanceKm;
      window.navigationManager.remainingDurationMin = route.durationMin;
      window.navigationManager.renderRouteSheet();
    }

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

  requestUserLocation(showNotice = false, forcePan = true) {
    if ('geolocation' in navigator) {
      const locateBtn = document.getElementById('btn-locate-me');
      if (locateBtn) locateBtn.classList.add('loading');

      // 1. Get current position immediately
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (locateBtn) {
            locateBtn.classList.remove('loading');
            locateBtn.classList.add('live-active');
          }
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const rawSpeed = pos.coords.speed;
          this.currentLiveSpeed = (rawSpeed !== null && rawSpeed > 0.5) ? Math.round(rawSpeed * 3.6) : 0;
          
          window.mapManager.setUserLocation(lat, lng, pos.coords.accuracy, forcePan);
          window.soundManager.playRadarPing();
          if (window.locationManager) {
            window.locationManager.reverseGeocode(lat, lng, true);
          }
          this.checkProximityAlerts();
          this.renderList();
          this.updateLiveRadarUI();
          if (showNotice) {
            this.showToast('📍 ได้รับตำแหน่ง GPS ปัจจุบัน & เริ่มต้นเรดาร์สดเรียบร้อยแล้ว', 'success');
          }

          // 2. Start continuous live GPS watch on mobile
          this.startLiveGPSWatch();
        },
        (err) => {
          if (locateBtn) locateBtn.classList.remove('loading');
          console.warn('Geolocation error or denied:', err);
          if (showNotice) {
            this.showToast('⚠️ ไม่สามารถเข้าถึงตำแหน่ง GPS ได้ กรุณาเปิดการระบุตำแหน่งบนโทรศัพท์ หรือใช้พิกัดตัวอย่างครับ', 'warning');
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 3000 }
      );
    }
  }

  startLiveGPSWatch() {
    if (this.liveGpsWatchId) return;

    this.liveGpsWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const rawSpeed = pos.coords.speed;
        let speedKmH = (rawSpeed !== null && rawSpeed > 0.5) ? Math.round(rawSpeed * 3.6) : 0;

        // Fallback speed from delta distance / time if device doesn't report raw speed
        if (speedKmH === 0 && this.lastLivePos && this.lastLivePosTime) {
          const dt = (Date.now() - this.lastLivePosTime) / 1000;
          if (dt >= 1.5 && dt <= 15) {
            const distKm = window.mapManager.calculateDistance(this.lastLivePos.lat, this.lastLivePos.lng, lat, lng);
            const calcSpeed = Math.round((distKm / dt) * 3600);
            if (calcSpeed >= 4 && calcSpeed <= 160) {
              speedKmH = calcSpeed;
            }
          }
        }
        this.lastLivePos = { lat, lng };
        this.lastLivePosTime = Date.now();
        this.currentLiveSpeed = speedKmH;

        window.mapManager.setUserLocation(lat, lng, pos.coords.accuracy, false);
        if (window.locationManager) {
          window.locationManager.reverseGeocode(lat, lng);
        }
        this.checkProximityAlerts();
        this.updateLiveRadarUI();
      },
      (err) => {
        console.warn('Live GPS watch error:', err);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 12000 }
    );
  }

  updateLiveRadarUI() {
    const textEl = document.getElementById('live-radar-text');
    const speedEl = document.getElementById('live-speed-display');
    const speed = this.currentLiveSpeed || 0;
    
    if (speedEl) {
      speedEl.innerHTML = `<i class="fa-solid fa-gauge-high"></i> ${speed} กม./ชม.`;
      if (speed > 90) {
        speedEl.classList.add('overspeed');
      } else {
        speedEl.classList.remove('overspeed');
      }
    }

    if (textEl) {
      if (this.nearestCheckpoint && this.nearestCheckpoint.distanceKm <= this.radarDistanceThresholdKm) {
        const distStr = this.nearestCheckpoint.distanceKm < 1 
          ? `${Math.round(this.nearestCheckpoint.distanceKm * 1000)} ม.` 
          : `${this.nearestCheckpoint.distanceKm.toFixed(1)} กม.`;
        const icon = this.nearestCheckpoint.type === 'speed' ? '⚡' : '🚨';
        textEl.innerHTML = `${icon} เรดาร์ตรวจพบ: <b>${this.nearestCheckpoint.title}</b> (${distStr})`;
      } else {
        textEl.innerHTML = `📡 เรดาร์ GPS สด: พร้อมตรวจจับความเร็ว & ด่านตรวจ (รัศมี ${this.radarDistanceThresholdKm} กม.)`;
      }
    }
  }

  simulateUserLocation(lat, lng, name) {
    this.currentLiveSpeed = 85;
    window.mapManager.setUserLocation(lat, lng, 20, true);
    window.soundManager.playRadarPing();
    if (window.locationManager) {
      window.locationManager.reverseGeocode(lat, lng, true);
    }
    this.checkProximityAlerts();
    this.renderList();
    this.updateLiveRadarUI();
    this.showToast(`🎯 พิกัดตัวอย่าง: ${name} (ความเร็วจำลอง 85 กม./ชม.)`, 'info');
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

    this.nearestCheckpoint = nearestSpeed && nearestSpeed.distanceKm < (nearest ? nearest.distanceKm : Infinity) 
      ? nearestSpeed 
      : (nearest || nearestSpeed);

    // 1. Dedicated Speed Camera & Radar Detection Warning
    const currentVoiceArea = window.locationManager ? window.locationManager.getVoiceAreaText() : '';
    const currentShortArea = window.locationManager ? window.locationManager.getShortAreaText() : '';
    const currentAreaTag = currentShortArea ? `<div class="radar-user-coord-tag"><i class="fa-solid fa-location-crosshairs"></i> พิกัดของคุณขณะนี้: <b>${currentShortArea}</b></div>` : '';

    if (nearestSpeed && nearestSpeed.distanceKm <= 2.5 && speedBanner) {
      const distStr = nearestSpeed.distanceKm < 1 
        ? `${Math.round(nearestSpeed.distanceKm * 1000)} เมตร` 
        : `${nearestSpeed.distanceKm.toFixed(1)} กิโลเมตร`;

      const currentDriverSpeed = this.currentLiveSpeed || (window.navigationManager ? Math.round(window.navigationManager.currentSpeed) : (window.hudManager ? Math.round(window.hudManager.currentSpeed) : 0));
      const speedLimit = nearestSpeed.speedLimit || (nearestSpeed.description && nearestSpeed.description.includes('120') ? 120 : (nearestSpeed.description && nearestSpeed.description.includes('90') ? 90 : (nearestSpeed.description && nearestSpeed.description.includes('80') ? 80 : 90)));
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
              ${isOverspeed ? '⚠️ ขับเร็วเกินกำหนด!' : '⚡ เรดาร์กล้องจับความเร็ว 24 ชม.'}
            </span>
          </div>
          <div class="speed-radar-title">${nearestSpeed.title}</div>
          <div class="speed-radar-loc">${nearestSpeed.locationName} (${nearestSpeed.direction || `จำกัด ${speedLimit} กม./ชม.`})</div>
          ${currentAreaTag}
        </div>
        <div class="speed-radar-limit-box">
          <div class="mini-speed-limit">${speedLimit}</div>
          <div class="speed-dist-tag"><i class="fa-solid fa-crosshairs"></i> ${distStr}</div>
        </div>
      `;

      // Trigger Laser Speed Radar Detector Audio & Voice with cooldown
      const now = Date.now();
      if (this.lastSpeedAlertId !== nearestSpeed.id || (now - this.lastSpeedAlertTime > 40000)) {
        this.lastSpeedAlertId = nearestSpeed.id;
        this.lastSpeedAlertTime = now;
        window.soundManager.playSpeedRadarAlert();
        window.voiceManager.announceSpeedCamera(nearestSpeed, nearestSpeed.distanceKm, speedLimit, currentVoiceArea);
      }
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
            ${currentAreaTag}
          </div>
          <button class="hud-view-btn" onclick="window.app.flyToAndOpen('${nearest.id}')">
            <i class="fa-solid fa-crosshairs"></i> ส่องจุดด่าน
          </button>
        </div>
      `;

      const now = Date.now();
      if (this.lastCheckpointAlertId !== nearest.id || (now - this.lastCheckpointAlertTime > 40000)) {
        this.lastCheckpointAlertId = nearest.id;
        this.lastCheckpointAlertTime = now;
        window.soundManager.playWarningAlert();
        window.voiceManager.announceCheckpointWarning(nearest, nearest.distanceKm, currentVoiceArea);
      }
    } else if (alertBanner) {
      alertBanner.classList.remove('visible', 'pulse-alert');
    }

    // 3. Accident Blackspots & Sharp Curves Warning
    const blackspotBanner = document.getElementById('blackspot-radar-hud');
    if (window.blackspotManager && blackspotBanner) {
      const nearestBlackspot = window.blackspotManager.checkBlackspotsProximity(userCoords, 1.5);
      if (nearestBlackspot) {
        const distStr = nearestBlackspot.distanceKm < 1 
          ? `${Math.round(nearestBlackspot.distanceKm * 1000)} เมตร` 
          : `${nearestBlackspot.distanceKm.toFixed(1)} กิโลเมตร`;

        blackspotBanner.className = 'blackspot-radar-banner visible';
        blackspotBanner.innerHTML = `
          <div class="blackspot-radar-icon-box">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div class="speed-radar-info">
            <div class="speed-radar-badge-row">
              <span class="radar-pill red"><i class="fa-solid fa-skull-crossbones"></i> จุดเสี่ยงอุบัติเหตุรุนแรง</span>
              <span class="radar-pill cyan">จำกัด ${nearestBlackspot.speedLimit} กม./ชม.</span>
            </div>
            <div class="speed-radar-title">${nearestBlackspot.title}</div>
            <div class="speed-radar-loc">${nearestBlackspot.locationName} (${nearestBlackspot.warningText})</div>
            ${currentAreaTag}
          </div>
          <div class="speed-radar-limit-box">
            <div class="mini-speed-limit">${nearestBlackspot.speedLimit}</div>
            <div class="speed-dist-tag" style="color: #f59e0b;"><i class="fa-solid fa-crosshairs"></i> ${distStr}</div>
          </div>
        `;

        window.soundManager.playWarningAlert();
        window.voiceManager.announceBlackspot(nearestBlackspot, nearestBlackspot.distanceKm, currentVoiceArea);
      } else {
        blackspotBanner.classList.remove('visible');
      }
    }

    // 4. Update Progressive Proximity Radar Beeping (Geiger frequency increases as distance closes)
    if (window.soundManager) {
      if (nearestSpeed && nearestSpeed.distanceKm <= 1.5) {
        window.soundManager.updateProximityBeep(nearestSpeed.distanceKm, 'speed');
      } else if (nearest && nearest.distanceKm <= 1.2) {
        window.soundManager.updateProximityBeep(nearest.distanceKm, 'checkpoint');
      } else {
        window.soundManager.stopProximityBeep();
      }
    }

    // 5. Log progress to TripLogger
    if (window.tripLogger && window.tripLogger.isRecording) {
      if (nearest && nearest.distanceKm <= 0.3) {
        window.tripLogger.logCheckpointPass(nearest);
      }
      if (nearestSpeed && nearestSpeed.distanceKm <= 0.3) {
        window.tripLogger.logCameraPass(nearestSpeed);
      }
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
        : (cp.type === 'speed' 
            ? '<span class="card-status active" style="border-color: #06b6d4; color: #38bdf8; background: rgba(6,182,212,0.15);"><i class="fa-solid fa-satellite-dish"></i> เรดาร์ 24 ชม.</span>'
            : '<span class="card-status active"><i class="fa-solid fa-circle-dot"></i> กำลังตั้งด่าน (สด)</span>');

      const typeBadgeClass = isCleared ? 'cleared' : cp.type;
      const timeAgo = this.formatRelativeTime(cp.reportedAt, cp.type, cp.status);

      return `
        <div class="checkpoint-card ${isCleared ? 'is-cleared' : ''}" id="card-${cp.id}" style="flex-shrink: 0 !important; min-height: 110px !important; display: flex; flex-direction: column;" onclick="window.app.flyToAndOpen('${cp.id}')">
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
    const mobActive = document.getElementById('mob-badge-active');

    if (elTotal) elTotal.textContent = total;
    if (elActive) elActive.textContent = active;
    if (elCleared) elCleared.textContent = cleared;
    if (mobActive) mobActive.textContent = active;
  }

  flyToAndOpen(checkpointId) {
    const cp = this.checkpoints.find((c) => c.id === checkpointId);
    if (!cp) return;

    window.mapManager.flyTo(cp.lat, cp.lng, 15);
    this.highlightCheckpointInList(cp.id);
    this.showCheckpointDetails(checkpointId);

    // If on mobile, collapse sheet so map is visible
    if (window.deviceManager && window.innerWidth <= 900) {
      window.deviceManager.closeMobileSheet();
    }
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
      : (cp.type === 'speed' ? '<i class="fa-solid fa-satellite-dish"></i> เรดาร์ตรวจจับ 24 ชม.' : '<i class="fa-solid fa-circle-dot"></i> กำลังตั้งด่าน (สดวันนี้)');

    document.getElementById('detail-title').textContent = cp.title;
    document.getElementById('detail-location').textContent = cp.locationName;
    document.getElementById('detail-direction').textContent = cp.direction || 'ไม่ระบุ';
    document.getElementById('detail-province').textContent = `${cp.province} ${cp.district ? `(${cp.district})` : ''}`;
    document.getElementById('detail-time').textContent = this.formatRelativeTime(cp.reportedAt, cp.type, cp.status);
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

  // ==========================================================================
  // Admin Authentication & Security System
  // ==========================================================================
  initAdminSecurity() {
    // 1. Check existing session
    const isSessionAdmin = sessionStorage.getItem('checkdan_is_admin') === 'true';
    this.setAdminMode(isSessionAdmin);

    // 2. Admin Auth Trigger Button
    const btnAdminAuth = document.getElementById('btn-admin-auth');
    if (btnAdminAuth) {
      btnAdminAuth.addEventListener('click', () => {
        if (this.isAdmin) {
          this.openGitHubModal();
        } else {
          this.openAdminLoginModal();
        }
      });
    }

    // 3. Admin Login Form Submission
    const adminForm = document.getElementById('admin-login-form');
    if (adminForm) {
      adminForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('admin-password-input');
        const errDiv = document.getElementById('admin-login-error');
        const enteredPass = input ? input.value.trim() : '';
        const savedPass = localStorage.getItem('checkdan_admin_password') || 'admin1234';

        if (enteredPass === savedPass) {
          sessionStorage.setItem('checkdan_is_admin', 'true');
          this.setAdminMode(true);
          if (errDiv) errDiv.style.display = 'none';
          if (input) input.value = '';
          this.closeAllModals();
          this.showToast('🎉 ยินดีต้อนรับ ผู้ดูแลระบบ (Admin Mode Active)', 'success');
          window.soundManager.playSuccess();
          if (this.pendingAdminAction === 'open_install_analytics') {
            this.pendingAdminAction = null;
            if (window.installTracker) {
              window.installTracker.showInstallAnalyticsModal();
            }
          } else {
            this.openGitHubModal();
          }
        } else {
          if (errDiv) errDiv.style.display = 'block';
          window.soundManager.playWarningAlert();
        }
      });
    }

    // 4. Toggle Eye Icon for Admin Password Input
    const btnEye = document.getElementById('btn-toggle-admin-eye');
    const eyeInput = document.getElementById('admin-password-input');
    const eyeIcon = document.getElementById('admin-eye-icon');
    if (btnEye && eyeInput) {
      btnEye.addEventListener('click', () => {
        const isPass = eyeInput.type === 'password';
        eyeInput.type = isPass ? 'text' : 'password';
        if (eyeIcon) {
          eyeIcon.className = isPass ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
        }
      });
    }

    // 5. Admin Logout Button
    const btnLogout = document.getElementById('btn-admin-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        sessionStorage.removeItem('checkdan_is_admin');
        this.setAdminMode(false);
        this.closeAllModals();
        this.showToast('🚪 ออกจากระบบ Admin เรียบร้อยแล้ว (ซ่อนปุ่ม GitHub แล้ว)', 'info');
      });
    }

    // 6. Change Admin Password Button & Form
    const openChangePassFn = () => {
      this.openAdminChangePasswordModal();
    };
    const btnChangePass = document.getElementById('btn-admin-change-pass');
    const btnChangePassBanner = document.getElementById('btn-admin-change-pass-banner');
    const btnHeaderChangePass = document.getElementById('btn-header-change-pass');
    if (btnChangePass) btnChangePass.addEventListener('click', openChangePassFn);
    if (btnChangePassBanner) btnChangePassBanner.addEventListener('click', openChangePassFn);
    if (btnHeaderChangePass) btnHeaderChangePass.addEventListener('click', openChangePassFn);

    const changePassForm = document.getElementById('admin-change-password-form');
    if (changePassForm) {
      changePassForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const oldInput = document.getElementById('admin-old-pass-input');
        const newInput = document.getElementById('admin-new-pass-input');
        const confirmInput = document.getElementById('admin-confirm-pass-input');
        const errDiv = document.getElementById('admin-change-error');

        const oldVal = oldInput ? oldInput.value.trim() : '';
        const newVal = newInput ? newInput.value.trim() : '';
        const confirmVal = confirmInput ? confirmInput.value.trim() : '';
        const currentSavedPass = localStorage.getItem('checkdan_admin_password') || 'admin1234';

        if (oldVal !== currentSavedPass) {
          if (errDiv) {
            errDiv.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> รหัสผ่านปัจจุบันไม่ถูกต้อง กรุณาตรวจสอบใหม่อีกครั้ง';
            errDiv.style.display = 'block';
          }
          if (oldInput) {
            oldInput.focus();
            oldInput.select();
          }
          window.soundManager.playWarningAlert();
          return;
        }

        if (newVal.length < 4) {
          if (errDiv) {
            errDiv.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร';
            errDiv.style.display = 'block';
          }
          if (newInput) newInput.focus();
          window.soundManager.playWarningAlert();
          return;
        }

        if (newVal !== confirmVal) {
          if (errDiv) {
            errDiv.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน';
            errDiv.style.display = 'block';
          }
          if (confirmInput) confirmInput.focus();
          window.soundManager.playWarningAlert();
          return;
        }

        // Save new password
        localStorage.setItem('checkdan_admin_password', newVal);
        if (errDiv) errDiv.style.display = 'none';
        changePassForm.reset();
        
        const modal = document.getElementById('admin-change-password-modal');
        if (modal) modal.classList.remove('show');

        this.showToast('🎉 เปลี่ยนรหัสผ่าน Admin เรียบร้อยแล้ว! รหัสผ่านใหม่มีผลทันที', 'success');
        window.soundManager.playSuccess();
        window.voiceManager.speak('เปลี่ยนรหัสผ่านผู้ดูแลระบบเรียบร้อยแล้วค่ะ');
      });
    }

    // Toggle eye icon for all .btn-toggle-eye
    document.querySelectorAll('.btn-toggle-eye').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const targetInput = document.getElementById(targetId);
        const icon = btn.querySelector('i');
        if (targetInput) {
          const isPass = targetInput.type === 'password';
          targetInput.type = isPass ? 'text' : 'password';
          if (icon) {
            icon.className = isPass ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
          }
        }
      });
    });

    // 7. Check URL Parameter for ?admin
    if (window.location.search.includes('admin')) {
      if (!this.isAdmin) {
        setTimeout(() => this.openAdminLoginModal(), 600);
      }
    }

    // 8. Keyboard Shortcuts: Esc to close & Ctrl + Shift + A to toggle
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const changeModal = document.getElementById('admin-change-password-modal');
        if (changeModal && changeModal.classList.contains('show')) {
          changeModal.classList.remove('show');
          return;
        }
        this.closeAllModals();
      }
      if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        if (this.isAdmin) {
          this.openGitHubModal();
        } else {
          this.openAdminLoginModal();
        }
      }
    });
  }

  setAdminMode(isAdmin) {
    this.isAdmin = isAdmin;
    const ghBtn = document.getElementById('btn-github-settings');
    const headerPassBtn = document.getElementById('btn-header-change-pass');
    const authBtn = document.getElementById('btn-admin-auth');
    const lockIcon = document.getElementById('admin-lock-icon');

    if (ghBtn) {
      ghBtn.style.display = isAdmin ? 'inline-flex' : 'none';
      ghBtn.classList.toggle('admin-visible', isAdmin);
    }

    if (headerPassBtn) {
      headerPassBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    }

    if (authBtn) {
      authBtn.classList.toggle('logged-in', isAdmin);
      authBtn.title = isAdmin 
        ? 'ผู้ดูแลระบบ (เข้าสู่ระบบแล้ว - คลิกเพื่อจัดการ GitHub / ออกจากระบบ)' 
        : 'เข้าสู่ระบบผู้ดูแล (Admin Access)';
    }

    if (lockIcon) {
      lockIcon.className = isAdmin ? 'fa-solid fa-shield-halved' : 'fa-solid fa-lock';
    }
  }

  openAdminLoginModal() {
    const modal = document.getElementById('admin-login-modal');
    if (!modal) return;
    const errDiv = document.getElementById('admin-login-error');
    const input = document.getElementById('admin-password-input');
    if (errDiv) errDiv.style.display = 'none';
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 300);
    }
    modal.classList.add('show');
  }

  openAdminChangePasswordModal() {
    if (!this.isAdmin) {
      this.showToast('🔒 กรุณาเข้าสู่ระบบ Admin ก่อนทำการเปลี่ยนรหัสผ่าน', 'warning');
      this.openAdminLoginModal();
      return;
    }
    const modal = document.getElementById('admin-change-password-modal');
    if (!modal) return;
    const form = document.getElementById('admin-change-password-form');
    const errDiv = document.getElementById('admin-change-error');
    if (form) form.reset();
    if (errDiv) {
      errDiv.style.display = 'none';
      errDiv.textContent = '';
    }
    const oldInput = document.getElementById('admin-old-pass-input');
    if (oldInput) {
      setTimeout(() => oldInput.focus(), 300);
    }
    modal.classList.add('show');
  }

  openGitHubModal() {
    // SECURITY GUARD: Only Admin can open GitHub Settings!
    if (!this.isAdmin) {
      this.showToast('🔒 ส่วนนี้สงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น', 'warning');
      this.openAdminLoginModal();
      return;
    }

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

  formatRelativeTime(isoString, type = '', status = 'active') {
    if (type === 'speed') {
      return '📡 เรดาร์ 24 ชม.';
    }
    if (!isoString) return 'วันนี้ (สด)';
    try {
      const then = new Date(isoString).getTime();
      const now = Date.now();
      const diffSec = Math.floor((now - then) / 1000);

      if (diffSec < 0 || diffSec < 60) return 'เมื่อสักครู่';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) {
        const d = new Date(isoString);
        const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        return `วันนี้ ${timeStr} น. (${diffHr} ชม. ที่แล้ว)`;
      }
      const diffDay = Math.floor(diffHr / 24);
      if (status === 'active' && diffDay <= 2) {
        return 'วันนี้ (กำลังตั้งด่าน)';
      }
      return `${diffDay} วันที่แล้ว`;
    } catch (e) {
      return 'วันนี้';
    }
  }

  // ==========================================================================
  // TrafficD Lite & External Data Integration
  // ==========================================================================
  openTrafficDModal() {
    this.closeAllModals();
    const modal = document.getElementById('trafficd-modal');
    if (modal) {
      modal.classList.add('show');
      modal.classList.add('active');
    }
  }

  closeTrafficDModal() {
    const modal = document.getElementById('trafficd-modal');
    if (modal) {
      modal.classList.remove('show');
      modal.classList.remove('active');
    }
  }

  launchTrafficDApp() {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    this.showToast('🚗 กำลังเรียกเปิดแอป TrafficD Lite...', 'info');

    const appUri = 'trafficd://';
    const fallbackWeb = 'https://trafficdmap.com';

    if (isMobile) {
      const start = Date.now();
      window.location.href = appUri;
      setTimeout(() => {
        if (Date.now() - start < 1800) {
          window.open(fallbackWeb, '_blank');
        }
      }, 1200);
    } else {
      window.open(fallbackWeb, '_blank');
    }
  }

  importTrafficDData() {
    const input = document.getElementById('trafficd-import-input');
    if (!input || !input.value.trim()) {
      this.showToast('⚠️ กรุณากรอกหรือวางข้อมูลจาก TrafficD ก่อนกดนำเข้าครับ', 'warning');
      return;
    }

    const val = input.value.trim();
    let importedList = [];

    // 1. JSON Array or Object
    if (val.startsWith('[') || val.startsWith('{')) {
      try {
        const parsed = JSON.parse(val);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        arr.forEach((item, idx) => {
          if (item.lat && item.lng) {
            const isSpeed = item.type === 'speed' || (item.title && item.title.includes('ความเร็ว')) || (item.title && item.title.includes('กล้อง'));
            importedList.push({
              id: item.id || `cp-trafficd-${Date.now()}-${idx}`,
              title: item.title || `จุดรายงาน TrafficD #${idx + 1}`,
              type: isSpeed ? 'speed' : (item.type || 'traffic'),
              typeLabel: isSpeed ? 'กล้องจับความเร็ว' : (item.typeLabel || 'ด่านจราจร TrafficD'),
              locationName: item.locationName || item.location || 'นำเข้าจาก TrafficD',
              province: item.province || 'กรุงเทพมหานคร',
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lng),
              direction: item.direction || 'ไม่ระบุฝั่ง',
              status: 'active',
              speedLimit: item.speedLimit || (isSpeed ? 90 : null),
              verifiedCount: item.verifiedCount || 10,
              clearedCount: 0,
              reportedAt: new Date().toISOString(),
              description: item.description || 'ข้อมูลนำเข้าจากแอป TrafficD Lite (จราจร ด่าน รถติด)',
              reportedBy: 'TrafficD_Crowd',
              severity: 'medium'
            });
          }
        });
      } catch (err) {
        console.warn('JSON parse error:', err);
      }
    }

    // 2. Comma or Space separated coordinates (e.g. "13.7563, 100.5018 ด่านตรวจแยกอโศก")
    if (importedList.length === 0) {
      const match = val.match(/([0-9]+\.[0-9]+)[\s,]+([0-9]+\.[0-9]+)/);
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        const isSpeed = val.includes('ความเร็ว') || val.includes('กล้อง') || val.includes('เรดาร์');
        importedList.push({
          id: `cp-trafficd-${Date.now()}`,
          title: val.replace(match[0], '').trim() || (isSpeed ? 'กล้องตรวจจับความเร็ว (TrafficD)' : 'จุดตรวจด่าน (TrafficD)'),
          type: isSpeed ? 'speed' : 'traffic',
          typeLabel: isSpeed ? 'กล้องจับความเร็ว' : 'ด่านตรวจจราจร',
          locationName: 'พิกัดนำเข้าด่วน TrafficD',
          province: 'กรุงเทพมหานคร',
          lat,
          lng,
          direction: 'ทั้งสองฝั่ง',
          status: 'active',
          speedLimit: isSpeed ? 90 : null,
          verifiedCount: 12,
          clearedCount: 0,
          reportedAt: new Date().toISOString(),
          description: val,
          reportedBy: 'TrafficD_User',
          severity: 'medium'
        });
      }
    }

    if (importedList.length > 0) {
      importedList.forEach(cp => this.checkpoints.unshift(cp));
      window.githubSync.saveLocalCache(this.checkpoints);
      this.render();
      this.closeTrafficDModal();
      this.flyToAndOpen(importedList[0].id);
      window.soundManager.playSuccess();
      window.voiceManager.speak(`นำเข้าข้อมูลจาก ทราฟฟิกดี สำเร็จ ${importedList.length} จุดเรียบร้อยค่ะ`);
      this.showToast(`✅ นำเข้าข้อมูลจุดด่านจาก TrafficD สำเร็จ ${importedList.length} จุดเรียบร้อย!`, 'success');
      input.value = '';
    } else {
      this.showToast('⚠️ รูปแบบข้อมูลไม่ถูกต้อง กรุณาใส่ JSON หรือพิกัด ละติจูด, ลองจิจูด', 'warning');
    }
  }

  loadSampleTrafficDData() {
    const input = document.getElementById('trafficd-import-input');
    if (!input) return;
    const sample = [
      {
        "title": "ด่านตรวจวัดแอลกอฮอล์ ถ.ทองหล่อ",
        "type": "alcohol",
        "typeLabel": "ตรวจวัดแอลกอฮอล์",
        "locationName": "หน้า สน.ทองหล่อ สุขุมวิท 55",
        "province": "กรุงเทพมหานคร",
        "lat": 13.7330,
        "lng": 100.5830,
        "direction": "ขาเข้า (มุ่งหน้าสุขุมวิท)"
      },
      {
        "title": "กล้องตรวจจับความเร็ว ทางด่วนเฉลิมมหานคร (ด่านอาจณรงค์)",
        "type": "speed",
        "typeLabel": "กล้องจับความเร็ว",
        "locationName": "บนทางด่วนช่วงโค้งอาจณรงค์",
        "province": "กรุงเทพมหานคร",
        "lat": 13.7120,
        "lng": 100.5890,
        "speedLimit": 80,
        "direction": "จำกัด 80 กม./ชม."
      }
    ];
    input.value = JSON.stringify(sample, null, 2);
    this.showToast('📋 โหลดตัวอย่างข้อมูล TrafficD เรียบร้อยแล้ว กด "นำเข้าสู่แผนที่เรดาร์" ได้เลยครับ', 'info');
  }

  async syncTrafficDAPI() {
    const endpointInput = document.getElementById('trafficd-api-endpoint');
    const url = endpointInput ? endpointInput.value.trim() : '';
    if (!url) {
      this.showToast('⚠️ กรุณากรอก URL Endpoint API ก่อนกดซิงค์ครับ', 'warning');
      return;
    }

    this.showToast('⏳ กำลังเชื่อมต่อซิงค์ข้อมูลกับ API...', 'info');
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((item, idx) => {
          if (item.lat && item.lng) {
            const isSpeed = item.type === 'speed' || (item.title && item.title.includes('ความเร็ว'));
            this.checkpoints.unshift({
              id: item.id || `cp-api-${Date.now()}-${idx}`,
              title: item.title || 'จุดตรวจสด (API Sync)',
              type: isSpeed ? 'speed' : (item.type || 'traffic'),
              typeLabel: isSpeed ? 'กล้องจับความเร็ว' : (item.typeLabel || 'จุดตรวจ'),
              locationName: item.locationName || item.location || 'API Data',
              province: item.province || 'กรุงเทพมหานคร',
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lng),
              direction: item.direction || 'ไม่ระบุ',
              status: item.status || 'active',
              speedLimit: item.speedLimit || (isSpeed ? 90 : null),
              verifiedCount: item.verifiedCount || 1,
              clearedCount: 0,
              reportedAt: new Date().toISOString(),
              description: item.description || 'ซิงค์สดจาก API Feed',
              reportedBy: 'API_Sync',
              severity: 'medium'
            });
          }
        });
        window.githubSync.saveLocalCache(this.checkpoints);
        this.render();
        this.closeTrafficDModal();
        window.soundManager.playSuccess();
        this.showToast(`✅ ซิงค์ข้อมูลด่านสดผ่าน API สำเร็จ ${data.length} รายการ!`, 'success');
      } else {
        this.showToast('⚠️ ไม่พบข้อมูลจุดด่านในรูปแบบ Array จาก API', 'warning');
      }
    } catch (err) {
      console.warn('API Sync Error:', err);
      this.showToast(`❌ เชื่อมต่อ API ล้มเหลว: ${err.message} (ตรวจสอบ CORS หรือ URL)`, 'warning');
    }
  }

  // ==========================================================================
  // Tourist Attractions & Travel Companion Integration
  // ==========================================================================
  initAttractionsTab() {
    const provSelect = document.getElementById('attraction-province-select');
    const searchInput = document.getElementById('attractions-search-input');
    const btnClear = document.getElementById('btn-attraction-search-clear');
    const chipsWrapper = document.getElementById('attraction-category-chips');
    const btnNearby = document.getElementById('btn-nearby-attractions');
    const btnToggleMap = document.getElementById('btn-sidebar-toggle-attractions-map');
    const btnMapFloating = document.getElementById('btn-toggle-attractions');

    // Province change
    if (provSelect) {
      provSelect.addEventListener('change', () => {
        if (window.attractionsManager) {
          window.attractionsManager.selectedProvince = provSelect.value;
        }
        this.renderAttractionsList();
      });
    }

    // Live search input
    if (searchInput) {
      let debounceTimer = null;
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (btnClear) btnClear.style.display = val ? 'flex' : 'none';

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (window.attractionsManager) {
            window.attractionsManager.searchQuery = val;
          }
          this.renderAttractionsList();
        }, 250);
      });
    }

    if (btnClear && searchInput) {
      btnClear.addEventListener('click', () => {
        searchInput.value = '';
        btnClear.style.display = 'none';
        if (window.attractionsManager) {
          window.attractionsManager.searchQuery = '';
        }
        this.renderAttractionsList();
      });
    }

    // Category filter chips
    if (chipsWrapper) {
      chipsWrapper.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          chipsWrapper.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          const cat = chip.dataset.cat || 'all';
          if (window.attractionsManager) {
            window.attractionsManager.activeFilter = cat;
          }
          this.renderAttractionsList();
        });
      });
    }

    // Nearby attractions button
    if (btnNearby) {
      btnNearby.addEventListener('click', () => {
        const userCoords = window.mapManager?.userCoords;
        if (!userCoords) {
          this.showToast('📍 กำลังค้นหาพิกัด GPS ปัจจุบันของคุณ...', 'info');
          this.requestUserLocation(true);
        }

        if (window.attractionsManager) {
          window.attractionsManager.selectedProvince = 'all';
          window.attractionsManager.searchQuery = '';
          if (provSelect) provSelect.value = 'all';
          if (searchInput) searchInput.value = '';
          if (btnClear) btnClear.style.display = 'none';
        }

        const nearbyList = window.attractionsManager ? window.attractionsManager.getNearby(120, userCoords) : [];
        this.renderAttractionsList(nearbyList);
        this.showToast(`🧭 พบแหล่งท่องเที่ยวใกล้เคียง ${nearbyList.length} แห่งในรัศมีของคุณ`, 'success');
        if (window.voiceManager) {
          window.voiceManager.speak(`พบแหล่งท่องเที่ยวใกล้เคียง ${nearbyList.length} แห่งค่ะ ที่ใกล้ที่สุดคือ ${nearbyList[0]?.name || ''}`);
        }
      });
    }

    // Toggle layer buttons
    const handleToggleMap = () => {
      if (!window.attractionsManager) return;
      const isVisible = window.attractionsManager.toggleLayer();
      if (btnToggleMap) {
        btnToggleMap.classList.toggle('active', isVisible);
        btnToggleMap.innerHTML = isVisible ? '<i class="fa-solid fa-eye-slash"></i> ซ่อนหมุดบนแผนที่' : '<i class="fa-solid fa-map-pin"></i> แสดงหมุดบนแผนที่';
      }
      if (btnMapFloating) {
        btnMapFloating.classList.toggle('active', isVisible);
      }
      this.showToast(isVisible ? '🗺️ แสดงหมุดแหล่งท่องเที่ยว 77 จังหวัดบนแผนที่แล้ว' : 'ซ่อนหมุดแหล่งท่องเที่ยวบนแผนที่แล้ว', 'info');
    };

    if (btnToggleMap) btnToggleMap.addEventListener('click', handleToggleMap);
    if (btnMapFloating) btnMapFloating.addEventListener('click', handleToggleMap);

    // Initial render of attractions list
    this.renderAttractionsList();
  }

  renderAttractionsList(customList = null) {
    const listContainer = document.getElementById('attractions-cards-list');
    const countLabel = document.getElementById('attractions-count-label');
    const emptyState = document.getElementById('attractions-empty-state');
    if (!listContainer || !window.attractionsManager) return;

    const mgr = window.attractionsManager;
    const userCoords = window.mapManager?.userCoords;
    const items = customList !== null ? customList : mgr.search(mgr.searchQuery, mgr.activeFilter, mgr.selectedProvince, userCoords);

    // Update count label
    if (countLabel) {
      countLabel.textContent = `พบแหล่งท่องเที่ยว ${items.length} แห่ง`;
    }

    if (emptyState) {
      emptyState.style.display = items.length === 0 ? 'flex' : 'none';
    }

    // Sync markers with map if layer is currently active
    if (mgr.isLayerVisible && window.mapManager?.map) {
      mgr.renderOnMap(items);
    }

    if (items.length === 0) {
      listContainer.innerHTML = '';
      return;
    }

    const catBadgeClass = {
      nature: 'nature',
      beach: 'beach',
      temple: 'temple',
      landmark: 'landmark',
      market: 'market',
      cafe: 'cafe'
    };

    const catIcons = {
      nature: 'fa-mountain-sun',
      beach: 'fa-umbrella-beach',
      temple: 'fa-vihara',
      landmark: 'fa-landmark-dome',
      market: 'fa-store',
      cafe: 'fa-mug-saucer'
    };

    listContainer.innerHTML = items.map(item => {
      const bClass = catBadgeClass[item.category] || 'landmark';
      const icon = catIcons[item.category] || 'fa-location-dot';
      const distStr = item.distanceKm !== undefined ? `~${item.distanceKm.toFixed(1)} กม.` : '';

      return `
        <div class="attraction-card" onclick="window.attractionsManager.focusAttraction(${item.lat}, ${item.lng})">
          <div class="attraction-card-header">
            <div>
              <h4 class="attraction-title">${item.name}</h4>
              <div style="font-size: 11px; color: #94a3b8;">${item.nameEn}</div>
            </div>
            <span class="attraction-cat-badge ${bClass}">
              <i class="fa-solid ${icon}"></i> ${item.categoryLabel}
            </span>
          </div>

          <p class="attraction-desc">${item.desc}</p>

          ${item.highlight ? `
            <div class="attraction-highlight-row">
              <i class="fa-solid fa-star" style="font-size: 10px;"></i>
              <span><b>ไฮไลต์:</b> ${item.highlight}</span>
            </div>
          ` : ''}

          <div class="attraction-meta-row">
            <span><i class="fa-solid fa-location-dot" style="color: var(--neon-cyan);"></i> จ.${item.province}</span>
            <span><i class="fa-solid fa-ticket"></i> ${item.fee || 'เข้าชมฟรี'}</span>
            ${distStr ? `<span style="color: #38bdf8; font-weight: 700;">${distStr}</span>` : ''}
          </div>

          <div class="attraction-actions-row" onclick="event.stopPropagation();">
            <button class="btn-attraction-nav" onclick="window.attractionsManager.navigateToAttraction(${item.lat}, ${item.lng}, '${item.name.replace(/'/g, "\\'")}')" title="เริ่มนำทางเลี้ยวต่อเลี้ยว">
              <i class="fa-solid fa-diamond-turn-right"></i> นำทางทันที
            </button>
            <button class="btn-attraction-route" onclick="window.attractionsManager.setAsRouteDest(${item.lat}, ${item.lng}, '${item.name.replace(/'/g, "\\'")}')" title="คำนวณเส้นทางและสแกนด่าน">
              <i class="fa-solid fa-route"></i> สแกนทาง
            </button>
            <button class="btn-attraction-route" onclick="window.attractionsManager.focusAttraction(${item.lat}, ${item.lng})" title="ปักหมุดบนแผนที่">
              <i class="fa-solid fa-map-pin"></i> ดูแผนที่
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // ==========================================================================
  // App Install Tracker & Analytics Integration
  // ==========================================================================
  initInstallTracker() {
    const badgeCountText = document.getElementById('header-install-count-text');
    const btnBadge = document.getElementById('btn-header-install-analytics');

    const updateInstallCountUI = (stats) => {
      if (badgeCountText && stats) {
        if (stats.isStandalone || stats.isInstalledPwa) {
          badgeCountText.textContent = `PWA ติดตั้งแล้ว (#${stats.sessionCount || 1})`;
        } else {
          badgeCountText.textContent = `อุปกรณ์จริง (#${stats.sessionCount || 1})`;
        }
      }
    };

    if (window.installTracker) {
      updateInstallCountUI(window.installTracker.stats);
    }

    window.addEventListener('installStatsUpdated', (e) => {
      updateInstallCountUI(e.detail);
    });

    if (btnBadge) {
      btnBadge.addEventListener('click', () => {
        if (this.isAdmin) {
          if (window.installTracker) window.installTracker.showInstallAnalyticsModal();
        } else {
          this.pendingAdminAction = 'open_install_analytics';
          this.openAdminLoginModal();
          this.showToast('🔒 กรุณาเข้าสู่ระบบ Admin เพื่อดูรายงานข้อมูลอุปกรณ์และการติดตั้งจริง', 'info');
        }
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new CheckDanApp();
  window.app.init();
});
