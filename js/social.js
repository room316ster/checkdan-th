// Social Sharing Module (LINE, Facebook, Native Web Share) for CheckDan Thailand
class SocialManager {
  // Share a single checkpoint
  shareCheckpoint(cp) {
    const isCleared = cp.status === 'cleared';
    const statusText = isCleared ? '✅ เคลียร์/ยกเลิกแล้ว' : '🚨 กำลังตั้งด่าน (ตรวจเข้ม)';
    const gmapsLink = `https://www.google.com/maps/dir/?api=1&destination=${cp.lat},${cp.lng}`;

    const message = `🚨 [แจ้งเตือนด่านตรวจ CheckDan TH]\n` +
      `📌 ${cp.title}\n` +
      `📍 สถานที่: ${cp.locationName} (${cp.province})\n` +
      `➡️ ฝั่ง/ทิศทาง: ${cp.direction || 'ไม่ระบุ'}\n` +
      `⚠️ ประเภท: ${cp.typeLabel}\n` +
      `⚡ สถานะ: ${statusText}\n` +
      `🗺️ นำทาง Google Maps: ${gmapsLink}\n` +
      `#เช็คด่าน #ด่านตรวจ #${cp.province}`;

    this.dispatchShare(message, cp.title, gmapsLink);
  }

  // Share a route summary with checkpoints
  shareRoute(route, detectedCheckpoints) {
    const count = detectedCheckpoints.length;
    const warning = count > 0 
      ? `🚨 ตรวจพบด่านตรวจบนเส้นทางนี้ ${count} จุด!` 
      : `🟢 เส้นทางปลอดโปร่ง ไม่พบด่านตรวจตลอดสาย`;

    const message = `🚗 [สรุปเส้นทาง & เช็คด่าน CheckDan TH]\n` +
      `📏 ระยะทางรวม: ${route.distanceKm.toFixed(1)} กม.\n` +
      `⏱️ เวลาเดินทางโดยประมาณ: ${window.routeManager.formatDuration(route.durationMin)}\n` +
      `${warning}\n` +
      `🔗 ตรวจสอบจุดตรวจสด: ${window.location.href}`;

    this.dispatchShare(message, 'สรุปเส้นทาง CheckDan TH', window.location.href);
  }

  // Dispatch via Web Share API or LINE
  dispatchShare(text, title = 'CheckDan TH', url = window.location.href) {
    if (navigator.share) {
      navigator.share({
        title: title,
        text: text,
        url: url
      }).catch((e) => console.log('Share canceled:', e));
    } else {
      // Fallback: Copy to clipboard and open LINE Share
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          window.app.showToast('📋 คัดลอกข้อความแจ้งเตือนด่านแล้ว! กำลังเปิด LINE...', 'success');
        });
      }
      const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
      window.open(lineUrl, '_blank');
    }
  }

  // Share to Facebook
  shareToFacebook(url = window.location.href) {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(fbUrl, '_blank', 'width=600,height=500');
  }
}

window.socialManager = new SocialManager();
