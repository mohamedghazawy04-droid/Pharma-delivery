import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { CourierProfile, Order, Pharmacy } from '../types';
import { formatDurationSeconds, calculateDistanceKm } from '../utils/geo';
import { store } from '../services/store';
import {
  Layers,
  Crosshair,
  Maximize2,
  Minimize2,
  Users,
  Compass,
} from 'lucide-react';

interface Props {
  pharmacy: Pharmacy;
  couriers: CourierProfile[];
  orders: Order[];
  selectedCourierId?: string;
  onSelectCourier?: (id: string) => void;
  className?: string;
}

// Distinct visual palettes so each courier is completely separated and distinguishable
export const COURIER_PALETTES = [
  { id: 0, name: 'أزرق ملكي', bg: '#2563eb', border: '#1d4ed8', hex: '#2563eb', text: '#ffffff', glow: 'rgba(37, 99, 235, 0.45)' },
  { id: 1, name: 'بنفسجي', bg: '#7c3aed', border: '#6d28d9', hex: '#7c3aed', text: '#ffffff', glow: 'rgba(124, 58, 237, 0.45)' },
  { id: 2, name: 'أخضر زمردي', bg: '#059669', border: '#047857', hex: '#059669', text: '#ffffff', glow: 'rgba(5, 150, 105, 0.45)' },
  { id: 3, name: 'عنبري دافئ', bg: '#d97706', border: '#b45309', hex: '#d97706', text: '#ffffff', glow: 'rgba(217, 119, 6, 0.45)' },
  { id: 4, name: 'قرمزي وردي', bg: '#e11d48', border: '#be123c', hex: '#e11d48', text: '#ffffff', glow: 'rgba(225, 29, 72, 0.45)' },
  { id: 5, name: 'سماوي بحري', bg: '#0891b2', border: '#0e7490', hex: '#0891b2', text: '#ffffff', glow: 'rgba(8, 145, 178, 0.45)' },
];

export function getCourierPalette(index: number) {
  return COURIER_PALETTES[index % COURIER_PALETTES.length];
}

