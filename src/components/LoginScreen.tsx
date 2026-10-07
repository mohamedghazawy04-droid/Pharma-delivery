import React, { useState } from 'react';
import {
  UserCheck,
  Bike,
  Lock,
  Phone,
  Building2,
  Check,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { CourierProfile, Pharmacy } from '../types';
import { store } from '../services/store';

interface Props {
  pharmacies: Pharmacy[];
  activePharmacyId: string;
}

export const LoginScreen: React.FC<Props> = ({
  pharmacies,
  activePharmacyId,
}) => {
  const [authMode, setAuthMode] = useState<'pharmacist' | 'courier' | 'register_courier'>('pharmacist');

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

  const handleCourierLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const res = store.loginCourier(courierPhone, courierPassword);
    if (!res.success) {
      setCourierError(res.error || 'رقم الهاتف أو كلمة المرور غير صحيحة');
    } else {
      setCourierPhone('');
      setCourierPassword('');
      setCourierError('');
    }
  };

  const handleRegisterCourier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourierName || !newCourierPhone || !newCourierPassword) {
      setCourierError('برجاء استكمال كافة البيانات الإلزامية للمندوب');
      return;
    }

    store.registerCourier({
      pharmacyId: newCourierPharmacyId || activePharmacyId,
      name: newCourierName,
      phone: newCourierPhone,
      password: newCourierPassword,
      vehicleType: newCourierVehicle,
      vehicleNumber: newCourierPlate || 'بدون لوحة',
      nationalId: newCourierNationalId,
    });
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
          {/* Main Top Role Toggle */}
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
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>تسجيل الدخول كمندوب</span>
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

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>تسجيل الحساب ودخول الشاشة</span>
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
