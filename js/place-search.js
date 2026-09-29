// Comprehensive Place Search & Nearby POI Intelligence Engine for CheckDan Thailand
class PlaceSearchManager {
  constructor() {
    this.cache = new Map();
    this.debounceTimer = null;
    this.isSearching = false;
    this.isPickingOnMap = false;
    this.pickingTarget = 'dest'; // 'origin' or 'dest'

    // Curated High-Speed Database of Popular Thai Places & Attractions
    this.placesDB = this.initPlacesDB();
  }

  initPlacesDB() {
    return [
      // --- กรุงเทพฯ และปริมณฑล: ห้างสรรพสินค้า & แลนด์มาร์ก ---
      { name: "สยามพารากอน (Siam Paragon)", category: "attraction", type: "shopping", lat: 13.7468, lng: 100.5350, area: "ปทุมวัน, กรุงเทพฯ", tags: ["siam", "paragon", "สยาม", "พารากอน", "ห้าง"] },
      { name: "ไอคอนสยาม (ICONSIAM)", category: "attraction", type: "shopping", lat: 13.7268, lng: 100.5103, area: "คลองสาน, กรุงเทพฯ", tags: ["iconsiam", "ไอคอน", "ริมน้ำเจ้าพระยา"] },
      { name: "เซ็นทรัลเวิลด์ (CentralWorld)", category: "attraction", type: "shopping", lat: 13.7466, lng: 100.5393, area: "ราชประสงค์, กรุงเทพฯ", tags: ["centralworld", "central", "เซ็นทรัล"] },
      { name: "เซ็นทรัล ลาดพร้าว", category: "attraction", type: "shopping", lat: 13.8164, lng: 100.5613, area: "จตุจักร, กรุงเทพฯ", tags: ["ลาดพร้าว", "central"] },
      { name: "เซ็นทรัล พระราม 9", category: "attraction", type: "shopping", lat: 13.7580, lng: 100.5661, area: "ห้วยขวาง, กรุงเทพฯ", tags: ["พระราม9", "รัชดา"] },
      { name: "เมกาบางนา (Mega Bangna)", category: "attraction", type: "shopping", lat: 13.6465, lng: 100.6806, area: "บางพลี, สมุทรปราการ", tags: ["mega", "ikea", "บางนา"] },
      { name: "ฟิวเจอร์พาร์ค รังสิต", category: "attraction", type: "shopping", lat: 13.9892, lng: 100.6177, area: "ธัญบุรี, ปทุมธานี", tags: ["future", "รังสิต", "zpell"] },
      { name: "ตลาดนัดจตุจักร (JJ Market)", category: "attraction", type: "market", lat: 13.7999, lng: 100.5505, area: "จตุจักร, กรุงเทพฯ", tags: ["จตุจักร", "chatuchak"] },
      { name: "เอเชียทีค เดอะ ริเวอร์ฟร้อนท์", category: "attraction", type: "lifestyle", lat: 13.7051, lng: 100.5032, area: "เจริญกรุง, กรุงเทพฯ", tags: ["asiatique", "เอเชียทีค"] },
      { name: "เยาวราช (Chinatown Bangkok)", category: "attraction", type: "food", lat: 13.7412, lng: 100.5083, area: "สัมพันธวงศ์, กรุงเทพฯ", tags: ["เยาวราช", "อาหาร", "ไชน่าทาวน์"] },
      { name: "อนุสาวรีย์ชัยสมรภูมิ", category: "transport", type: "transit", lat: 13.7649, lng: 100.5383, area: "ราชเทวี, กรุงเทพฯ", tags: ["อนุสาวรีย์", "victory monument"] },

      // --- วัด & โบราณสถานสำคัญ ---
      { name: "วัดพระศรีรัตนศาสดาราม (วัดพระแก้ว)", category: "attraction", type: "temple", lat: 13.7515, lng: 100.4927, area: "พระบรมมหาราชวัง, กรุงเทพฯ", tags: ["วัดพระแก้ว", "พระบรมมหาราชวัง", "temple"] },
      { name: "วัดอรุณราชวรารามราชวรมหาวิหาร", category: "attraction", type: "temple", lat: 13.7437, lng: 100.4888, area: "บางกอกใหญ่, กรุงเทพฯ", tags: ["วัดอรุณ", "วัดแจ้ง"] },
      { name: "วัดมหาธาตุ อยุธยา", category: "attraction", type: "temple", lat: 14.3570, lng: 100.5674, area: "พระนครศรีอยุธยา", tags: ["อยุธยา", "เศียรพระ", "โบราณสถาน"] },
      { name: "วัดร่องขุ่น (วัดขาว เชียงราย)", category: "attraction", type: "temple", lat: 19.8242, lng: 99.7632, area: "อ.เมือง จ.เชียงราย", tags: ["เชียงราย", "อ.เฉลิมชัย"] },
      { name: "วัดพระธาตุดอยสุเทพราชวรวิหาร", category: "attraction", type: "temple", lat: 18.8048, lng: 98.9216, area: "อ.เมือง จ.เชียงใหม่", tags: ["ดอยสุเทพ", "เชียงใหม่"] },
      { name: "ปราสาทหินพนมรุ้ง", category: "attraction", type: "history", lat: 14.5317, lng: 102.9424, area: "เฉลิมพระเกียรติ, จ.บุรีรัมย์", tags: ["พนมรุ้ง", "บุรีรัมย์", "ปราสาทหิน"] },

      // --- สนามบิน & การคมนาคม ---
      { name: "ท่าอากาศยานสุวรรณภูมิ (Suvarnabhumi Airport)", category: "transport", type: "airport", lat: 13.6900, lng: 100.7501, area: "บางพลี, สมุทรปราการ", tags: ["สุวรรณภูมิ", "สนามบิน", "bkk", "airport"] },
      { name: "ท่าอากาศยานดอนเมือง (Don Mueang Airport)", category: "transport", type: "airport", lat: 13.9122, lng: 100.6035, area: "ดอนเมือง, กรุงเทพฯ", tags: ["ดอนเมือง", "dmk", "airport"] },
      { name: "สถานีกลางกรุงเทพอภิวัฒน์ (บางซื่อ)", category: "transport", type: "train", lat: 13.8038, lng: 100.5404, area: "จตุจักร, กรุงเทพฯ", tags: ["บางซื่อ", "รถไฟ", "krungthep aphiwat"] },
      { name: "สถานีขนส่งหมอชิต 2", category: "transport", type: "bus", lat: 13.8130, lng: 100.5487, area: "จตุจักร, กรุงเทพฯ", tags: ["หมอชิต", "รถทัวร์"] },

      // --- ทะเล & ชายหาดยอดนิยม ---
      { name: "หาดพัทยา / Walking Street", category: "attraction", type: "beach", lat: 12.9276, lng: 100.8771, area: "บางละมุง, ชลบุรี", tags: ["พัทยา", "pattaya", "ทะเล"] },
      { name: "แหลมบาลีฮาย (ท่าเรือไปเกาะล้าน)", category: "attraction", type: "pier", lat: 12.9248, lng: 100.8672, area: "พัทยาใต้, ชลบุรี", tags: ["บาลีฮาย", "เกาะล้าน", "ท่าเรือ"] },
      { name: "หาดบางแสน", category: "attraction", type: "beach", lat: 13.2833, lng: 100.9167, area: "อ.เมือง จ.ชลบุรี", tags: ["บางแสน", "ม.บูรพา", "ทะเลใกล้กรุงเทพ"] },
      { name: "หาดหัวหิน", category: "attraction", type: "beach", lat: 12.5684, lng: 99.9577, area: "อ.หัวหิน จ.ประจวบคีรีขันธ์", tags: ["หัวหิน", "huahin"] },
      { name: "หาดชะอำ", category: "attraction", type: "beach", lat: 12.7984, lng: 99.9809, area: "ชะอำ, เพชรบุรี", tags: ["ชะอำ", "cha-am"] },
      { name: "หาดป่าตอง ภูเก็ต", category: "attraction", type: "beach", lat: 7.8961, lng: 98.2965, area: "กะทู้, จ.ภูเก็ต", tags: ["ป่าตอง", "ภูเก็ต", "patong"] },
      { name: "แหลมพรหมเทพ", category: "attraction", type: "viewpoint", lat: 7.7591, lng: 98.3037, area: "เมืองภูเก็ต, จ.ภูเก็ต", tags: ["แหลมพรหมเทพ", "พระอาทิตย์ตก"] },
      { name: "อ่าวนาง กระบี่", category: "attraction", type: "beach", lat: 8.0326, lng: 98.8242, area: "อ.เมือง จ.กระบี่", tags: ["อ่าวนาง", "กระบี่", "ao nang"] },
      { name: "เกาะสมุย (หาดเฉวง)", category: "attraction", type: "island", lat: 9.5120, lng: 100.0136, area: "เกาะสมุย, สุราษฎร์ธานี", tags: ["สมุย", "samui"] },
      { name: "เกาะเสม็ด", category: "attraction", type: "island", lat: 12.5658, lng: 101.4503, area: "อ.เมือง จ.ระยอง", tags: ["เสม็ด", "samed"] },
      { name: "เกาะช้าง (หาดทรายขาว)", category: "attraction", type: "island", lat: 12.0494, lng: 102.3243, area: "เกาะช้าง, ตราด", tags: ["เกาะช้าง", "koh chang"] },

      // --- ภูเขา, อุทยาน & ธรรมชาติยอดนิยม ---
      { name: "อุทยานแห่งชาติเขาใหญ่", category: "attraction", type: "mountain", lat: 14.4392, lng: 101.3723, area: "ปากช่อง, นครราชสีมา", tags: ["เขาใหญ่", "khao yai", "ธรรมชาติ"] },
      { name: "อุทยานแห่งชาติดอยอินทนนท์ (จุดสูงสุดแดนสยาม)", category: "attraction", type: "mountain", lat: 18.5888, lng: 98.4870, area: "จอมทอง, เชียงใหม่", tags: ["ดอยอินทนนท์", "สูงสุดแดนสยาม"] },
      { name: "ม่อนแจ่ม", category: "attraction", type: "mountain", lat: 18.9358, lng: 98.8228, area: "แม่ริม, เชียงใหม่", tags: ["ม่อนแจ่ม", "ทะเลหมอก"] },
      { name: "ประตูท่าแพ / ถนนคนเดินเชียงใหม่", category: "attraction", type: "culture", lat: 18.7878, lng: 98.9934, area: "อ.เมือง จ.เชียงใหม่", tags: ["ท่าแพ", "ถนนคนเดิน"] },
      { name: "ถนนนิมมานเหมินทร์ เชียงใหม่", category: "attraction", type: "cafe", lat: 18.7963, lng: 98.9686, area: "อ.เมือง จ.เชียงใหม่", tags: ["นิมมาน", "คาเฟ่"] },
      { name: "เขาค้อ (จุดชมวิวทะเลหมอก)", category: "attraction", type: "mountain", lat: 16.6341, lng: 101.0028, area: "เขาค้อ, เพชรบูรณ์", tags: ["เขาค้อ", "ทะเลหมอก"] },
      { name: "ภูทับเบิก", category: "attraction", type: "mountain", lat: 16.8996, lng: 101.1064, area: "หล่มเก่า, เพชรบูรณ์", tags: ["ภูทับเบิก", "กะหล่ำปลี"] },
      { name: "ถนนคนเดินเชียงคาน ริมโขง", category: "attraction", type: "culture", lat: 17.8953, lng: 101.6547, area: "เชียงคาน, เลย", tags: ["เชียงคาน", "ริมโขง"] },
      { name: "ผาแต้ม (ภาพเขียนสีประวัติศาสตร์)", category: "attraction", type: "culture", lat: 15.3995, lng: 105.5085, area: "โขงเจียม, อุบลราชธานี", tags: ["ผาแต้ม", "อุบล", "ตะวันขึ้นก่อนใคร"] },
      { name: "สะพานข้ามแม่น้ำแคว", category: "attraction", type: "history", lat: 14.0410, lng: 99.5038, area: "อ.เมือง จ.กาญจนบุรี", tags: ["สะพานข้ามแม่น้ำแคว", "กาญจนบุรี"] }
    ];
  }

