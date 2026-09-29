// Location & Reverse Geocoding Intelligence Engine for CheckDan Thailand
class LocationManager {
  constructor() {
    this.currentLocation = null;
    this.cache = new Map(); // key: 'lat,lng' rounded
    this.isResolving = false;
    this.lastResolveTime = 0;
    this.lastCoords = null;
    this.lastAnnouncedDistrict = '';
    this.lastAnnouncedProvince = '';
    this.init();
  }

  init() {
    // Bind UI buttons if present
    document.addEventListener('DOMContentLoaded', () => {
      this.bindEvents();
    });
    // In case DOM is already loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(() => this.bindEvents(), 100);
    }
  }

  bindEvents() {
    // Voice Speak Current Location buttons
    const speakBtns = document.querySelectorAll('.btn-speak-current-location, #btn-speak-current-location, #live-location-chip');
    speakBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.speakCurrentLocation();
      });
    });

    // Test Ubon location simulation button if present
    const btnTestUbon = document.getElementById('btn-test-loc-ubon');
    if (btnTestUbon) {
      btnTestUbon.addEventListener('click', () => {
        this.simulateLocation(15.2448, 104.8473, 'อ.เมือง จ.อุบลราชธานี (ถ.แจ้งสนิท)');
      });
    }
  }

  // Reverse geocode lat, lng to Thai administrative divisions
  async reverseGeocode(lat, lng, force = false) {
    if (lat === null || lat === undefined || lng === null || lng === undefined) return null;
    lat = parseFloat(lat);
    lng = parseFloat(lng);
    if (isNaN(lat) || isNaN(lng)) return null;

    // Check distance from last resolved coords to prevent unnecessary queries (< 250 meters)
    if (!force && this.lastCoords && this.currentLocation) {
      const dist = window.mapManager 
        ? window.mapManager.calculateDistance(lat, lng, this.lastCoords.lat, this.lastCoords.lng)
        : 0;
      if (dist < 0.25) {
        return this.currentLocation;
      }
    }

    // Cache key by grid (~100m)
    const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    if (!force && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      this.currentLocation = cached;
      this.updateUI(cached);
      return cached;
    }

    // Instant local fallback so UI never waits
    const instantFallback = this.getFallbackLocation(lat, lng);
    if (!this.currentLocation) {
      this.currentLocation = instantFallback;
      this.updateUI(instantFallback);
    }

    // Throttle remote API requests: at most 1 every 2 seconds
    const now = Date.now();
    if (!force && (this.isResolving || (now - this.lastResolveTime < 2000))) {
      return this.currentLocation;
    }

    this.isResolving = true;
    this.lastResolveTime = now;

    // 1. Primary Engine: BigDataCloud Client Reverse Geocode (Fast, accurate Thai administrative levels)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);
      const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=th`;
      
      const res = await fetch(bdcUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const parsed = this.parseBDCAddress(data, lat, lng);
        if (parsed && (parsed.district || parsed.province)) {
          this.cache.set(cacheKey, parsed);
          this.currentLocation = parsed;
          this.lastCoords = { lat, lng };
          this.updateUI(parsed);

          // Check if driver entered a new district/province
          if (parsed.district && parsed.district !== this.lastAnnouncedDistrict) {
            this.onDistrictChange(parsed);
          }

          this.isResolving = false;
          return parsed;
        }
      }
    } catch (err) {
      console.warn('BigDataCloud reverse geocode attempt:', err);
    }

    // 2. Secondary Engine: OpenStreetMap Nominatim
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=th`;
      
      const res = await fetch(nomUrl, { 
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const parsed = this.parseNominatimAddress(data.address || {}, lat, lng);
        if (parsed) {
          this.cache.set(cacheKey, parsed);
          this.currentLocation = parsed;
          this.lastCoords = { lat, lng };
          this.updateUI(parsed);

          if (parsed.district && parsed.district !== this.lastAnnouncedDistrict) {
            this.onDistrictChange(parsed);
          }

          this.isResolving = false;
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Nominatim reverse geocode attempt:', err);
    }

    // 3. Fallback: Instant 77 Provinces Spatial Lookup
    this.currentLocation = instantFallback;
    this.updateUI(instantFallback);
    this.isResolving = false;
    return instantFallback;
  }

  // Parse BigDataCloud administrative response
  parseBDCAddress(data, lat, lng) {
    let province = data.principalSubdivision || '';
    let district = data.city || '';
    let subdistrict = data.locality || '';
    let road = '';

    if (data.localityInfo && Array.isArray(data.localityInfo.administrative)) {
      for (const a of data.localityInfo.administrative) {
        if (a.adminLevel === 4) province = a.name;
        if (a.adminLevel === 6) district = a.name;
        if (a.adminLevel === 8 && (!subdistrict || subdistrict === district)) subdistrict = a.name;
      }
    }

    const isBKK = (province && province.includes('กรุงเทพ')) || (district && district.includes('กรุงเทพ'));
    if (isBKK) {
      province = 'กรุงเทพมหานคร';
      if (!district || district === 'กรุงเทพมหานคร') {
        district = subdistrict && subdistrict.includes('เขต') ? subdistrict : 'เขตพระนคร';
      }
    } else {
      if (province && !province.startsWith('จังหวัด') && !province.startsWith('จ.')) {
        province = 'จังหวัด' + province;
      }
      if (district && !district.startsWith('อำเภอ') && !district.startsWith('อ.')) {
        district = 'อำเภอ' + district;
      }
    }

    return this.buildLocationObject(lat, lng, road, subdistrict, district, province);
  }

  // Parse OpenStreetMap / Nominatim Thai address structure
  parseNominatimAddress(addr, lat, lng) {
    let province = addr.province || addr.state || '';
    const isBKK = (addr.city === 'กรุงเทพมหานคร') || (province && province.includes('กรุงเทพ'));
    
    if (isBKK) {
      province = 'กรุงเทพมหานคร';
    } else if (!province) {
      const fb = this.findClosestProvince(lat, lng);
      province = fb ? fb.name : 'ประเทศไทย';
    }

    if (!isBKK && !province.startsWith('จังหวัด') && !province.startsWith('จ.')) {
      province = 'จังหวัด' + province;
    }

    let district = '';
    if (isBKK) {
      district = addr.suburb || addr.city_district || addr.district || 'เขตพระนคร';
      if (!district.startsWith('เขต')) district = 'เขต' + district;
    } else {
      district = addr.county || addr.district || addr.city_district || '';
      if (!district) {
        const cleanProv = province.replace('จังหวัด', '').trim();
        district = `อำเภอเมือง${cleanProv}`;
      } else if (!district.startsWith('อำเภอ') && !district.startsWith('อ.')) {
        district = 'อำเภอ' + district;
      }
    }

    let subdistrict = isBKK ? (addr.quarter || addr.suburb || '') : (addr.city_district || addr.suburb || addr.village || '');
    let road = addr.road || addr.pedestrian || addr.highway || '';

    return this.buildLocationObject(lat, lng, road, subdistrict, district, province);
  }

  buildLocationObject(lat, lng, road, subdistrict, district, province) {
    const isBKK = province.includes('กรุงเทพ');

    // Clean subdistrict prefix
    if (subdistrict) {
      if (isBKK && !subdistrict.startsWith('แขวง')) subdistrict = 'แขวง' + subdistrict;
      else if (!isBKK && !subdistrict.startsWith('ตำบล') && !subdistrict.startsWith('ต.') && !subdistrict.startsWith('เทศบาล')) subdistrict = 'ตำบล' + subdistrict;
    }

    // Voice text e.g. "อำเภอเมืองอุบลราชธานี จังหวัดอุบลราชธานี"
    let voiceArea = '';
    if (district && province) {
      voiceArea = `${district} ${province}`;
    } else {
      voiceArea = province || 'ประเทศไทย';
    }

    // Short UI text e.g. "อ.เมืองอุบลราชธานี, จ.อุบลราชธานี"
    const shortDist = isBKK ? district : district.replace('อำเภอ', 'อ.');
    const shortProv = isBKK ? 'กรุงเทพฯ' : province.replace('จังหวัด', 'จ.');
    const shortArea = road ? `${road}, ${shortDist} ${shortProv}` : `${shortDist} ${shortProv}`;

    return {
      lat,
      lng,
      road,
      subdistrict,
      district,
      province,
      fullArea: `${subdistrict ? subdistrict + ' ' : ''}${district} ${province}`.trim(),
      shortArea,
      voiceArea
    };
  }

  // Instant fallback location based on closest Thai Province
  getFallbackLocation(lat, lng) {
    const closest = this.findClosestProvince(lat, lng);
    const provName = closest ? closest.name : 'กรุงเทพมหานคร';
    const isBKK = provName === 'กรุงเทพมหานคร';
    const district = isBKK ? 'เขตพระนคร' : `อำเภอเมือง${provName}`;
    const provFull = isBKK ? 'กรุงเทพมหานคร' : `จังหวัด${provName}`;
    const shortProv = isBKK ? 'กรุงเทพฯ' : `จ.${provName}`;
    const shortDist = isBKK ? 'เขตพระนคร' : `อ.เมือง`;

    return {
      lat,
      lng,
      road: '',
      subdistrict: '',
      district,
      province: provFull,
      fullArea: `${district} ${provFull}`,
      shortArea: `${shortDist} ${shortProv}`,
      voiceArea: `${district} ${provFull}`
    };
  }

  findClosestProvince(lat, lng) {
    if (!window.THAILAND_PROVINCES || !window.THAILAND_PROVINCES.length) return null;
    let minD = Infinity;
    let closest = null;
    for (const p of window.THAILAND_PROVINCES) {
      const d = Math.hypot(lat - p.lat, lng - p.lng);
      if (d < minD) {
        minD = d;
        closest = p;
      }
    }
    return closest;
  }

  updateUI(location) {
    if (!location) return;

    // 1. Live Radar Status Bar Location Tag
    const liveTextEl = document.getElementById('live-location-name');
    const liveChipEl = document.getElementById('live-location-chip');
    if (liveTextEl) {
      liveTextEl.textContent = location.shortArea;
      liveTextEl.title = `พิกัดปัจจุบัน: ${location.fullArea} (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`;
    }
    if (liveChipEl) {
      liveChipEl.classList.add('active');
    }

    // 2. HUD Driving Mode Location display
    const hudLocEl = document.getElementById('hud-location-text');
    if (hudLocEl) {
      hudLocEl.textContent = location.shortArea;
    }

    // 3. SOS Modal Current Location display
    const sosLocEl = document.getElementById('sos-current-area');
    if (sosLocEl) {
      const roadInfo = location.road ? `${location.road} ` : '';
      sosLocEl.textContent = `${roadInfo}${location.fullArea}`;
    }

    // 4. Update window.app reference
    if (window.app) {
      window.app.currentLocationInfo = location;
    }
  }

  onDistrictChange(newLocation) {
    if (this.lastAnnouncedDistrict && this.lastAnnouncedDistrict !== newLocation.district) {
      // Notify driver when crossing into a new district/province
      if (window.voiceManager && window.voiceManager.enabled) {
        window.voiceManager.speak(`เข้าสู่พื้นที่ ${newLocation.voiceArea} ค่ะ`, false);
      }
    }
    this.lastAnnouncedDistrict = newLocation.district;
    this.lastAnnouncedProvince = newLocation.province;
  }

  // Voice announce current coordinates and area
  speakCurrentLocation() {
    const userCoords = window.mapManager ? window.mapManager.userCoords : null;
    if (!this.currentLocation && userCoords) {
      this.reverseGeocode(userCoords.lat, userCoords.lng, true).then(() => {
        this.speakCurrentLocation();
      });
      return;
    }

    if (!this.currentLocation) {
      window.voiceManager.speak('ยังไม่สามารถระบุพิกัดพื้นที่ในขณะนี้ได้ค่ะ กรุณารอสักครู่');
      return;
    }

    const loc = this.currentLocation;
    const speed = window.app && window.app.currentLiveSpeed ? window.app.currentLiveSpeed : 0;
    const speedText = speed > 0 ? ` ความเร็วขณะนี้ ${speed} กิโลเมตรต่อชั่วโมง` : '';
    const roadText = loc.road ? ` บริเวณ${loc.road}` : '';

    let text = `ขณะนี้ท่านอยู่ที่${roadText} ${loc.voiceArea}${speedText} ค่ะ`;
    if (window.voiceManager.currentStyle === 'police') {
      text = `รายงานพิกัด! กำลังปฏิบัติการที่${roadText} ${loc.voiceArea}${speedText} เคารพกฎจราจร!`;
    } else if (window.voiceManager.currentStyle === 'esan') {
      text = `ตอนนี้อยู่แถว${roadText} ${loc.voiceArea}${speedText} เด้อพี่น้อง เดินทางปลอดภัย!`;
    }

    window.voiceManager.speak(text, true);
    if (window.app) {
      window.app.showToast(`📍 พิกัดปัจจุบัน: ${loc.road ? loc.road + ' ' : ''}${loc.fullArea}`, 'info');
    }
  }

  // Simulate moving to a location (e.g. Ubon Ratchathani) for testing
  simulateLocation(lat, lng, label) {
    if (window.app) {
      window.app.simulateUserLocation(lat, lng, label);
    }
    this.reverseGeocode(lat, lng, true).then(loc => {
      this.speakCurrentLocation();
    });
  }

  getFullAreaText() {
    return this.currentLocation ? this.currentLocation.fullArea : '';
  }

  getShortAreaText() {
    return this.currentLocation ? this.currentLocation.shortArea : '';
  }

  getVoiceAreaText() {
    return this.currentLocation ? this.currentLocation.voiceArea : '';
  }
}

window.locationManager = new LocationManager();
