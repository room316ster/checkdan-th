// Leaflet Map Manager for CheckDan Thailand (100% Free OpenStreetMap & Esri Layers)
class MapManager {
  constructor() {
    this.map = null;
    this.markersGroup = null;
    this.userLocationMarker = null;
    this.radarCircle = null;
    this.userCoords = null; // { lat, lng }
    this.activeTileLayer = null;
    this.tileLayers = {};
    this.radarRadiusMeters = 5000; // 5 km default alert zone
    this.onMapClickCallback = null;
  }

  init(containerId = 'map') {
    // Default center Bangkok
    const defaultCenter = [13.7563, 100.5018];
    const defaultZoom = 12;

    this.map = L.map(containerId, {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: false
    });

    // Custom zoom control in bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // Initialize 100% Free Tile Layers (NO API KEY REQUIRED)
    this.tileLayers = {
      dark: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: ['a', 'b', 'c'],
        className: 'map-tiles-dark',
        maxZoom: 19
      }),
      streets: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19
      }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP',
        maxZoom: 18
      })
    };

    // Set default dark mode
    this.setMapTheme('dark');

    // Feature group for markers
    this.markersGroup = L.layerGroup().addTo(this.map);

    // Map click handler for reporting checkpoint
    this.map.on('click', (e) => {
      if (this.onMapClickCallback) {
        this.onMapClickCallback(e.latlng);
      }
    });

    // Fix leaflet resize glitch
    setTimeout(() => {
      this.map.invalidateSize();
    }, 250);
  }

  setMapTheme(themeName) {
    if (this.activeTileLayer) {
      this.map.removeLayer(this.activeTileLayer);
    }
    const layer = this.tileLayers[themeName] || this.tileLayers.dark;
    this.activeTileLayer = layer;
    this.activeTileLayer.addTo(this.map);

    // Toggle theme class on map container for precision pane styling
    const mapEl = document.getElementById('map');
    if (mapEl) {
      mapEl.classList.toggle('map-theme-dark', themeName === 'dark');
      mapEl.classList.toggle('map-theme-streets', themeName === 'streets');
      mapEl.classList.toggle('map-theme-satellite', themeName === 'satellite');
    }
  }

  // Get custom HTML icon based on checkpoint type & status
  createCustomIcon(checkpoint) {
    const isCleared = checkpoint.status === 'cleared';
    const typeIcons = {
      alcohol: 'fa-wine-bottle',
      traffic: 'fa-user-shield',
      smoke: 'fa-smog',
      speed: 'fa-camera-retro',
      security: 'fa-shield-halved',
      weigh: 'fa-truck-front'
    };

    const iconClass = typeIcons[checkpoint.type] || 'fa-triangle-exclamation';
    const markerClass = isCleared ? 'cleared' : checkpoint.type;
    const pulseRing = !isCleared ? '<div class="marker-pulse"></div>' : '';

    const html = `
      <div class="custom-checkpoint-marker ${markerClass}">
        ${pulseRing}
        <div class="marker-pin">
          <i class="fa-solid ${iconClass}"></i>
        </div>
      </div>
    `;

    return L.divIcon({
      className: 'checkpoint-div-icon',
      html: html,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -22]
    });
  }

  renderCheckpoints(checkpoints, onMarkerClick) {
    this.markersGroup.clearLayers();

    checkpoints.forEach((cp) => {
      const marker = L.marker([cp.lat, cp.lng], {
        icon: this.createCustomIcon(cp),
        title: cp.title
      });

      // Calculate distance if user coords known
      let distanceText = '';
      if (this.userCoords) {
        const distKm = this.calculateDistance(this.userCoords.lat, this.userCoords.lng, cp.lat, cp.lng);
        distanceText = `<span class="popup-dist"><i class="fa-solid fa-location-arrow"></i> ${distKm < 1 ? Math.round(distKm * 1000) + ' ม.' : distKm.toFixed(1) + ' กม.'}</span>`;
      }

      const statusBadge = cp.status === 'active' 
        ? '<span class="status-tag active"><i class="fa-solid fa-circle-dot"></i> กำลังตั้งด่าน</span>'
        : '<span class="status-tag cleared"><i class="fa-solid fa-circle-check"></i> ยกเลิก/เคลียร์แล้ว</span>';

      const speedLimitTag = cp.type === 'speed'
        ? '<span style="background: rgba(6,182,212,0.2); color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700;">จำกัด 90 กม./ชม.</span>'
        : '';

      const popupContent = `
        <div class="map-popup-card">
          <div class="popup-header">
            <span class="popup-type ${cp.type}">${cp.typeLabel}</span>
            ${speedLimitTag}
            ${statusBadge}
          </div>
          <h3 class="popup-title">${cp.title}</h3>
          <p class="popup-loc"><i class="fa-solid fa-location-dot"></i> ${cp.locationName} (${cp.direction || 'ไม่ระบุฝั่ง'})</p>
          ${cp.description ? `<p class="popup-desc">${cp.description}</p>` : ''}
          <div class="popup-footer">
            ${distanceText}
            <div class="popup-votes">
              <span class="vote-tag up"><i class="fa-solid fa-thumbs-up"></i> ${cp.verifiedCount || 0}</span>
              <span class="vote-tag down"><i class="fa-solid fa-thumbs-down"></i> ${cp.clearedCount || 0}</span>
            </div>
          </div>
          <button class="popup-detail-btn" onclick="window.app.showCheckpointDetails('${cp.id}')">
            ดูรายละเอียด & ยืนยันสถานะ <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 320,
        className: 'custom-leaflet-popup'
      });

      marker.on('click', () => {
        if (onMarkerClick) onMarkerClick(cp);
      });

      this.markersGroup.addLayer(marker);
    });
  }

  // Set or update user's live GPS position with radar pulse effect
  setUserLocation(lat, lng, accuracy = 50, shouldPan = true) {
    this.userCoords = { lat, lng };

    if (!this.userLocationMarker) {
      const userIcon = L.divIcon({
        className: 'user-loc-div-icon',
        html: `
          <div class="user-loc-marker">
            <div class="user-loc-sonar"></div>
            <div class="user-loc-dot"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      this.userLocationMarker = L.marker([lat, lng], {
        icon: userIcon,
        zIndexOffset: 1000
      }).addTo(this.map);

      this.userLocationMarker.bindPopup(`
        <div class="user-popup">
          <b><i class="fa-solid fa-street-view"></i> ตำแหน่งปัจจุบันของคุณ</b>
          <p>พิกัด: ${lat.toFixed(5)}, ${lng.toFixed(5)}</p>
          <span class="radar-tag">รัศมีเรดาร์ตรวจจับ: ${(this.radarRadiusMeters / 1000).toFixed(0)} กม.</span>
        </div>
      `);
    } else {
      this.userLocationMarker.setLatLng([lat, lng]);
    }

    // Radar scanning perimeter circle
    if (!this.radarCircle) {
      this.radarCircle = L.circle([lat, lng], {
        radius: this.radarRadiusMeters,
        color: '#00f2fe',
        fillColor: '#00f2fe',
        fillOpacity: 0.06,
        weight: 1.5,
        dashArray: '6, 8',
        className: 'radar-perimeter-circle'
      }).addTo(this.map);
    } else {
      this.radarCircle.setLatLng([lat, lng]);
      this.radarCircle.setRadius(this.radarRadiusMeters);
    }

    if (shouldPan) {
      this.map.setView([lat, lng], Math.max(this.map.getZoom(), 13));
    }
  }

  setRadarRadius(meters) {
    this.radarRadiusMeters = meters;
    if (this.radarCircle && this.userCoords) {
      this.radarCircle.setRadius(meters);
    }
  }

  flyTo(lat, lng, zoom = 15) {
    if (this.map) {
      this.map.flyTo([lat, lng], zoom, {
        duration: 1.2,
        easeLinearity: 0.25
      });
    }
  }

  // Haversine formula to compute distance in Kilometers
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

window.mapManager = new MapManager();
