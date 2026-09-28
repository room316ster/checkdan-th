// Route Planning & Checkpoint Collision Detection Engine for CheckDan Thailand
class RouteManager {
  constructor() {
    this.routeLayer = null;
    this.routeGlowLayer = null;
    this.startMarker = null;
    this.endMarker = null;
    this.activeRoute = null;
    this.detectedCheckpointsOnRoute = [];
    this.isRoutingActive = false;
  }

  // Calculate route between Origin (lat, lng) and Destination (lat, lng)
  async calculateRoute(origin, dest, checkpoints) {
    console.log(`Calculating route from [${origin.lat}, ${origin.lng}] to [${dest.lat}, ${dest.lng}]...`);
    
    let routeGeoJson = null;
    let distanceKm = 0;
    let durationMin = 0;

    // 1. Try fetching real driving route from public OSRM service
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson&steps=false`;
      const res = await fetch(osrmUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const primary = data.routes[0];
          routeGeoJson = primary.geometry.coordinates; // Array of [lng, lat]
          distanceKm = primary.distance / 1000;
          durationMin = primary.duration / 60;
        }
      }
    } catch (err) {
      console.warn('OSRM service failed or unreachable, generating fallback highway curve:', err);
    }

    // Fallback highway curve if OSRM is offline
    if (!routeGeoJson) {
      const fallback = this.generateFallbackRoute(origin, dest);
      routeGeoJson = fallback.coordinates;
      distanceKm = fallback.distanceKm;
      durationMin = (distanceKm / 75) * 60; // Assume 75 km/h avg speed
    }

    // Convert coordinates to Leaflet lat/lng format [[lat, lng], ...]
    const latLngs = routeGeoJson.map(coord => [coord[1], coord[0]]);

    // 2. Detect checkpoints lying within highway proximity buffer of the route
    const detected = this.detectCheckpointsAlongRoute(latLngs, checkpoints, 2.5); // 2.5 km tolerance

    this.activeRoute = {
      origin,
      dest,
      latLngs,
      distanceKm,
      durationMin,
      detectedCheckpoints: detected
    };

    this.isRoutingActive = true;
    return this.activeRoute;
  }

  // Detect checkpoints that fall within thresholdKm of any route segment
  detectCheckpointsAlongRoute(routeLatLngs, checkpoints, thresholdKm = 2.5) {
    const onRouteList = [];

    checkpoints.forEach(cp => {
      let minDistanceToRoute = Infinity;
      let closestSegmentIndex = 0;

      // Sample route segments (step by 2-3 for performance if route is long)
      const step = Math.max(1, Math.floor(routeLatLngs.length / 250));

      for (let i = 0; i < routeLatLngs.length - step; i += step) {
        const p1 = routeLatLngs[i];
        const p2 = routeLatLngs[i + step];
        const dist = this.distancePointToSegment(cp.lat, cp.lng, p1[0], p1[1], p2[0], p2[1]);
        if (dist < minDistanceToRoute) {
          minDistanceToRoute = dist;
          closestSegmentIndex = i;
        }
      }

      if (minDistanceToRoute <= thresholdKm) {
        onRouteList.push({
          ...cp,
          distanceFromRouteKm: minDistanceToRoute,
          routeProgressPercent: (closestSegmentIndex / routeLatLngs.length) * 100
        });
      }
    });

    // Sort checkpoints in order of appearance along the journey (from start to finish)
    onRouteList.sort((a, b) => a.routeProgressPercent - b.routeProgressPercent);
    return onRouteList;
  }

  // Draw Route Polyline on Leaflet Map
  drawRouteOnMap(map) {
    this.clearRoute(map);
    if (!this.activeRoute) return;

    const latLngs = this.activeRoute.latLngs;

    // Glowing outer shadow line
    this.routeGlowLayer = L.polyline(latLngs, {
      color: '#00f2fe',
      weight: 10,
      opacity: 0.35,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Main vibrant cyan highway line
    this.routeLayer = L.polyline(latLngs, {
      color: '#00e5ff',
      weight: 4.5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Start Pin (Green)
    const startIcon = L.divIcon({
      className: 'route-flag-icon start',
      html: '<div class="route-flag start"><i class="fa-solid fa-play"></i></div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    this.startMarker = L.marker(latLngs[0], { icon: startIcon, zIndexOffset: 2000 })
      .bindPopup('<b>จุดเริ่มต้นเส้นทาง</b>')
      .addTo(map);

    // End Pin (Checkered/Red)
    const endIcon = L.divIcon({
      className: 'route-flag-icon end',
      html: '<div class="route-flag end"><i class="fa-solid fa-flag-checkered"></i></div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    this.endMarker = L.marker(latLngs[latLngs.length - 1], { icon: endIcon, zIndexOffset: 2000 })
      .bindPopup('<b>จุดหมายปลายทาง</b>')
      .addTo(map);

    // Fit map bounds to encompass entire route
    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }

  clearRoute(map) {
    if (this.routeLayer && map) {
      map.removeLayer(this.routeLayer);
      this.routeLayer = null;
    }
    if (this.routeGlowLayer && map) {
      map.removeLayer(this.routeGlowLayer);
      this.routeGlowLayer = null;
    }
    if (this.startMarker && map) {
      map.removeLayer(this.startMarker);
      this.startMarker = null;
    }
    if (this.endMarker && map) {
      map.removeLayer(this.endMarker);
      this.endMarker = null;
    }
    this.activeRoute = null;
    this.isRoutingActive = false;
  }

  // Calculate perpendicular distance from point to segment (in km)
  distancePointToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return window.mapManager.calculateDistance(px, py, x1, y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * (x2 - x1);
    const projY = y1 + t * (y2 - y1);
    return window.mapManager.calculateDistance(px, py, projX, projY);
  }

  // Fallback route generator if offline
  generateFallbackRoute(origin, dest) {
    const points = [];
    const steps = 30;
    const directDist = window.mapManager.calculateDistance(origin.lat, origin.lng, dest.lat, dest.lng);

    for (let i = 0; i <= steps; i++) {
      const frac = i / steps;
      // Slight natural curvature
      const arc = Math.sin(frac * Math.PI) * (directDist * 0.05 / 111);
      const lat = origin.lat + (dest.lat - origin.lat) * frac + arc * 0.5;
      const lng = origin.lng + (dest.lng - origin.lng) * frac + arc;
      points.push([lng, lat]);
    }

    return {
      coordinates: points,
      distanceKm: directDist * 1.18 // Highway tortuosity factor
    };
  }

  formatDuration(min) {
    const hours = Math.floor(min / 60);
    const mins = Math.round(min % 60);
    if (hours > 0) {
      return `${hours} ชั่วโมง ${mins > 0 ? `${mins} นาที` : ''}`;
    }
    return `${mins} นาที`;
  }
}

window.routeManager = new RouteManager();
