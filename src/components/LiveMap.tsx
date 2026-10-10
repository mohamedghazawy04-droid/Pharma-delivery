import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { CourierProfile, Order, Pharmacy } from '../types';
import { formatDurationSeconds } from '../utils/geo';
import { store } from '../services/store';

interface Props {
  pharmacy: Pharmacy;
  couriers: CourierProfile[];
  orders: Order[];
  selectedCourierId?: string;
  onSelectCourier?: (id: string) => void;
}

export const LiveMap: React.FC<Props> = ({
  pharmacy,
  couriers,
  orders,
  selectedCourierId,
  onSelectCourier,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [pharmacy.coordinates.lat, pharmacy.coordinates.lng],
        zoom: 14,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomleft' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

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

  // Update Markers whenever couriers, orders, or selected courier changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    // 1. Pharmacy Marker
    const pharmacyHtml = `
      <div class="relative flex items-center justify-center">
        <div class="w-10 h-10 bg-emerald-600 border-2 border-white text-white rounded-2xl shadow-xl flex items-center justify-center font-bold text-lg">
          🏥
        </div>
        <div class="absolute -bottom-5 bg-emerald-950/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
          ${pharmacy.name}
        </div>
      </div>
    `;
    const pharmacyIcon = L.divIcon({
      className: 'custom-pharmacy-icon',
      html: pharmacyHtml,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const pharmacyMarker = L.marker(
      [pharmacy.coordinates.lat, pharmacy.coordinates.lng],
      { icon: pharmacyIcon }
    );
    pharmacyMarker.bindPopup(`
      <div style="direction: rtl; text-align: right; font-family: Cairo, sans-serif; min-width: 200px;">
        <h4 style="font-weight: 800; font-size: 14px; margin-bottom: 4px; color: #047857;">${pharmacy.name}</h4>
        <p style="font-size: 11px; color: #4b5563; margin-bottom: 6px;">${pharmacy.address}</p>
        <div style="font-size: 11px; font-weight: 700; color: #1e293b;">هاتف: ${pharmacy.phone}</div>
      </div>
    `);
    pharmacyMarker.addTo(layer);

    // 2. Couriers Markers
    couriers.forEach((courier) => {
      if (!courier.isOnDuty || courier.shift.isEnded) return;

      const isSelected = courier.id === selectedCourierId;
      const isAlerting = courier.isStoppageAlertActive;
      const isOffline = Boolean(courier.isOfflineAlertActive || courier.isInternetOnline === false);
      const isStationary = courier.currentLocation.isStationary;

      // Status color
      let ringColor = 'border-emerald-500 bg-emerald-600';
      let statusEmoji = '🏍️';
      if (courier.vehicleType === 'سكوتر') statusEmoji = '🛵';
      if (courier.vehicleType === 'دراجة') statusEmoji = '🚲';
      if (courier.vehicleType === 'سيارة') statusEmoji = '🚗';

      if (isAlerting) {
        ringColor = 'border-red-500 bg-red-600 animate-ping';
      } else if (isOffline) {
        ringColor = 'border-orange-500 bg-orange-600 animate-pulse';
      } else if (isStationary) {
        ringColor = 'border-amber-400 bg-amber-500';
      }

      // Draw GPS real accuracy circle if streaming real device GPS
      if (courier.currentLocation.isGpsLive) {
        const accuracyRadius = Math.max(12, courier.currentLocation.accuracy || 20);
        const accuracyCircle = L.circle(
          [courier.currentLocation.lat, courier.currentLocation.lng],
          {
            radius: accuracyRadius,
            color: isOffline ? '#f97316' : '#10b981',
            fillColor: isOffline ? '#f97316' : '#10b981',
            fillOpacity: 0.15,
            weight: 1.5,
            dashArray: '4, 4',
          }
        );
        accuracyCircle.addTo(layer);
      }

      const courierHtml = `
        <div class="relative flex flex-col items-center cursor-pointer group">
          ${
            isAlerting
              ? `<div class="absolute -top-6 bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow animate-bounce">
                  🚨 متوقف!
                </div>`
              : isOffline
              ? `<div class="absolute -top-6 bg-orange-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow animate-pulse">
                  📶 انقطاع النت!
                </div>`
              : courier.currentLocation.isGpsLive
              ? `<div class="absolute -top-5 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shadow flex items-center gap-0.5">
                  📡 GPS
                </div>`
              : ''
          }
          <div class="w-10 h-10 rounded-2xl ${ringColor} border-2 border-white text-white shadow-xl flex items-center justify-center text-lg ${
        isSelected ? 'ring-4 ring-indigo-500 scale-110' : ''
      }">
            <span>${statusEmoji}</span>
          </div>
          <div class="mt-1 bg-slate-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
            ${courier.name.split(' ')[0]}
          </div>
        </div>
      `;

      const courierIcon = L.divIcon({
        className: 'custom-courier-icon',
        html: courierHtml,
        iconSize: [40, 48],
        iconAnchor: [20, 24],
      });

      const marker = L.marker(
        [courier.currentLocation.lat, courier.currentLocation.lng],
        { icon: courierIcon }
      );

      marker.on('click', () => {
        if (onSelectCourier) {
          onSelectCourier(courier.id);
        }
      });

      const popupContent = document.createElement('div');
      popupContent.style.direction = 'rtl';
      popupContent.style.textAlign = 'right';
      popupContent.style.fontFamily = 'Cairo, sans-serif';
      popupContent.style.minWidth = '230px';
      popupContent.innerHTML = `
        <div style="padding: 2px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <strong style="font-size: 14px; color: #0f172a;">${courier.name}</strong>
            <span style="font-size: 11px; background: #f1f5f9; padding: 2px 6px; border-radius: 6px;">${courier.vehicleType}</span>
          </div>
          ${
            isOffline
              ? `<div style="background: #fff7ed; border: 1px solid #fdba74; color: #9a3412; font-size: 11px; font-weight: 800; padding: 4px 8px; border-radius: 6px; margin-bottom: 6px;">
                  ⚠️ إنذار: تم رصد انقطاع الاتصال بالإنترنت بالهاتف منذ ${Math.floor((courier.offlineSeconds || 300) / 60)} دقائق!
                  <div style="margin-top: 4px;"><a href="tel:${courier.phone}" style="color: #047857; text-decoration: underline; font-weight: bold;">📞 اتصال بالمندوب: ${courier.phone}</a></div>
                </div>`
              : ''
          }
          ${
            courier.currentLocation.isGpsLive
              ? `<div style="background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 6px; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
                  📡 بث GPS حقيقي مباشر (دقة ±${courier.currentLocation.accuracy || 5}م)
                </div>`
              : ''
          }
          <p style="font-size: 11px; color: #64748b; margin-bottom: 4px;">📍 ${courier.currentLocation.address}</p>
          <div style="font-size: 10px; font-family: monospace; color: #6366f1; margin-bottom: 6px; direction: ltr; text-align: left;">
            ${courier.currentLocation.lat.toFixed(6)}, ${courier.currentLocation.lng.toFixed(6)}
          </div>
          <div style="font-size: 11px; margin-bottom: 4px;">
            الحالة: <strong>${
              isOffline
                ? '📶 انقطاع الإنترنت بالهاتف'
                : isStationary
                ? '⏸️ متوقف'
                : '🟢 يتحرك بسرعة ' + courier.currentLocation.speedKmH + ' كم/س'
            }</strong>
          </div>
          ${
            isStationary && !isOffline
              ? `<div style="font-size: 11px; color: ${isAlerting ? '#dc2626' : '#d97706'}; font-weight: 700; margin-bottom: 8px;">
                  مدة التوقف: ${formatDurationSeconds(courier.currentLocation.stationarySeconds)}
                </div>`
              : ''
          }
          <div style="font-size: 11px; margin-bottom: 8px; color: #047857;">
            💰 أرباح الشيفت: <strong>${courier.shift.totalDeliveryEarnings} جنيه</strong>
          </div>
          <div style="display: flex; gap: 4px; margin-top: 8px;">
            <button id="move-btn-${courier.id}" style="flex: 1; padding: 4px 8px; background: #10b981; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">
              🚀 تحريك
            </button>
            <button id="alert-btn-${courier.id}" style="flex: 1; padding: 4px 8px; background: #ef4444; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">
              ⚠️ فحص 5 د
            </button>
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

    // 3. Active Delivery Order Pins (optional pins near pharmacy)
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

        // Place marker around pharmacy
        const angle = (idx * 45 * Math.PI) / 180;
        const lat = pharmacy.coordinates.lat + Math.sin(angle) * 0.006;
        const lng = pharmacy.coordinates.lng + Math.cos(angle) * 0.006;

        const orderMarker = L.marker([lat, lng], {
          icon: orderIcon,
        });

        orderMarker.bindPopup(`
          <div style="direction: rtl; text-align: right; font-family: Cairo, sans-serif; min-width: 180px;">
            <div style="font-weight: 800; font-size: 13px; color: #4338ca; margin-bottom: 2px;">
              أوردر ${order.orderNumber} (${order.orderValue} ج)
            </div>
            <div style="font-size: 11px; color: #047857; font-weight: 700;">عمولة التوصيل: ${order.deliveryFee} جنيه</div>
            <div style="font-size: 10px; color: #475569; margin-top: 4px;">طريقة الدفع: ${order.paymentMethod === 'cash' ? '💵 نقدي' : order.paymentMethod === 'visa' ? '💳 فيزا' : '⚡ انستاباي'}</div>
            ${order.quickNote ? `<div style="font-size: 10px; color: #64748b; margin-top: 2px;">ملاحظة: ${order.quickNote}</div>` : ''}
          </div>
        `);
        orderMarker.addTo(layer);
      });
  }, [pharmacy, couriers, orders, selectedCourierId, onSelectCourier]);

  // Center on selected courier if provided
  useEffect(() => {
    if (selectedCourierId && mapInstanceRef.current) {
      const courier = couriers.find((c) => c.id === selectedCourierId);
      if (courier) {
        mapInstanceRef.current.panTo([
          courier.currentLocation.lat,
          courier.currentLocation.lng,
        ]);
      }
    }
  }, [selectedCourierId, couriers]);

  return (
    <div className="relative w-full h-[400px] sm:h-[480px] rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Map Legend Overlay */}
      <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-md p-2.5 rounded-2xl shadow-md border border-slate-200 text-xs space-y-1.5 max-w-[200px]">
        <div className="font-bold text-slate-800 text-[11px] border-b border-slate-100 pb-1">
          دليل الخريطة الحية
        </div>
        <div className="flex items-center gap-2 text-slate-600 text-[11px]">
          <span>🏥</span>
          <span>موقع الصيدلية</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600 text-[11px]">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
          <span>مندوب يتحرك</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600 text-[11px]">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
          <span>مندوب متوقف</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600 text-[11px]">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block animate-ping"></span>
          <span>إنذار توقف (5 دقائق)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600 text-[11px]">
          <span>📦</span>
          <span>عنوان تسليم أوردر</span>
        </div>
      </div>
    </div>
  );
};
