// Highway Rest Areas, Gas Stations & EV Fast Charging Hubs for CheckDan Thailand
window.HIGHWAY_SERVICES = [
  {
    id: "srv-01",
    name: "จุดพักรถมอเตอร์เวย์ M7 บางปะกง (กม.50)",
    brand: "PTT Station & Rest Area",
    type: "rest_ev",
    typeLabel: "จุดพักรถ & ชาร์จ EV 24 ชม.",
    highway: "มอเตอร์เวย์ สาย 7 (กม.49-50)",
    lat: 13.5435,
    lng: 100.9912,
    evCharger: "EV Station PluZ (DC 160 kW 6 หัวชาร์จ)",
    facilities: ["ร้านอาหาร 24 ชม.", "ห้องน้ำคนพิการ/ครอบครัว", "7-Eleven", "Cafe Amazon", "จุดปฐมพยาบาล"],
    contact: "สายด่วนมอเตอร์เวย์ 1586 กด 7",
    color: "#06b6d4"
  },
  {
    id: "srv-02",
    name: "PTT Station วังน้อย & จุดบริการตำรวจทางหลวง (กม.55)",
    brand: "PTT Station + ตำรวจทางหลวง",
    type: "rest_police",
    typeLabel: "ปั๊มน้ำมัน & หน่วยบริการทางหลวง",
    highway: "ถ.พหลโยธิน ขาออก (มุ่งหน้าสระบุรี/โคราช)",
    lat: 14.2312,
    lng: 100.7123,
    evCharger: "EV Station PluZ (DC 120 kW)",
    facilities: ["หน่วยบริการประชาชนตำรวจทางหลวง 24 ชม.", "ห้องน้ำสะอาด", "ที่จอดพักนอนหลับ", "ช่างตรวจเช็กรถเบื้องต้น"],
    contact: "ตำรวจทางหลวง 1193",
    color: "#3b82f6"
  },
  {
    id: "srv-03",
    name: "PTT Station ลำตะคอง มิตรภาพ (กม.85)",
    brand: "PTT Station & จุดชมวิว",
    type: "rest_ev",
    typeLabel: "จุดพักรถลำตะคอง & ชาร์จ EV",
    highway: "ถ.มิตรภาพ ขาเข้าโคราช (ริมเขื่อนลำตะคอง)",
    lat: 14.8624,
    lng: 101.5431,
    evCharger: "PEA Volta & EV Station PluZ (DC 150 kW)",
    facilities: ["จุดชมวิวเขื่อนลำตะคอง", "ร้านอาหาร/ของฝาก", "ห้องน้ำวิวธรรมชาติ", "กาแฟอเมซอน"],
    contact: "สายด่วนกรมทางหลวง 1586",
    color: "#10b981"
  },
  {
    id: "srv-04",
    name: "PTT Station แก่งคอย สระบุรี (กม.18)",
    brand: "PTT Station",
    type: "gas_ev",
    typeLabel: "ปั๊มน้ำมัน & ชาร์จด่วน EV",
    highway: "ถ.มิตรภาพ ขาออกสระบุรี",
    lat: 14.5823,
    lng: 100.9982,
    evCharger: "EV Station PluZ (DC 120 kW)",
    facilities: ["7-Eleven", "ตู้เติมลมยางอัตโนมัติ", "ร้านปะยาง 24 ชม.", "ศูนย์อาหาร"],
    contact: "036-245-123",
    color: "#f59e0b"
  },
  {
    id: "srv-05",
    name: "PTT Mega Station ถ.แจ้งสนิท อ.เมือง จ.อุบลราชธานี",
    brand: "PTT Station อุบลราชธานี",
    type: "gas_ev",
    typeLabel: "ปั๊มใหญ่ & ชาร์จด่วน EV (อ.เมือง อุบลฯ)",
    highway: "ทล.23 (ถ.แจ้งสนิท) หน้า มรภ.อุบลฯ",
    lat: 15.2475,
    lng: 104.8420,
    evCharger: "EV Station PluZ (DC 120 kW 4 ช่อง)",
    facilities: ["Cafe Amazon", "7-Eleven", "ศูนย์ตรวจเช็กรถ Fit Auto", "ห้องน้ำมาตรฐานสากล"],
    contact: "045-281-222",
    color: "#06b6d4"
  },
  {
    id: "srv-06",
    name: "จุดพักรถ & ชาร์จ EV ชะอำ ทล.4 เพชรเกษม (กม.168)",
    brand: "Bangchak Green Serv",
    type: "gas_ev",
    typeLabel: "ปั๊มบางจาก & PEA Volta (ลงใต้)",
    highway: "ถ.เพชรเกษม ขาลงใต้ มุ่งหน้าหัวหิน",
    lat: 12.8021,
    lng: 99.9634,
    evCharger: "PEA Volta Ultra Fast (DC 160 kW)",
    facilities: ["Inthanin Coffee", "ร้านสะดวกซื้อ", "จุดบริการเปลี่ยนยาง", "ห้องน้ำติดแอร์"],
    contact: "สายด่วนทางหลวง 1586",
    color: "#10b981"
  },
  {
    id: "srv-07",
    name: "หน่วยบริการประชาชนตำรวจทางหลวงทับสะแก (กม.365)",
    brand: "ตำรวจทางหลวง 24 ชม.",
    type: "rest_police",
    typeLabel: "จุดพักรถตำรวจทางหลวงฟรี 24 ชม.",
    highway: "ถ.เพชรเกษม ทับสะแก ประจวบคีรีขันธ์",
    lat: 11.5012,
    lng: 99.6241,
    evCharger: "จุดชาร์จชะลอรถฉุกเฉิน",
    facilities: ["ห้องพักผ่อนติดแอร์ฟรีสำหรับคนขับง่วง", "น้ำดื่ม/กาแฟฟรี", "ห้องน้ำคนพิการ", "สายตรวจฉุกเฉิน 24 ชม."],
    contact: "ตำรวจทางหลวง 1193",
    color: "#3b82f6"
  },
  {
    id: "srv-08",
    name: "PTT Station สารภี เชียงใหม่ ซูเปอร์ไฮเวย์ (กม.540)",
    brand: "PTT Station เชียงใหม่",
    type: "gas_ev",
    typeLabel: "ปั๊มซูเปอร์ไฮเวย์ & ชาร์จ EV (เชียงใหม่)",
    highway: "ทล.11 ซูเปอร์ไฮเวย์ สารภี-เชียงใหม่",
    lat: 18.7214,
    lng: 99.0345,
    evCharger: "EV Station PluZ (DC 120 kW)",
    facilities: ["ศูนย์อาหารภาคเหนือ", "ของฝากเชียงใหม่", "Fit Auto", "ร้านสะดวกซื้อ"],
    contact: "053-123-456",
    color: "#06b6d4"
  }
];

