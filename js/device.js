// ==========================================================================
// Device Adaptation & Hardware API Manager for CheckDan Thailand
// Handles Vibration API (Haptics), Screen Wake Lock API, Mobile Bottom Nav & Sheet
// ==========================================================================

class DeviceManager {
  constructor() {
    this.wakeLockSentinel = null;
    this.wakeLockRequestedBy = null;
    this.isWakeLockSupported = 'wakeLock' in navigator;
    this.isVibrationSupported = 'vibrate' in navigator;
    
    // Load persisted vibration setting (default enabled)
    const savedVibrate = localStorage.getItem('checkdan_vibrate_enabled');
    this.isVibrationEnabled = savedVibrate !== null ? savedVibrate === 'true' : true;

    this.activeMobileTab = 'map';
    this.isSheetOpen = false;
    this.isMobileView = window.innerWidth <= 900;
  }

  init() {
    console.log('[DeviceManager] Initializing device adaptation & hardware APIs...');
    this.bindEvents();
    this.setupWakeLockVisibilityHandler();
    this.updateVibrateUI();
    this.updateWakeLockUI();
    this.checkOrientation();

    window.addEventListener('resize', () => {
      const wasMobile = this.isMobileView;
      this.isMobileView = window.innerWidth <= 900;
      if (wasMobile !== this.isMobileView) {
        this.handleViewportChange();
      }
    });

    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.checkOrientation(), 250);
    });
  }

  // ==========================================================================
  // 1. Screen Wake Lock API (ป้องกันหน้าจอดับอัตโนมัติขณะขับขี่/นำทาง)
  // ==========================================================================
  async requestWakeLock(reason = 'Driving Mode') {
    if (!this.isWakeLockSupported) {
      console.log('[DeviceManager] Screen Wake Lock not supported by this browser.');
      return false;
    }

    try {
      if (this.wakeLockSentinel && !this.wakeLockSentinel.released) {
        return true; // Already active
      }

      this.wakeLockSentinel = await navigator.wakeLock.request('screen');
      this.wakeLockRequestedBy = reason;
      console.log(`[DeviceManager] 🔆 Screen Wake Lock acquired for: ${reason}`);

      this.wakeLockSentinel.addEventListener('release', () => {
        console.log('[DeviceManager] 🔆 Screen Wake Lock was released.');
        this.updateWakeLockUI();
      });

      this.updateWakeLockUI();
      if (window.app && typeof window.app.showToast === 'function') {
        window.app.showToast('🔆 ป้องกันหน้าจอดับ (Wake Lock) เปิดทำงานแล้ว', 'info');
      }
      return true;
    } catch (err) {
      console.warn(`[DeviceManager] Wake Lock request failed (${err.name}: ${err.message})`);
      return false;
    }
  }

  async releaseWakeLock() {
    if (this.wakeLockSentinel && !this.wakeLockSentinel.released) {
      try {
        await this.wakeLockSentinel.release();
        this.wakeLockSentinel = null;
        this.wakeLockRequestedBy = null;
        console.log('[DeviceManager] 🔆 Screen Wake Lock manually released.');
      } catch (err) {
        console.warn('[DeviceManager] Error releasing Wake Lock:', err);
      }
    }
    this.updateWakeLockUI();
  }

  setupWakeLockVisibilityHandler() {
    document.addEventListener('visibilitychange', async () => {
      // If user switched away and came back while still in driving mode, re-acquire
      if (document.visibilityState === 'visible' && this.wakeLockRequestedBy) {
        const isHudActive = window.hudManager && window.hudManager.isActive;
        const isNavActive = window.navigationManager && window.navigationManager.isActive;
        if (isHudActive || isNavActive) {
          await this.requestWakeLock(this.wakeLockRequestedBy);
        }
      }
    });
  }

  isWakeLockActive() {
    return !!(this.wakeLockSentinel && !this.wakeLockSentinel.released);
  }

  updateWakeLockUI() {
    const active = this.isWakeLockActive();
    const badges = document.querySelectorAll('.wakelock-status-badge');
    badges.forEach(b => {
      b.classList.toggle('active', active);
      b.innerHTML = active
        ? '<i class="fa-solid fa-sun"></i> <span>จอสว่างตลอดเวลา</span>'
        : '<i class="fa-regular fa-sun"></i> <span>จอดับตามปกติ</span>';
    });
  }

  // ==========================================================================
  // 2. Vibration API (Haptic Feedback ระบบสั่นเตือนบนมือถือ)
  // ==========================================================================
  vibrate(pattern) {
    if (!this.isVibrationSupported || !this.isVibrationEnabled) return;
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn('[DeviceManager] Vibration error:', e);
    }
  }

  // Subtle tap feedback for mobile UI clicks
  vibrateTap() {
    this.vibrate(22);
  }

  // Radar Proximity Alert (double pulse warning)
  vibrateRadarAlert() {
    this.vibrate([260, 100, 260]);
  }

  // Speed Camera / Laser Radar Warning (rapid urgent pulse)
  vibrateSpeedCameraAlert() {
    this.vibrate([350, 80, 350, 80, 500]);
  }

  // Dangerous curve / blackspot alert
  vibrateDangerCurve() {
    this.vibrate([280, 110, 280]);
  }

  // Success action confirmation
  vibrateSuccess() {
    this.vibrate([60, 60, 60]);
  }

  toggleVibration(enable) {
    this.isVibrationEnabled = enable !== undefined ? enable : !this.isVibrationEnabled;
    localStorage.setItem('checkdan_vibrate_enabled', this.isVibrationEnabled ? 'true' : 'false');
    this.updateVibrateUI();

    if (this.isVibrationEnabled) {
      this.vibrateSuccess();
      if (window.app) window.app.showToast('📳 เปิดระบบสั่นเตือนบนมือถือแล้ว', 'success');
    } else {
      if (window.app) window.app.showToast('📳 ปิดระบบสั่นเตือนบนมือถือแล้ว', 'info');
    }
    return this.isVibrationEnabled;
  }

  updateVibrateUI() {
    const vibrateBtns = document.querySelectorAll('.btn-vibrate-toggle, #btn-vibrate-toggle, #menu-item-vibrate');
    vibrateBtns.forEach(btn => {
      if (this.isVibrationEnabled) {
        btn.classList.add('active');
        btn.setAttribute('title', 'ระบบสั่นเตือน: เปิดอยู่ (คลิกเพื่อปิด)');
        const icon = btn.querySelector('i');
        if (icon) icon.className = 'fa-solid fa-mobile-screen-button';
      } else {
        btn.classList.remove('active');
        btn.setAttribute('title', 'ระบบสั่นเตือน: ปิดอยู่ (คลิกเพื่อเปิด)');
        const icon = btn.querySelector('i');
        if (icon) icon.className = 'fa-solid fa-mobile-screen';
      }
    });
  }

  // ==========================================================================
  // 3. Mobile Bottom Navigation & Sheet Drawer
  // ==========================================================================
  bindEvents() {
    // Bottom Nav buttons
    const navButtons = document.querySelectorAll('.mobile-nav-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = btn.dataset.tab;
        this.vibrateTap();
        this.switchMobileTab(tab);
      });
    });

    // Close mobile sheet button
    const btnCloseSheet = document.getElementById('btn-close-mobile-sheet');
    if (btnCloseSheet) {
      btnCloseSheet.addEventListener('click', () => {
        this.vibrateTap();
        this.closeMobileSheet();
      });
    }

    // Drag handle tap to toggle collapse
    const sheetHandle = document.getElementById('mobile-sheet-header');
    if (sheetHandle) {
      sheetHandle.addEventListener('click', (e) => {
        if (e.target.closest('#btn-close-mobile-sheet')) return;
        this.vibrateTap();
        if (this.isSheetOpen) {
          this.closeMobileSheet();
        } else {
          this.openMobileSheet('checkpoints');
        }
      });
    }

    // Vibration Toggle Buttons
    const vibrateBtn = document.getElementById('btn-vibrate-toggle');
    if (vibrateBtn) {
      vibrateBtn.addEventListener('click', () => {
        this.toggleVibration();
      });
    }

    // Mobile More Menu Dropdown Toggle
    const btnMobileMenu = document.getElementById('btn-mobile-menu');
    const mobileDropdown = document.getElementById('mobile-more-dropdown');
    if (btnMobileMenu && mobileDropdown) {
      btnMobileMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        this.vibrateTap();
        const isOpen = mobileDropdown.classList.toggle('active');
        btnMobileMenu.classList.toggle('active', isOpen);
      });

      // Close when clicking outside
      document.addEventListener('click', (e) => {
        if (!mobileDropdown.contains(e.target) && e.target !== btnMobileMenu) {
          mobileDropdown.classList.remove('active');
          btnMobileMenu.classList.remove('active');
        }
      });
    }

    // Menu Item: WakeLock info / toggle
    const menuWakeLock = document.getElementById('menu-item-wakelock');
    if (menuWakeLock) {
      menuWakeLock.addEventListener('click', () => {
        this.vibrateTap();
        if (this.isWakeLockActive()) {
          this.releaseWakeLock();
          if (window.app) window.app.showToast('🔆 ปิดการป้องกันจอดับแล้ว', 'info');
        } else {
          this.requestWakeLock('Manual setting');
        }
      });
    }

    // Menu Item: Vibrate toggle
    const menuVibrate = document.getElementById('menu-item-vibrate');
    if (menuVibrate) {
      menuVibrate.addEventListener('click', () => {
        this.toggleVibration();
      });
    }
  }

  switchMobileTab(tab) {
    this.activeMobileTab = tab;

    // Update bottom nav button active states
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    if (tab === 'map') {
      this.closeMobileSheet();
      // Ensure map fits nicely
      if (window.mapManager && window.mapManager.map) {
        setTimeout(() => window.mapManager.map.invalidateSize(), 300);
      }
    } else if (tab === 'checkpoints') {
      this.openMobileSheet('checkpoints');
    } else if (tab === 'route') {
      this.openMobileSheet('route');
    } else if (tab === 'hud') {
      if (window.hudManager) {
        window.hudManager.openHUD();
      }
    } else if (tab === 'sos') {
      const sosModal = document.getElementById('sos-modal');
      if (sosModal) sosModal.classList.add('active');
    }
  }

  openMobileSheet(viewType = 'checkpoints') {
    const sidebar = document.getElementById('sidebar');
    const sheetTitle = document.getElementById('mobile-sheet-title');
    if (!sidebar) return;

    this.isSheetOpen = true;
    sidebar.classList.add('mobile-sheet-expanded');

    // Switch view inside sidebar
    const tabBtnCheckpoints = document.getElementById('tab-btn-checkpoints');
    const tabBtnRoute = document.getElementById('tab-btn-route');
    const viewCheckpoints = document.getElementById('view-checkpoints');
    const viewRoute = document.getElementById('view-route');

    if (viewType === 'checkpoints') {
      if (tabBtnCheckpoints) tabBtnCheckpoints.classList.add('active');
      if (tabBtnRoute) tabBtnRoute.classList.remove('active');
      if (viewCheckpoints) viewCheckpoints.classList.add('active');
      if (viewRoute) viewRoute.classList.remove('active');
      if (sheetTitle) sheetTitle.innerHTML = '<i class="fa-solid fa-shield-halved" style="color: var(--neon-cyan);"></i> รายการจุดตรวจด่าน';
    } else if (viewType === 'route') {
      if (tabBtnCheckpoints) tabBtnCheckpoints.classList.remove('active');
      if (tabBtnRoute) tabBtnRoute.classList.add('active');
      if (viewCheckpoints) viewCheckpoints.classList.remove('active');
      if (viewRoute) viewRoute.classList.add('active');
      if (sheetTitle) sheetTitle.innerHTML = '<i class="fa-solid fa-route" style="color: var(--neon-cyan);"></i> วางแผนเส้นทาง & สแกนด่าน';
    }

    // Update bottom nav
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === viewType);
    });
  }

  closeMobileSheet() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    this.isSheetOpen = false;
    sidebar.classList.remove('mobile-sheet-expanded');

    // Reset bottom nav active to 'map' if in mobile view
    if (this.isMobileView) {
      document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === 'map');
      });
      this.activeMobileTab = 'map';
    }

    if (window.mapManager && window.mapManager.map) {
      setTimeout(() => window.mapManager.map.invalidateSize(), 300);
    }
  }

  handleViewportChange() {
    const sidebar = document.getElementById('sidebar');
    if (!this.isMobileView) {
      // Desktop: remove mobile sheet classes
      if (sidebar) sidebar.classList.remove('mobile-sheet-expanded');
      this.isSheetOpen = false;
    } else {
      // Mobile: start in map view with collapsed sheet
      this.closeMobileSheet();
    }

    if (window.mapManager && window.mapManager.map) {
      setTimeout(() => window.mapManager.map.invalidateSize(), 300);
    }
  }

  checkOrientation() {
    const isLandscape = window.innerWidth > window.innerHeight && window.innerHeight < 600;
    document.body.classList.toggle('mobile-landscape-mode', isLandscape);
    if (isLandscape && (window.hudManager?.isActive || window.navigationManager?.isActive)) {
      console.log('[DeviceManager] In-Car Landscape Dashboard Mode activated.');
    }
  }
}

// Global instance
window.deviceManager = new DeviceManager();
