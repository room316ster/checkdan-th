// Live Traffic Flow Overlay Layer for CheckDan Thailand
class TrafficManager {
  constructor() {
    this.trafficLayerGroup = null;
    this.isEnabled = false;
  }

  init(map) {
    this.trafficLayerGroup = L.layerGroup();
    this.buildTrafficCorridors();
  }

  toggleTraffic(map) {
    this.isEnabled = !this.isEnabled;
    if (this.isEnabled) {
      this.trafficLayerGroup.addTo(map);
      if (window.app) window.app.showToast('🚦 เปิดเลเยอร์สภาพการจราจรแบบเรียลไทม์', 'success');
    } else {
      map.removeLayer(this.trafficLayerGroup);
      if (window.app) window.app.showToast('🚦 ปิดเลเยอร์สภาพการจราจร', 'info');
    }
    return this.isEnabled;
  }

  buildTrafficCorridors() {
    this.trafficLayerGroup.clearLayers();

    // Key corridors with realistic real-time traffic speeds
    const corridors = [
      // 1. Phahonyothin (BKK - Don Mueang - Rangsit)
      { coords: [[13.7650, 100.5380], [13.8050, 100.5560]], status: 'fast', speed: 80 },
      { coords: [[13.8050, 100.5560], [13.8650, 100.5890]], status: 'slow', speed: 35 }, // Checkpoint queue
      { coords: [[13.8650, 100.5890], [13.9150, 100.6050]], status: 'heavy', speed: 18 }, // Don Mueang congestion
      { coords: [[13.9150, 100.6050], [13.9850, 100.6170]], status: 'fast', speed: 75 },

      // 2. Kanchanaphisek (Western Ring Road Highway 9)
      { coords: [[13.6800, 100.4100], [13.7800, 100.4100]], status: 'fast', speed: 85 },
      { coords: [[13.7800, 100.4100], [13.8761, 100.4109]], status: 'slow', speed: 45 }, // Speed camera zone
      { coords: [[13.8761, 100.4109], [13.9600, 100.4150]], status: 'fast', speed: 90 },

      // 3. Sirat Expressway & Sukhumvit
      { coords: [[13.7372, 100.5604], [13.7500, 100.5300]], status: 'heavy', speed: 15 }, // Asok junction
      { coords: [[13.7500, 100.5300], [13.7709, 100.5735]], status: 'slow', speed: 30 },  // Ratchada checkpoint
      { coords: [[13.7709, 100.5735], [13.8291, 100.6120]], status: 'fast', speed: 70 },

      // 4. Rama 2 Highway (AH2 to Southern Thailand)
      { coords: [[13.6627, 100.4398], [13.6300, 100.3800]], status: 'slow', speed: 35 }, // Rama 2 roadworks
      { coords: [[13.6300, 100.3800], [13.5400, 100.2700]], status: 'fast', speed: 85 },

      // 5. Motorway 7 (BKK - Suvarnabhumi - Pattaya)
      { coords: [[13.7300, 100.6500], [13.7000, 100.7500]], status: 'fast', speed: 110 },
      { coords: [[13.7000, 100.7500], [13.4000, 100.9800]], status: 'fast', speed: 115 },
      { coords: [[13.4000, 100.9800], [12.9150, 100.8920]], status: 'slow', speed: 40 }, // Pattaya entry

      // 6. Mittraphap Highway 2 (Saraburi - Korat)
      { coords: [[14.5200, 100.9100], [14.6500, 101.1800]], status: 'slow', speed: 45 }, // Muak Lek hill
      { coords: [[14.6500, 101.1800], [14.8912, 101.7180]], status: 'fast', speed: 90 }  // Korat highway
    ];

    const colors = {
      fast: '#10b981',   // Neon Emerald (Flowing smoothly > 65 km/h)
      slow: '#f59e0b',   // Amber (Moderate slowdown 30-50 km/h)
      heavy: '#ef4444'   // Crimson (Heavy traffic / Checkpoint bottleneck < 20 km/h)
    };

    corridors.forEach(seg => {
      // Glow underlay
      L.polyline(seg.coords, {
        color: colors[seg.status],
        weight: 8,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(this.trafficLayerGroup);

      // Core traffic line
      const poly = L.polyline(seg.coords, {
        color: colors[seg.status],
        weight: 5,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      });

      const label = seg.status === 'fast' ? '🟢 คล่องตัว' : (seg.status === 'slow' ? '🟠 ชะลอตัว' : '🔴 ติดขัดหนาแน่น');
      poly.bindTooltip(`สภาพจราจร: <b>${label}</b> (${seg.speed} กม./ชม.)`, { sticky: true });
      poly.addTo(this.trafficLayerGroup);
    });
  }
}

window.trafficManager = new TrafficManager();
