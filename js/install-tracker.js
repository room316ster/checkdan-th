// ============================================================================
// Real Device Telemetry & Installation Audit Engine for "คู่หูนักเดินทาง"
// ตรวจสอบและบันทึกข้อมูลการติดตั้งและการใช้งานจริง 100% จากอุปกรณ์ (Real Device Telemetry)
// เข้าดูรายงานและสถิติจริงโดยการ Login ผู้ดูแลระบบ (Admin)
// ============================================================================

class InstallTrackerManager {
  constructor() {
    this.storageKeyAudit = 'khuhunakderntang_real_audit_logs';
    this.storageKeyMetrics = 'khuhunakderntang_real_device_metrics';
    this.deferredPrompt = null;
    this.auditLogs = [];
    this.deviceMetrics = {
      deviceId: '',
      firstVisit: '',
      lastActive: '',
      sessionCount: 1,
      isInstalledPwa: false,
      installDate: '',
      os: 'ตรวจจับ...',
      browser: 'ตรวจจับ...',
      displayMode: 'browser',
      screenResolution: '',
      touchSupport: false,
      networkStatus: 'ออนไลน์',
      storageUsedMb: '0.00'
    };

    this.init();
  }

  async init() {
    this.loadPersistedMetrics();
    this.detectRealHardwareSpecs();
    await this.estimateStorageUsage();
    this.bindPwaEvents();
    this.checkCurrentStandaloneStatus();
    this.logRealEvent('เปิดใช้งานแอปพลิเคชัน', `เริ่มต้นเซสชัน #${this.deviceMetrics.sessionCount} ในโหมด ${this.deviceMetrics.displayMode === 'standalone' ? 'Standalone PWA' : 'Web Browser'}`);
    this.savePersistedMetrics();
    this.dispatchUpdate();
  }

  // Load persistent real device metrics from LocalStorage
  loadPersistedMetrics() {
    try {
      const savedMetrics = localStorage.getItem(this.storageKeyMetrics);
      const savedLogs = localStorage.getItem(this.storageKeyAudit);

      if (savedMetrics) {
        this.deviceMetrics = { ...this.deviceMetrics, ...JSON.parse(savedMetrics) };
        this.deviceMetrics.sessionCount = (this.deviceMetrics.sessionCount || 0) + 1;
        this.deviceMetrics.lastActive = new Date().toLocaleString('th-TH');
      } else {
        // First time initialization on this device
        this.deviceMetrics.deviceId = 'DEV-' + Math.random().toString(36).substring(2, 9).toUpperCase();
        this.deviceMetrics.firstVisit = new Date().toLocaleString('th-TH');
        this.deviceMetrics.lastActive = this.deviceMetrics.firstVisit;
        this.deviceMetrics.sessionCount = 1;
      }

      if (savedLogs) {
        this.auditLogs = JSON.parse(savedLogs);
      }
    } catch (e) {
      console.warn('[RealTelemetry] Error loading metrics, resetting:', e);
    }
  }

  savePersistedMetrics() {
    try {
      localStorage.setItem(this.storageKeyMetrics, JSON.stringify(this.deviceMetrics));
      localStorage.setItem(this.storageKeyAudit, JSON.stringify(this.auditLogs.slice(0, 50)));
    } catch (e) {
      console.warn('[RealTelemetry] Error saving metrics:', e);
    }
  }

