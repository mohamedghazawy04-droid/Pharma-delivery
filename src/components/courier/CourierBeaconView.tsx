import React, { useState, useEffect, useRef } from 'react';
import { CourierProfile, Order, Pharmacy } from '../../types';
import { store, normalizePhone } from '../../services/store';
import {
  Bike,
  Navigation,
  MapPin,
  CheckCircle,
  Clock,
  Radio,
  Phone,
  RefreshCw,
  Building2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Download,
  Plus,
  User,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { playCoinSound } from '../../utils/audio';
import { InstallAppBanner } from '../InstallAppBanner';

interface Props {
  pharmacy: Pharmacy;
  allCouriers: CourierProfile[];
  orders: Order[];
  initialCourierId?: string;
}

export const CourierBeaconView: React.FC<Props> = ({
  pharmacy,
  allCouriers,
  orders,
  initialCourierId,
}) => {
  const [selectedCourierId, setSelectedCourierId] = useState<string>(() => {
    if (initialCourierId) return initialCourierId;
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlId = urlParams.get('courierId') || urlParams.get('c') || urlParams.get('courier');
      if (urlId) return urlId;
      const saved = localStorage.getItem('pharma_beacon_courier_id');
      if (saved) return saved;
    }
    return allCouriers[0]?.id || '';
  });

  const [isBeaconActive, setIsBeaconActive] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pharma_gps_beacon_active') === 'true';
    }
    return false;
  });

  const [gpsStatus, setGpsStatus] = useState<'idle' | 'tracking' | 'error' | 'denied'>('idle');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy: number; speed: number } | null>(null);
  const [lastPingTime, setLastPingTime] = useState<string>('');
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string>('');
  const [showDelivered, setShowDelivered] = useState<boolean>(false);
  const [completingOrderId, setCompletingOrderId] = useState<string | null>(null);

  // Quick self-registration for new courier opening the link
  const [isAddingSelf, setIsAddingSelf] = useState(false);
  const [newCourierName, setNewCourierName] = useState('');
  const [newCourierPhone, setNewCourierPhone] = useState('');
  const [newCourierVehicle, setNewCourierVehicle] = useState<'موتوسيكل' | 'دراجة' | 'سيارة' | 'سكوتر'>('موتوسيكل');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  const watchIdRef = useRef<number | null>(null);

  // Active courier object
  const currentCourier =
    allCouriers.find((c) => c.id === selectedCourierId) ||
    allCouriers.find((c) => normalizePhone(c.phone) === normalizePhone(selectedCourierId)) ||
    allCouriers[0];

  // Save selected courier to local storage
  useEffect(() => {
    if (currentCourier?.id) {
      localStorage.setItem('pharma_beacon_courier_id', currentCourier.id);
    }
  }, [currentCourier?.id]);

  // Normalize phone for foolproof matching
  const normPhone = currentCourier?.phone ? normalizePhone(currentCourier.phone) : '';

  // Filter orders assigned to this courier (Order clarification & incoming registration)
  const isOrderForCourier = (o: Order) => {
    if (!currentCourier) return false;
    if (o.courierId === currentCourier.id) return true;
    if (normPhone) {
      if (o.courierPhone && normalizePhone(o.courierPhone) === normPhone) return true;
      if (o.courierId && normalizePhone(o.courierId) === normPhone) return true;
    }
    if (o.courierName && currentCourier.name && o.courierName.trim().toLowerCase() === currentCourier.name.trim().toLowerCase()) {
      return true;
    }
    return false;
  };

  const assignedActiveOrders = orders
    .filter((o) => !o.isArchived && isOrderForCourier(o) && o.status !== 'delivered' && o.status !== 'cancelled')
    .sort((a, b) => {
      const numA = parseInt(a.orderNumber.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.orderNumber.replace(/\D/g, '')) || 0;
      return numA - numB;
    });

  const deliveredTodayOrders = orders
    .filter((o) => isOrderForCourier(o) && o.status === 'delivered')
    .sort((a, b) => new Date(b.deliveredAt || b.createdAt).getTime() - new Date(a.deliveredAt || a.createdAt).getTime());

  // Fast polling to keep orders synced in real-time
  useEffect(() => {
    store.fetchCloudData();
    const interval = setInterval(() => {
      store.fetchCloudData();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Handle GPS Live Beacon streaming to Pharmacist
  useEffect(() => {
    if (!isBeaconActive || !currentCourier) {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setGpsStatus('idle');
      return;
    }

    if (!('geolocation' in navigator)) {
      setGpsStatus('error');
      setGpsErrorMsg('خاصية تحديد الموقع الجغرافي (GPS) غير مدعومة في هذا المتصفح');
      return;
    }

    setGpsStatus('tracking');
    setGpsErrorMsg('');

    const handleSuccess = (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = Math.round(pos.coords.accuracy || 10);
      const speedKmH = pos.coords.speed !== null ? Math.round(pos.coords.speed * 3.6) : 0;

      setGpsCoords({ lat, lng, accuracy, speed: speedKmH });
      setLastPingTime(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      // Stream GPS position to store and server for pharmacist to track
      store.updateCourierGPS(
        currentCourier.id,
        lat,
        lng,
        speedKmH,
        accuracy,
        pos.coords.heading || 0,
        pos.coords.altitude || 0,
        `موقع حي (±${accuracy}م)`
      );
    };

    const handleError = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        setGpsStatus('denied');
        setGpsErrorMsg('يرجى السماح بإذن الموقع الجغرافي ليظهر موقعك للصيدلي على الخريطة');
      } else {
        setGpsStatus('error');
        setGpsErrorMsg('جاري البحث عن إشارة GPS دقيقة...');
      }
    };

    // Watch position in real-time
    watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
    });

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isBeaconActive, currentCourier?.id]);

  const toggleBeacon = () => {
    const next = !isBeaconActive;
    setIsBeaconActive(next);
    localStorage.setItem('pharma_gps_beacon_active', String(next));
  };

  const handleDeliverOrder = async (orderId: string) => {
    setCompletingOrderId(orderId);
    try {
      store.updateOrderStatus(orderId, 'delivered');
      playCoinSound();
    } finally {
      setCompletingOrderId(null);
    }
  };

  // Self-register by courier name (No passwords or accounts!)
  const handleSelfRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourierName.trim()) return;

    setIsSubmittingNew(true);
    try {
      const added = await store.registerCourierAsync({
        pharmacyId: pharmacy.id,
        name: newCourierName.trim(),
        phone: newCourierPhone.trim() || '01000000000',
        password: '123',
        vehicleType: newCourierVehicle,
        vehicleNumber: 'بدون لوحة',
        nationalId: '',
        deliveryFeePerOrder: pharmacy.globalDeliveryFee || 7,
      });

      setSelectedCourierId(added.id);
      setIsBeaconActive(true);
      localStorage.setItem('pharma_gps_beacon_active', 'true');
      localStorage.setItem('pharma_beacon_courier_id', added.id);
      setIsAddingSelf(false);
      setNewCourierName('');
      setNewCourierPhone('');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Empty state: No courier registered yet, or clicked add self
  if (!currentCourier || isAddingSelf) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center py-10 px-4 font-['Cairo',sans-serif] selection:bg-emerald-500 selection:text-white">
        <div className="max-w-md w-full mx-auto bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-lg shadow-emerald-900/40">
              <Bike className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-black text-white">
              تسجيل كابتن توصيل · {pharmacy.name}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              أدخل اسمك فقط لبدء بث موقعك الحي للصيدلي ومتابعة الأوردرات المطلوب توصيلها.
            </p>
          </div>

          <form onSubmit={handleSelfRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                اسم الكابتن / المندوب *
              </label>
              <input
                type="text"
                required
                autoFocus
                value={newCourierName}
                onChange={(e) => setNewCourierName(e.target.value)}
                placeholder="مثال: محمد علي"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white focus:border-emerald-500 focus:bg-slate-800/90 outline-hidden transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                رقم الهاتف (اختياري)
              </label>
              <input
                type="tel"
                value={newCourierPhone}
                onChange={(e) => setNewCourierPhone(e.target.value)}
                placeholder="010xxxxxxxx"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white focus:border-emerald-500 outline-hidden transition text-left dir-ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                وسيلة التنقل
              </label>
              <select
                value={newCourierVehicle}
                onChange={(e) => setNewCourierVehicle(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:border-emerald-500 outline-hidden transition"
              >
                <option value="موتوسيكل">موتوسيكل 🏍️</option>
                <option value="دراجة">عجلة / دراجة 🚲</option>
                <option value="سيارة">سيارة 🚗</option>
                <option value="سكوتر">سكوتر 🛴</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmittingNew}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs sm:text-sm font-black shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Radio className="w-4 h-4" />
                <span>{isSubmittingNew ? 'جاري التسجيل...' : 'تسجيل وبدء بث موقعي للصيدلي 📡'}</span>
              </button>
            </div>

            {allCouriers.length > 0 && isAddingSelf && (
              <button
                type="button"
                onClick={() => setIsAddingSelf(false)}
                className="w-full text-xs text-slate-400 hover:text-white pt-2"
              >
                العودة للقائمة الحالية
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-['Cairo',sans-serif] selection:bg-emerald-500 selection:text-white pb-16">
      {/* Top Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0 shadow-md">
              <Bike className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-black text-sm text-white truncate">
                  كابتن {currentCourier.name}
                </h1>
                {isBeaconActive && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                <Building2 className="w-3 h-3 text-emerald-400" />
                <span>{pharmacy.name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => store.fetchCloudData()}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              title="تحديث الأوردرات"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <InstallAppBanner variant="compact" />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* If multiple couriers exist, allow switching or adding self */}
        {allCouriers.length > 0 && (
          <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-slate-400 font-bold">
                حساب الكابتن على هذا الهاتف:
              </span>
              <button
                onClick={() => setIsAddingSelf(true)}
                className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>تسجيل كابتن جديد</span>
              </button>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {allCouriers.map((c) => {
                const isSelected = c.id === currentCourier.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCourierId(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{c.name}</span>
                    {isSelected && <span>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* GPS Live Beacon Card */}
        <div className={`rounded-3xl p-5 border transition-all ${
          isBeaconActive
            ? 'bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-900 border-emerald-500/50 shadow-lg ring-1 ring-emerald-500/30'
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-3 rounded-2xl text-white shrink-0 ${
                isBeaconActive ? 'bg-emerald-600 animate-pulse' : 'bg-slate-800 text-slate-400'
              }`}>
                <Radio className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    بث موقعك المباشر للصيدلي
                  </h3>
                  {isBeaconActive && (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>متصل بالخريطة</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {isBeaconActive
                    ? 'يتم إرسال إحداثياتك الحقيقية الآن لتظهر على خريطة الصيدلي بالصيدلية فورياً.'
                    : 'اضغط لتشغيل بث GPS ليتمكن الصيدلي من متابعة خط سيرك على الخريطة.'}
                </p>

                {isBeaconActive && gpsCoords && (
                  <div className="mt-2.5 flex items-center gap-3 text-[11px] text-emerald-300 font-mono">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>الدقة: ±{gpsCoords.accuracy}م</span>
                    </span>
                    <span>·</span>
                    <span>السرعة: {gpsCoords.speed} كم/س</span>
                    <span>·</span>
                    <span>آخر إرسال: {lastPingTime}</span>
                  </div>
                )}

                {gpsErrorMsg && (
                  <div className="mt-2 text-xs text-rose-400 flex items-center gap-1.5 bg-rose-950/40 p-2 rounded-xl border border-rose-800/50">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{gpsErrorMsg}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={toggleBeacon}
              className={`w-full sm:w-auto px-6 py-3 rounded-2xl text-xs font-black transition shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                isBeaconActive
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>{isBeaconActive ? 'إيقاف بث الموقع' : 'تشغيل بث موقعي الحي 📡'}</span>
            </button>
          </div>
        </div>

        {/* Orders Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h2 className="text-base font-black text-white">
              الأوردرات المطلوب توصيلها ({assignedActiveOrders.length})
            </h2>
            <p className="text-xs text-slate-400">
              الواردات والمبالغ المطلوب تحصيلها من العملاء
            </p>
          </div>
          <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-mono font-black">
            {assignedActiveOrders.length} أوردر جاري
          </span>
        </div>

        {/* Empty State */}
        {assignedActiveOrders.length === 0 ? (
          <div className="bg-slate-900 rounded-3xl p-10 text-center border border-slate-800 space-y-3">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-3xl">
              🛵
            </div>
            <h3 className="font-extrabold text-white text-base">
              لا توجد أوردرات مسندة لك حالياً
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              عندما يسند الصيدلي أي أوردر لكابتن <strong>{currentCourier.name}</strong>، سيظهر هنا فوراً في نفس اللحظة تلقائياً.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignedActiveOrders.map((order) => {
              const isCompleting = completingOrderId === order.id;

              return (
                <div
                  key={order.id}
                  className="bg-slate-900 rounded-3xl p-5 border border-slate-800 hover:border-slate-700 shadow-md space-y-3 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-mono font-black text-xs">
                        {order.orderNumber}
                      </span>
                      <div>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {order.orderType || 'عادي'}
                        </span>
                        <span className="text-[11px] text-slate-400 mr-2 font-mono">
                          {new Date(order.assignedAt || order.createdAt).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 block">المطلوب تحصيله:</span>
                      <span className="text-lg font-mono font-black text-emerald-400">
                        {order.orderValue} ج
                      </span>
                    </div>
                  </div>

                  {/* Customer & Pills info */}
                  {(order.customerName || order.pillsSummary || order.customerPhone) && (
                    <div className="bg-slate-800/90 p-3 rounded-2xl border border-slate-700/80 space-y-1.5 text-xs">
                      {order.customerName && (
                        <div className="flex items-center justify-between text-slate-200">
                          <span className="font-extrabold text-white text-sm">
                            👤 {order.customerName}
                          </span>
                          {order.customerPhone && (
                            <a
                              href={`tel:${order.customerPhone}`}
                              className="text-emerald-400 font-mono font-bold hover:underline"
                            >
                              📞 {order.customerPhone}
                            </a>
                          )}
                        </div>
                      )}
                      {(order.pillsSummary || (order.pills && order.pills.length > 0)) && (
                        <div className="text-emerald-300 font-semibold bg-emerald-950/40 p-2 rounded-xl border border-emerald-800/40">
                          <span className="text-[10px] text-slate-400 block mb-0.5">💊 أصناف وأدوية الأوردر:</span>
                          <span>{order.pillsSummary || order.pills?.join(' + ')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment Method Badge */}
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="text-slate-400">طريقة التحصيل:</span>
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                      order.paymentMethod === 'cash'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : order.paymentMethod === 'visa'
                        ? 'bg-purple-950 text-purple-300 border border-purple-800'
                        : order.paymentMethod === 'instapay'
                        ? 'bg-blue-950 text-blue-300 border border-blue-800'
                        : order.paymentMethod === 'vodafone_cash'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {order.paymentMethod === 'cash' && '💵 نقدي من العميل'}
                      {order.paymentMethod === 'visa' && '💳 فيزا (POS)'}
                      {order.paymentMethod === 'instapay' && '⚡ انستاباي للصيدلية'}
                      {order.paymentMethod === 'vodafone_cash' && '📱 فودافون كاش للصيدلية'}
                      {order.paymentMethod === 'deferred' && '📝 آجل / على الحساب'}
                    </span>
                  </div>

                  {/* Note / Details */}
                  {order.quickNote && order.quickNote !== order.pillsSummary && (
                    <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 text-xs text-slate-200">
                      <span className="text-slate-400 block text-[10px] mb-0.5">ملاحظات إضافية:</span>
                      <p className="font-semibold">{order.quickNote}</p>
                    </div>
                  )}

                  {/* Complete Button */}
                  <button
                    onClick={() => handleDeliverOrder(order.id)}
                    disabled={isCompleting}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs sm:text-sm font-black shadow-lg transition flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                  >
                    <CheckCircle className="w-5 h-5 text-white" />
                    <span>{isCompleting ? 'جاري تأكيد التمام...' : 'تم تسليم الأوردر للعميل بنجاح ✔️'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Delivered Orders Accordion */}
        {deliveredTodayOrders.length > 0 && (
          <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
            <button
              onClick={() => setShowDelivered(!showDelivered)}
              className="w-full p-4 flex items-center justify-between text-right text-xs font-bold text-slate-300 hover:bg-slate-800/50 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>أوردرات أنجزتها اليوم ({deliveredTodayOrders.length})</span>
              </div>
              {showDelivered ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showDelivered && (
              <div className="p-4 pt-0 space-y-2 border-t border-slate-800">
                {deliveredTodayOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-slate-300">{ord.orderNumber}</span>
                      <span className="text-slate-400 text-[11px] mr-2">
                        {ord.deliveredAt ? new Date(ord.deliveredAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">
                      {ord.orderValue} ج ({ord.paymentMethod === 'cash' ? 'نقدي' : ord.paymentMethod === 'visa' ? 'فيزا' : 'انستاباي'})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
