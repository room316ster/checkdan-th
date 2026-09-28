// Main Application Controller for CheckDan Thailand
class CheckDanApp {
  constructor() {
    this.checkpoints = [];
    this.activeFilter = 'all';
    this.searchQuery = '';
    this.selectedCheckpoint = null;
    this.nearestCheckpoint = null;
    this.radarDistanceThresholdKm = 3.0; // Distance to trigger proximity warning
  }

  async init() {
    console.log('Initializing CheckDan App...');
    
    // 1. Initialize Map
    window.mapManager.init('map');
    window.mapManager.onMapClickCallback = (latlng) => {
      this.openReportModalWithCoords(latlng.lat, latlng.lng);
    };

    // 2. Load Checkpoint Data (GitHub / LocalStorage / Fallback)
    await this.refreshData();

    // 3. Bind UI Events
    this.bindEvents();

    // 4. Update UI stats
    this.updateStats();

    // 5. Try requesting user geolocation automatically (graceful fallback)
    this.requestUserLocation(false);
  }

  async refreshData() {
    this.checkpoints = await window.githubSync.loadCheckpoints();
    this.render();
  }

  bindEvents() {
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

    // Audio Mute/Unmute Toggle
    const soundToggle = document.getElementById('btn-sound-toggle');
    if (soundToggle) {
      soundToggle.addEventListener('click', () => {
        const isEnabled = window.soundManager.toggleSound();
        soundToggle.innerHTML = isEnabled 
          ? '<i class="fa-solid fa-volume-high"></i>' 
          : '<i class="fa-solid fa-volume-xmark"></i>';
        soundToggle.classList.toggle('muted', !isEnabled);
        if (isEnabled) {
          window.soundManager.playSuccess();
        }
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

    // Report Checkpoint Button (Header & Floating)
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

    // Quick Simulation Location buttons (for instant testing without driving)
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

  // Request actual browser geolocation
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
            this.showToast('⚠️ ไม่สามารถเข้าถึงตำแหน่ง GPS ได้ (หรือไม่ได้อนุญาต) คุณสามารถใช้ปุ่ม "จำลองพิกัด" ด้านล่างเพื่อทดสอบระบบได้ครับ', 'warning');
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
      );
    }
  }

  // Simulate user location (e.g. for testing proximity alerts)
  simulateUserLocation(lat, lng, name) {
    window.mapManager.setUserLocation(lat, lng, 20);
    window.soundManager.playRadarPing();
    this.checkProximityAlerts();
    this.renderList();
    this.showToast(`🎯 จำลองตำแหน่งที่: ${name}`, 'info');
  }

  // Check if any active checkpoint is within the proximity radar zone
  checkProximityAlerts() {
    const userCoords = window.mapManager.userCoords;
    const alertBanner = document.getElementById('proximity-radar-hud');
    if (!userCoords || !alertBanner) return;

    let nearest = null;
    let minDistance = Infinity;

    this.checkpoints.forEach((cp) => {
      if (cp.status === 'active') {
        const dist = window.mapManager.calculateDistance(userCoords.lat, userCoords.lng, cp.lat, cp.lng);
        if (dist < minDistance) {
          minDistance = dist;
          nearest = { ...cp, distanceKm: dist };
        }
      }
    });

    this.nearestCheckpoint = nearest;

    if (nearest && nearest.distanceKm <= this.radarDistanceThresholdKm) {
      // Trigger Warning HUD and sound!
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

      // Play alert chime
      window.soundManager.playWarningAlert();
    } else {
      alertBanner.classList.remove('visible', 'pulse-alert');
    }
  }

  getFilteredCheckpoints() {
    return this.checkpoints.filter((cp) => {
      // Type filter
      if (this.activeFilter === 'cleared') {
        if (cp.status !== 'cleared') return false;
      } else if (this.activeFilter !== 'all') {
        if (cp.type !== this.activeFilter || cp.status === 'cleared') return false;
      }

      // Search query
      if (this.searchQuery) {
        const text = `${cp.title} ${cp.locationName} ${cp.province} ${cp.district || ''} ${cp.typeLabel} ${cp.description || ''}`.toLowerCase();
        if (!text.includes(this.searchQuery)) return false;
      }

      return true;
    });
  }

  render() {
    const filtered = this.getFilteredCheckpoints();
    
    // Sort by proximity if user location is known, else by latest report
    const userCoords = window.mapManager.userCoords;
    if (userCoords) {
      filtered.sort((a, b) => {
        const distA = window.mapManager.calculateDistance(userCoords.lat, userCoords.lng, a.lat, a.lng);
        const distB = window.mapManager.calculateDistance(userCoords.lat, userCoords.lng, b.lat, b.lng);
        return distA - distB;
      });
    }

    // Render Markers on Leaflet Map
    window.mapManager.renderCheckpoints(filtered, (cp) => {
      this.highlightCheckpointInList(cp.id);
    });

    // Render Sidebar / Bottom Sheet List
    this.renderList(filtered);
    this.updateStats();
  }

  renderList(items = null) {
    const list = items || this.getFilteredCheckpoints();
    const container = document.getElementById('checkpoint-cards-list');
    const emptyState = document.getElementById('empty-state');
    const counterEl = document.getElementById('results-count');

    if (counterEl) {
      counterEl.textContent = `พบ ${list.length} รายการ`;
    }

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

      // Relative time formatted
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

    // Open detail modal directly
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

  // Checkpoint Details & Community Verification Modal
  showCheckpointDetails(checkpointId) {
    const cp = this.checkpoints.find((c) => c.id === checkpointId);
    if (!cp) return;

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

    // Set onclick for vote buttons in modal
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

    // Google Maps navigation link
    const gmapsBtn = document.getElementById('detail-gmaps-link');
    if (gmapsBtn) {
      gmapsBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${cp.lat},${cp.lng}`;
    }

    modal.classList.add('show');
  }

  // Community Voting Function
  voteCheckpoint(id, type) {
    const cp = this.checkpoints.find((c) => c.id === id);
    if (!cp) return;

    if (type === 'up') {
      cp.verifiedCount = (cp.verifiedCount || 0) + 1;
      if (cp.status === 'cleared') {
        cp.status = 'active'; // Revived by community
      }
      this.showToast('👍 ขอบคุณที่ร่วมยืนยันสถานะด่าน!', 'success');
      window.soundManager.playSuccess();
    } else if (type === 'down') {
      cp.clearedCount = (cp.clearedCount || 0) + 1;
      // Auto-mark cleared if cleared votes heavily outweigh verified votes
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

  // Open Report Modal
  openReportModal() {
    const modal = document.getElementById('report-modal');
    if (!modal) return;

    // Prefill coordinates if user location known
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
    const province = document.getElementById('report-province').value.trim();
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

    // Prepend to list
    this.checkpoints.unshift(newCheckpoint);
    window.githubSync.saveLocalCache(this.checkpoints);

    this.closeAllModals();
    this.render();
    this.flyToAndOpen(newCheckpoint.id);

    window.soundManager.playSuccess();
    this.showToast('🎉 แจ้งจุดตรวจด่านสำเร็จแล้ว! ข้อมูลถูกบันทึกลงระบบเรียบร้อย', 'success');

    // Reset form
    document.getElementById('report-form').reset();
  }

  // GitHub Settings & Sync Modal
  openGitHubModal() {
    const modal = document.getElementById('github-modal');
    if (!modal) return;

    const config = window.githubSync.getConfig();
    document.getElementById('gh-owner').value = config.owner || '';
    document.getElementById('gh-repo').value = config.repo || '';
    document.getElementById('gh-branch').value = config.branch || 'main';
    document.getElementById('gh-path').value = config.filePath || 'data/checkpoints.json';
    document.getElementById('gh-token').value = config.token || '';

    // Direct export JSON button
    const btnExport = document.getElementById('btn-export-json');
    if (btnExport) {
      btnExport.onclick = () => {
        window.githubSync.exportJsonFile(this.checkpoints);
        this.showToast('📥 ดาวน์โหลดไฟล์ checkpoints.json สำเร็จ นำไป commit ขึ้น GitHub ได้ทันที', 'success');
      };
    }

    // Direct Save GitHub Config
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

    // Direct Push via API button
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

    // Reset default data
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

// Initialize Application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new CheckDanApp();
  window.app.init();
});