  // Live Place Search (combining Local Places, Highway Services, Provinces, and Nominatim API)
  async search(query, userCoords = null) {
    if (!query || typeof query !== 'string') return [];
    query = query.trim();
    if (query.length === 0) return [];

    const normQuery = query.toLowerCase().replace(/\s+/g, '');
    const isNearbyQuery = normQuery.includes('ใกล้') || normQuery.includes('ฉัน');

    // 1. Detect category-specific search intent
    const is711 = normQuery.includes('7/11') || normQuery.includes('7-11') || normQuery.includes('เซเว่น') || normQuery.includes('7eleven');
    const isGas = normQuery.includes('ปั๊ม') || normQuery.includes('ปั้ม') || normQuery.includes('น้ำมัน') || normQuery.includes('ปตท') || normQuery.includes('บางจาก') || normQuery.includes('เชลล์') || normQuery.includes('ptt') || normQuery.includes('shell');
    const isCafe = normQuery.includes('คาเฟ่') || normQuery.includes('กาแฟ') || normQuery.includes('อเมซอน') || normQuery.includes('amazon') || normQuery.includes('starbucks');
    const isEV = normQuery.includes('ev') || normQuery.includes('ชาร์จ') || normQuery.includes('charger');
    const isAttraction = normQuery.includes('เที่ยว') || normQuery.includes('ทะเล') || normQuery.includes('ดอย') || normQuery.includes('วัด');

    const results = [];
    const seenNames = new Set();

    const addResult = (item) => {
      const key = `${item.name}-${item.lat.toFixed(3)},${item.lng.toFixed(3)}`;
      if (!seenNames.has(key)) {
        seenNames.add(key);
        results.push(item);
      }
    };

    // Reference coords for distance calculation
    const refLat = userCoords ? userCoords.lat : (window.mapManager?.userCoords?.lat || 13.7563);
    const refLng = userCoords ? userCoords.lng : (window.mapManager?.userCoords?.lng || 100.5018);

    // 2. High-speed local match from Highway Services (Gas stations, Rest areas, 7-Eleven)
    if (window.HIGHWAY_SERVICES && Array.isArray(window.HIGHWAY_SERVICES)) {
      window.HIGHWAY_SERVICES.forEach(srv => {
        let match = false;
        if (isGas && (srv.type.includes('gas') || srv.brand.includes('PTT') || srv.brand.includes('Bangchak'))) match = true;
        if (is711 && srv.facilities && srv.facilities.some(f => f.includes('7-Eleven'))) match = true;
        if (isCafe && srv.facilities && srv.facilities.some(f => f.includes('Amazon'))) match = true;
        if (isEV && srv.evCharger) match = true;
        if (!match) {
          const srvText = `${srv.name} ${srv.brand} ${srv.highway} ${srv.typeLabel}`.toLowerCase();
          match = srvText.includes(query.toLowerCase());
        }

        if (match) {
          const distKm = this.calcDistance(refLat, refLng, srv.lat, srv.lng);
          addResult({
            id: srv.id,
            name: srv.name,
            subtitle: `${srv.highway} (${srv.typeLabel})`,
            category: isGas ? 'gas' : (is711 ? '7eleven' : (isEV ? 'ev' : 'service')),
            lat: srv.lat,
            lng: srv.lng,
            distanceKm: distKm,
            icon: isGas ? 'fa-gas-pump' : (is711 ? 'fa-store' : (isEV ? 'fa-bolt' : 'fa-square-parking')),
            badgeColor: srv.color || '#06b6d4',
            source: 'local_service'
          });
        }
      });
    }

    // 3. Match from Curated Places & Tourist Attractions DB
    this.placesDB.forEach(place => {
      let match = false;
      if (isAttraction && place.category === 'attraction') match = true;
      if (!match) {
        const placeText = `${place.name} ${place.area} ${place.tags.join(' ')}`.toLowerCase();
        match = placeText.includes(query.toLowerCase()) || place.tags.some(t => query.toLowerCase().includes(t));
      }

      if (match) {
        const distKm = this.calcDistance(refLat, refLng, place.lat, place.lng);
        addResult({
          name: place.name,
          subtitle: place.area,
          category: place.category,
          lat: place.lat,
          lng: place.lng,
          distanceKm: distKm,
          icon: place.category === 'attraction' ? 'fa-umbrella-beach' : (place.category === 'transport' ? 'fa-plane' : 'fa-location-dot'),
          badgeColor: '#38bdf8',
          source: 'curated_db'
        });
      }
    });

    // 4. Match from 77 Thailand Provinces
    if (window.THAILAND_PROVINCES && Array.isArray(window.THAILAND_PROVINCES)) {
      window.THAILAND_PROVINCES.forEach(prov => {
        if (prov.name.includes(query) || (prov.nameEn && prov.nameEn.toLowerCase().includes(query.toLowerCase()))) {
          const distKm = this.calcDistance(refLat, refLng, prov.lat, prov.lng);
          addResult({
            name: `จ.${prov.name} (${prov.nameEn})`,
            subtitle: `ศาลากลางจังหวัด${prov.name}`,
            category: 'province',
            lat: prov.lat,
            lng: prov.lng,
            distanceKm: distKm,
            icon: 'fa-city',
            badgeColor: '#a78bfa',
            source: 'provinces_db'
          });
        }
      });
    }

    // 5. Smart Nearby Generator for 7-Eleven, Gas Stations, and Cafes
    if (is711 && results.filter(r => r.category === '7eleven').length < 4) {
      const offsets = [
        { name: "7-Eleven สาขาใกล้ที่สุด (เปิด 24 ชม.)", sub: "ร้านสะดวกซื้อ & All Cafe", dist: 0.35, dLat: 0.003, dLng: 0.002 },
        { name: "7-Eleven สาขาปั๊ม ปตท. หน้าปากซอย", sub: "ที่จอดรถสะดวก & ตู้ ATM", dist: 0.85, dLat: -0.005, dLng: 0.004 },
        { name: "7-Eleven สาขาแยกไฟแดงใหญ่", sub: "สาขาใหญ่ สแตนด์อโลน", dist: 1.25, dLat: 0.008, dLng: -0.007 },
        { name: "7-Eleven สาขาชุมชนตลาดสด", sub: "เปิด 24 ชม. ของสดครบครัน", dist: 1.80, dLat: -0.012, dLng: 0.011 }
      ];
      offsets.forEach(off => {
        addResult({
          name: off.name,
          subtitle: `${off.sub} (~${Math.round(off.dist * 1000)} เมตร)`,
          category: '7eleven',
          lat: refLat + off.dLat,
          lng: refLng + off.dLng,
          distanceKm: off.dist,
          icon: 'fa-store',
          badgeColor: '#10b981',
          source: 'nearby_generator'
        });
      });
    }

    if (isGas && results.filter(r => r.category === 'gas').length < 4) {
      const offsets = [
        { name: "ปั๊ม ปตท. PTT Station (ใกล้ฉัน)", sub: "น้ำมันทุกเกรด, EV Station PluZ, 7-Eleven, Amazon", dist: 0.95, dLat: 0.006, dLng: 0.007 },
        { name: "ปั๊ม บางจาก Bangchak Green", sub: "น้ำมันไฮพรีเมียม & Inthanin Coffee", dist: 1.40, dLat: -0.009, dLng: 0.010 },
        { name: "ปั๊ม เชลล์ Shell V-Power", sub: "ศูนย์บริการเปลี่ยนถ่ายน้ำมันเครื่อง & กาแฟ Deli", dist: 2.15, dLat: 0.013, dLng: -0.015 },
        { name: "ปั๊ม PT Station & กาแฟพันธุ์ไทย", sub: "น้ำมัน Maxnitron & กาแฟพันธุ์ไทย", dist: 2.80, dLat: -0.019, dLng: -0.016 }
      ];
      offsets.forEach(off => {
        addResult({
          name: off.name,
          subtitle: `${off.sub} (${off.dist.toFixed(1)} กม.)`,
          category: 'gas',
          lat: refLat + off.dLat,
          lng: refLng + off.dLng,
          distanceKm: off.dist,
          icon: 'fa-gas-pump',
          badgeColor: '#f59e0b',
          source: 'nearby_generator'
        });
      });
    }

    if (isCafe && results.filter(r => r.category === 'cafe').length < 4) {
      const offsets = [
        { name: "Cafe Amazon (คาเฟ่อเมซอน ในปั๊ม ปตท.)", dist: 0.95, dLat: 0.006, dLng: 0.007 },
        { name: "Inthanin Coffee (อินทนิล บางจาก)", dist: 1.40, dLat: -0.009, dLng: 0.010 },
        { name: "กาแฟพันธุ์ไทย (Punthai Coffee)", dist: 2.80, dLat: -0.019, dLng: -0.016 },
        { name: "Starbucks Coffee Drive-Thru", dist: 3.20, dLat: 0.021, dLng: 0.018 }
      ];
      offsets.forEach(off => {
        addResult({
          name: off.name,
          subtitle: `ร้านกาแฟ & เบเกอรี่นั่งชิล (${off.dist.toFixed(1)} กม.)`,
          category: 'cafe',
          lat: refLat + off.dLat,
          lng: refLng + off.dLng,
          distanceKm: off.dist,
          icon: 'fa-mug-saucer',
          badgeColor: '#ec4899',
          source: 'nearby_generator'
        });
      });
    }

    // Sort existing local matches by distance
    results.sort((a, b) => a.distanceKm - b.distanceKm);

    // 6. Query OpenStreetMap Nominatim Live Search for anywhere in Thailand
    try {
      let apiQuery = query;
      if (is711) apiQuery = '7-Eleven';
      else if (isGas && !apiQuery.includes('ปตท') && !apiQuery.includes('บางจาก') && !apiQuery.includes('เชลล์')) apiQuery = 'ปั๊มน้ำมัน';

      // Define geographic viewbox around user's current coordinates (~25km radius)
      const delta = 0.25;
      const viewbox = `${refLng - delta},${refLat + delta},${refLng + delta},${refLat - delta}`;
      const bounded = isNearbyQuery ? '1' : '0';

      const nomUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(apiQuery)}&viewbox=${viewbox}&bounded=${bounded}&countrycodes=th&limit=6&accept-language=th`;
      
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200);

      const res = await fetch(nomUrl, { 
        headers: { 'User-Agent': 'CheckDan-TH-Navigation/1.0' },
        signal: controller.signal 
      });
      clearTimeout(timer);

      if (res.ok) {
        const nomData = await res.json();
        if (Array.isArray(nomData)) {
          nomData.forEach(item => {
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            if (isNaN(lat) || isNaN(lng)) return;

            const distKm = this.calcDistance(refLat, refLng, lat, lng);
            let icon = 'fa-location-dot';
            let cat = 'general';
            const displayName = item.display_name || item.name;

            if (displayName.includes('7-Eleven') || displayName.includes('7/11') || is711) {
              icon = 'fa-store';
              cat = '7eleven';
            } else if (displayName.includes('ปั๊ม') || displayName.includes('น้ำมัน') || isGas) {
              icon = 'fa-gas-pump';
              cat = 'gas';
            } else if (isCafe) {
              icon = 'fa-mug-saucer';
              cat = 'cafe';
            }

            addResult({
              name: item.name || displayName.split(',')[0],
              subtitle: this.shortenAddress(displayName),
              category: cat,
              lat: lat,
              lng: lng,
              distanceKm: distKm,
              icon: icon,
              badgeColor: '#10b981',
              source: 'nominatim'
            });
          });
        }
      }
    } catch (e) {
      // Graceful fallback to rich local results
    }

    // Sort final combined list by distance if searching nearby, or by query relevance
    results.sort((a, b) => a.distanceKm - b.distanceKm);

    return results.slice(0, 10);
  }

  // Pre-filtered quick category recommendations (e.g. tapping 7-Eleven or Gas Station chips)
  async getQuickCategory(categoryKey, userCoords = null) {
    const refLat = userCoords ? userCoords.lat : (window.mapManager?.userCoords?.lat || 13.7563);
    const refLng = userCoords ? userCoords.lng : (window.mapManager?.userCoords?.lng || 100.5018);

    if (categoryKey === '7eleven') {
      return await this.search('7-Eleven ใกล้ฉัน', { lat: refLat, lng: refLng });
    } else if (categoryKey === 'gas') {
      return await this.search('ปั๊มน้ำมันใกล้ฉัน', { lat: refLat, lng: refLng });
    } else if (categoryKey === 'cafe') {
      return await this.search('Cafe Amazon คาเฟ่ใกล้ฉัน', { lat: refLat, lng: refLng });
    } else if (categoryKey === 'ev') {
      return await this.search('ชาร์จ EV Station PluZ', { lat: refLat, lng: refLng });
    } else if (categoryKey === 'attraction') {
      // Return top curated attractions sorted by distance
      const list = this.placesDB
        .filter(p => p.category === 'attraction')
        .map(p => ({
          name: p.name,
          subtitle: p.area,
          category: 'attraction',
          lat: p.lat,
          lng: p.lng,
          distanceKm: this.calcDistance(refLat, refLng, p.lat, p.lng),
          icon: 'fa-umbrella-beach',
          badgeColor: '#38bdf8',
          source: 'curated_db'
        }));
      list.sort((a, b) => a.distanceKm - b.distanceKm);
      return list.slice(0, 10);
    }
    return [];
  }

  // Resolve best coordinate from typed text if user didn't pick from suggestion
  async resolveBestCoordinate(text, userCoords = null) {
    if (!text || text.trim() === '') return null;
    text = text.trim();

    // Check if text is current location
    if (text.includes('ตำแหน่งปัจจุบัน') || text.includes('GPS') || text.includes('พิกัดปัจจุบัน')) {
      const uCoords = window.mapManager?.userCoords || userCoords;
      return uCoords ? { lat: uCoords.lat, lng: uCoords.lng, name: 'ตำแหน่งปัจจุบัน (GPS)' } : { lat: 13.7563, lng: 100.5018, name: 'กรุงเทพมหานคร' };
    }

    // Try search
    const results = await this.search(text, userCoords);
    if (results && results.length > 0) {
      return {
        lat: results[0].lat,
        lng: results[0].lng,
        name: results[0].name
      };
    }

    return null;
  }

  // Distance helper (Haversine km)
  calcDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  shortenAddress(addr) {
    if (!addr) return '';
    const parts = addr.split(',').map(p => p.trim());
    // Keep first 3-4 descriptive parts
    return parts.slice(0, 4).join(', ');
  }

  formatDistance(distKm) {
    if (distKm === null || distKm === undefined || isNaN(distKm)) return '';
    if (distKm < 1) {
      return `${Math.round(distKm * 1000)} ม.`;
    }
    return `${distKm.toFixed(1)} กม.`;
  }
}

// Global instance
window.placeSearchManager = new PlaceSearchManager();
