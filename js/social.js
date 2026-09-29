// ============================================================================
// Comprehensive Social Sharing Engine for "คู่หูนักเดินทาง"
// รองรับการแชร์ไปยัง Social Media ยอดนิยม: LINE, Facebook, X (Twitter), Telegram, WhatsApp,
// Native Web Share API, คัดลอกลิงก์ และสร้าง QR Code สำหรับสแกนบนมือถือ
// ============================================================================

class SocialManager {
  constructor() {
    this.currentShareData = {
      title: 'คู่หูนักเดินทาง',
      text: '',
      url: window.location.href,
      category: 'app',
      icon: 'fa-compass',
      heading: 'คู่หูนักเดินทาง',
      subheading: 'เรดาร์ด่านตรวจ แหล่งท่องเที่ยว 77 จังหวัด & นำทางอัจฉริยะ'
    };

    this.init();
  }

  init() {
    this.ensureModalExists();
    this.bindEvents();
  }

  getBaseAppUrl() {
    if (typeof window !== 'undefined' && window.location) {
      if (window.location.origin && window.location.pathname && window.location.origin !== 'null') {
        return `${window.location.origin}${window.location.pathname}`;
      }
      if (window.location.href) {
        return window.location.href.split('?')[0];
      }
    }
    return 'https://checkdan.th/';
  }

  // 1. Share Entire Application
  shareApp() {
    const appUrl = this.getBaseAppUrl();
    const shareText = `🧭 [คู่หูนักเดินทาง - Travel Companion TH]\n` +
      `🚗 แอปเรดาร์เตือนด่านตรวจ กล้องจับความเร็ว แหล่งท่องเที่ยว 77 จังหวัด และระบบนำทางอัจฉริยะแบบเลี้ยวต่อเลี้ยวฟรี!\n` +
      `📱 ใช้งานได้ทันทีบนมือถือและคอมพิวเตอร์ ไม่ต้องติดตั้งเพิ่มเติม\n` +
      `👉 เปิดใช้งานได้ที่: ${appUrl}\n` +
      `#คู่หูนักเดินทาง #เช็คด่าน #เที่ยวไทย #เรดาร์ด่านตรวจ`;

    this.openShareModal({
      title: 'แชร์แอป คู่หูนักเดินทาง',
      text: shareText,
      url: appUrl,
      category: 'app',
      icon: 'fa-compass',
      heading: 'คู่หูนักเดินทาง (Travel Companion TH)',
      subheading: 'เรดาร์เตือนด่าน แหล่งท่องเที่ยว 77 จังหวัด & นำทางอัจฉริยะ',
      hashtags: 'คู่หูนักเดินทาง,เช็คด่าน,เที่ยวทั่วไทย,เรดาร์จราจร'
    });
  }

  // 2. Share a Checkpoint / Speed Camera
  shareCheckpoint(cp) {
    if (!cp) return;
    const isCleared = cp.status === 'cleared';
    const statusText = isCleared ? '✅ เคลียร์/ยกเลิกแล้ว' : '🚨 กำลังตั้งด่าน (ตรวจเข้ม)';
    const gmapsLink = `https://www.google.com/maps/dir/?api=1&destination=${cp.lat},${cp.lng}`;
    const appUrl = `${this.getBaseAppUrl()}?cp=${encodeURIComponent(cp.id)}`;

    const shareText = `🚨 [แจ้งเตือนด่านตรวจ - คู่หูนักเดินทาง]\n` +
      `📌 ${cp.title}\n` +
      `📍 สถานที่: ${cp.locationName} (${cp.province})\n` +
      `➡️ ฝั่ง/ทิศทาง: ${cp.direction || 'ไม่ระบุ'}\n` +
      `⚠️ ประเภท: ${cp.typeLabel}\n` +
      `⚡ สถานะ: ${statusText}\n` +
      `🗺️ นำทาง Google Maps: ${gmapsLink}\n` +
      `📲 ดูจุดตรวจสดบนเรดาร์: ${appUrl}\n` +
      `#คู่หูนักเดินทาง #ด่านตรวจ #${(cp.province || '').replace(/\s+/g, '')}`;

    this.openShareModal({
      title: `แชร์จุดตรวจ: ${cp.title}`,
      text: shareText,
      url: appUrl,
      category: 'checkpoint',
      icon: 'fa-shield-halved',
      heading: cp.title,
      subheading: `${cp.locationName} (จ.${cp.province}) • ${cp.typeLabel}`,
      hashtags: `คู่หูนักเดินทาง,ด่านตรวจ,${(cp.province || '').replace(/\s+/g, '')}`
    });
  }