  // Real Hardware, OS & Browser detection
  detectRealHardwareSpecs() {
    const ua = navigator.userAgent || '';
    let os = 'Unknown OS';
    let browser = 'Unknown Browser';

    // 1. Detect Real OS
    if (/android/i.test(ua)) {
      const match = ua.match(/Android\s([0-9\.]+)/i);
      os = `Android ${match ? match[1] : ''}`;
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      const match = ua.match(/OS\s([0-9_]+)/i);
      os = `iOS ${match ? match[1].replace(/_/g, '.') : ''}`;
    } else if (/windows nt 10\.0/i.test(ua)) {
      os = 'Windows 10 / 11';
    } else if (/windows nt/i.test(ua)) {
      os = 'Windows PC';
    } else if (/macintosh|mac os x/i.test(ua)) {
      os = 'macOS';
    } else if (/linux/i.test(ua)) {
      os = 'Linux';
    }

    // 2. Detect Real Browser
    if (/edg\//i.test(ua)) {
      const match = ua.match(/edg\/([0-9\.]+)/i);
      browser = `Microsoft Edge ${match ? match[1].split('.')[0] : ''}`;
    } else if (/samsungbrowser/i.test(ua)) {
      browser = 'Samsung Internet';
    } else if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) {
      const match = ua.match(/chrome\/([0-9\.]+)/i);
      browser = `Google Chrome ${match ? match[1].split('.')[0] : ''}`;
    } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
      browser = 'Apple Safari';
    } else if (/firefox|fxios/i.test(ua)) {
      browser = 'Mozilla Firefox';
    }

    // 3. Screen Specs
    const w = window.screen.width;
    const h = window.screen.height;
    const dpr = window.devicePixelRatio || 1;
    const resolution = `${w} x ${h} (DPR: ${dpr.toFixed(2)})`;

    // 4. Touch support
    const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    // 5. Network info
    let net = navigator.onLine ? 'ออนไลน์' : 'ออฟไลน์';
    if (navigator.connection && navigator.connection.effectiveType) {
      net = `ออนไลน์ (${navigator.connection.effectiveType.toUpperCase()})`;
    }

    this.deviceMetrics.os = os;
    this.deviceMetrics.browser = browser;
    this.deviceMetrics.screenResolution = resolution;
    this.deviceMetrics.touchSupport = hasTouch;
    this.deviceMetrics.networkStatus = net;
  }

  // Calculate actual Cache Storage quota used
  async estimateStorageUsage() {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const mb = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2);
        this.deviceMetrics.storageUsedMb = mb;
      }
    } catch (e) {
      this.deviceMetrics.storageUsedMb = 'N/A';
    }
  }

  // Detect if running as standalone PWA
  checkCurrentStandaloneStatus() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    this.deviceMetrics.displayMode = isStandalone ? 'standalone' : 'browser';
    
    if (isStandalone && !this.deviceMetrics.isInstalledPwa) {
      this.deviceMetrics.isInstalledPwa = true;
      if (!this.deviceMetrics.installDate) {
        this.deviceMetrics.installDate = new Date().toLocaleString('th-TH');
      }
      this.logRealEvent('เปิดแอปในโหมด Standalone PWA', 'ตรวจพบการเปิดใช้งานจากไอคอนที่ติดตั้งลงบนหน้าจอหลักของเครื่อง');
    }
  }

  // Bind PWA Installation Events
  bindPwaEvents() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.logRealEvent('พร้อมให้ติดตั้ง (PWA Ready)', 'เบราว์เซอร์ส่งสัญญาณ beforeinstallprompt พร้อมสร้างช็อตคัต');
      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.classList.add('show');
    });

    window.addEventListener('appinstalled', () => {
      console.log('[RealTelemetry] PWA App was installed on this device!');
      this.deviceMetrics.isInstalledPwa = true;
      this.deviceMetrics.displayMode = 'standalone';
      this.deviceMetrics.installDate = new Date().toLocaleString('th-TH');
      this.logRealEvent('ติดตั้งแอปสำเร็จ (PWA Installed)', 'ผู้ใช้ยืนยันการติดตั้งโปรแกรมลงบนอุปกรณ์เรียบร้อยแล้ว');
      this.savePersistedMetrics();
      this.dispatchUpdate();

      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.classList.remove('show');
      if (window.soundManager) window.soundManager.playSuccess();
      if (window.voiceManager) window.voiceManager.speak('ขอบคุณที่ติดตั้งแอปคู่หูนักเดินทางค่ะ พร้อมเดินทางอย่างอุ่นใจแล้ว');
    });
  }

  // Record an actual chronological activity event on this device
  logRealEvent(actionName, detailText = '') {
    const now = new Date();
    const eventItem = {
      id: 'EVT-' + Date.now().toString(36),
      time: now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }),
      timestamp: now.getTime(),
      action: actionName,
      detail: detailText,
      mode: this.deviceMetrics.displayMode === 'standalone' ? 'Standalone PWA' : 'Browser Tab'
    };

    this.auditLogs.unshift(eventItem);
    if (this.auditLogs.length > 50) this.auditLogs.pop();
    this.savePersistedMetrics();
  }

  // Expose current real stats to callers
  get stats() {
    return {
      isStandalone: this.deviceMetrics.displayMode === 'standalone',
      isInstalledPwa: this.deviceMetrics.isInstalledPwa,
      sessionCount: this.deviceMetrics.sessionCount,
      os: this.deviceMetrics.os,
      browser: this.deviceMetrics.browser,
      firstVisit: this.deviceMetrics.firstVisit,
      lastActive: this.deviceMetrics.lastActive,
      storageUsedMb: this.deviceMetrics.storageUsedMb,
      displayStatus: this.deviceMetrics.isInstalledPwa ? 'ติดตั้งแล้ว (Standalone PWA)' : 'ใช้งานผ่านเว็บเบราว์เซอร์'
    };
  }

  dispatchUpdate() {
    window.dispatchEvent(new CustomEvent('installStatsUpdated', { detail: this.stats }));
  }

  // Open analytics with authentication check
  openInstallAnalyticsWithAuth() {
    const isAdmin = sessionStorage.getItem('checkdan_is_admin') === 'true';
    if (!isAdmin) {
      if (window.app && typeof window.app.openAdminLoginModal === 'function') {
        window.app.pendingAdminAction = 'open_install_analytics';
        window.app.openAdminLoginModal();
        if (window.app.showToast) {
          window.app.showToast('🔒 กรุณาเข้าสู่ระบบ Admin เพื่อดูรายงานข้อมูลอุปกรณ์และการติดตั้ง', 'info');
        }
      } else {
        alert('กรุณาเข้าสู่ระบบ Admin เพื่อดูข้อมูลผู้ติดตั้ง');
      }
      return;
    }

    this.showInstallAnalyticsModal();
  }

  // Render and show Real Device Telemetry Modal
  showInstallAnalyticsModal() {
    let modal = document.getElementById('install-analytics-modal');
    if (!modal) {
      this.createInstallAnalyticsModal();
      modal = document.getElementById('install-analytics-modal');
    }

    this.logRealEvent('เปิดดูรายงาน Telemetry (Admin)', 'ผู้ดูแลระบบเข้าดูรายงานสเปกและการติดตั้งจริงของเครื่อง');
    this.renderDashboardUI();
    modal.classList.add('show');
  }

  createInstallAnalyticsModal() {
    const modalHtml = `
      <div class="app-modal" id="install-analytics-modal">
        <div class="modal-backdrop"></div>
        <div class="modal-dialog" style="max-width: 860px; max-height: 90vh;">
          <div class="modal-header">
            <h3 class="modal-title" style="color: var(--neon-cyan); display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-microchip"></i>
              ข้อมูลอุปกรณ์และการติดตั้งจริง (Real Device Telemetry)
              <span class="admin-pill-tag"><i class="fa-solid fa-shield-halved"></i> Admin Mode</span>
            </h3>
            <button class="modal-close" onclick="document.getElementById('install-analytics-modal').classList.remove('show');">&times;</button>
          </div>
          <div class="modal-body" style="padding: 16px; overflow-y: auto;">
            <div id="install-analytics-content">
              <!-- Dynamically populated -->
            </div>
          </div>
          <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 11px; color: var(--text-muted);">
              <i class="fa-solid fa-circle-check" style="color: #10b981;"></i> ข้อมูลจริง 100% จากฮาร์ดแวร์และเบราว์เซอร์ปัจจุบัน
            </div>
            <button class="header-btn" onclick="document.getElementById('install-analytics-modal').classList.remove('show');">ปิดหน้าต่าง</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modalEl = document.getElementById('install-analytics-modal');
    modalEl.querySelector('.modal-backdrop').addEventListener('click', () => {
      modalEl.classList.remove('show');
    });
  }

  renderDashboardUI() {
    const container = document.getElementById('install-analytics-content');
    if (!container) return;

    const m = this.deviceMetrics;
    const isPwa = m.displayMode === 'standalone' || m.isInstalledPwa;

    container.innerHTML = `
      <!-- Notice Banner -->
      <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 10px; padding: 10px 14px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <i class="fa-solid fa-circle-check" style="color: #10b981; font-size: 18px;"></i>
          <div>
            <div style="font-size: 13px; font-weight: 700; color: #10b981;">รายงานข้อมูลอุปกรณ์จริง (Verified Real Device Telemetry)</div>
            <div style="font-size: 11px; color: #cbd5e1;">ระบบตรวจจับค่าจริงจาก Client Browser และสภาพแวดล้อมฮาร์ดแวร์ปัจจุบัน ไม่ใช้ตัวเลขจำลอง</div>
          </div>
        </div>
        <span style="font-size: 11px; background: rgba(255,255,255,0.08); padding: 4px 10px; border-radius: 20px; color: #38bdf8;">
          ID: ${m.deviceId || 'DEV-ACTIVE'}
        </span>
      </div>

      <!-- Real KPI Cards Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px;">
        <div style="background: rgba(0, 242, 254, 0.08); border: 1px solid rgba(0, 242, 254, 0.3); border-radius: 12px; padding: 14px; text-align: center;">
          <div style="font-size: 20px; font-weight: 800; color: ${isPwa ? '#10b981' : '#38bdf8'};">
            ${isPwa ? '<i class="fa-solid fa-circle-check"></i> ติดตั้งแล้ว' : '<i class="fa-solid fa-globe"></i> เบราว์เซอร์'}
          </div>
          <div style="font-size: 11px; color: #cbd5e1; font-weight: 600; margin-top: 6px;">
            สถานะการติดตั้ง PWA
          </div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">
            ${isPwa ? 'โหมดแอปพลิเคชันเดี่ยว' : 'โหมดเว็บแท็บ'}
          </div>
        </div>

        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 14px; text-align: center;">
          <div style="font-size: 20px; font-weight: 800; color: #10b981;">${m.os}</div>
          <div style="font-size: 11px; color: #cbd5e1; font-weight: 600; margin-top: 6px;">
            ระบบปฏิบัติการที่ตรวจพบ
          </div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">
            ${m.browser}
          </div>
        </div>

        <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 14px; text-align: center;">
          <div style="font-size: 24px; font-weight: 800; color: #fbbf24;">${m.sessionCount} ครั้ง</div>
          <div style="font-size: 11px; color: #cbd5e1; font-weight: 600; margin-top: 6px;">
            เปิดใช้งานบนเครื่องนี้
          </div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">
            นับตามการโหลดใช้งานจริง
          </div>
        </div>

        <div style="background: rgba(139, 92, 246, 0.08); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px; padding: 14px; text-align: center;">
          <div style="font-size: 20px; font-weight: 800; color: #a78bfa;">${m.storageUsedMb} MB</div>
          <div style="font-size: 11px; color: #cbd5e1; font-weight: 600; margin-top: 6px;">
            พื้นที่แคชออฟไลน์
          </div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">
            พร้อมทำงานโหมดไร้เน็ต
          </div>
        </div>
      </div>

      <!-- Real Hardware & Environment Telemetry Table -->
      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <h4 style="margin: 0 0 12px 0; font-size: 14px; color: var(--neon-cyan); display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-server"></i> สเปกฮาร์ดแวร์และซอฟต์แวร์เครื่องปัจจุบัน
        </h4>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #cbd5e1;">
            <tbody>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                <td style="padding: 8px; color: #94a3b8; width: 35%;">ระบบปฏิบัติการ (OS):</td>
                <td style="padding: 8px; font-weight: 600; color: #ffffff;">${m.os}</td>
                <td style="padding: 8px; color: #10b981; text-align: right;"><i class="fa-solid fa-check"></i> ตรวจจับจริง</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                <td style="padding: 8px; color: #94a3b8;">เว็บเบราว์เซอร์ (Browser):</td>
                <td style="padding: 8px; font-weight: 600; color: #ffffff;">${m.browser}</td>
                <td style="padding: 8px; color: #10b981; text-align: right;"><i class="fa-solid fa-check"></i> ตรวจจับจริง</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                <td style="padding: 8px; color: #94a3b8;">ความละเอียดหน้าจอ (Display):</td>
                <td style="padding: 8px; font-weight: 600; color: #ffffff;">${m.screenResolution}</td>
                <td style="padding: 8px; color: #10b981; text-align: right;"><i class="fa-solid fa-check"></i> ตรวจจับจริง</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                <td style="padding: 8px; color: #94a3b8;">ระบบสัมผัส (Touch Screen):</td>
                <td style="padding: 8px; font-weight: 600; color: #ffffff;">${m.touchSupport ? 'รองรับ Touch Screen' : 'เมาส์ & คีย์บอร์ด (Desktop)'}</td>
                <td style="padding: 8px; color: #10b981; text-align: right;"><i class="fa-solid fa-check"></i> ตรวจจับจริง</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                <td style="padding: 8px; color: #94a3b8;">สถานะเครือข่าย:</td>
                <td style="padding: 8px; font-weight: 600; color: #ffffff;">${m.networkStatus}</td>
                <td style="padding: 8px; color: #10b981; text-align: right;"><i class="fa-solid fa-check"></i> ตรวจจับจริง</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                <td style="padding: 8px; color: #94a3b8;">วันที่เปิดใช้งานครั้งแรก:</td>
                <td style="padding: 8px; font-weight: 600; color: #ffffff;">${m.firstVisit}</td>
                <td style="padding: 8px; color: #38bdf8; text-align: right;">บันทึกในเครื่อง</td>
              </tr>
              <tr>
                <td style="padding: 8px; color: #94a3b8;">ใช้งานล่าสุด:</td>
                <td style="padding: 8px; font-weight: 600; color: #ffffff;">${m.lastActive}</td>
                <td style="padding: 8px; color: #38bdf8; text-align: right;">บันทึกในเครื่อง</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Real Activity Audit Log -->
      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h4 style="margin: 0; font-size: 14px; color: var(--neon-cyan); display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-list-check"></i> ประวัติกิจกรรมจริงบนเครื่อง (Activity Audit Log - ${this.auditLogs.length} รายการ)
          </h4>
          <div style="display: flex; gap: 6px;">
            <button onclick="window.installTracker.exportAuditJson();" 
                    style="background: rgba(56, 189, 248, 0.15); border: 1px solid #38bdf8; color: #38bdf8; padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
              <i class="fa-solid fa-download"></i> ส่งออก JSON
            </button>
            <button onclick="window.installTracker.reAuditDevice();" 
                    style="background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #10b981; padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
              <i class="fa-solid fa-rotate"></i> สแกนใหม่
            </button>
          </div>
        </div>

        <div style="max-height: 220px; overflow-y: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; color: #cbd5e1;">
            <thead>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: #94a3b8; text-align: left;">
                <th style="padding: 6px;">เวลา</th>
                <th style="padding: 6px;">กิจกรรม</th>
                <th style="padding: 6px;">รายละเอียด</th>
                <th style="padding: 6px; text-align: right;">โหมด</th>
              </tr>
            </thead>
            <tbody>
              ${this.auditLogs.map(log => `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
                  <td style="padding: 6px; color: #94a3b8; white-space: nowrap;">${log.time}</td>
                  <td style="padding: 6px; font-weight: 600; color: #ffffff;">${log.action}</td>
                  <td style="padding: 6px; color: #cbd5e1;">${log.detail}</td>
                  <td style="padding: 6px; text-align: right; color: #38bdf8;">${log.mode}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Re-run real hardware and environment audit
  async reAuditDevice() {
    this.detectRealHardwareSpecs();
    await this.estimateStorageUsage();
    this.checkCurrentStandaloneStatus();
    this.logRealEvent('สแกนระบบอุปกรณ์ใหม่ (Re-Audit)', 'อัปเดตสถานะฮาร์ดแวร์ พื้นที่แคช และโหมดการแสดงผล');
    this.renderDashboardUI();
    if (window.app && window.app.showToast) {
      window.app.showToast('🔄 อัปเดตการตรวจจับสเปกอุปกรณ์จริงเรียบร้อยแล้ว', 'success');
    }
  }

  // Export audit report as JSON
  exportAuditJson() {
    const report = {
      reportTitle: "รายงานข้อมูลอุปกรณ์และการติดตั้งจริง (คู่หูนักเดินทาง)",
      generatedAt: new Date().toISOString(),
      deviceMetrics: this.deviceMetrics,
      activityLogs: this.auditLogs
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `device-telemetry-${this.deviceMetrics.deviceId || 'report'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (window.app && window.app.showToast) {
      window.app.showToast('📥 ดาวน์โหลดไฟล์รายงาน Telemetry JSON สำเร็จ', 'success');
    }
  }
}

// Global singleton instance
window.installTracker = new InstallTrackerManager();
