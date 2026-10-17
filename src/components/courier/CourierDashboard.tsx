import React, { useState, useEffect, useRef } from 'react';
import {
  Coins,
  Package,
  Bike,
  MapPin,
  Clock,
  Phone,
  CheckCircle,
  AlertTriangle,
  Navigation,
  Compass,
  Check,
  Building2,
  Radio,
  Satellite,
  Gauge,
  Crosshair,
  WifiOff,
  FileText,
  RefreshCw,
  Download,
  BellRing,
} from 'lucide-react';
import { CourierProfile, Order, Pharmacy, OrderType } from '../../types';
import { store, normalizePhone } from '../../services/store';
import { LiveMap } from '../LiveMap';
import { InstallAppBanner } from '../InstallAppBanner';
import {
  formatDurationSeconds,
  fetchRealAddressFromCoords,
  formatCoordinates,
} from '../../utils/geo';
import { playStoppageBellSound, playCoinSound, requestNotificationPermission } from '../../utils/audio';
import { exportDailyOrdersToPdf } from '../../services/pdfExportService';

interface Props {
  courier: CourierProfile;
  orders: Order[];
  pharmacy: Pharmacy;
  allCouriers: CourierProfile[];
  onOpenPiggyBankModal: () => void;
}

export const CourierDashboard: React.FC<Props> = ({
  courier,
  orders,
  pharmacy,
  allCouriers,
  onOpenPiggyBankModal,
}) => {
  const [gpsActive, setGpsActive] = useState(true);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'history' | 'map'>('orders');
  const [isDeviceOnline, setIsDeviceOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);
  const [newOrderBanner, setNewOrderBanner] = useState<string | null>(null);
  const [ordersScope, setOrdersScope] = useState<'mine' | 'pharmacy'>('mine');

  // Normalize courier phone for foolproof order matching (supports Arabic digits & ASCII)
  const normCourierPhone = normalizePhone(courier.phone);

  // Robust order matching: By courier.id OR courier.phone OR courier.name OR fallback if sole courier
  const isOrderForThisCourier = (o: Order) => {
    if (o.courierId === courier.id) return true;
    if (normCourierPhone) {
      if (o.courierPhone && normalizePhone(o.courierPhone) === normCourierPhone) return true;
      if (o.courierId && normalizePhone(o.courierId) === normCourierPhone) return true;
      if (o.courierId === `courier-${normCourierPhone}`) return true;
    }
    if (o.courierName && courier.name && o.courierName.trim().toLowerCase() === courier.name.trim().toLowerCase()) return true;
    // If only 1 courier in this pharmacy and order belongs to this pharmacy
    if (allCouriers.length <= 1 && o.pharmacyId === pharmacy.id) return true;
    // If only 1 courier is currently on duty in this pharmacy
    const onDuty = allCouriers.filter((c) => c.isOnDuty);
    if (onDuty.length === 1 && onDuty[0].id === courier.id && o.pharmacyId === pharmacy.id) return true;
    return false;
  };

  // Filter and sort active unarchived orders assigned to this courier sequentially (#1, #2, #3, ...)
  const courierActiveOrders = orders
    .filter((o) => !o.isArchived && isOrderForThisCourier(o))
    .sort((a, b) => {
      const numA = parseInt(a.orderNumber.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.orderNumber.replace(/\D/g, '')) || 0;
      return numA - numB;
    });

  // All active unarchived orders for this pharmacy (to let courier view or claim any order)
  const pharmacyActiveOrders = orders
    .filter((o) => !o.isArchived && o.pharmacyId === pharmacy.id)
    .sort((a, b) => {
      const numA = parseInt(a.orderNumber.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.orderNumber.replace(/\D/g, '')) || 0;
      return numA - numB;
    });

  // Complete Daily Orders Log (all orders assigned to this courier today)
  const courierDailyOrders = orders
    .filter((o) => isOrderForThisCourier(o))
    .sort((a, b) => {
      const numA = parseInt(a.orderNumber.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.orderNumber.replace(/\D/g, '')) || 0;
      return numA - numB;
    });

  const pendingOrders = courierActiveOrders.filter(
    (o) => o.status !== 'delivered' && o.status !== 'cancelled'
  );

  const prevActiveCount = useRef(courierActiveOrders.length);
  const prevPharmacyCount = useRef(pharmacyActiveOrders.length);

  // Fast background polling every 1.5s so orders assigned by pharmacist appear immediately on mobile
  useEffect(() => {
    store.fetchCloudData();
    const pollTimer = setInterval(() => {
      store.fetchCloudData();
    }, 1500);
    return () => clearInterval(pollTimer);
  }, [courier.id]);

  // Audio & banner chime when pharmacist adds a new order
  useEffect(() => {
    if (courierActiveOrders.length > prevActiveCount.current) {
      const added = courierActiveOrders.length - prevActiveCount.current;
      playCoinSound();
      setNewOrderBanner(`🔔 وصلك (${added}) أوردر جديد تم إسناده لك من الصيدلية الآن!`);
      setTimeout(() => setNewOrderBanner(null), 9000);
    } else if (pharmacyActiveOrders.length > prevPharmacyCount.current) {
      const added = pharmacyActiveOrders.length - prevPharmacyCount.current;
      playCoinSound();
      setNewOrderBanner(`🔔 تم إضافة (${added}) أوردر جديد بالصيدلية! اضغط للمشاهدة أو الاستلام.`);
      setTimeout(() => setNewOrderBanner(null), 9000);
    }
    prevActiveCount.current = courierActiveOrders.length;
    prevPharmacyCount.current = pharmacyActiveOrders.length;
  }, [courierActiveOrders.length, pharmacyActiveOrders.length]);

  const isAlerting = courier.isStoppageAlertActive;
  const isStationary = courier.currentLocation.isStationary;

  // 1. Send immediate heartbeat on mount and keep periodic pulse every 15s
  useEffect(() => {
    store.sendCourierHeartbeat(courier.id, navigator.onLine);
    const interval = setInterval(() => {
      store.sendCourierHeartbeat(courier.id, navigator.onLine);
    }, 15000);

    const handleOnline = () => {
      setIsDeviceOnline(true);
      store.setCourierInternetStatus(courier.id, true);
    };
    const handleOffline = () => {
      setIsDeviceOnline(false);
      store.setCourierInternetStatus(courier.id, false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [courier.id]);

  // 2. Instant initial GPS fix on screen open
  useEffect(() => {
    if ('geolocation' in navigator) {
      requestNotificationPermission();
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          setGpsError(null);
          let realAddr = courier.currentLocation.address;
          try {
            realAddr = await fetchRealAddressFromCoords(
              pos.coords.latitude,
              pos.coords.longitude
            );
          } catch (e) {}

          store.updateCourierGPS(
            courier.id,
            pos.coords.latitude,
            pos.coords.longitude,
            pos.coords.speed,
            pos.coords.accuracy,
            pos.coords.heading,
            pos.coords.altitude,
            realAddr
          );
        },
        (err) => {
          console.warn('Initial GPS fetch error:', err);
          if (err.code === 1) {
            setGpsError('يرجى السماح بصلاحية الموقع (GPS) من المتصفح لبث موقعك الحقيقي للصيدلية.');
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, [courier.id]);

  // 3. Real device continuous GPS watchPosition with high accuracy and reverse geocoding
  useEffect(() => {
    let watchId: number | null = null;
    if (gpsActive && 'geolocation' in navigator) {
      requestNotificationPermission();
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          setGpsError(null);
          let realAddr = courier.currentLocation.address;
          try {
            realAddr = await fetchRealAddressFromCoords(
              pos.coords.latitude,
              pos.coords.longitude
            );
          } catch (e) {
            // fallback
          }

          store.updateCourierGPS(
            courier.id,
            pos.coords.latitude,
            pos.coords.longitude,
            pos.coords.speed,
            pos.coords.accuracy,
            pos.coords.heading,
            pos.coords.altitude,
            realAddr
          );
        },
        (err) => {
          console.warn('GPS watch error:', err);
          if (err.code === 1) {
            setGpsError('تم رفض إذن الوصول للموقع. يرجى تفعيل إذن الـ Location من إعدادات المتصفح.');
          } else if (err.code === 2) {
            setGpsError('تعذر تحديد موقع الجهاز عبر الأقمار الصناعية حالياً.');
          } else {
            setGpsError('انتهت مهلة استجابة إشارة GPS.');
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 }
      );
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [gpsActive, courier.id]);

  const handleToggleGPS = () => {
    if (!gpsActive) {
      if ('geolocation' in navigator) {
        requestNotificationPermission();
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            setGpsError(null);
            setGpsActive(true);
            let realAddr = courier.currentLocation.address;
            try {
              realAddr = await fetchRealAddressFromCoords(
                pos.coords.latitude,
                pos.coords.longitude
              );
            } catch (e) {}

            store.updateCourierGPS(
              courier.id,
              pos.coords.latitude,
              pos.coords.longitude,
              pos.coords.speed,
              pos.coords.accuracy,
              pos.coords.heading,
              pos.coords.altitude,
              realAddr
            );
          },
          (err) => {
            setGpsError('تعذر الوصول للـ GPS: ' + err.message);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        setGpsError('المتصفح لا يدعم خاصية تحديد الموقع الجغرافي GPS');
      }
    } else {
      setGpsActive(false);
    }
  };

  const handleUpdateStatus = (orderId: string, nextStatus: Order['status']) => {
    store.updateOrderStatus(orderId, nextStatus);
  };

  const handleClaimOrder = (orderId: string) => {
    store.updateOrder(orderId, {
      courierId: courier.id,
      deliveryFee: courier.deliveryFeePerOrder || 7,
    });
    playCoinSound();
    setNewOrderBanner(`✅ تم استتحواذ الأوردر وإسناده لكابتن ${courier.name} بنجاح!`);
    setTimeout(() => setNewOrderBanner(null), 6000);
  };

  return (
    <div className="space-y-6">
      {/* 1-Click Mobile App Installation Banner */}
      <InstallAppBanner
        variant="banner"
        title="تثبيت تطبيق فارما ديليفري على هاتفك بضغطة زر 📲"
      />

      {/* Quick Courier Selector Bar for Mobile & All Devices */}
      {allCouriers.length > 1 && (
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-3">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Bike className="w-4 h-4 text-indigo-600" />
              <span>تبديل حساب الكابتن على هذا الجهاز ({allCouriers.length} كباتن مسجلين):</span>
            </span>
            <span className="text-[11px] text-slate-500">
              اضغط على اسمك لعرض الأوردرات المسندة لك فوراً
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {allCouriers.map((c) => {
              const isSelected = c.id === courier.id;
              const cNorm = normalizePhone(c.phone);
              const pendingCount = orders.filter(
                (o) =>
                  !o.isArchived &&
                  (o.courierId === c.id ||
                    (cNorm && o.courierPhone && normalizePhone(o.courierPhone) === cNorm) ||
                    (o.courierName && o.courierName.trim().toLowerCase() === c.name.trim().toLowerCase())) &&
                  o.status !== 'delivered'
              ).length;

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => store.setCurrentCourier(c.id)}
                  className={`p-3.5 rounded-2xl border text-right transition flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-indigo-50/90 border-indigo-500 shadow-xs ring-2 ring-indigo-500/30'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">
                      {c.vehicleType === 'دراجة' ? '🚲' : '🏍️'}
                    </span>
                    <div className="truncate">
                      <strong className={`block text-xs font-extrabold truncate ${isSelected ? 'text-indigo-950 font-black' : 'text-slate-800'}`}>
                        كابتن {c.name}
                      </strong>
                      <span className="text-[11px] font-mono text-slate-500 block mt-0.5">
                        {c.phone}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    {pendingCount > 0 ? (
                      <span className="px-2.5 py-1 bg-red-600 text-white rounded-full text-[11px] font-black animate-pulse shadow-2xs">
                        {pendingCount} أوردر
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded-md text-[10px] font-bold">
                        0 أوردر
                      </span>
                    )}
                    {isSelected && (
                      <span className="text-indigo-600 text-sm font-black mr-1">✓</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Offline Alert Banner (حفظ كامل للبيانات بدون إنترنت) */}
      {!isDeviceOnline && (
        <div className="p-4 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white rounded-3xl flex items-center gap-3.5 shadow-lg border-2 border-amber-400 animate-pulse">
          <div className="p-2.5 bg-white/20 rounded-2xl shrink-0">
            <WifiOff className="w-6 h-6 text-white" />
          </div>
          <div>
            <strong className="text-sm block font-black">
              أنت حالياً في وضع عدم الاتصال (بدون إنترنت)
            </strong>
            <p className="text-xs text-amber-100 mt-0.5">
              جميع بياناتك وأوردراتك وحصالتك (والـ 7 جنيه المضافة لكل أوردر تمام) محفوظة ومؤمنة بالكامل على هاتفك ولن تتأثر بإغلاق الموبايل أو إعادة تشغيله.
            </p>
          </div>
        </div>
      )}

      {/* Real-time Order Assignment Notification Banner */}
      {newOrderBanner && (
        <div className="p-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-3xl flex items-center justify-between gap-3 shadow-xl border-2 border-emerald-300 animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl animate-bounce shrink-0">
              <BellRing className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <strong className="text-sm block font-black">{newOrderBanner}</strong>
              <p className="text-xs text-emerald-100 mt-0.5">
                قام الصيدلي بإسناد هذا الأوردر لك للتو. يظهر الأوردر في جدول أوردراتك الحالية أدناه.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveTab('orders');
              setNewOrderBanner(null);
            }}
            className="px-4 py-2 bg-white text-emerald-900 rounded-xl text-xs font-black hover:bg-emerald-50 transition shadow-xs shrink-0"
          >
            مشاهدة الأوردر الآن 👀
          </button>
        </div>
      )}

      {/* Identity & Pharmacy Association */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl shadow-sm">
              {courier.vehicleType === 'دراجة' ? '🚲' : '🏍️'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900">
                  كابتن {courier.name}
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                  {courier.isOnDuty ? 'في الشيفت نشط' : 'خارج الشيفت'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>الصيدلية التابع لها: <strong className="text-slate-800">{pharmacy.name}</strong></span>
                <span>·</span>
                <span>مركبة: <strong className="text-slate-700">{courier.vehicleType} ({courier.vehicleNumber})</strong></span>
                <span>·</span>
                <span>هاتف: <strong className="text-slate-700 font-mono">{courier.phone}</strong></span>
              </p>
            </div>
          </div>

          {/* Quick Real Test Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => store.simulateCourierMovement(courier.id)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
              title="تحريك المندوب واستئناف الحركة"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>تحريك موقعي 🚀</span>
            </button>

            <button
              onClick={() => store.simulateStoppage(courier.id, 605)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition"
              title="تجربة رنين جرس إنذار التوقف 10 دقائق فوراً"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>فحص إنذار التوقف 10د 🔔</span>
            </button>

            <button
              onClick={() => store.simulateOffline(courier.id, 10)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition"
              title="تجربة رنين إنذار انقطاع النت 10 دقائق فوراً"
            >
              <Radio className="w-3.5 h-3.5 text-amber-600" />
              <span>فحص إنذار غلق النت 10د 📶</span>
            </button>

            <button
              onClick={handleToggleGPS}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-bold transition ${
                gpsActive
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{gpsActive ? 'GPS نشط من الهاتف' : 'تفعيل GPS الجهاز'}</span>
            </button>
          </div>
        </div>

        {/* GPS Error Notification if any */}
        {gpsError && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{gpsError}</span>
            </div>
            <button
              onClick={handleToggleGPS}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shrink-0"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Live GPS Satellite Telemetry Panel */}
        <div className="mt-4 p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center">
                <Satellite className="w-4 h-4 text-indigo-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-extrabold text-white">
                    نظام تتبع الـ GPS الفعلي للمندوب
                  </h3>
                  {courier.currentLocation.isGpsLive ? (
                    <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>متصل بالأقمار الصناعية (بث حقيقي)</span>
                    </span>
                  ) : (
                    <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      غير متصل بالأقمار
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  تحديد الموقع الجغرافي الفعلي من حساسات الهاتف ورصد توقف الـ 5 دقائق الحقيقي
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleGPS}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                gpsActive
                  ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{gpsActive ? 'إيقاف بث الـ GPS' : 'تشغيل الـ GPS الفعلي الآن'}</span>
            </button>
          </div>

          {/* Telemetry Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-3">
            <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50">
              <span className="text-[10px] text-slate-400 font-semibold block flex items-center gap-1">
                <Crosshair className="w-3 h-3 text-indigo-400" />
                الإحداثيات الحقيقية
              </span>
              <strong className="text-xs font-mono text-indigo-300 block mt-1 tracking-tight">
                {formatCoordinates(courier.currentLocation.lat, courier.currentLocation.lng)}
              </strong>
            </div>

            <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50">
              <span className="text-[10px] text-slate-400 font-semibold block flex items-center gap-1">
                <Radio className="w-3 h-3 text-emerald-400" />
                دقة إشارة الأقمار
              </span>
              <strong className="text-xs font-mono text-emerald-300 block mt-1">
                ±{courier.currentLocation.accuracy || 5} متر (دقة عالية)
              </strong>
            </div>

            <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50">
              <span className="text-[10px] text-slate-400 font-semibold block flex items-center gap-1">
                <Gauge className="w-3 h-3 text-amber-400" />
                السرعة اللحظية
              </span>
              <strong className="text-xs font-mono text-amber-300 block mt-1">
                {courier.currentLocation.speedKmH} كم/س
              </strong>
            </div>

            <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50">
              <span className="text-[10px] text-slate-400 font-semibold block flex items-center gap-1">
                <Clock className="w-3 h-3 text-sky-400" />
                حالة التوقف الفعلي
              </span>
              <strong
                className={`text-xs block mt-1 font-bold ${
                  courier.currentLocation.isStationary ? 'text-amber-300' : 'text-emerald-300'
                }`}
              >
                {courier.currentLocation.isStationary
                  ? `متوقف (${formatDurationSeconds(courier.currentLocation.stationarySeconds)})`
                  : 'حركة نشطة مستمرة'}
              </strong>
            </div>
          </div>
        </div>

        {/* Live Stoppage Real Counter Bar */}
        <div
          className={`mt-4 p-3.5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            isAlerting
              ? 'bg-red-50 border-red-300 text-red-900 animate-pulse'
              : isStationary
              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isAlerting ? (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 animate-bounce" />
            ) : isStationary ? (
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
            ) : (
              <Navigation className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
            <div>
              <span className="text-xs font-extrabold block">
                {isAlerting
                  ? '⚠️ إنذار حقيقي: أنت متوقف منذ أكثر من 5 دقائق متواصلة!'
                  : isStationary
                  ? 'رصد توقف حقيقي للمركبة'
                  : 'أنت في حركة نشطة وتوصيل'}
              </span>
              <p className="text-[11px] opacity-80 mt-0.5">
                الموقع: {courier.currentLocation.address} · السرعة: {courier.currentLocation.speedKmH} كم/س
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-xs font-mono font-bold">
              <span>مدة التوقف: </span>
              <span className="text-sm font-extrabold underline">
                {formatDurationSeconds(courier.currentLocation.stationarySeconds)}
              </span>
              <span className="text-[10px] text-slate-500 block">
                (الإنذار ينطلق عند 10 دقائق)
              </span>
            </div>

            {isAlerting && (
              <button
                onClick={() => store.simulateCourierMovement(courier.id)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs"
              >
                استئناف الحركة الآن
              </button>
            )}
          </div>
        </div>
      </div>

      {/* The Live Piggy Bank / Wallet Card */}
      <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 rounded-3xl p-6 text-white shadow-lg shadow-amber-900/10 relative overflow-hidden">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-yellow-300/20 rounded-full blur-xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              onClick={onOpenPiggyBankModal}
              className="w-18 h-18 bg-white rounded-3xl shadow-xl flex items-center justify-center cursor-pointer group hover:scale-105 transition border-4 border-amber-200 shrink-0"
              title="اضغط لعرض تفاصيل الحصالة بالكامل"
            >
              <Coins className="w-9 h-9 text-amber-500 group-hover:rotate-12 transition-transform" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold">حصالة ومحفظة الكابتن</h2>
                <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">
                  عمولة: {courier.deliveryFeePerOrder} ج لكل أوردر
                </span>
              </div>
              <p className="text-xs text-amber-100 mt-1">
                تضاف <strong>{courier.deliveryFeePerOrder} جنيه</strong> فوراً لحصالتك مع كل أوردر يتم إسناده وتسليمه
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/20">
            <div>
              <span className="text-[11px] text-amber-100 font-semibold block">
                رصيد أرباحك في الحصالة
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white flex items-baseline gap-1">
                <span>{courier.shift.totalDeliveryEarnings}</span>
                <span className="text-sm font-bold">جنيه</span>
              </div>
            </div>

            <div className="border-r border-white/20 pr-4 text-left">
              <span className="text-[10px] text-amber-100 block">المبالغ المحصلة في عهدتك:</span>
              <div className="flex flex-col text-xs font-mono font-bold mt-0.5 space-y-0.5">
                <span>💵 نقدي: {courier.shift.totalCollectedCash} ج</span>
                <span>💳 فيزا: {courier.shift.totalCollectedVisa} ج</span>
                <span>⚡ انستاباي: {courier.shift.totalCollectedInstapay} ج</span>
              </div>
              <span className="text-[10px] text-amber-100 block mt-1">أوردرات منجزة: {courier.shift.totalOrdersDelivered}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Current Orders vs Daily Orders History vs Map */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center p-1 bg-slate-200/70 rounded-2xl text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-2 px-3.5 sm:px-4 rounded-xl transition shrink-0 ${
              activeTab === 'orders'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            أوردراتي الحالية ({pendingOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-3.5 sm:px-4 rounded-xl transition shrink-0 ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            سجل أوردرات اليوم ({courierDailyOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`py-2 px-3.5 sm:px-4 rounded-xl transition shrink-0 ${
              activeTab === 'map'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            خريطة التوصيل المباشرة
          </button>
        </div>

        {/* Action buttons: Instant cloud sync & PDF export */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={async () => {
              setIsRefreshingOrders(true);
              await store.fetchCloudData();
              setTimeout(() => setIsRefreshingOrders(false), 600);
            }}
            className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition shadow-2xs"
            title="سحب أحدث الأوردرات من السيرفر فوراً"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingOrders ? 'animate-spin text-emerald-600' : ''}`} />
            <span>تحديث فوري</span>
          </button>

          <button
            onClick={async () => {
              if (courierDailyOrders.length === 0) return;
              setIsExportingPdf(true);
              try {
                await exportDailyOrdersToPdf(
                  courierDailyOrders,
                  pharmacy,
                  allCouriers,
                  courier,
                  `سجل_اوردرات_${courier.name.replace(/\s+/g, '_')}`
                );
              } finally {
                setIsExportingPdf(false);
              }
            }}
            disabled={isExportingPdf || courierDailyOrders.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-xs transition"
            title="تصدير كشف أوردرات اليوم كامل في ملف PDF"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isExportingPdf ? 'جاري التصدير...' : 'تصدير سجل اليوم PDF'}</span>
          </button>
        </div>
      </div>

      {/* Orders List (قيمة فقط مع تحديث فوري) */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Orders Scope Toggle: My Assigned Orders vs All Pharmacy Orders */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-slate-200/80 rounded-2xl">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setOrdersScope('mine')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                  ordersScope === 'mine'
                    ? 'bg-white text-indigo-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>أوردراتي المسندة لي ({courierActiveOrders.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setOrdersScope('pharmacy')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                  ordersScope === 'pharmacy'
                    ? 'bg-white text-indigo-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>كافة أوردرات الصيدلية ({pharmacyActiveOrders.length})</span>
                {pharmacyActiveOrders.length > courierActiveOrders.length && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                )}
              </button>
            </div>
            <div className="text-[11px] text-slate-500 font-bold px-2">
              {ordersScope === 'mine' ? `أوردرات كابتن ${courier.name}` : `جميع أوردرات ${pharmacy.name}`}
            </div>
          </div>

          {/* Alert if courier has 0 orders but pharmacy has pending orders */}
          {ordersScope === 'mine' && courierActiveOrders.length === 0 && pharmacyActiveOrders.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="text-2xl shrink-0">🔔</span>
                <div>
                  <strong className="text-xs sm:text-sm block font-extrabold text-amber-900">
                    يوجد ({pharmacyActiveOrders.length}) أوردر نشط في الصيدلية متاح للتوصيل!
                  </strong>
                  <span className="text-[11px] text-amber-800">
                    الأوردرات مسندة لكباتن آخرين أو مسجلة حديثاً. يمكنك استلام أي أوردر منها فوراً لحسابك لتوصيله أو تبديل الكابتن من الأعلى.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOrdersScope('pharmacy')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-xs transition shrink-0"
              >
                عرض واستلام أوردرات الصيدلية 📥
              </button>
            </div>
          )}

          {/* Orders Empty State */}
          {((ordersScope === 'mine' && courierActiveOrders.length === 0) ||
            (ordersScope === 'pharmacy' && pharmacyActiveOrders.length === 0)) ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
              <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto text-3xl">
                ✨
              </div>
              <h3 className="text-lg font-extrabold text-slate-800">
                {ordersScope === 'mine'
                  ? `لا توجد أوردرات مسندة لكابتن ${courier.name} حالياً`
                  : 'لا توجد أوردرات نشطة في الصيدلية حالياً'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                بمجرد إضافة الصيدلي لأي أوردر جديد سيظهر هنا فوراً على هاتفك في نفس اللحظة عبر المزامنة الحية.
              </p>
              {ordersScope === 'mine' && pharmacyActiveOrders.length > 0 && (
                <button
                  type="button"
                  onClick={() => setOrdersScope('pharmacy')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs mt-2"
                >
                  مشاهدة كافة أوردرات الصيدلية ({pharmacyActiveOrders.length})
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(ordersScope === 'pharmacy' ? pharmacyActiveOrders : courierActiveOrders).map((order) => {
                const isDelivered = order.status === 'delivered';
                const isMine = isOrderForThisCourier(order);

                return (
                  <div
                    key={order.id}
                    className={`bg-white rounded-3xl p-5 border transition-all ${
                      isDelivered
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : !isMine
                        ? 'border-indigo-300 bg-indigo-50/20 shadow-xs'
                        : order.updatedAt
                        ? 'border-amber-400 shadow-md ring-2 ring-amber-300/60'
                        : 'border-slate-200 shadow-xs hover:border-slate-300'
                    }`}
                  >
                    {/* Live Update Notification from Pharmacist */}
                    {order.updatedAt && (
                      <div className="mb-2 px-3 py-1.5 bg-amber-100 text-amber-950 rounded-xl text-xs font-black flex items-center justify-between animate-pulse">
                        <span>⚡ قام الصيدلي بتحديث الأوردر: ({order.orderType || 'عادي'} - {order.orderValue} ج)</span>
                        <span className="font-mono text-[10px]">
                          {new Date(order.updatedAt).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}

                    {/* Ownership badge if assigned to another courier */}
                    {!isMine && !isDelivered && (
                      <div className="mb-2 p-2 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between gap-2 text-xs">
                        <span className="text-indigo-900 font-bold">
                          مسند حالياً إلى: <strong>{order.courierName || 'كابتن آخر'}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleClaimOrder(order.id)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-black transition"
                        >
                          استلام لحسابي 📥
                        </button>
                      </div>
                    )}

                    {/* Order Header: Sequential Order Number + Type Badge */}
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-lg text-indigo-700">
                          أوردر {order.orderNumber}
                        </span>
                        {/* Order Type Badge */}
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1 ${
                            order.orderType === 'مستعجل'
                              ? 'bg-red-100 text-red-800'
                              : order.orderType === 'أدوية ثلاجة'
                              ? 'bg-blue-100 text-blue-800'
                              : order.orderType === 'روشتة'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {order.orderType === 'عادي' && '🟢 عادي'}
                          {order.orderType === 'مستعجل' && '⚡ مستعجل'}
                          {order.orderType === 'روشتة' && '📝 روشتة'}
                          {order.orderType === 'أدوية ثلاجة' && '❄️ ثلاجة'}
                          {order.orderType === 'مستلزمات' && '🩹 مستلزمات'}
                          {!order.orderType && '🟢 عادي'}
                        </span>
                      </div>

                      <div>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full inline-block ${
                            order.paymentMethod === 'cash'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.paymentMethod === 'visa'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {order.paymentMethod === 'cash' && '💵 نقدي'}
                          {order.paymentMethod === 'visa' && '💳 فيزا'}
                          {order.paymentMethod === 'instapay' && '⚡ انستاباي'}
                        </span>
                      </div>
                    </div>

                    {/* Value & Delivery Status Box */}
                    <div className="my-3">
                      {isDelivered ? (
                        <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs text-emerald-800 font-bold block">
                                قيمة الأوردر بعد التمام (+7 ج):
                              </span>
                              <div className="font-mono font-black text-xl text-emerald-950 mt-0.5">
                                <span>{order.orderValue} ج + 7 ج = </span>
                                <span className="underline">{order.orderValue + 7} جنيه</span>
                              </div>
                            </div>
                            <span className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-2xs">
                              <CheckCircle className="w-4 h-4" />
                              <span>تم التوصيل ✔️</span>
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-700 font-bold mt-1">
                            تم إضافة عمولة 7 جنيه لحصالتك ومحفظتك بنجاح
                          </p>
                        </div>
                      ) : (
                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs text-slate-500 font-bold block">
                                قيمة الأوردر الأساسية:
                              </span>
                              <div className="font-mono font-black text-2xl text-slate-900 mt-0.5">
                                {order.orderValue} جنيه
                              </div>
                            </div>
                            <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-xl text-xs font-bold border border-amber-200 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>لم يتم التوصيل</span>
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium mt-1">
                            عند تمام الأوردر سيضاف +7 جنيه كعمولة مباشرة في حصالتك
                          </p>
                        </div>
                      )}
                    </div>

                    {order.quickNote && (
                      <div className="my-2 p-2 bg-slate-50 rounded-xl text-xs text-slate-600 font-medium">
                        ملاحظة من الصيدلي: {order.quickNote}
                      </div>
                    )}

                    {/* Step Actions */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      {!isDelivered && isMine && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(order.id, 'delivered')}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-md transition flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>
                            اضغط لتأكيد تمام الأوردر والتسليم (+7 جنيه لحصالتك فوراً)
                          </span>
                        </button>
                      )}

                      {!isDelivered && !isMine && (
                        <button
                          type="button"
                          onClick={() => handleClaimOrder(order.id)}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black shadow-md transition flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          <span>
                            استلام هذا الأوردر وتوصيله باسمي (+7 ج لحصالتك فوراً) 📥
                          </span>
                        </button>
                      )}

                      {isDelivered && (
                        <div className="p-2.5 bg-emerald-100 text-emerald-900 rounded-xl text-xs font-black text-center flex items-center justify-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-700" />
                          <span>الأوردر مكتمل - تم إضافة 7 جنيه لحصالتك ومحفظتك</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Daily Orders History Tab (سجل الأوردرات اليومي المحفوظ) */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  <span>سجل أوردرات اليوم المحفوظة للكابتن ({courier.name})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  السجل محفوظ تلقائياً ولا يحذف مع إغلاق الشاشة، وجاهز للتصدير كملف PDF رسمي بأي وقت.
                </p>
              </div>

              <button
                onClick={async () => {
                  if (courierDailyOrders.length === 0) return;
                  setIsExportingPdf(true);
                  try {
                    await exportDailyOrdersToPdf(
                      courierDailyOrders,
                      pharmacy,
                      allCouriers,
                      courier,
                      `سجل_اوردرات_${courier.name.replace(/\s+/g, '_')}`
                    );
                  } finally {
                    setIsExportingPdf(false);
                  }
                }}
                disabled={isExportingPdf || courierDailyOrders.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition"
              >
                <Download className="w-4 h-4" />
                <span>{isExportingPdf ? 'جاري التصدير...' : 'تحميل سجل الأوردرات كملف PDF'}</span>
              </button>
            </div>

            {courierDailyOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Package className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-600">لا توجد أوردرات مسجلة لك حتى الآن اليوم</p>
                <p className="text-xs text-slate-400 mt-1">بمجرد إضافة أوردر جديد لك من الصيدلية سيتم حفظه وتوثيقه هنا فوراً</p>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="py-3 px-3 font-bold">#</th>
                      <th className="py-3 px-3 font-bold">رقم الأوردر</th>
                      <th className="py-3 px-3 font-bold">وقت الإسناد</th>
                      <th className="py-3 px-3 font-bold">النوع</th>
                      <th className="py-3 px-3 font-bold">قيمة الأوردر</th>
                      <th className="py-3 px-3 font-bold">عمولة التوصيل</th>
                      <th className="py-3 px-3 font-bold">طريقة الدفع</th>
                      <th className="py-3 px-3 font-bold">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {courierDailyOrders.map((ord, idx) => {
                      const isDelivered = ord.status === 'delivered';
                      return (
                        <tr key={ord.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-3 text-slate-400 font-mono font-bold">{idx + 1}</td>
                          <td className="py-3 px-3 font-mono font-black text-slate-900">{ord.orderNumber}</td>
                          <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                            {ord.createdAt
                              ? new Date(ord.createdAt).toLocaleTimeString('ar-EG', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '--:--'}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-[10px]">
                              {ord.orderType || 'عادي'}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-black text-slate-900">
                            {ord.orderValue} ج
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-amber-700">
                            +{ord.deliveryFee || 7} ج
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              ord.paymentMethod === 'cash'
                                ? 'bg-emerald-50 text-emerald-800'
                                : ord.paymentMethod === 'visa'
                                ? 'bg-purple-50 text-purple-800'
                                : 'bg-sky-50 text-sky-800'
                            }`}>
                              {ord.paymentMethod === 'cash' ? '💵 كاش' : ord.paymentMethod === 'visa' ? '💳 فيزا' : '⚡ انستاباي'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center gap-1 ${
                              isDelivered
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {isDelivered ? '✅ تم التسليم' : '🚴 قيد التوصيل'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                      <td colSpan={4} className="py-3 px-3 text-slate-700">الإجمالي:</td>
                      <td className="py-3 px-3 font-mono font-black text-slate-900">
                        {courierDailyOrders.reduce((sum, o) => sum + (Number(o.orderValue) || 0), 0)} ج
                      </td>
                      <td className="py-3 px-3 font-mono font-black text-amber-700">
                        +{courierDailyOrders.reduce((sum, o) => sum + (Number(o.deliveryFee) || 7), 0)} ج
                      </td>
                      <td colSpan={2} className="py-3 px-3 text-slate-500 text-[11px]">
                        ({courierDailyOrders.filter(o => o.status === 'delivered').length} أوردرات منجزة)
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map */}
      {activeTab === 'map' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                خريطة التوصيل المباشرة
              </h3>
              <p className="text-xs text-slate-500">
                موقعك الحالي ومقر {pharmacy.name}
              </p>
            </div>
            <button
              onClick={() => store.simulateCourierMovement(courier.id)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              تحريك موقعي 🚀
            </button>
          </div>

          <LiveMap
            pharmacy={pharmacy}
            couriers={allCouriers}
            orders={orders}
            selectedCourierId={courier.id}
          />
        </div>
      )}
    </div>
  );
};