  // 3. Share a Tourist Attraction
  shareAttraction(att) {
    if (!att) return;
    const gmapsLink = `https://www.google.com/maps/dir/?api=1&destination=${att.lat},${att.lng}`;
    const appUrl = `${this.getBaseAppUrl()}?att=${encodeURIComponent(att.id)}`;

    const shareText = `✨ [ชวนเที่ยวทั่วไทย - คู่หูนักเดินทาง]\n` +
      `🏞️ ${att.name}${att.nameEn ? ` (${att.nameEn})` : ''}\n` +
      `📍 จ.${att.province} (${att.categoryLabel || 'สถานที่ท่องเที่ยว'})\n` +
      `${att.highlight ? `⭐ ไฮไลต์: ${att.highlight}\n` : ''}` +
      `${att.openHours ? `⏰ เวลาเปิด-ปิด: ${att.openHours}\n` : ''}` +
      `🎫 ค่าเข้าชม: ${att.fee || 'เข้าชมฟรี'}\n` +
      `🗺️ นำทาง Google Maps: ${gmapsLink}\n` +
      `📲 วางแผนเดินทาง & สแกนด่านตลอดสาย: ${appUrl}\n` +
      `#คู่หูนักเดินทาง #เที่ยวไทย #${(att.province || '').replace(/\s+/g, '')} #ที่เที่ยว`;

    this.openShareModal({
      title: `แชร์ที่เที่ยว: ${att.name}`,
      text: shareText,
      url: appUrl,
      category: 'attraction',
      icon: 'fa-umbrella-beach',
      heading: att.name,
      subheading: `${att.categoryLabel} จ.${att.province} • ${att.nameEn || ''}`,
      hashtags: `คู่หูนักเดินทาง,เที่ยวไทย,${(att.province || '').replace(/\s+/g, '')}`
    });
  }

  // 4. Share Calculated Route & Checkpoint Scanner
  shareRoute(route, detectedCheckpoints = []) {
    if (!route) return;
    const count = detectedCheckpoints.length;
    const warning = count > 0 
      ? `🚨 ผลสแกนด่าน: ตรวจพบด่าน/กล้อง ${count} จุดบนเส้นทาง!` 
      : `🟢 ผลสแกนด่าน: เส้นทางปลอดโปร่ง ไม่พบด่านตรวจตลอดสาย`;

    const appUrl = (typeof window !== 'undefined' && window.location && window.location.href) ? window.location.href : this.getBaseAppUrl();
    const durationStr = window.routeManager 
      ? window.routeManager.formatDuration(route.durationMin) 
      : `${Math.round(route.durationMin)} นาที`;

    const shareText = `🚗 [แผนการเดินทาง & สแกนด่าน - คู่หูนักเดินทาง]\n` +
      `🏁 จุดหมายปลายทาง: ${route.destName || 'ปลายทาง'}\n` +
      `📏 ระยะทางรวม: ${route.distanceKm.toFixed(1)} กม.\n` +
      `⏱️ เวลาเดินทางโดยประมาณ: ${durationStr}\n` +
      `${warning}\n` +
      `📲 เปิดเรดาร์นำทางและตรวจจับด่านสด: ${appUrl}\n` +
      `#คู่หูนักเดินทาง #วางแผนเดินทาง #สแกนด่าน`;

    this.openShareModal({
      title: `แชร์แผนการเดินทางสู่ ${route.destName || 'จุดหมาย'}`,
      text: shareText,
      url: appUrl,
      category: 'route',
      icon: 'fa-route',
      heading: `เส้นทางสู่ ${route.destName || 'ปลายทาง'}`,
      subheading: `ระยะทาง ${route.distanceKm.toFixed(1)} กม. (${durationStr}) • ${count > 0 ? `พบด่าน ${count} จุด` : 'ทางปลอดโปร่ง'}`,
      hashtags: 'คู่หูนักเดินทาง,วางแผนเดินทาง,สแกนด่าน'
    });
  }

