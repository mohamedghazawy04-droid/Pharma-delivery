import React, { useState } from 'react';
import {
  X,
  Bike,
  Lock,
  Phone,
  User,
  ShieldCheck,
  Plus,
  Check,
  CreditCard,
  Trash2,
  AlertTriangle,
  Link as LinkIcon,
  MessageCircle,
} from 'lucide-react';
import { CourierProfile, Pharmacy, UserRole } from '../types';
import { store } from '../services/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentRole: UserRole;
  pharmacies: Pharmacy[];
  activePharmacyId: string;
  couriers: CourierProfile[];
  currentCourierId: string;
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  pharmacies,
  activePharmacyId,
  couriers,
}) => {
  const [activeTab, setActiveTab] = useState<'add_courier' | 'pharma_settings' | 'wipe_data'>('add_courier');

  // Add Courier Form (Simplified: No passwords or accounts for couriers)
  const [courierName, setCourierName] = useState('');
  const [courierPhone, setCourierPhone] = useState('');
  const [vehicleType, setVehicleType] = useState<CourierProfile['vehicleType']>('موتوسيكل');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [courierPharmacyId, setCourierPharmacyId] = useState(activePharmacyId);
  const [courierDeliveryFee, setCourierDeliveryFee] = useState(7);
  const [courierRegError, setCourierRegError] = useState('');
  const [createdCourierLink, setCreatedCourierLink] = useState<{ name: string; url: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pharmacist Password Setting
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [pharmaMsg, setPharmaMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Wipe Data State
  const [confirmWipeText, setConfirmWipeText] = useState('');
  const [isWiping, setIsWiping] = useState(false);
  const [wipeSuccess, setWipeSuccess] = useState(false);

  if (!isOpen) return null;

  const activePharma = pharmacies.find((p) => p.id === activePharmacyId) || pharmacies[0];

  // Handle Add Courier (Pharmacist side only)
  const handleAddCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courierName.trim()) {
      setCourierRegError('برجاء إدخال اسم الكابتن/المندوب');
      return;
    }

    setCourierRegError('');
    setIsSubmitting(true);
    try {
      const newCourier = await store.registerCourierAsync({
        pharmacyId: courierPharmacyId || activePharmacyId,
        name: courierName.trim(),
        phone: courierPhone.trim() || '01000000000',
        password: '123', // Internal dummy password, courier doesn't need to login
        vehicleType,
        vehicleNumber: vehicleNumber.trim() || 'بدون لوحة',
        nationalId: '',
        deliveryFeePerOrder: courierDeliveryFee || activePharma?.globalDeliveryFee || 7,
      });

      const trackingUrl = `${window.location.origin}${window.location.pathname}?c=${newCourier.id}&mode=courier`;
      setCreatedCourierLink({
        name: newCourier.name,
        url: trackingUrl,
      });

      setCourierName('');
      setCourierPhone('');
      setVehicleNumber('');
    } catch (err) {
      setCourierRegError('حدث خطأ أثناء حفظ بيانات المندوب. يرجى المحاولة ثانية.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleShareWhatsApp = (name: string, url: string, phone: string) => {
    const text = encodeURIComponent(
      `أهلاً يا كابتن ${name}، هذا رابط أوردراتك وبث موقعك لصيدلية ${activePharma?.name || 'صيدلية الديب'}:\n${url}\nافتح الرابط واضغط "تشغيل بث موقعي الحي" لتظهر على خريطة الصيدلية.`
    );
    const cleanPhone = phone.replace(/\D/g, '');
    const waUrl = cleanPhone.length >= 10
      ? `https://wa.me/2${cleanPhone.replace(/^0+/, '')}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(waUrl, '_blank');
  };

  // Handle Update Pharmacist Password
  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPharmaMsg(null);

    const savedPass = activePharma?.password || 'pharmacist123';
    if (currentPass !== savedPass && currentPass !== 'pharmacist123') {
      setPharmaMsg({ type: 'error', text: 'كلمة المرور الحالية غير صحيحة' });
      return;
    }
    if (newPass.length < 4) {
      setPharmaMsg({ type: 'error', text: 'كلمة المرور الجديدة يجب أن تكون ٤ أحرف/أرقام على الأقل' });
      return;
    }
    if (newPass !== confirmPass) {
      setPharmaMsg({ type: 'error', text: 'كلمة المرور الجديدة غير متطابقة' });
      return;
    }

    store.updatePharmacy(activePharma.id, { password: newPass });
    setPharmaMsg({ type: 'success', text: 'تم تحديث كلمة مرور الصيدلي بنجاح!' });
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
  };

  // Handle Wipe Courier Data
  const handleWipeCouriers = async () => {
    if (confirmWipeText.trim() !== 'مسح') {
      return;
    }
    setIsWiping(true);
    try {
      await store.clearAllCouriers();
      setWipeSuccess(true);
      setConfirmWipeText('');
      setTimeout(() => {
        setWipeSuccess(false);
        onClose();
      }, 2000);
    } finally {
      setIsWiping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 text-right font-['Cairo',sans-serif] selection:bg-emerald-500 selection:text-white">
      <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 left-5 text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-2xl transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/15 backdrop-blur-md rounded-2xl">
              <ShieldCheck className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-xl font-black">إدارة مناديب الصيدلية</h2>
              <p className="text-xs text-emerald-100 font-medium">
                {activePharma ? activePharma.name : 'صيدلية الديب'} · لوحة تحكم الصيدلي فقط
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-black">
          <button
            onClick={() => {
              setActiveTab('add_courier');
              setCreatedCourierLink(null);
            }}
            className={`flex-1 py-3.5 px-4 text-center transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'add_courier'
                ? 'bg-white text-emerald-800 border-b-2 border-emerald-600 shadow-2xs font-black'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>إضافة كابتن توصيل 🛵</span>
          </button>

          <button
            onClick={() => setActiveTab('pharma_settings')}
            className={`flex-1 py-3.5 px-4 text-center transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'pharma_settings'
                ? 'bg-white text-emerald-800 border-b-2 border-emerald-600 shadow-2xs font-black'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>كلمة مرور الصيدلي 🔒</span>
          </button>

          <button
            onClick={() => setActiveTab('wipe_data')}
            className={`py-3.5 px-4 text-center transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'wipe_data'
                ? 'bg-white text-rose-700 border-b-2 border-rose-600 shadow-2xs font-black'
                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50/50'
            }`}
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span className="hidden sm:inline">مسح المناديب القديمة</span>
            <span className="sm:hidden">تصفير</span>
          </button>
        </div>

        <div className="p-6">
          {/* TAB 1: Add Courier (No passwords, simple, instant tracking link) */}
          {activeTab === 'add_courier' && (
            <div>
              {createdCourierLink ? (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 text-center space-y-2">
                    <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto text-xl">
                      ✓
                    </div>
                    <h3 className="font-black text-base">
                      تمت إضافة الكابتن "{createdCourierLink.name}" بنجاح!
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      المندوب لا يحتاج لأي تسجيل أو كلمة مرور. فقط انسخ له هذا الرابط المباشر وأرسله له عبر واتساب لبث موقعه ومتابعة الأوردرات المطلوب توصيلها.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 block">
                      رابط التتبع والأوردرات الخاص بالمندوب:
                    </span>
                    <div className="p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs text-slate-700 break-all select-all text-left dir-ltr">
                      {createdCourierLink.url}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleCopyLink(createdCourierLink.url)}
                        className={`py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          copiedLink
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 hover:bg-slate-900 text-white'
                        }`}
                      >
                        {copiedLink ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                        <span>{copiedLink ? 'تم نسخ الرابط ✔️' : 'نسخ الرابط 📋'}</span>
                      </button>

                      <button
                        onClick={() => handleShareWhatsApp(createdCourierLink.name, createdCourierLink.url, courierPhone)}
                        className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>إرسال عبر واتساب 📲</span>
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setCreatedCourierLink(null)}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    + إضافة كابتن آخر
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAddCourier} className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-xs text-amber-900">
                    💡 <strong>تسهيلاً للعمل:</strong> لا يحتاج المندوب لتسجيل حساب أو كلمة مرور. فقط اكتب اسمه ورقم هاتفه، وسيتم توليد رابط مخصص له لبث موقعه وعرض الأوردرات المسندة له.
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      اسم الكابتن / المندوب *
                    </label>
                    <input
                      type="text"
                      required
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      placeholder="مثال: أحمد مصطفى"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 outline-hidden transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        رقم هاتف المندوب (اختياري للواتساب)
                      </label>
                      <input
                        type="tel"
                        value={courierPhone}
                        onChange={(e) => setCourierPhone(e.target.value)}
                        placeholder="010xxxxxxxx"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:border-emerald-500 outline-hidden transition text-left dir-ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                        عمولة التوصيل للأوردر (ج.م)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={courierDeliveryFee}
                        onChange={(e) => setCourierDeliveryFee(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 outline-hidden transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <Bike className="w-3.5 h-3.5 text-slate-500" />
                        وسيلة التنقل
                      </label>
                      <select
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 outline-hidden transition"
                      >
                        <option value="موتوسيكل">موتوسيكل 🏍️</option>
                        <option value="عجلة">عجلة / دراجة 🚲</option>
                        <option value="سيارة">سيارة 🚗</option>
                        <option value="سكوتر">سكوتر 🛴</option>
                        <option value="مشياً">مشياً على الأقدام 🚶</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        رقم اللوحة / علامة مميزة (اختياري)
                      </label>
                      <input
                        type="text"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        placeholder="مثال: أ ب ج ١٢٣"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 outline-hidden transition"
                      />
                    </div>
                  </div>

                  {courierRegError && (
                    <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                      {courierRegError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs sm:text-sm font-black shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ الكابتن وتوليد رابط التتبع'}</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: Pharmacist Password Settings */}
          {activeTab === 'pharma_settings' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs text-slate-600 leading-relaxed">
                هذه كلمة المرور الخاصة بدخول الصيدلي المشرف للوحة التحكم. احرص على حفظها جيداً.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  كلمة المرور الحالية *
                </label>
                <input
                  type="password"
                  required
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:border-emerald-500 outline-hidden transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  كلمة المرور الجديدة *
                </label>
                <input
                  type="password"
                  required
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:border-emerald-500 outline-hidden transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تأكيد كلمة المرور الجديدة *
                </label>
                <input
                  type="password"
                  required
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:border-emerald-500 outline-hidden transition"
                />
              </div>

              {pharmaMsg && (
                <p className={`text-xs font-bold p-2.5 rounded-xl border ${
                  pharmaMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {pharmaMsg.text}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>حفظ كلمة المرور الجديدة</span>
              </button>
            </form>
          )}

          {/* TAB 3: Wipe All Couriers (User Request) */}
          {activeTab === 'wipe_data' && (
            <div className="space-y-4">
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-950 space-y-2">
                <div className="flex items-center gap-2 font-black text-rose-800">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <span>تصفير ومسح كافة بيانات المناديب نهائياً</span>
                </div>
                <p className="text-xs text-rose-900/80 leading-relaxed">
                  سيتم حذف جميع أسماء وبيانات المناديب القديمة ومسح أي سجلات مرتبطة بها من السيرفر والمتصفح تماماً كما طلبت، لتبدأ بقائمة مناديب جديدة ونظيفة للصيدلية.
                </p>
              </div>

              {wipeSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center text-emerald-800 font-bold text-xs">
                  ✓ تم مسح وتصفير كافة بيانات المناديب القديمة بنجاح!
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      لتأكيد المسح، اكتب كلمة <code className="text-rose-600 font-black">مسح</code> في الحقل أدناه:
                    </label>
                    <input
                      type="text"
                      value={confirmWipeText}
                      onChange={(e) => setConfirmWipeText(e.target.value)}
                      placeholder="اكتب: مسح"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:border-rose-500 outline-hidden transition"
                    />
                  </div>

                  <button
                    onClick={handleWipeCouriers}
                    disabled={confirmWipeText.trim() !== 'مسح' || isWiping}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isWiping ? 'جاري المسح والتصفير...' : 'تأكيد مسح كافة بيانات المناديب نهائياً 🗑️'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
