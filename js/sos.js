// Emergency SOS & Traffic Police Directory for CheckDan Thailand
class SOSManager {
  constructor() {
    this.hotlines = [
      { number: '1193', name: 'ตำรวจทางหลวง', desc: 'สอบถามเส้นทาง, ด่านตรวจ, รถเสียบนทางหลวง', color: '#3b82f6', icon: 'fa-shield-halved' },
      { number: '1197', name: 'บก.02 ศูนย์ควบคุมจราจร', desc: 'รายงานสภาพจราจร, อุบัติเหตุในเขต กทม. และปริมณฑล', color: '#06b6d4', icon: 'fa-traffic-light' },
      { number: '1543', name: 'สายด่วนการทางพิเศษ (กทพ.)', desc: 'ขอความช่วยเหลือฉุกเฉินบนทางด่วน ทางพิเศษ', color: '#f59e0b', icon: 'fa-road' },
      { number: '1669', name: 'ศูนย์กู้ชีพ & แพทย์ฉุกเฉิน', desc: 'อุบัติเหตุรุนแรง บาดเจ็บ เรียกรถพยาบาลฉุกเฉินฟรี 24 ชม.', color: '#ef4444', icon: 'fa-truck-medical' },
      { number: '191', name: 'เหตุด่วนเหตุร้าย', desc: 'แจ้งเหตุด่วนเหตุร้าย ปล้นจี้ อุบัติเหตุ ตำรวจทุกท้องที่', color: '#ff3366', icon: 'fa-bell' },
      { number: '1586', name: 'สายด่วนกรมทางหลวง', desc: 'แจ้งซ่อมถนน สะพาน ไฟดับ น้ำท่วมทางหลวง', color: '#10b981', icon: 'fa-wrench' },
      { number: '199', name: 'ดับเพลิงและกู้ภัย', desc: 'ไฟไหม้ สัตว์มีพิษเข้าบ้าน สกัดสารเคมีรั่วไหล', color: '#f97316', icon: 'fa-fire-extinguisher' },
      { number: '1155', name: 'ตำรวจท่องเที่ยว', desc: 'ช่วยเหลือนักท่องเที่ยวทั้งชาวไทยและต่างชาติ', color: '#8b5cf6', icon: 'fa-umbrella-beach' }
    ];
  }

  init() {
    this.bindEvents();
    this.renderHotlines();
  }

  bindEvents() {
    const sosOpenBtns = document.querySelectorAll('.btn-open-sos');
    sosOpenBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.openSOSModal();
      });
    });

    const shareGpsBtn = document.getElementById('btn-share-sos-gps');
    if (shareGpsBtn) {
      shareGpsBtn.addEventListener('click', () => {
        this.shareDistressLocation();
      });
    }
    const sosCloseBtns = document.querySelectorAll('#sos-modal .modal-close, #sos-modal .modal-backdrop');
    sosCloseBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeSOSModal();
      });
    });
  }

  openSOSModal() {
    const modal = document.getElementById('sos-modal');
    if (modal) {
      modal.classList.add('show');
      modal.classList.add('active');
    }

    // Refresh current location display
    const userCoords = window.mapManager ? window.mapManager.userCoords : null;
    if (userCoords && window.locationManager) {
      window.locationManager.reverseGeocode(userCoords.lat, userCoords.lng).then(loc => {
        const sosLocEl = document.getElementById('sos-current-area');
        if (sosLocEl && loc) {
          const roadInfo = loc.road ? `${loc.road} ` : '';
          sosLocEl.textContent = `${roadInfo}${loc.fullArea}`;
        }
      });
    }
  }

  closeSOSModal() {
    const modal = document.getElementById('sos-modal');
    if (modal) {
      modal.classList.remove('show');
      modal.classList.remove('active');
    }
    // Restore mobile bottom navigation state if on mobile
    if (window.deviceManager && window.deviceManager.isMobileView) {
      const activeTab = window.deviceManager.isSheetOpen ? 'checkpoints' : 'map';
      document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === activeTab);
      });
      window.deviceManager.activeMobileTab = activeTab;
    }
  }

  renderHotlines() {
    const container = document.getElementById('sos-hotlines-list');
    if (!container) return;

    container.innerHTML = this.hotlines.map(h => `
      <div class="sos-card" style="border-left: 4px solid ${h.color};">
        <div class="sos-icon-wrap" style="background: ${h.color}20; color: ${h.color};">
          <i class="fa-solid ${h.icon}"></i>
        </div>
        <div class="sos-info">
          <div class="sos-number">${h.number}</div>
          <div class="sos-name">${h.name}</div>
          <div class="sos-desc">${h.desc}</div>
        </div>
        <a href="tel:${h.number}" class="sos-call-btn" style="background: ${h.color};">
          <i class="fa-solid fa-phone"></i> โทรออก
        </a>
      </div>
    `).join('');
  }

  shareDistressLocation() {
    const userCoords = window.mapManager ? window.mapManager.userCoords : null;
    if (!userCoords) {
      window.app.showToast('⚠️ ไม่พบพิกัด GPS ปัจจุบัน กรุณากดปุ่ม "พิกัดฉัน" ก่อนแชร์', 'warning');
      return;
    }

    const areaText = window.locationManager ? window.locationManager.getFullAreaText() : '';
    const roadInfo = (window.locationManager && window.locationManager.currentLocation && window.locationManager.currentLocation.road) 
      ? `บริเวณ ${window.locationManager.currentLocation.road} ` 
      : '';
    const fullLoc = `${roadInfo}${areaText}`.trim() || 'ประเทศไทย';

    if (window.socialManager) {
      window.socialManager.shareSOS(userCoords.lat, userCoords.lng, fullLoc);
    } else {
      const gmapsUrl = `https://maps.google.com/?q=${userCoords.lat},${userCoords.lng}`;
      const text = `🚨 [ขอความช่วยเหลือฉุกเฉิน!] รถเสีย/ต้องการความช่วยเหลือ\n📍 พื้นที่ปัจจุบัน: ${fullLoc}\n📌 พิกัด GPS: ${userCoords.lat.toFixed(5)}, ${userCoords.lng.toFixed(5)}\n🌐 เปิดแผนที่ระบุตำแหน่ง: ${gmapsUrl}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          window.app.showToast('📋 คัดลอกข้อความและพิกัดฉุกเฉินแล้ว! สามารถวางส่งใน LINE หรือ SMS ได้ทันที', 'success');
          window.soundManager.playSuccess();
        });
      } else {
        window.app.showToast(gmapsUrl, 'info');
      }
    }
  }
}

window.sosManager = new SOSManager();