  // 5. Share Trip Summary Log
  shareTrip(data) {
    if (!data) return;
    const appUrl = this.getBaseAppUrl();
    const dist = (data.distanceKm || 0).toFixed(1);
    const dur = data.durationFormatted || (data.durationMin ? `${data.durationMin} นาที` : 'ไม่ระบุ');
    const cpCount = data.checkpointCount !== undefined ? data.checkpointCount : (data.checkpointsEncountered || 0);
    const camCount = data.cameraCount || 0;
    const scoreText = data.score !== undefined ? ` (คะแนนการขับขี่ ${data.score}/100)` : '';

    const shareText = `🏁 [สรุปสถิติการเดินทาง - คู่หูนักเดินทาง]\n` +
      `🛣️ ระยะทางขับขี่: ${dist} กม.\n` +
      `⏱️ เวลาที่ใช้: ${dur}\n` +
      `⚡ ความเร็วเฉลี่ย: ${data.avgSpeed || 0} กม./ชม. (สูงสุด ${data.maxSpeed || 0} กม./ชม.)${scoreText}\n` +
      `🛡️ ขับผ่านด่านตรวจ ${cpCount} จุด และกล้องจับความเร็ว ${camCount} ตัว ปลอดภัยตลอดการเดินทาง!\n` +
      `📲 บันทึกการเดินทางอัจฉริยะกับ คู่หูนักเดินทาง: ${appUrl}\n` +
      `#คู่หูนักเดินทาง #บันทึกการเดินทาง #ขับขี่ปลอดภัย`;

    this.openShareModal({
      title: 'แชร์สถิติการเดินทาง',
      text: shareText,
      url: appUrl,
      category: 'trip',
      icon: 'fa-flag-checkered',
      heading: `สถิติการเดินทาง ${dist} กม.`,
      subheading: `เวลา ${dur} • ความเร็วเฉลี่ย ${data.avgSpeed || 0} กม./ชม. • ปลอดภัย 100%`,
      hashtags: 'คู่หูนักเดินทาง,บันทึกการเดินทาง,ขับขี่ปลอดภัย'
    });
  }

  // 6. Share Emergency Distress Location
  shareSOS(lat, lng, areaText = '') {
    const gmapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
    const shareText = `🆘 [แจ้งพิกัดขอความช่วยเหลือฉุกเฉิน - SOS]\n` +
      `📍 ตำแหน่งปัจจุบัน: ${areaText || 'พิกัด GPS'}\n` +
      `📌 พิกัดละติจูด-ลองจิจูด: ${lat.toFixed(6)}, ${lng.toFixed(6)}\n` +
      `🗺️ แผนที่ระบุตำแหน่ง: ${gmapsLink}\n` +
      `📞 สายด่วนฉุกเฉิน: 1193 (ตำรวจทางหลวง) / 1669 (กู้ชีพฉุกเฉิน 24 ชม.)\n` +
      `#ฉุกเฉิน #ขอความช่วยเหลือ #ตำรวจทางหลวง`;

    this.openShareModal({
      title: 'แชร์พิกัดขอความช่วยเหลือฉุกเฉิน (SOS)',
      text: shareText,
      url: gmapsLink,
      category: 'sos',
      icon: 'fa-truck-medical',
      heading: 'พิกัดขอความช่วยเหลือฉุกเฉิน',
      subheading: `${areaText || `${lat.toFixed(4)}, ${lng.toFixed(4)}`} • สายด่วน 1193 / 1669`,
      hashtags: 'ฉุกเฉิน,ขอความช่วยเหลือ,ตำรวจทางหลวง'
    });
  }