class HighwayServiceManager {
  constructor() {
    this.services = window.HIGHWAY_SERVICES || [];
    this.layerGroup = L.layerGroup();
    this.isVisible = true;
    this.init();
  }

  init(map = null) {
    const targetMap = map || (window.mapManager ? window.mapManager.map : null);
    if (targetMap && this.layerGroup.getLayers().length === 0) {
      this.renderMarkers(targetMap);
      this.layerGroup.addTo(targetMap);
      this.isVisible = true;
    }

    this.bindButtons();
    document.addEventListener('DOMContentLoaded', () => this.bindButtons());
  }

  bindButtons() {
    const toggleBtn = document.getElementById('btn-toggle-services');
    if (toggleBtn && !toggleBtn._bound) {
      toggleBtn._bound = true;
      toggleBtn.classList.toggle('active', this.isVisible);
      toggleBtn.addEventListener('click', () => {
        const targetMap = window.mapManager ? window.mapManager.map : null;
        const active = this.toggleLayer(targetMap);
        toggleBtn.classList.toggle('active', active);
        if (window.app) {
          window.app.showToast(active ? '⛽ แสดงจุดพักรถ ปั๊มน้ำมัน & จุดชาร์จ EV ทางหลวง' : 'ซ่อนจุดพักรถและปั๊มน้ำมัน', 'info');
        }
      });
    }
  }

  toggleLayer(map) {
    if (!map) return false;
    this.isVisible = !this.isVisible;

    if (this.isVisible) {
      this.renderMarkers(map);
      this.layerGroup.addTo(map);
    } else {
      map.removeLayer(this.layerGroup);
    }
    return this.isVisible;
  }

  renderMarkers(map) {
    this.layerGroup.clearLayers();

    this.services.forEach(srv => {
      // Pick icon based on type
      let iconHtml = '<i class="fa-solid fa-gas-pump"></i>';
      let iconBg = '#10b981';
      if (srv.type === 'rest_ev' || srv.type === 'gas_ev') {
        iconHtml = '<i class="fa-solid fa-charging-station"></i>';
        iconBg = '#06b6d4';
      } else if (srv.type === 'rest_police') {
        iconHtml = '<i class="fa-solid fa-shield-halved"></i>';
        iconBg = '#3b82f6';
      }

      const customIcon = L.divIcon({
        className: 'custom-service-icon',
        html: `
          <div style="background: ${iconBg}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 14px; box-shadow: 0 4px 12px ${iconBg}80; border: 2px solid #fff;">
            ${iconHtml}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([srv.lat, srv.lng], { icon: customIcon });

      const popupContent = `
        <div style="font-family: 'Prompt', sans-serif; min-width: 240px; color: #fff; padding: 4px;">
          <div style="font-size: 10px; color: ${srv.color}; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">
            <i class="fa-solid fa-road"></i> ${srv.typeLabel}
          </div>
          <div style="font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 4px;">${srv.name}</div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px;">📍 ${srv.highway}</div>
          
          <div style="background: rgba(6,182,212,0.15); border-left: 3px solid #06b6d4; padding: 5px 8px; font-size: 11px; border-radius: 4px; margin-bottom: 6px; color: #38bdf8;">
            ⚡ <b>ชาร์จ EV:</b> ${srv.evCharger}
          </div>

          <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 8px;">
            🛠️ <b>สิ่งอำนวยความสะดวก:</b> ${srv.facilities.join(', ')}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
            <a href="tel:${srv.contact.replace(/[^0-9]/g, '')}" style="color: #f59e0b; font-size: 11px; text-decoration: none; font-weight: 600;">
              <i class="fa-solid fa-phone"></i> ${srv.contact}
            </a>
            <button onclick="window.mapManager.map.flyTo([${srv.lat}, ${srv.lng}], 16); window.app.showToast('🎯 ปักหมุดนำทาง: ${srv.name}', 'success');" style="background: #06b6d4; color: #000; border: none; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; cursor: pointer;">
              <i class="fa-solid fa-location-arrow"></i> ปักหมุด
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      this.layerGroup.addLayer(marker);
    });
  }
}

window.highwayServiceManager = new HighwayServiceManager();
