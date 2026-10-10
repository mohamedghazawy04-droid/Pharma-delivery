import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Bike,
  Lock,
  Phone,
  Building2,
  Check,
  ShieldCheck,
  UserPlus,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { CourierProfile, Pharmacy } from '../types';
import { store } from '../services/store';

interface Props {
  pharmacies: Pharmacy[];
  activePharmacyId: string;
  defaultMode?: 'pharmacist' | 'courier' | 'register_courier';
  lockMode?: 'pharmacist' | 'courier';
}

export const LoginScreen: React.FC<Props> = ({
  pharmacies,
  activePharmacyId,
  defaultMode = 'pharmacist',
  lockMode,
}) => {
  const [authMode, setAuthMode] = useState<'pharmacist' | 'courier' | 'register_courier'>(
    lockMode === 'courier' ? 'courier' : defaultMode
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regSuccessMessage, setRegSuccessMessage] = useState('');

  // Pharmacist Login
  const [selectedPharmacyId, setSelectedPharmacyId] = useState(activePharmacyId);
  const [pharmaPassword, setPharmaPassword] = useState('');
  const [pharmaError, setPharmaError] = useState('');

  // Courier Login
  const [courierPhone, setCourierPhone] = useState('');
  const [courierPassword, setCourierPassword] = useState('');
  const [courierError, setCourierError] = useState('');

  // Courier Registration
  const [newCourierName, setNewCourierName] = useState('');
  const [newCourierPhone, setNewCourierPhone] = useState('');
  const [newCourierPassword, setNewCourierPassword] = useState('');
  const [newCourierNationalId, setNewCourierNationalId] = useState('');
  const [newCourierVehicle, setNewCourierVehicle] = useState<CourierProfile['vehicleType']>('موتوسيكل');
  const [newCourierPlate, setNewCourierPlate] = useState('');
  const [newCourierPharmacyId, setNewCourierPharmacyId] = useState(activePharmacyId);

  useEffect(() => {
    if (!newCourierPharmacyId && pharmacies.length > 0) {
      setNewCourierPharmacyId(activePharmacyId || pharmacies[0].id);
    }
    if (!selectedPharmacyId && pharmacies.length > 0) {
      setSelectedPharmacyId(activePharmacyId || pharmacies[0].id);
    }
  }, [pharmacies, activePharmacyId]);

  const handlePharmacistLogin = (e: React.FormEvent) => {
    e.preventDefault();
    store.setActivePharmacy(selectedPharmacyId);
    const res = store.loginPharmacist(pharmaPassword);
    if (!res.success) {
      setPharmaError(res.error || 'كلمة المرور غير صحيحة');
    } else {
      setPharmaPassword('');
      setPharmaError('');
    }
  };

  const handleCourierLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setCourierError('');
    try {
      const res = await store.loginCourierAsync(courierPhone, courierPassword);
      if (!res.success) {
        setCourierError(res.error || 'رقم الهاتف أو كلمة المرور غير صحيحة');
      } else {
        setCourierPhone('');
        setCourierPassword('');
        setCourierError('');
      }
    } catch (err: any) {
      setCourierError('حدث خطأ أثناء محاولة تسجيل الدخول');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourierName.trim() || !newCourierPhone.trim() || !newCourierPassword.trim()) {
      setCourierError('برجاء استكمال كافة البيانات الإلزامية للمندوب (الاسم، الهاتف، وكلمة المرور)');
      return;
    }

    setIsSubmitting(true);
    setCourierError('');
    setRegSuccessMessage('');

    try {
      const chosenPharmaId = newCourierPharmacyId || activePharmacyId || pharmacies[0]?.id || 'pharma-main';
      const registered = await store.registerCourierAsync({
        pharmacyId: chosenPharmaId,
        name: newCourierName.trim(),
        phone: newCourierPhone.trim(),
        password: newCourierPassword.trim(),
        vehicleType: newCourierVehicle,
        vehicleNumber: newCourierPlate.trim() || 'بدون لوحة',
        nationalId: newCourierNationalId.trim(),
      });

      setRegSuccessMessage(`تم تسجيل الكابتن ${registered.name} بنجاح، وربطه بالنظام السحابي!`);
    } catch (err: any) {
      setCourierError(err?.message || 'حدث خطأ أثناء حفظ بيانات المندوب، يرجى المحاولة ثانية');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="max-w-md w-full">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 text-white shadow-lg text-3xl mb-4 border border-emerald-400/30">
            💊
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            فارما ديليفري
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            المنظومة الذكية لإدارة وتتبع مناديب الصيدلية
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Main Top Role Toggle / Header */}
          {lockMode === 'courier' ? (
            <div className="py-4 px-4 bg-indigo-950 text-white text-center border-b border-indigo-900 flex items-center justify-center gap-2">
              <Bike className="w-5 h-5 text-indigo-400" />
              <div>
                <strong className="text-sm block font-extrabold">تطبيق صفحة المندوب</strong>
                <span className="text-[11px] text-indigo-300">تسجيل الدخول خاص بالمندوب فقط</span>
              </div>
            </div>
          ) : lockMode === 'pharmacist' ? (
            <div className="py-4 px-4 bg-emerald-950 text-white text-center border-b border-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2 text-right">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <strong className="text-sm block font-extrabold">لوحة إدارة وتحكم الصيدلي</strong>
                  <span className="text-[11px] text-emerald-300">تحكم كامل في الأوردرات والمناديب</span>
                </div>
              </div>
              <a
                href="?role=courier"
                className="text-[11px] bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg text-emerald-200 transition"
                title="فتح صفحة المندوب المستقلة"
              >
                صفحة المندوب ↗
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 text-xs font-bold text-center">
              <button
                onClick={() => {
                  setAuthMode('pharmacist');
                  setPharmaError('');
                }}
                className={`py-3.5 px-3 border-b-2 transition flex items-center justify-center gap-1.5 ${
                  authMode === 'pharmacist'
                    ? 'border-emerald-600 text-emerald-800 bg-white font-black'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>تسجيل دخول الصيدلي</span>
              </button>

              <button
                onClick={() => {
                  setAuthMode('courier');
                  setCourierError('');
                }}
                className={`py-3.5 px-3 border-b-2 transition flex items-center justify-center gap-1.5 ${
                  authMode === 'courier' || authMode === 'register_courier'
                    ? 'border-indigo-600 text-indigo-800 bg-white font-black'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Bike className="w-4 h-4 text-indigo-600" />
                <span>تسجيل دخول المندوب</span>
              </button>
            </div>
          )}

          <div className="p-6">
            {/* 1. Pharmacist Manager Login */}
            {authMode === 'pharmacist' && (
              <form onSubmit={handlePharmacistLogin} className="space-y-4">
                <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                  <div>
                    <strong className="block">دخول إدارة الصيدلية (المدير الصيدلي)</strong>
                    <span className="text-[11px] text-emerald-800">
                      إدارة الأوردرات، إضافة الصيدليات، متابعة المناديب والحصالة
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    اختيار الصيدلية / الفرع *
                  </label>
                  <select
                    value={selectedPharmacyId}
                    onChange={(e) => setSelectedPharmacyId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden"
                  >
                    {pharmacies.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.address})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    كلمة مرور الصيدلي *
                  </label>
                  <input
                    type="password"
                    required
                    value={pharmaPassword}
                    onChange={(e) => {
                      setPharmaPassword(e.target.value);
                      setPharmaError('');
                    }}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:border-emerald-500 focus:outline-hidden transition"
                  />
                  {pharmaError && (
                    <p className="text-xs text-rose-600 font-bold mt-1.5">{pharmaError}</p>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>تسجيل الدخول كصيدلي</span>
                  </button>
                </div>
              </form>
            )}

            {/* 2. Courier Login */}
            {authMode === 'courier' && (
              <form onSubmit={handleCourierLogin} className="space-y-4">
                <div className="bg-indigo-50/70 p-3 rounded-2xl border border-indigo-200 text-xs text-indigo-900 flex items-center gap-2">
                  <Bike className="w-5 h-5 text-indigo-700 shrink-0" />
                  <div>
                    <strong className="block">دخول مندوب التوصيل</strong>
                    <span className="text-[11px] text-indigo-800">
                      استلام الأوردرات وتحديث حالة التسليم والحصالة
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    رقم الهاتف المسجل *
                  </label>
                  <input
                    type="tel"
                    required
                    value={courierPhone}
                    onChange={(e) => {
                      setCourierPhone(e.target.value);
                      setCourierError('');
                    }}
                    placeholder="01xxxxxxxxx"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-left focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    كلمة المرور *
                  </label>
                  <input
                    type="password"
                    required
                    value={courierPassword}
                    onChange={(e) => {
                      setCourierPassword(e.target.value);
                      setCourierError('');
                    }}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-hidden"
                  />
                  {courierError && (
                    <p className="text-xs text-rose-600 font-bold mt-1.5">{courierError}</p>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري التحقق والدخول...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>تسجيل الدخول كمندوب</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-center pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setAuthMode('register_courier')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center justify-center gap-1 mx-auto"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>مندوب جديد؟ اضغط هنا لإنشاء حساب</span>
                  </button>
                </div>
              </form>
            )}

            {/* 3. New Courier Registration */}
            {authMode === 'register_courier' && (
              <form onSubmit={handleRegisterCourier} className="space-y-3.5">
                <div className="bg-indigo-50/70 p-3 rounded-2xl border border-indigo-200 text-xs text-indigo-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-700 shrink-0" />
                  <div>
                    <strong className="block">تسجيل مندوب توصيل جديد</strong>
                    <span className="text-[11px] text-indigo-800">
                      بيانات حقيقية مع الحفظ السحابي
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الصيدلية التابع لها *
                  </label>
                  <select
                    value={newCourierPharmacyId}
                    onChange={(e) => setNewCourierPharmacyId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    {pharmacies.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      اسم المندوب *
                    </label>
                    <input
                      type="text"
                      required
                      value={newCourierName}
                      onChange={(e) => setNewCourierName(e.target.value)}
                      placeholder="الاسم"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      رقم الهاتف (للدخول) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={newCourierPhone}
                      onChange={(e) => setNewCourierPhone(e.target.value)}
                      placeholder="01xxxxxxxxx"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-left focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      كلمة المرور *
                    </label>
                    <input
                      type="password"
                      required
                      value={newCourierPassword}
                      onChange={(e) => setNewCourierPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      الرقم القومي (اختياري)
                    </label>
                    <input
                      type="text"
                      value={newCourierNationalId}
                      onChange={(e) => setNewCourierNationalId(e.target.value)}
                      placeholder="14 رقم"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-left"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      وسيلة التوصيل
                    </label>
                    <select
                      value={newCourierVehicle}
                      onChange={(e) =>
                        setNewCourierVehicle(e.target.value as CourierProfile['vehicleType'])
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      <option value="موتوسيكل">موتوسيكل</option>
                      <option value="سكوتر">سكوتر</option>
                      <option value="دراجة">دراجة</option>
                      <option value="سيارة">سيارة</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      رقم اللوحة / المركبة
                    </label>
                    <input
                      type="text"
                      value={newCourierPlate}
                      onChange={(e) => setNewCourierPlate(e.target.value)}
                      placeholder="رقم اللوحة"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>

                {regSuccessMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{regSuccessMessage}</span>
                  </div>
                )}

                {courierError && authMode === 'register_courier' && (
                  <p className="text-xs text-rose-600 font-bold">{courierError}</p>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري الحفظ السحابي والتسجيل...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>تسجيل الحساب ودخول الشاشة</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-center pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setAuthMode('courier')}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 transition"
                  >
                    لديك حساب بالفعل؟ العودة لتسجيل الدخول
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Clean Footer */}
        <div className="text-center mt-6 text-xs text-slate-500">
          فارما ديليفري © {new Date().getFullYear()} · نظام مشفر وآمن
        </div>
      </div>
    </div>
  );
};