  // Open Universal Social Share Modal with custom payload
  openShareModal(data) {
    this.currentShareData = { ...this.currentShareData, ...data };
    this.renderModalContent();

    const modal = document.getElementById('social-share-modal');
    if (modal) {
      modal.classList.add('show');
    }
  }

  closeShareModal() {
    const modal = document.getElementById('social-share-modal');
    if (modal) {
      modal.classList.remove('show');
    }
  }

  // Bind UI Events
  bindEvents() {
    // Header share button
    const btnHeaderShare = document.getElementById('btn-header-share');
    if (btnHeaderShare) {
      btnHeaderShare.addEventListener('click', () => {
        this.shareApp();
      });
    }

    // Modal close backdrop
    const modal = document.getElementById('social-share-modal');
    if (modal) {
      const closeBtn = modal.querySelector('.modal-close');
      const backdrop = modal.querySelector('.modal-backdrop');
      if (closeBtn) closeBtn.onclick = () => this.closeShareModal();
      if (backdrop) backdrop.onclick = () => this.closeShareModal();
    }
  }

  ensureModalExists() {
    if (document.getElementById('social-share-modal')) return;

    const modalHtml = `
      <div class="app-modal" id="social-share-modal">
        <div class="modal-backdrop"></div>
        <div class="modal-dialog" style="max-width: 580px; max-height: 90vh;">
          <div class="modal-header">
            <h3 class="modal-title" style="color: var(--neon-cyan); display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-share-nodes"></i>
              <span id="social-share-modal-title">แชร์ไปยัง Social ต่าง ๆ</span>
            </h3>
            <button class="modal-close" onclick="window.socialManager.closeShareModal();">&times;</button>
          </div>
          <div class="modal-body" style="padding: 16px; overflow-y: auto;">
            <div id="social-share-modal-body">
              <!-- Dynamically populated -->
            </div>
          </div>
          <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 11px; color: var(--text-muted);">
              <i class="fa-solid fa-heart" style="color: #ef4444;"></i> ร่วมเป็นส่วนหนึ่งของการเดินทางที่ปลอดภัย
            </div>
            <button class="header-btn" onclick="window.socialManager.closeShareModal();">ปิดหน้าต่าง</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  renderModalContent() {
    const body = document.getElementById('social-share-modal-body');
    const titleEl = document.getElementById('social-share-modal-title');
    if (!body) return;

    if (titleEl) {
      titleEl.textContent = this.currentShareData.title || 'แชร์ไปยัง Social ต่าง ๆ';
    }

    const d = this.currentShareData;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(d.url)}`;

    body.innerHTML = `
      <!-- Share Preview Card -->
      <div class="social-share-preview-card">
        <div class="social-preview-icon">
          <i class="fa-solid ${d.icon || 'fa-share-nodes'}"></i>
        </div>
        <div class="social-preview-details">
          <h4 class="social-preview-title">${d.heading || 'คู่หูนักเดินทาง'}</h4>
          <p class="social-preview-sub">${d.subheading || ''}</p>
          <div class="social-preview-text-box">
            ${d.text.replace(/\n/g, '<br>')}
          </div>
        </div>
      </div>

      <!-- Social Media Buttons Grid -->
      <div style="margin-top: 16px; margin-bottom: 8px;">
        <label style="font-size: 12px; font-weight: 700; color: #cbd5e1; display: flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-paper-plane" style="color: var(--neon-cyan);"></i> เลือก Social Media ที่ต้องการแชร์:
        </label>
      </div>

      <div class="social-platforms-grid">
        <!-- LINE -->
        <button class="btn-social-platform line" onclick="window.socialManager.shareToLine();">
          <i class="fa-brands fa-line"></i>
          <span>LINE</span>
        </button>

        <!-- Facebook -->
        <button class="btn-social-platform fb" onclick="window.socialManager.shareToFacebook();">
          <i class="fa-brands fa-facebook"></i>
          <span>Facebook</span>
        </button>

        <!-- X (Twitter) -->
        <button class="btn-social-platform x" onclick="window.socialManager.shareToX();">
          <i class="fa-brands fa-x-twitter"></i>
          <span>X (Twitter)</span>
        </button>

        <!-- Telegram -->
        <button class="btn-social-platform tg" onclick="window.socialManager.shareToTelegram();">
          <i class="fa-brands fa-telegram"></i>
          <span>Telegram</span>
        </button>

        <!-- WhatsApp -->
        <button class="btn-social-platform wa" onclick="window.socialManager.shareToWhatsApp();">
          <i class="fa-brands fa-whatsapp"></i>
          <span>WhatsApp</span>
        </button>

        <!-- Native Web Share (Instagram, Messenger, AirDrop, etc.) -->
        <button class="btn-social-platform native" onclick="window.socialManager.shareNative();">
          <i class="fa-solid fa-share-from-square"></i>
          <span>แอปอื่น ๆ</span>
        </button>
      </div>

      <!-- Copy Link Section -->
      <div style="margin-top: 16px; margin-bottom: 8px;">
        <label style="font-size: 12px; font-weight: 700; color: #cbd5e1; display: flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-link" style="color: #38bdf8;"></i> ลิงก์สำหรับส่งต่อ / วางในแชต:
        </label>
      </div>

      <div class="social-copy-bar">
        <input type="text" id="social-share-url-input" class="social-copy-input" value="${d.url}" readonly>
        <button id="btn-social-copy-link" class="social-copy-btn" onclick="window.socialManager.copyShareLink();">
          <i class="fa-solid fa-copy"></i>
          <span id="social-copy-btn-text">คัดลอกลิงก์</span>
        </button>
      </div>

      <!-- Copy Full Text Button -->
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button class="social-action-btn" onclick="window.socialManager.copyFullMessage();">
          <i class="fa-solid fa-paste"></i> คัดลอกข้อความเต็มทั้งหมด
        </button>
        <button class="social-action-btn" id="btn-toggle-qr-view" onclick="window.socialManager.toggleQrCode();">
          <i class="fa-solid fa-qrcode"></i> แสดง QR Code
        </button>
      </div>

      <!-- QR Code Container (Expandable) -->
      <div id="social-qr-container" class="social-qr-wrapper" style="display: none;">
        <div style="background: #ffffff; padding: 12px; border-radius: 12px; display: inline-block; box-shadow: 0 0 20px rgba(0, 242, 254, 0.3);">
          <img src="${qrUrl}" alt="QR Code" style="width: 170px; height: 170px; display: block; border-radius: 4px;">
        </div>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
          <i class="fa-solid fa-mobile-screen"></i> สแกนด้วยกล้องมือถือหรือ LINE เพื่อเปิดหน้านี้ทันที
        </div>
      </div>
    `;
  }