export const LiveMap: React.FC<Props> = ({
  pharmacy,
  couriers,
  orders,
  selectedCourierId,
  onSelectCourier,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const streetTileLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteTileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = pharmacy?.coordinates?.lat || 29.97056;
      const initialLng = pharmacy?.coordinates?.lng || 30.89801;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 14,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomleft' }).addTo(map);

      // 1. Street layer (OpenStreetMap)
      const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);
      streetTileLayerRef.current = streetLayer;

      // 2. Satellite layer (Esri World Imagery)
      const satLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye',
          maxZoom: 19,
        }
      );
      satelliteTileLayerRef.current = satLayer;

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle Map Type Switching (Streets vs Satellite)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !streetTileLayerRef.current || !satelliteTileLayerRef.current) return;

    if (mapType === 'satellite') {
      if (map.hasLayer(streetTileLayerRef.current)) {
        map.removeLayer(streetTileLayerRef.current);
      }
      if (!map.hasLayer(satelliteTileLayerRef.current)) {
        satelliteTileLayerRef.current.addTo(map);
      }
    } else {
      if (map.hasLayer(satelliteTileLayerRef.current)) {
        map.removeLayer(satelliteTileLayerRef.current);
      }
      if (!map.hasLayer(streetTileLayerRef.current)) {
        streetTileLayerRef.current.addTo(map);
      }
    }
  }, [mapType]);

  // Center on Pharmacy
  const handleCenterPharmacy = () => {
    if (mapInstanceRef.current && pharmacy?.coordinates) {
      mapInstanceRef.current.flyTo(
        [pharmacy.coordinates.lat, pharmacy.coordinates.lng],
        15,
        { duration: 1.2 }
      );
    }
  };

  // Fit all couriers and pharmacy on screen
  const handleFitAll = () => {
    if (!mapInstanceRef.current) return;
    const points: [number, number][] = [];
    if (pharmacy?.coordinates) {
      points.push([pharmacy.coordinates.lat, pharmacy.coordinates.lng]);
    }
    couriers.forEach((c) => {
      if (c.isOnDuty && !c.shift.isEnded) {
        points.push([c.currentLocation.lat, c.currentLocation.lng]);
      }
    });

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 250);
  };

  // Update Markers whenever couriers, orders, or selected courier changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const pharmaLat = pharmacy?.coordinates?.lat || 29.97056;
    const pharmaLng = pharmacy?.coordinates?.lng || 30.89801;
    const pharmaAddress =
      pharmacy?.address ||
      'الجيزه ٦ اكتوبر الاتحاد التعاوني عماره ٦٢ بجوار مجمع المحاكم الحى ١١ صيدليه الديب';

    // 1. Pharmacy Base Marker (صيدليه الديب - مقر التوزيع الرئيسي)
    const pharmacyHtml = `
      <div class="relative flex flex-col items-center justify-center cursor-pointer group">
        <!-- Pulsing radar glow around pharmacy -->
        <div class="absolute w-14 h-14 rounded-full bg-emerald-500/25 animate-ping"></div>
        <div class="absolute w-12 h-12 rounded-full bg-emerald-500/30"></div>

        <div class="relative w-11 h-11 bg-gradient-to-tr from-emerald-700 to-teal-500 border-2 border-white text-white rounded-2xl shadow-2xl flex items-center justify-center text-xl transform group-hover:scale-110 transition">
          💊
        </div>

        <!-- Distinct permanent badge below pharmacy -->
        <div class="mt-1 bg-emerald-950/95 border border-emerald-400/50 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-lg whitespace-nowrap flex items-center gap-1">
          <span>🏥 ${pharmacy?.name || 'صيدليه الديب'}</span>
          <span class="text-emerald-300 text-[9px]">(المقر)</span>
        </div>
      </div>
    `;

    const pharmacyIcon = L.divIcon({
      className: 'custom-pharmacy-icon',
      html: pharmacyHtml,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const pharmacyMarker = L.marker([pharmaLat, pharmaLng], {
      icon: pharmacyIcon,
      zIndexOffset: 1000,
    });

    pharmacyMarker.bindPopup(`
      <div style="direction: rtl; text-align: right; font-family: 'Cairo', sans-serif; min-width: 260px; padding: 4px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <div style="background: #059669; color: white; width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
            💊
          </div>
          <div>
            <h4 style="font-weight: 800; font-size: 15px; margin: 0; color: #065f46;">${pharmacy?.name || 'صيدليه الديب'}</h4>
            <span style="font-size: 10px; color: #059669; font-weight: bold;">مقر انطلاق وتوزيع المناديب الرئيسي</span>
          </div>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 6px 8px; margin-bottom: 8px;">
          <div style="font-size: 11px; color: #166534; font-weight: 700; line-height: 1.5;">
            📍 ${pharmaAddress}
          </div>
        </div>
        <div style="font-size: 11px; color: #334155; margin-bottom: 4px;">
          هاتف الصيدلية: <strong style="font-family: monospace; direction: ltr; display: inline-block;">${pharmacy?.phone || '01000321253'}</strong>
        </div>
        <div style="font-size: 11px; color: #334155;">
          المسئول الصيدلي: <strong>${pharmacy?.pharmacistName || 'د.محمد'}</strong>
        </div>
        <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #64748b; font-family: monospace;">
          الإحداثيات: ${pharmaLat.toFixed(5)}, ${pharmaLng.toFixed(5)}
        </div>
      </div>
    `);
    pharmacyMarker.addTo(layer);

    // 2. Distinct Courier Markers with Individual Colors & Route Guidance
    couriers.forEach((courier, index) => {
      if (!courier.isOnDuty || courier.shift.isEnded) return;

      const palette = getCourierPalette(index);
      const isSelected = courier.id === selectedCourierId;
      const isAlerting = courier.isStoppageAlertActive;
      const isOffline = Boolean(courier.isOfflineAlertActive || courier.isInternetOnline === false);
      const isStationary = courier.currentLocation.isStationary;

      // Distance from pharmacy in km
      const distKm = calculateDistanceKm(
        pharmaLat,
        pharmaLng,
        courier.currentLocation.lat,
        courier.currentLocation.lng
      );

      // Vehicle emoji
      let vehicleEmoji = '🏍️';
      if (courier.vehicleType === 'سكوتر') vehicleEmoji = '🛵';
      if (courier.vehicleType === 'دراجة') vehicleEmoji = '🚲';
      if (courier.vehicleType === 'سيارة') vehicleEmoji = '🚗';

      // Status indicator ring
      let statusBorderColor = palette.border;
      if (isAlerting) statusBorderColor = '#ef4444';
      else if (isOffline) statusBorderColor = '#f97316';
      else if (isStationary) statusBorderColor = '#f59e0b';

      // Draw dashed connection line from pharmacy to courier with distance label
      const routeLine = L.polyline(
        [
          [pharmaLat, pharmaLng],
          [courier.currentLocation.lat, courier.currentLocation.lng],
        ],
        {
          color: isSelected ? palette.hex : '#94a3b8',
          weight: isSelected ? 3.5 : 1.8,
          dashArray: isSelected ? '6, 6' : '4, 8',
          opacity: isSelected ? 0.9 : 0.45,
        }
      );
      routeLine.bindTooltip(`${distKm} كم من الصيدلية`, {
        permanent: isSelected,
        direction: 'center',
        className: 'route-distance-tooltip',
      });
      routeLine.addTo(layer);

      // Draw GPS real accuracy circle if streaming real device GPS
      if (courier.currentLocation.isGpsLive) {
        const accuracyRadius = Math.max(12, courier.currentLocation.accuracy || 15);
        const accuracyCircle = L.circle(
          [courier.currentLocation.lat, courier.currentLocation.lng],
          {
            radius: accuracyRadius,
            color: palette.hex,
            fillColor: palette.hex,
            fillOpacity: isSelected ? 0.22 : 0.12,
            weight: 1.5,
            dashArray: '3, 4',
          }
        );
        accuracyCircle.addTo(layer);
      }

      // Courier Distinct Pin HTML
      const courierHtml = `
        <div class="relative flex flex-col items-center cursor-pointer group">
          <!-- Status Banner Top -->
          ${
            isAlerting
              ? `<div class="absolute -top-7 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg animate-bounce whitespace-nowrap">
                  🚨 متوقف (+5د)!
                </div>`
              : isOffline
              ? `<div class="absolute -top-7 bg-orange-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg animate-pulse whitespace-nowrap">
                  📶 نت مقطوع!
                </div>`
              : courier.currentLocation.isGpsLive
              ? `<div class="absolute -top-6 bg-emerald-700 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow flex items-center gap-0.5 whitespace-nowrap">
                  📡 GPS
                </div>`
              : ''
          }

          <!-- Main Pin Badge with Distinct Assigned Color -->
          <div class="relative w-11 h-11 rounded-2xl text-white shadow-2xl flex items-center justify-center text-lg border-2 border-white transition-all transform ${
            isSelected ? 'scale-125 ring-4 ring-indigo-500 shadow-indigo-500/50' : 'group-hover:scale-110'
          }" style="background-color: ${palette.bg}; box-shadow: 0 4px 14px ${palette.glow};">
            <span>${vehicleEmoji}</span>
            <span class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
              isAlerting
                ? 'bg-red-500 animate-ping'
                : isOffline
                ? 'bg-orange-500'
                : isStationary
                ? 'bg-amber-400'
                : 'bg-emerald-400'
            }"></span>
          </div>

          <!-- Permanent Name & Distance Tag (Separated visually) -->
          <div class="mt-1 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md whitespace-nowrap flex items-center gap-1 border border-white/20" style="background-color: ${palette.bg};">
            <span>${courier.name}</span>
            <span class="text-white/80 font-mono text-[9px]">(${distKm} كم)</span>
          </div>
        </div>
      `;

      const courierIcon = L.divIcon({
        className: `custom-courier-icon-${courier.id}`,
        html: courierHtml,
        iconSize: [44, 52],
        iconAnchor: [22, 26],
      });

      const marker = L.marker(
        [courier.currentLocation.lat, courier.currentLocation.lng],
        { icon: courierIcon, zIndexOffset: isSelected ? 500 : 100 }
      );

      marker.on('click', () => {
        if (onSelectCourier) {
          onSelectCourier(courier.id);
        }
      });

      const activeOrdersForCourier = orders.filter(
        (o) => o.courierId === courier.id && !o.isArchived && o.status !== 'delivered'
      );

      const popupContent = document.createElement('div');
      popupContent.style.direction = 'rtl';
      popupContent.style.textAlign = 'right';
      popupContent.style.fontFamily = "'Cairo', sans-serif";
      popupContent.style.minWidth = '260px';
      popupContent.innerHTML = `
        <div style="padding: 2px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 2px solid ${palette.hex};">
            <div>
              <strong style="font-size: 15px; color: #0f172a;">${courier.name}</strong>
              <span style="font-size: 10px; background: ${palette.bg}; color: white; padding: 1px 6px; border-radius: 9999px; margin-right: 4px; font-weight: bold;">
                مندوب #${index + 1}
              </span>
            </div>
            <span style="font-size: 11px; background: #f1f5f9; padding: 2px 6px; border-radius: 6px; font-weight: bold;">
              ${vehicleEmoji} ${courier.vehicleType}
            </span>
          </div>

          ${
            isOffline
              ? `<div style="background: #fff7ed; border: 1px solid #fdba74; color: #9a3412; font-size: 11px; font-weight: 800; padding: 5px 8px; border-radius: 8px; margin-bottom: 6px;">
                  ⚠️ إنذار: تم رصد انقطاع النت بالهاتف منذ ${Math.max(1, Math.floor((courier.offlineSeconds || 300) / 60))} دقائق!
                  <div style="margin-top: 4px;"><a href="tel:${courier.phone}" style="color: #047857; text-decoration: underline; font-weight: bold;">📞 اتصال بالمندوب: ${courier.phone}</a></div>
                </div>`
              : ''
          }

          ${
            isAlerting
              ? `<div style="background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b; font-size: 11px; font-weight: 800; padding: 5px 8px; border-radius: 8px; margin-bottom: 6px;">
                  🚨 إنذار توقف: المندوب متوقف منذ ${formatDurationSeconds(courier.currentLocation.stationarySeconds)}!
                </div>`
              : ''
          }

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 8px; margin-bottom: 8px; font-size: 11px;">
            <div style="color: #334155; margin-bottom: 3px;">
              📍 <strong>الموقع الحالي:</strong> ${courier.currentLocation.address}
            </div>
            <div style="color: #047857; font-weight: 800;">
              📏 <strong>المسافة من صيدلية الديب:</strong> ${distKm} كم
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 8px; font-size: 11px;">
            <div style="background: #f1f5f9; padding: 4px 6px; border-radius: 6px;">
              السرعة: <strong>${courier.currentLocation.speedKmH} كم/س</strong>
            </div>
            <div style="background: #f1f5f9; padding: 4px 6px; border-radius: 6px;">
              أوردرات جارية: <strong>${activeOrdersForCourier.length}</strong>
            </div>
          </div>

          <div style="font-size: 11px; margin-bottom: 8px; color: #047857; font-weight: 700;">
            💰 أرباح الشيفت (الحصالة): ${courier.shift.totalDeliveryEarnings} جنيه
          </div>

          <div style="display: flex; gap: 4px; margin-top: 6px;">
            <button id="move-btn-${courier.id}" style="flex: 1; padding: 5px 6px; background: #059669; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">
              🚀 تحريك
            </button>
            <button id="alert-btn-${courier.id}" style="flex: 1; padding: 5px 6px; background: #dc2626; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">
              ⚠️ فحص 5د
            </button>
            <a href="tel:${courier.phone}" style="padding: 5px 8px; background: #3b82f6; color: white; border-radius: 6px; font-size: 11px; font-weight: 700; text-decoration: none; display: flex; align-items: center; justify-content: center;">
              📞
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('popupopen', () => {
        const moveBtn = document.getElementById(`move-btn-${courier.id}`);
        const alertBtn = document.getElementById(`alert-btn-${courier.id}`);
        if (moveBtn) {
          moveBtn.onclick = () => store.simulateCourierMovement(courier.id);
        }
        if (alertBtn) {
          alertBtn.onclick = () => store.simulateStoppage(courier.id, 305);
        }
      });

      marker.addTo(layer);
    });

    // 3. Active Delivery Order Pins
    orders
      .filter((o) => !o.isArchived && o.status !== 'delivered' && o.status !== 'cancelled')
      .forEach((order, idx) => {
        const orderHtml = `
          <div class="relative flex items-center justify-center cursor-pointer">
            <div class="w-7 h-7 bg-indigo-600 border border-white text-white rounded-full shadow-lg flex items-center justify-center text-xs font-bold font-mono">
              📦
            </div>
            <div class="absolute -bottom-4 bg-slate-900 text-white text-[9px] font-mono px-1.5 py-0.2 rounded shadow whitespace-nowrap">
              ${order.orderNumber}
            </div>
          </div>
        `;
        const orderIcon = L.divIcon({
          className: 'custom-order-icon',
          html: orderHtml,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        // Place marker around pharmacy based on order index
        const angle = (idx * 45 * Math.PI) / 180;
        const lat = pharmaLat + Math.sin(angle) * 0.005;
        const lng = pharmaLng + Math.cos(angle) * 0.005;

        const orderMarker = L.marker([lat, lng], {
          icon: orderIcon,
        });

        orderMarker.bindPopup(`
          <div style="direction: rtl; text-align: right; font-family: 'Cairo', sans-serif; min-width: 190px;">
            <div style="font-weight: 800; font-size: 13px; color: #4338ca; margin-bottom: 2px;">
              أوردر ${order.orderNumber} (${order.orderValue} ج)
            </div>
            <div style="font-size: 11px; color: #047857; font-weight: 700;">عمولة التوصيل: ${order.deliveryFee} جنيه</div>
            <div style="font-size: 10px; color: #475569; margin-top: 4px;">طريقة الدفع: ${
              order.paymentMethod === 'cash' ? '💵 نقدي' : order.paymentMethod === 'visa' ? '💳 فيزا' : '⚡ انستاباي'
            }</div>
            ${order.quickNote ? `<div style="font-size: 10px; color: #64748b; margin-top: 2px;">ملاحظة: ${order.quickNote}</div>` : ''}
          </div>
        `);
        orderMarker.addTo(layer);
      });
  }, [pharmacy, couriers, orders, selectedCourierId, onSelectCourier]);

  // Center on selected courier if selected
  useEffect(() => {
    if (selectedCourierId && mapInstanceRef.current) {
      const courier = couriers.find((c) => c.id === selectedCourierId);
      if (courier) {
        mapInstanceRef.current.flyTo(
          [courier.currentLocation.lat, courier.currentLocation.lng],
          15,
          { duration: 1 }
        );
      }
    }
  }, [selectedCourierId, couriers]);

  return (
    <div
      className={`relative w-full rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none h-screen w-screen'
          : className || 'h-[420px] sm:h-[500px] lg:h-[580px]'
      }`}
    >
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Map Control Bar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-md border border-slate-200">
        <button
          onClick={handleCenterPharmacy}
          title="التركيز على مقر صيدليه الديب (الحي 11 مجمع المحاكم)"
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-xs"
        >
          <span>🏥 مقر الصيدلية</span>
        </button>

        <button
          onClick={handleFitAll}
          title="عرض جميع المناديب والصيدلية معاً في إطار واحد"
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition"
        >
          <Users className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden sm:inline">إظهار الكل ({couriers.length})</span>
          <span className="sm:hidden">الكل</span>
        </button>

        <button
          onClick={() => setMapType(mapType === 'streets' ? 'satellite' : 'streets')}
          title="التبديل بين خريطة الشوارع والأقمار الصناعية"
          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition"
        >
          <Layers className="w-3.5 h-3.5 text-slate-600" />
          <span className="hidden md:inline">
            {mapType === 'streets' ? '🛰️ قمر صناعي' : '🗺️ شوارع'}
          </span>
        </button>

        <button
          onClick={toggleFullscreen}
          title="ملء الشاشة"
          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Pharmacy Address Mini Badge on Map (Bottom-Right) */}
      <div className="absolute bottom-3 right-3 z-10 max-w-[360px] hidden sm:block bg-slate-900/95 text-white backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-xl border border-slate-700 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-emerald-400 mb-0.5">
          <span className="text-sm">🏥</span>
          <span className="font-black text-[12px]">صيدليه الديب - 6 أكتوبر</span>
        </div>
        <p className="text-[10px] text-slate-300 leading-normal font-medium">
          الجيزه ٦ اكتوبر الاتحاد التعاوني عماره ٦٢ بجوار مجمع المحاكم الحى ١١ صيدليه الديب
        </p>
      </div>

      {/* Map Legend Overlay (Top-Right) */}
      <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-md p-2.5 rounded-2xl shadow-md border border-slate-200 text-xs space-y-1.5 max-w-[210px] hidden sm:block">
        <div className="font-extrabold text-slate-800 text-[11px] border-b border-slate-100 pb-1 flex items-center justify-between">
          <span>دليل تتبع المناديب</span>
          <span className="text-[10px] text-indigo-600 font-mono">({couriers.length} مندوب)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-700 text-[11px]">
          <span>💊</span>
          <span className="font-bold">مقر صيدليه الديب</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600 text-[11px]">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
          <span>حركة نشطة (مباشر)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600 text-[11px]">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
          <span>توقف مؤقت</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600 text-[11px]">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block animate-ping"></span>
          <span className="font-bold text-red-600">إنذار توقف (5 دقائق)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600 text-[11px]">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
          <span className="font-bold text-orange-600">انقطاع الإنترنت بالهاتف</span>
        </div>
      </div>
    </div>
  );
};
