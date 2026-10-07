import React, { useState, useEffect } from 'react';
import {
  Users,
  Package,
  Bike,
  Archive,
  ArrowRightLeft,
  DollarSign,
  Clock,
  MapPin,
  CheckCircle,
  Plus,
  Play,
  RotateCcw,
  History,
  Eye,
  Navigation,
  AlertTriangle,
  Coins,
  Building2,
  Zap,
  Edit3,
  CreditCard,
  Banknote,
  Send,
  HardDrive,
  Bell,
  BellRing,
  PackageCheck,
  Volume2,
  FileText,
} from 'lucide-react';
import {
  CourierProfile,
  Order,
  Pharmacy,
  ShiftSummaryArchive,
  PaymentMethod,
} from '../../types';
import { store } from '../../services/store';
import { notificationService, DeliveryAlertItem } from '../../services/notificationService';
import { LiveMap } from '../LiveMap';
import { AddPharmacyModal } from './AddPharmacyModal';
import { ManagePharmaciesModal } from './ManagePharmaciesModal';
import { ShiftPdfModal } from './ShiftPdfModal';
import { formatDurationSeconds } from '../../utils/geo';

interface Props {
  pharmacy: Pharmacy;
  pharmacies: Pharmacy[];
  couriers: CourierProfile[];
  orders: Order[];
  shiftSummaries: ShiftSummaryArchive[];
  onOpenNewOrder: () => void;
  onOpenTransferModal: (order: Order) => void;
  onOpenEditOrder: (order: Order) => void;
  onOpenPiggyBank: (summary: ShiftSummaryArchive) => void;
  onOpenAuthModal: () => void;
  onOpenGoogleDrive?: () => void;
}