  // ==========================================
  // Direct Social Platform Handlers
  // ==========================================

  // Share to LINE
  shareToLine(customText = null) {
    const textToShare = customText || this.currentShareData.text;
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(textToShare)}`;
    window.open(lineUrl, '_blank');
    if (window.app && window.app.showToast) {
      window.app.showToast('🟢 กำลังเปิดแชร์ไปยัง LINE...', 'info');
    }
  }

  // Share to Facebook
  shareToFacebook(customUrl = null) {
    const url = customUrl || this.currentShareData.url;
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(this.currentShareData.title)}`;
    window.open(fbUrl, '_blank', 'width=600,height=500,menubar=no,toolbar=no');
    if (window.app && window.app.showToast) {
      window.app.showToast('🔵 กำลังเปิดแชร์ไปยัง Facebook...', 'info');
    }
  }

  // Share to X (Twitter)
  shareToX() {
    const d = this.currentShareData;
    const tweetText = `${d.title}\n${d.heading}`;
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(d.url)}&hashtags=${encodeURIComponent(d.hashtags || 'คู่หูนักเดินทาง,เช็คด่าน')}`;
    window.open(xUrl, '_blank', 'width=600,height=450,menubar=no,toolbar=no');
    if (window.app && window.app.showToast) {
      window.app.showToast('⚫ กำลังเปิดแชร์ไปยัง X (Twitter)...', 'info');
    }
  }

  // Share to Telegram
  shareToTelegram() {
    const d = this.currentShareData;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(d.url)}&text=${encodeURIComponent(d.text)}`;
    window.open(tgUrl, '_blank');
    if (window.app && window.app.showToast) {
      window.app.showToast('✈️ กำลังเปิดแชร์ไปยัง Telegram...', 'info');
    }
  }

  // Share to WhatsApp
  shareToWhatsApp() {
    const d = this.currentShareData;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(d.text)}`;
    window.open(waUrl, '_blank');
    if (window.app && window.app.showToast) {
      window.app.showToast('💬 กำลังเปิดแชร์ไปยัง WhatsApp...', 'info');
    }
  }

  // Native Web Share API (Mobile OS Share Sheet)
  shareNative() {
    const d = this.currentShareData;
    if (navigator.share) {
      navigator.share({
        title: d.title,
        text: d.text,
        url: d.url
      }).then(() => {
        if (window.app && window.app.showToast) {
          window.app.showToast('✨ แชร์สำเร็จเรียบร้อย', 'success');
        }
      }).catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn('Native share error:', err);
          this.copyShareLink();
        }
      });
    } else {
      // Fallback: Copy link
      this.copyShareLink();
    }
  }

  // Copy URL only
  copyShareLink() {
    const input = document.getElementById('social-share-url-input');
    const url = input ? input.value : this.currentShareData.url;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        this.animateCopySuccess('social-copy-btn-text', '✓ คัดลอกลิงก์แล้ว!');
        if (window.app && window.app.showToast) {
          window.app.showToast('📋 คัดลอกลิงก์สำเร็จ นำไปส่งให้เพื่อนได้ทันที', 'success');
        }
      });
    } else {
      if (input) {
        input.select();
        document.execCommand('copy');
        this.animateCopySuccess('social-copy-btn-text', '✓ คัดลอกลิงก์แล้ว!');
      }
    }
  }

  // Copy Full Message Text
  copyFullMessage() {
    const fullText = this.currentShareData.text;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullText).then(() => {
        if (window.app && window.app.showToast) {
          window.app.showToast('📝 คัดลอกข้อความเต็มทั้งหมดเรียบร้อยแล้ว', 'success');
        }
      });
    }
  }

  // Toggle QR Code Display
  toggleQrCode() {
    const qrWrap = document.getElementById('social-qr-container');
    const btn = document.getElementById('btn-toggle-qr-view');
    if (!qrWrap) return;

    const isVisible = qrWrap.style.display !== 'none';
    qrWrap.style.display = isVisible ? 'none' : 'block';
    if (btn) {
      btn.innerHTML = isVisible 
        ? '<i class="fa-solid fa-qrcode"></i> แสดง QR Code' 
        : '<i class="fa-solid fa-eye-slash"></i> ซ่อน QR Code';
    }
  }

  animateCopySuccess(btnTextId, successText) {
    const el = document.getElementById(btnTextId);
    if (!el) return;
    const orig = el.textContent;
    el.textContent = successText;
    el.style.color = '#10b981';
    setTimeout(() => {
      el.textContent = orig;
      el.style.color = '';
    }, 2500);
  }
}

// Global instance
window.socialManager = new SocialManager();
