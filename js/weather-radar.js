// Real-time Rain Cloud Radar & Highway Flood Hazard Warning Engine
// Integrates RainViewer Open Weather Doppler Radar & Highway Department (1586) Flooding Blackspots
class WeatherRadarManager {
  constructor() {
    this.radarLayer = null;
    this.hazardLayer = L.layerGroup();
    this.isVisible = false;
    this.floodHazardSpots = [
      {
        id: "flood-01",
        title: "จุดเสี่ยงน้ำท่วมขัง ทล.32 (สายเอเชีย) พระนครศรีอยุธยา",
        location: "ทล.32 สายเอเชีย กม.18-24 อ.บางปะอิน",
        type: "flood_risk",
        desc: "บริเวณผิวจราจรลุ่มต่ำ น้ำระบายช้าช่วงฝนตกหนัก",
        lat: 14.3012,
        lng: 100.5821,
        severity: "medium"
      },
      {
        id: "flood-02",
        title: "จุดเสี่ยงน้ำท่วม ทางลอดแยกรัชวิภา - วิภาวดีรังสิต",
        location: "ถ.วิภาวดีรังสิต หน้าวัดเสมียนนารี",
        type: "tunnel_flood",
        desc: "อุโมงค์ทางลอดระบายน้ำ หากฝนตกเกิน 60 มม. เสี่ยงน้ำท่วมขังสูง",
        lat: 13.8341,
        lng: 100.5512,
        severity: "high"
      },
      {
        id: "flood-03",
        title: "จุดเสี่ยงดินสไลด์และน้ำป่า ทล.304 เขาโทน (นาดี - วังน้ำเขียว)",
        location: "ทล.304 กม.195-200 รอยต่อปราจีนบุรี - นครราชสีมา",
        type: "landslide_rain",
        desc: "ทางลงเขาสูงชันและโค้งคดเคี้ยว ผิวถนนลื่นมากช่วงฝนตกชุก",
        lat: 14.3821,
        lng: 101.9123,
        severity: "critical"
      },
      {
        id: "flood-04",
        title: "จุดเสี่ยงน้ำป่าไหลหลาก ทล.4 เพชรเกษม (สะพานวังยาว บางสะพาน)",
        location: "ทล.4 กม.385 บางสะพาน จ.ประจวบคีรีขันธ์",
        type: "flood_risk",
        desc: "จุดรับน้ำเทือกเขาตะนาวศรี เสี่ยงน้ำหลากท่วมคอสะพาน",
        lat: 11.2145,
        lng: 99.4932,
        severity: "high"
      },
      {
        id: "flood-05",
        title: "จุดเสี่ยงน้ำท่วมผิวจราจร วารินชำราบ - เมืองอุบลราชธานี",
        location: "ทล.24 สะพานเสรีประชาธิปไตย ข้ามแม่น้ำมูล",
        type: "flood_risk",
        desc: "ระดับน้ำแม่น้ำมูลสูงช่วงมรสุม ผิวจราจรคอสะพานท่วมขัง",
        lat: 15.2012,
        lng: 104.8589,
        severity: "high"
      }
    ];
    this.init();
  }

  init(map = null) {
    this.bindButtons();
    document.addEventListener('DOMContentLoaded', () => {
      this.bindButtons();
    });
  }

  bindButtons() {
    const toggleBtn = document.getElementById('btn-toggle-weather');
    if (toggleBtn && !toggleBtn._bound) {
      toggleBtn._bound = true;
      toggleBtn.addEventListener('click', async () => {
        const targetMap = window.mapManager ? window.mapManager.map : null;
        const active = await this.toggleWeather(targetMap);
        toggleBtn.classList.toggle('active', active);
        if (window.app) {
          window.app.showToast(active ? '🌧️ เปิดเรดาร์ตรวจจับฝนสด & จุดเสี่ยงน้ำท่วมทางหลวง' : 'ปิดเรดาร์สภาพอากาศ', 'info');
        }
      });
    }
  }

  async toggleWeather(map) {
    if (!map) return false;
    this.isVisible = !this.isVisible;

    if (this.isVisible) {
      // 1. Fetch live rain cloud radar layer from RainViewer
      try {
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await res.json();
        if (data.radar && data.radar.past && data.radar.past.length > 0) {
          const latest = data.radar.past[data.radar.past.length - 1];
          const tileUrl = `${data.host}${latest.path}/512/{z}/{x}/{y}/2/1_1.png`;
          
          if (this.radarLayer) {
            map.removeLayer(this.radarLayer);
          }
          this.radarLayer = L.tileLayer(tileUrl, {
            opacity: 0.65,
            zIndex: 400,
            attribution: '&copy; <a href="https://www.rainviewer.com/" target="_blank">RainViewer</a>'
          });
          this.radarLayer.addTo(map);
        }
      } catch (e) {
        console.warn('RainViewer load failed:', e);
      }

      // 2. Render Highway Flood Hazard Markers
      this.renderFloodHazards(map);
      this.hazardLayer.addTo(map);

      // Voice alert announcement
      if (window.voiceManager) {
        window.voiceManager.speak('เปิดเรดาร์สภาพอากาศและจุดเสี่ยงน้ำท่วมผิวจราจรแล้วค่ะ ช่วงฝนตกโปรดลดความเร็วและเปิดไฟหน้ารถนะคะ');
      }
    } else {
      if (this.radarLayer) {
        map.removeLayer(this.radarLayer);
      }
      map.removeLayer(this.hazardLayer);
    }

    return this.isVisible;
  }

  renderFloodHazards(map) {
    this.hazardLayer.clearLayers();

    this.floodHazardSpots.forEach(spot => {
      const floodIcon = L.divIcon({
        className: 'custom-flood-icon',
        html: `
          <div style="background: #3b82f6; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 13px; box-shadow: 0 0 14px rgba(59, 130, 246, 0.8); border: 2px solid #93c5fd; animation: beacon-glow 1.8s infinite;">
            <i class="fa-solid fa-cloud-showers-heavy"></i>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      const marker = L.marker([spot.lat, spot.lng], { icon: floodIcon });
      const popup = `
        <div style="font-family: 'Prompt', sans-serif; min-width: 230px; color: #fff; padding: 4px;">
          <div style="font-size: 10px; color: #60a5fa; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">
            <i class="fa-solid fa-triangle-exclamation"></i> จุดเสี่ยงน้ำท่วมขังผิวทางหลวง (1586)
          </div>
          <div style="font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 4px;">${spot.title}</div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px;">📍 ${spot.location}</div>
          <div style="font-size: 11px; color: #e2e8f0; line-height: 1.4; background: rgba(59,130,246,0.15); border-left: 3px solid #3b82f6; padding: 5px 8px; border-radius: 4px; margin-bottom: 6px;">
            🌧️ ${spot.desc}
          </div>
          <div style="font-size: 11px; color: #f59e0b; font-weight: 600;">
            <i class="fa-solid fa-phone"></i> แจ้งน้ำท่วมทางหลวง โทร 1586
          </div>
        </div>
      `;
      marker.bindPopup(popup);
      this.hazardLayer.addLayer(marker);
    });
  }
}

window.weatherRadarManager = new WeatherRadarManager();
