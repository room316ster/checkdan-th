// Accident Blackspots & Dangerous Curves Manager for CheckDan Thailand
class BlackspotManager {
  constructor() {
    this.blackspots = [];
    this.markersGroup = null;
    this.layerVisible = true;
  }

  async init(map) {
    this.markersGroup = L.layerGroup().addTo(map);
    await this.loadBlackspots();
    this.renderMarkers();
  }

  async loadBlackspots() {
    try {
      const res = await fetch('data/blackspots.json');
      if (res.ok) {
        this.blackspots = await res.json();
      }
    } catch (e) {
      console.warn('Failed to load blackspots.json, using fallback:', e);
      this.blackspots = [];
    }
  }

  toggleLayer(map) {
    this.layerVisible = !this.layerVisible;
    if (this.layerVisible) {
      this.markersGroup.addTo(map);
    } else {
      map.removeLayer(this.markersGroup);
    }
    return this.layerVisible;
  }

  createBlackspotIcon(spot) {
    const isCritical = spot.severity === 'critical';
    const iconClass = spot.hazardType === 'sharp_curve' ? 'fa-bezier-curve' : (spot.hazardType === 'steep_hill' ? 'fa-mountain' : 'fa-triangle-exclamation');

    const html = `
      <div class="custom-blackspot-marker ${isCritical ? 'critical' : 'warning'}">
        <div class="blackspot-pulse"></div>
        <div class="blackspot-pin">
          <i class="fa-solid ${iconClass}"></i>
        </div>
      </div>
    `;

    return L.divIcon({
      className: 'blackspot-div-icon',
      html: html,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -20]
    });
  }

  renderMarkers() {
    if (!this.markersGroup) return;
    this.markersGroup.clearLayers();

    this.blackspots.forEach((spot) => {
      const marker = L.marker([spot.lat, spot.lng], {
        icon: this.createBlackspotIcon(spot),
        title: spot.title
      });

      const popupHtml = `
        <div class="map-popup-card blackspot-popup">
          <div class="popup-header">
            <span class="popup-type blackspot"><i class="fa-solid fa-triangle-exclamation"></i> จุดเสี่ยงอุบัติเหตุ</span>
            <span class="status-tag danger">จำกัด ${spot.speedLimit} กม./ชม.</span>
          </div>
          <div class="popup-title">${spot.title}</div>
          <div class="popup-loc"><i class="fa-solid fa-location-dot"></i> ${spot.locationName} (${spot.province})</div>
          <div class="popup-desc">${spot.warningText}</div>
          <button class="popup-detail-btn" onclick="window.app.startNavigationToCoords(${spot.lat}, ${spot.lng}, '${spot.title}')">
            <i class="fa-solid fa-diamond-turn-right"></i> นำทางไปจุดนี้
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, { className: 'custom-leaflet-popup', maxWidth: 320 });
      this.markersGroup.addLayer(marker);
    });
  }

  // Check proximity to any blackspot
  checkBlackspotsProximity(userCoords, thresholdKm = 1.5) {
    if (!userCoords) return null;

    let nearest = null;
    let minDistance = Infinity;

    this.blackspots.forEach((spot) => {
      const dist = window.mapManager.calculateDistance(userCoords.lat, userCoords.lng, spot.lat, spot.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = { ...spot, distanceKm: dist };
      }
    });

    if (nearest && nearest.distanceKm <= thresholdKm) {
      return nearest;
    }
    return null;
  }
}

window.blackspotManager = new BlackspotManager();