export const PharmacistDashboard: React.FC<Props> = ({
  pharmacy,
  pharmacies,
  couriers,
  orders,
  shiftSummaries,
  onOpenNewOrder,
  onOpenTransferModal,
  onOpenEditOrder,
  onOpenPiggyBank,
  onOpenAuthModal,
  onOpenGoogleDrive,
}) => {
  const [activeTab, setActiveTab] = useState<'couriers' | 'orders' | 'archive' | 'shifts' | 'map'>('couriers');
  const [selectedCourierId, setSelectedCourierId] = useState<string>(couriers[0]?.id || '');
  const [editingGlobalFee, setEditingGlobalFee] = useState<number>(pharmacy.globalDeliveryFee || 7);
  const [isEditingFeeOpen, setIsEditingFeeOpen] = useState(false);
  const [isAddPharmacyOpen, setIsAddPharmacyOpen] = useState(false);
  const [isManagePharmaciesOpen, setIsManagePharmaciesOpen] = useState(false);
  const [isShiftPdfModalOpen, setIsShiftPdfModalOpen] = useState(false);
  const [pdfModalSummary, setPdfModalSummary] = useState<ShiftSummaryArchive | null>(null);

  // Fast inline order entry states (قيمة فقط لسرعة العمل)
  const [fastOrderValue, setFastOrderValue] = useState('');
  const [fastPaymentMethod, setFastPaymentMethod] = useState<PaymentMethod>('cash');
  const [fastCourierId, setFastCourierId] = useState(couriers[0]?.id || '');

  // Web Notification API Service state
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(notificationService.getPermission());
  const [recentDeliveryAlerts, setRecentDeliveryAlerts] = useState<DeliveryAlertItem[]>(
    notificationService.getRecentAlerts()
  );
  const [showAlertsList, setShowAlertsList] = useState(false);

  useEffect(() => {
    const unsubPerm = notificationService.onPermissionChange((perm) => {
      setNotificationPermission(perm);
    });
    const unsubAlert = notificationService.onDeliveryAlert(() => {
      setRecentDeliveryAlerts(notificationService.getRecentAlerts());
    });
    return () => {
      unsubPerm();
      unsubAlert();
    };
  }, []);

  const handleRequestNotificationPermission = async () => {
    const perm = await notificationService.requestPermission();
    setNotificationPermission(perm);
  };

  const handleTestDeliveryNotification = () => {
    notificationService.testNotification(pharmacy.name);
  };

  // Filter couriers and orders belonging to THIS pharmacy
  const pharmacyCouriers = couriers.filter((c) => c.pharmacyId === pharmacy.id);
  const pharmacyOrders = orders.filter((o) => o.pharmacyId === pharmacy.id);
  const pharmacyShiftSummaries = shiftSummaries.filter((s) => s.pharmacyId === pharmacy.id);

  // Active unarchived orders
  const activeOrders = pharmacyOrders.filter((o) => !o.isArchived);
  const archivedOrders = pharmacyOrders.filter((o) => o.isArchived);

  // Stats
  const activeCouriersCount = pharmacyCouriers.filter((c) => c.isOnDuty && !c.shift.isEnded).length;
  const inTransitOrdersCount = activeOrders.filter((o) => o.status === 'in_transit' || o.status === 'picked_up').length;
  const deliveredTodayCount = activeOrders.filter((o) => o.status === 'delivered').length;
  const totalCashCollected = pharmacyCouriers.reduce((sum, c) => sum + c.shift.totalCollectedCash, 0);

  // Handle Ultra-Fast Order Submit
  const handleFastOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(fastOrderValue);
    if (isNaN(val) || val <= 0) {
      return;
    }
    const targetCourier = fastCourierId || pharmacyCouriers[0]?.id;
    if (!targetCourier) {
      onOpenAuthModal();
      return;
    }

    store.addFastOrder({
      pharmacyId: pharmacy.id,
      orderValue: val,
      paymentMethod: fastPaymentMethod,
      courierId: targetCourier,
    });

    setFastOrderValue('');
  };

  const handleUpdateGlobalFee = (e: React.FormEvent) => {
    e.preventDefault();
    store.setPharmacyDeliveryFee(pharmacy.id, Number(editingGlobalFee));
    setIsEditingFeeOpen(false);
  };

  const handleEndShift = (courierId: string) => {
    const courier = pharmacyCouriers.find((c) => c.id === courierId);
    if (!courier) return;

    const summary = store.endCourierShift(courierId);
    if (summary) {
      onOpenPiggyBank(summary);
    }
  };

  const handleArchiveCourierOrders = (courierId: string) => {
    const courier = pharmacyCouriers.find((c) => c.id === courierId);
    if (!courier) return;
    const count = activeOrders.filter((o) => o.courierId === courierId).length;
    if (count === 0) return;

    store.archiveCourierOrders(courierId);
  };

  return (
    <div className="space-y-6">
      {/* Pharmacy Switcher & Top Info */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {pharmacy.name}
              </h1>
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-xl text-xs font-bold">
                <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>{pharmacies.length} صيدليات مسجلة</span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              العنوان: <strong className="text-slate-700">{pharmacy.address}</strong> · هاتف: <strong className="text-slate-700 font-mono">{pharmacy.phone}</strong> · المسئول: <strong className="text-slate-700">{pharmacy.pharmacistName}</strong>
            </p>
          </div>

          {/* Quick Controls: Global Fee & Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Pharmacy Global Fee Box */}
            <div className="flex items-center gap-2 bg-amber-50/80 border border-amber-200 px-3 py-1.5 rounded-2xl">
              <Coins className="w-4 h-4 text-amber-600" />
              <div className="text-xs">
                <span className="text-amber-800 font-medium">عمولة الأوردر للصيدلية: </span>
                <strong className="font-mono text-amber-950 font-extrabold text-sm">
                  {pharmacy.globalDeliveryFee || 7} جنيه
                </strong>
              </div>
              <button
                onClick={() => setIsEditingFeeOpen(!isEditingFeeOpen)}
                className="text-[11px] font-bold text-amber-800 underline hover:text-amber-950 px-1"
              >
                تغيير
              </button>
            </div>

            {/* Add Pharmacy Button - Restricted to Pharmacist Manager */}
            <button
              onClick={() => setIsAddPharmacyOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition shadow-xs"
              title="إضافة فرع أو صيدلية جديدة - خاصية حصرية للمدير الصيدلي"
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>+ إضافة صيدلية</span>
            </button>

            {/* Manage & Delete Pharmacies Button */}
            <button
              onClick={() => setIsManagePharmaciesOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              title="إدارة وحذف والتبديل بين الصيدليات"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-600" />
              <span>إدارة وحذف الصيدليات ({pharmacies.length})</span>
            </button>

            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>مندوب جديد</span>
            </button>

            {onOpenGoogleDrive && (
              <button
                onClick={onOpenGoogleDrive}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition shadow-2xs"
                title="تصدير تقارير الأوردرات لـ Google Drive والنسخ السحابي"
              >
                <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                <span>Google Drive</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Pharmacy Switcher Pills Bar */}
        {pharmacies.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pt-4 pb-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap flex items-center gap-1">
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
              <span>التبديل المباشر:</span>
            </span>
            {pharmacies.map((p) => {
              const isCur = p.id === pharmacy.id;
              const countC = couriers.filter((c) => c.pharmacyId === p.id).length;
              return (
                <button
                  key={p.id}
                  onClick={() => store.setActivePharmacy(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition flex items-center gap-1.5 ${
                    isCur
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{p.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isCur ? 'bg-white/20' : 'bg-slate-200'
                    }`}
                  >
                    {countC} مناديب
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => setIsManagePharmaciesOpen(true)}
              className="px-2.5 py-1 text-xs text-indigo-700 hover:text-indigo-900 font-bold whitespace-nowrap underline"
            >
              إدارة وحذف الفروع ⚙️
            </button>
          </div>
        )}

        {/* Global Fee Edit popdown */}
        {isEditingFeeOpen && (
          <form
            onSubmit={handleUpdateGlobalFee}
            className="mt-4 p-4 bg-amber-50/50 rounded-2xl border border-amber-200 flex flex-wrap items-center gap-3 animate-in fade-in"
          >
            <span className="text-xs font-bold text-amber-900">
              تحديد القيمة المضافة للمندوب مقابل كل أوردر (7 جنيه أو أكثر أو أقل):
            </span>
            <div className="relative w-28">
              <input
                type="number"
                min="1"
                value={editingGlobalFee}
                onChange={(e) => setEditingGlobalFee(Number(e.target.value))}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold font-mono text-amber-950"
              />
              <span className="absolute left-2.5 top-1.5 text-xs text-amber-700 font-bold">
                ج
              </span>
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              حفظ وتعميم
            </button>
            <button
              type="button"
              onClick={() => setIsEditingFeeOpen(false)}
              className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
            >
              إلغاء
            </button>
          </form>
        )}

        {/* WEB NOTIFICATIONS SERVICE BAR (خدمة إشعارات المتصفح الفورية لتنبيه الصيدلي بتسليم الأوردرات) */}
        <div className="mt-4 p-4 rounded-2xl border transition-all bg-white shadow-2xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  notificationPermission === 'granted'
                    ? 'bg-emerald-100 text-emerald-700'
                    : notificationPermission === 'denied'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {notificationPermission === 'granted' ? (
                  <BellRing className="w-5 h-5 animate-pulse" />
                ) : notificationPermission === 'denied' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Bell className="w-5 h-5" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                    خدمة إشعارات المتصفح الفورية (Web Notifications API)
                  </h4>
                  {notificationPermission === 'granted' ? (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      <span>مفعلة وتعمل بنجاح</span>
                    </span>
                  ) : notificationPermission === 'denied' ? (
                    <span className="bg-rose-100 text-rose-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      محظورة في إعدادات المتصفح
                    </span>
                  ) : (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      تحتاج تفعيل
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 mt-0.5">
                  {notificationPermission === 'granted'
                    ? 'يتم إطلاق إشعار نظام فوري ورنين صوتي للصيدلي عند قيام أي مندوب بتسليم الأوردر والتحصيل.'
                    : notificationPermission === 'denied'
                    ? 'الإشعارات محظورة في متصفحك. يرجى الضغط على علامة القفل 🔒 بجوار شريط العنوان والسماح بالإشعارات.'
                    : 'اضغط على تفعيل الإشعارات لتنبيهك فوراً على شاشة جهازك عند تسليم أي مندوب للأوردر حتى لو كان المتصفح في الخلفية.'}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {notificationPermission !== 'granted' && (
                <button
                  onClick={handleRequestNotificationPermission}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>تفعيل إشعارات المتصفح الآن</span>
                </button>
              )}

              <button
                onClick={handleTestDeliveryNotification}
                title="إطلاق إشعار تسليم تجريبي لفحص خدمة Web Notifications ورنين الصوت"
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>تجربة إشعار التسليم 🔔</span>
              </button>

              {recentDeliveryAlerts.length > 0 && (
                <button
                  onClick={() => setShowAlertsList(!showAlertsList)}
                  className="px-2.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  <span>السجل ({recentDeliveryAlerts.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Collapsible Recent Alerts Feed */}
          {showAlertsList && recentDeliveryAlerts.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                <span>سجل آخر إشعارات تسليم الأوردرات المستلمة:</span>
                <button
                  onClick={() => {
                    notificationService.clearRecentAlerts();
                    setRecentDeliveryAlerts([]);
                  }}
                  className="text-[11px] text-rose-600 hover:underline"
                >
                  مسح السجل
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {recentDeliveryAlerts.slice(0, 6).map((alert) => (
                  <div
                    key={alert.id}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-extrabold text-slate-900 flex items-center gap-1">
                        <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>كابتن {alert.courierName}</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {alert.orderNumber} · <strong className="text-emerald-700">{alert.orderValue} ج</strong> ({alert.paymentMethod})
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {alert.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FAST ORDER ENTRY BAR (الاوردرات تضاف قيمه فقط بدون بيانات خاصه بالعميل نظام تشغيل سريع أثناء العمل) */}
        <div className="mt-5 p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-2xl border-2 border-emerald-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-700 fill-emerald-600" />
              شريط التشغيل السريع: إضافة أوردر بالقيمة فقط (بدون بيانات عميل)
            </span>
            <span className="text-[11px] text-emerald-700 font-bold">
              تضاف {pharmacy.globalDeliveryFee || 7} ج لمحفظة المندوب فوراً
            </span>
          </div>

          <form onSubmit={handleFastOrderSubmit} className="flex flex-wrap items-center gap-2.5">
            {/* Big Amount input */}
            <div className="relative flex-1 min-w-[140px]">
              <input
                type="number"
                step="any"
                min="1"
                required
                value={fastOrderValue}
                onChange={(e) => setFastOrderValue(e.target.value)}
                placeholder="قيمة الأوردر بالجنيه (مثال: 120)"
                className="w-full pl-12 pr-4 py-2.5 bg-white border-2 border-emerald-400 rounded-xl text-base font-extrabold font-mono text-slate-900 focus:outline-hidden focus:border-emerald-600"
              />
              <span className="absolute left-3 top-3 text-xs font-bold text-slate-400">
                جنيه
              </span>
            </div>

            {/* Quick Presets */}
            <div className="hidden sm:flex items-center gap-1">
              {[50, 100, 150, 200].map((pr) => (
                <button
                  key={pr}
                  type="button"
                  onClick={() => setFastOrderValue(String(pr))}
                  className="px-2 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg text-xs font-mono font-bold"
                >
                  {pr}ج
                </button>
              ))}
            </div>

            {/* Payment method toggle: نقدي أو فيزا أو انستاباي */}
            <div className="flex bg-white p-1 rounded-xl border border-emerald-300">
              <button
                type="button"
                onClick={() => setFastPaymentMethod('cash')}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition ${
                  fastPaymentMethod === 'cash'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                نقدي
              </button>
              <button
                type="button"
                onClick={() => setFastPaymentMethod('visa')}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition ${
                  fastPaymentMethod === 'visa'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                فيزا
              </button>
              <button
                type="button"
                onClick={() => setFastPaymentMethod('instapay')}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition ${
                  fastPaymentMethod === 'instapay'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                انستاباي
              </button>
            </div>

            {/* Select Courier */}
            <select
              value={fastCourierId || pharmacyCouriers[0]?.id || ''}
              onChange={(e) => setFastCourierId(e.target.value)}
              disabled={pharmacyCouriers.length === 0}
              className="px-3 py-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-900 min-w-[150px]"
            >
              {pharmacyCouriers.length === 0 ? (
                <option value="">لا يوجد مناديب مسجلين</option>
              ) : (
                pharmacyCouriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.vehicleType})
                  </option>
                ))
              )}
            </select>

            {/* Submit button */}
            <button
              type="submit"
              disabled={pharmacyCouriers.length === 0}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-sm transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إرسال فوري للأوردر (Enter)</span>
            </button>
          </form>
        </div>

        {/* Real Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium block">
              مناديب الصيدلية في الشيفت
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-extrabold font-mono text-slate-900">
                {activeCouriersCount}
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                من إجمالي {pharmacyCouriers.length}
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium block">
              أوردرات جاري توصيلها
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-extrabold font-mono text-indigo-600">
                {inTransitOrdersCount}
              </span>
              <span className="text-xs text-slate-500 font-semibold">في الطريق</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium block">
              أوردرات تم تسليمها
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-extrabold font-mono text-emerald-600">
                {deliveredTodayCount}
              </span>
              <span className="text-xs text-slate-500 font-semibold">مكتمل</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium block">
              مبالغ الكاش في عهدة المناديب
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-extrabold font-mono text-slate-900">
                {totalCashCollected}
              </span>
              <span className="text-xs text-slate-500 font-semibold">جنيه</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-2xl max-w-xl text-xs font-bold">
        <button
          onClick={() => setActiveTab('couriers')}
          className={`flex-1 py-2 px-3 rounded-xl transition ${
            activeTab === 'couriers'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          مناديب الصيدلية ({pharmacyCouriers.length})
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 py-2 px-3 rounded-xl transition ${
            activeTab === 'orders'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          الأوردرات النشطة ({activeOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('archive')}
          className={`flex-1 py-2 px-3 rounded-xl transition ${
            activeTab === 'archive'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          الأرشيف السحابي ({archivedOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('shifts')}
          className={`flex-1 py-2 px-3 rounded-xl transition ${
            activeTab === 'shifts'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          سجل الشفتات ({pharmacyShiftSummaries.length})
        </button>

        <button
          onClick={() => setActiveTab('map')}
          className={`flex-1 py-2 px-3 rounded-xl transition ${
            activeTab === 'map'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          الخريطة المباشرة
        </button>
      </div>

      {/* Tab 1: Couriers */}
      {activeTab === 'couriers' && (
        <div className="space-y-4">
          {pharmacyCouriers.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
              <Bike className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-extrabold text-slate-800">
                لا يوجد مناديب مسجلين في {pharmacy.name} حتى الآن
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                النظام يعمل ببيانات حقيقية تماماً بدون بيانات وهمية. اضغط على الزر أدناه لتسجيل أول مندوب توصيل لهذه الصيدلية.
              </p>
              <button
                onClick={onOpenAuthModal}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ تسجيل مندوب جديد لهذه الصيدلية</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pharmacyCouriers.map((courier) => {
                const courierOrders = activeOrders.filter((o) => o.courierId === courier.id);
                const isAlerting = courier.isStoppageAlertActive;
                const isStationary = courier.currentLocation.isStationary;

                return (
                  <div
                    key={courier.id}
                    className={`bg-white rounded-3xl p-5 border transition-all ${
                      isAlerting
                        ? 'border-red-500 shadow-md ring-2 ring-red-400'
                        : 'border-slate-200 shadow-xs hover:border-slate-300'
                    }`}
                  >
                    {/* Top Bar of Card */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg ${
                            isAlerting
                              ? 'bg-red-100 text-red-600 animate-bounce'
                              : 'bg-indigo-50 text-indigo-700'
                          }`}
                        >
                          {courier.vehicleType === 'دراجة' ? '🚲' : '🏍️'}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900">
                            {courier.name}
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            {courier.vehicleType} ({courier.vehicleNumber}) · {courier.phone}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          courier.isOnDuty && !courier.shift.isEnded
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {courier.isOnDuty && !courier.shift.isEnded ? 'في الشيفت' : 'خارج الشيفت'}
                      </span>
                    </div>

                    {/* Location & Real Inactivity status */}
                    <div className="bg-slate-50 rounded-2xl p-3 mb-3 border border-slate-200 space-y-1.5 text-xs">
                      {courier.currentLocation.isGpsLive && (
                        <div className="flex items-center justify-between text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-lg border border-emerald-200 mb-1">
                          <span className="flex items-center gap-1 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            <span>📡 بث GPS حقيقي مباشر</span>
                          </span>
                          <span className="font-mono">±{courier.currentLocation.accuracy || 5}م</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1 truncate max-w-[180px]">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{courier.currentLocation.address}</span>
                        </span>
                        <span className="font-mono text-[11px] font-bold text-slate-700">
                          {courier.currentLocation.speedKmH} كم/س
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-400 font-mono" dir="ltr">
                        {courier.currentLocation.lat.toFixed(6)}, {courier.currentLocation.lng.toFixed(6)}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                        <span className="text-slate-500 text-[11px]">حالة الحركة:</span>
                        {isAlerting ? (
                          <span className="text-red-600 font-extrabold text-[11px] flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            إنذار: متوقف منذ {formatDurationSeconds(courier.currentLocation.stationarySeconds)}!
                          </span>
                        ) : isStationary ? (
                          <span className="text-amber-600 font-bold text-[11px]">
                            متوقف ({formatDurationSeconds(courier.currentLocation.stationarySeconds)})
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold text-[11px]">
                            يتحرك الآن 🟢
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mini Piggy Bank / Commission Box */}
                    <div className="bg-gradient-to-r from-amber-50 to-amber-100/60 rounded-2xl p-3 mb-3 border border-amber-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-amber-900 font-semibold block">
                            أرباح المندوب (الحصالة)
                          </span>
                          <div className="text-lg font-mono font-extrabold text-amber-950">
                            {courier.shift.totalDeliveryEarnings} جنيه
                          </div>
                        </div>
                        <div className="text-left text-xs">
                          <span className="text-[10px] text-amber-800 block">
                            عمولة الأوردر:
                          </span>
                          <div className="flex items-center gap-1 font-mono font-bold text-amber-900">
                            <input
                              type="number"
                              min="1"
                              value={courier.deliveryFeePerOrder}
                              onChange={(e) =>
                                store.setCourierDeliveryFee(courier.id, Number(e.target.value))
                              }
                              className="w-12 px-1 py-0.5 bg-white border border-amber-300 rounded text-center text-xs"
                              title="تعديل قيمة عمولة هذا المندوب (7 ج أو أكثر أو أقل)"
                            />
                            <span>ج</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-amber-200 flex justify-between text-[11px] text-amber-900 font-medium">
                        <span>أوردرات منجزة: {courier.shift.totalOrdersDelivered}</span>
                        <span>كاش في عهدته: {courier.shift.totalCollectedCash} ج</span>
                      </div>
                    </div>

                    {/* Active Orders Count Badge */}
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-3 px-1">
                      <span>الأوردرات الجارية:</span>
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">
                        {courierOrders.length} أوردر
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      {/* Action 1: Save / Archive Courier Orders */}
                      <button
                        onClick={() => handleArchiveCourierOrders(courier.id)}
                        disabled={courierOrders.length === 0}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                          courierOrders.length > 0
                            ? 'bg-slate-800 hover:bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                        title="تختفي الأوردرات من صفحة المندوب وتظهر صفحته فارغة ونظيفة مع حفظها سحابياً"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>حفظ وأرشفة أوردرات المندوب (تفريغ صفحته)</span>
                      </button>

                      {/* Action 2: End Shift */}
                      {courier.isOnDuty && !courier.shift.isEnded ? (
                        <button
                          onClick={() => handleEndShift(courier.id)}
                          className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>إنهاء الشيفت وعرض الحصالة الذهبية</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => store.startNewShift(courier.id)}
                          className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>بدء شيفت جديد للمندوب</span>
                        </button>
                      )}

                      {/* Real Stoppage Test Helpers */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          onClick={() => store.simulateCourierMovement(courier.id)}
                          className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition"
                        >
                          <Navigation className="w-3 h-3 text-emerald-600" />
                          <span>تحريك تجريبي</span>
                        </button>
                        <button
                          onClick={() => store.simulateStoppage(courier.id, 305)}
                          className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition"
                        >
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>فحص جرس 5د</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Orders (قيمة فقط) */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                قائمة الأوردرات النشطة في {pharmacy.name}
              </h2>
              <p className="text-xs text-slate-500">
                أوردرات بالقيمة والعمولة وطريقة التحصيل (سريعة بدون بيانات عميل)
              </p>
            </div>
            <button
              onClick={onOpenNewOrder}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة أوردر سريع</span>
            </button>
          </div>

          {activeOrders.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-700">لا توجد أوردرات نشطة حالياً</h4>
              <p className="text-xs text-slate-400 mt-1">
                استخدم شريط الإدخال السريع بالأعلى لإدخال قيمة الأوردر بالجنيه فوراً
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold">
                    <th className="pb-3 pr-2">رقم الأوردر</th>
                    <th className="pb-3">قيمة الأوردر</th>
                    <th className="pb-3">طريقة الدفع</th>
                    <th className="pb-3">المندوب المسند له</th>
                    <th className="pb-3">عمولة المندوب (المحفظة)</th>
                    <th className="pb-3">وقت الإسناد</th>
                    <th className="pb-3">الحالة</th>
                    <th className="pb-3 pl-2 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeOrders.map((order) => {
                    const assignedCourier = pharmacyCouriers.find((c) => c.id === order.courierId);
                    return (
                      <tr key={order.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 pr-2 font-mono font-black text-slate-900 text-sm">
                          {order.orderNumber}
                        </td>
                        <td className="py-3 font-mono font-extrabold text-slate-900 text-base">
                          {order.orderValue} جنيه
                          {order.quickNote && (
                            <span className="block text-[10px] text-slate-500 font-normal">
                              ({order.quickNote})
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                order.paymentMethod === 'cash'
                                  ? 'bg-emerald-50 text-emerald-800'
                                  : order.paymentMethod === 'visa'
                                  ? 'bg-purple-50 text-purple-800'
                                  : 'bg-blue-50 text-blue-800'
                              }`}
                            >
                              {order.paymentMethod === 'cash' && '💵 نقدي'}
                              {order.paymentMethod === 'visa' && '💳 فيزا'}
                              {order.paymentMethod === 'instapay' && '⚡ انستاباي'}
                            </span>
                            {order.updatedAt && (
                              <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-bold" title="تم تعديل هذا الأوردر من قِبل الصيدلي">
                                معدل ⚡
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="font-bold text-indigo-700">
                            {assignedCourier ? assignedCourier.name : 'غير محدد'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {assignedCourier?.vehicleType}
                          </div>
                        </td>
                        <td className="py-3 font-mono font-bold text-amber-700 text-sm">
                          +{order.deliveryFee} ج
                        </td>
                        <td className="py-3 text-[11px] text-slate-500 font-mono">
                          {new Date(order.assignedAt).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              order.status === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'in_transit'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {order.status === 'assigned' && 'تم الإسناد'}
                            {order.status === 'picked_up' && 'تم الاستلام'}
                            {order.status === 'in_transit' && 'في الطريق'}
                            {order.status === 'delivered' && 'تم التسليم والتحصيل'}
                          </span>
                        </td>
                        <td className="py-3 pl-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Edit Order (نقدي / فيزا / انستاباي / القيمة) */}
                            <button
                              onClick={() => onOpenEditOrder(order)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              title="تعديل الأوردر (نقدي/فيزا/انستاباي/القيمة)"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Transfer order to another courier */}
                            <button
                              onClick={() => onOpenTransferModal(order)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="تحويل الأوردر لمندوب آخر"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>

                            {/* Mark Delivered if done */}
                            {order.status !== 'delivered' && (
                              <button
                                onClick={() => store.updateOrderStatus(order.id, 'delivered')}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                title="تحديد كـ تم التسليم والتحصيل"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Cloud Archive */}
      {activeTab === 'archive' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                الأرشيف السحابي للأوردرات المحفوظة
              </h2>
              <p className="text-xs text-slate-500">
                الأوردرات المحفوظة سحابياً باليوم والتاريخ والوقت والقيمة
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              إجمالي الأوردرات المؤرشفة: {archivedOrders.length}
            </span>
          </div>

          {archivedOrders.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Archive className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-700">الأرشيف فارغ حالياً</h4>
              <p className="text-xs text-slate-400 mt-1">
                عند الضغط على "حفظ وأرشفة أوردرات المندوب"، ستختفي الأوردرات من شاشته وتظهر هنا في الأرشيف السحابي
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {archivedOrders.map((order) => {
                const assignedCourier = pharmacyCouriers.find((c) => c.id === order.courierId);
                const archivedDate = order.archivedAt ? new Date(order.archivedAt) : new Date(order.createdAt);

                return (
                  <div
                    key={order.id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
                        📁
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">
                            {order.orderNumber}
                          </span>
                          <span className="font-bold text-slate-800 font-mono text-sm">
                            - {order.orderValue} جنيه ({order.paymentMethod === 'cash' ? 'نقدي' : order.paymentMethod === 'visa' ? 'فيزا' : 'انستاباي'})
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                          <span>المندوب: <strong className="text-slate-700">{assignedCourier?.name}</strong></span>
                          <span>·</span>
                          <span>
                            تاريخ الأرشفة:{' '}
                            <strong className="text-slate-700 font-mono">
                              {archivedDate.toLocaleDateString('ar-EG')} - {archivedDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-left">
                        <span className="text-xs font-mono font-bold text-amber-700">
                          عمولة: +{order.deliveryFee} ج
                        </span>
                      </div>

                      <button
                        onClick={() => store.restoreCourierOrders(order.courierId)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition"
                        title="إعادة إظهار أوردرات هذا المندوب في صفحته"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>إعادة للمندوب</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Shift Summaries Log */}
      {activeTab === 'shifts' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                سجل الشفتات المنتهية وإغلاقات الحصالة
              </h2>
              <p className="text-xs text-slate-500">
                أرشيف جميع الشفتات السابقة التي تم إنهاؤها مع تفاصيل الأرباح والمبالغ المحصلة
              </p>
            </div>
            {pharmacyShiftSummaries.length > 0 && (
              <button
                onClick={() => {
                  setPdfModalSummary(null);
                  setIsShiftPdfModalOpen(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition self-start sm:self-auto"
              >
                <FileText className="w-4 h-4" />
                <span>تصدير السجل المالي المجمع (PDF)</span>
              </button>
            )}
          </div>

          {pharmacyShiftSummaries.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-700">لا توجد شفتات منتهية بعد لهذه الصيدلية</h4>
              <p className="text-xs text-slate-400 mt-1">
                عند إنهاء شيفت أي مندوب سيتم تسجيل التقرير الشامل هنا تلقائياً
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pharmacyShiftSummaries.map((summary) => (
                <div
                  key={summary.id}
                  className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-100/60 transition cursor-pointer"
                  onClick={() => onOpenPiggyBank(summary)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg">
                      🪙
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">
                          شيفت: {summary.courierName}
                        </span>
                        <span className="text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded-full font-medium text-slate-600">
                          {summary.shiftDate}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        عدد الأوردرات المنجزة: <strong className="text-slate-800">{summary.totalOrdersCount}</strong> · كاش محصل: <strong className="text-emerald-700 font-mono">{summary.totalCashCollected} ج</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
                    <div className="text-left pl-2">
                      <span className="text-[11px] text-amber-800 font-semibold block">
                        أرباح المندوب (الحصالة)
                      </span>
                      <span className="text-base font-mono font-extrabold text-amber-950">
                        {summary.totalDeliveryFees} جنيه
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPdfModalSummary(summary);
                          setIsShiftPdfModalOpen(true);
                        }}
                        className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                        title="تصدير ملخص هذا الشيفت إلى ملف PDF"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>تصدير PDF</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPiggyBank(summary);
                        }}
                        className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>عرض الحصالة</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Live Map */}
      {activeTab === 'map' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  خريطة التتبع المباشر لمناديب {pharmacy.name}
                </h2>
                <p className="text-xs text-slate-500">
                  تتبع مباشر لأماكن المناديب وحركتهم وإنذار التوقف 5 دقائق
                </p>
              </div>
            </div>

            <LiveMap
              pharmacy={pharmacy}
              couriers={pharmacyCouriers}
              orders={pharmacyOrders}
              selectedCourierId={selectedCourierId}
              onSelectCourier={(id) => setSelectedCourierId(id)}
            />
          </div>
        </div>
      )}

      {/* Add Pharmacy Modal (Pharmacist Manager only) */}
      <AddPharmacyModal
        isOpen={isAddPharmacyOpen}
        onClose={() => setIsAddPharmacyOpen(false)}
      />

      {/* Manage & Delete Pharmacies Modal */}
      <ManagePharmaciesModal
        isOpen={isManagePharmaciesOpen}
        onClose={() => setIsManagePharmaciesOpen(false)}
        pharmacies={pharmacies}
        activePharmacyId={pharmacy.id}
        couriers={couriers}
        orders={orders}
      />

      {/* Export Shift Summary PDF Modal */}
      <ShiftPdfModal
        isOpen={isShiftPdfModalOpen}
        onClose={() => setIsShiftPdfModalOpen(false)}
        summary={pdfModalSummary}
        pharmacy={pharmacy}
        allPharmacySummaries={pharmacyShiftSummaries}
      />
    </div>
  );
};
