import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { CourierProfile, Order, Pharmacy } from '../../types';
import { store } from '../../services/store';
import { LiveMap } from '../LiveMap';
import {
  formatDurationSeconds,
  fetchRealAddressFromCoords,
  formatCoordinates,
} from '../../utils/geo';
import { playStoppageBellSound, requestNotificationPermission } from '../../utils/audio';

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
  const [gpsActive, setGpsActive] = useState(Boolean(courier.currentLocation.isGpsLive));
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'map'>('orders');

  // Filter unarchived orders belonging to this courier
  const courierActiveOrders = orders.filter(
    (o) => o.courierId === courier.id && !o.isArchived
  );

  const pendingOrders = courierActiveOrders.filter(
    (o) => o.status !== 'delivered' && o.status !== 'cancelled'
  );

  const isAlerting = courier.isStoppageAlertActive;
  const isStationary = courier.currentLocation.isStationary;

  // Real device GPS watchPosition with high accuracy and reverse geocoding
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

  return (
    <div className="space-y-6">
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
              onClick={() => store.simulateStoppage(courier.id, 305)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition"
              title="تجربة رنين جرس إنذار التوقف 5 دقائق فوراً"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>فحص إنذار 5 دقائق 🔔</span>
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
                (الإنذار ينطلق عند 5 دقائق)
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

      {/* Tabs Switcher: Orders vs Map */}
      <div className="flex items-center gap-2">
        <div className="flex items-center p-1 bg-slate-200/70 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-2 px-4 rounded-xl transition ${
              activeTab === 'orders'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            أوردراتي الحالية ({pendingOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`py-2 px-4 rounded-xl transition ${
              activeTab === 'map'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            خريطة التوصيل المباشرة
          </button>
        </div>
      </div>

      {/* Orders List (قيمة فقط مع تحديث فوري) */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {courierActiveOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
              <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto text-3xl">
                ✨
              </div>
              <h3 className="text-lg font-extrabold text-slate-800">
                الصفحة فارغة وجاهزة لاستقبال أوردرات جديدة!
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                قام الصيدلي بحفظ وأرشفة الأوردرات السابقة سحابياً. أرباحك وعمولاتك محفوظة بأمان في الحصالة، وبمجرد إسناد أوردر جديد سيظهر لك هنا فوراً.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courierActiveOrders.map((order) => {
                const isDelivered = order.status === 'delivered';

                return (
                  <div
                    key={order.id}
                    className={`bg-white rounded-3xl p-5 border transition-all ${
                      isDelivered
                        ? 'border-emerald-200 bg-emerald-50/20 opacity-80'
                        : order.updatedAt
                        ? 'border-amber-400 shadow-md ring-2 ring-amber-300/60'
                        : 'border-slate-200 shadow-xs hover:border-slate-300'
                    }`}
                  >
                    {/* Live Update Notification from Pharmacist */}
                    {order.updatedAt && (
                      <div className="mb-2 px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg text-[11px] font-extrabold flex items-center justify-between animate-pulse">
                        <span>⚡ تم تعديل بيانات الأوردر من قِبل الصيدلي الآن</span>
                        <span className="font-mono text-[10px]">
                          {new Date(order.updatedAt).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}

                    {/* Value only header */}
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <span className="font-mono font-black text-base text-indigo-700 block">
                          أوردر {order.orderNumber}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {new Date(order.assignedAt).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="text-left">
                        <span className="text-xl font-black font-mono text-slate-900 block">
                          {order.orderValue} جنيه
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
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

                    {order.quickNote && (
                      <div className="my-2 p-2 bg-slate-50 rounded-xl text-xs text-slate-600 font-medium">
                        ملاحظة: {order.quickNote}
                      </div>
                    )}

                    {/* Commission Box */}
                    <div className="my-3 bg-amber-50/70 p-3 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                      <span className="text-amber-900 font-bold flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-amber-600" />
                        عمولتك في الحصالة من هذا الأوردر:
                      </span>
                      <span className="font-mono font-extrabold text-amber-950 text-base">
                        +{order.deliveryFee} جنيه
                      </span>
                    </div>

                    {/* Step Actions */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      {order.status === 'assigned' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'picked_up')}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
                        >
                          <Package className="w-4 h-4" />
                          <span>استلمت الأوردر من الصيدلية</span>
                        </button>
                      )}

                      {order.status === 'picked_up' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'in_transit')}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
                        >
                          <Navigation className="w-4 h-4" />
                          <span>في الطريق للعميل الآن</span>
                        </button>
                      )}

                      {order.status === 'in_transit' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'delivered')}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>
                            تم التسليم والتحصيل ({order.orderValue} ج {order.paymentMethod === 'cash' ? 'نقدي' : order.paymentMethod === 'visa' ? 'فيزا' : 'انستاباي'})
                          </span>
                        </button>
                      )}

                      {order.status === 'delivered' && (
                        <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1">
                          <Check className="w-4 h-4" />
                          <span>تم تسليم الأوردر وإضافة {order.deliveryFee} ج لحصالتك</span>
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
