import React, { useState } from 'react';
import {
  X,
  UserCheck,
  Bike,
  Building2,
  Lock,
  Phone,
  User,
  ShieldCheck,
  Plus,
  Check,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
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
  currentRole,
  pharmacies,
  activePharmacyId,
  couriers,
  currentCourierId,
}) => {
  const [activeTab, setActiveTab] = useState<'login_pharma' | 'login_courier' | 'reg_courier' | 'add_pharma'>('login_pharma');

  // Pharmacist Login
  const [pharmaPassword, setPharmaPassword] = useState('');
  const [pharmaError, setPharmaError] = useState('');

  // Courier Login
  const [courierLoginPhone, setCourierLoginPhone] = useState('');
  const [courierLoginPassword, setCourierLoginPassword] = useState('');
  const [courierLoginError, setCourierLoginError] = useState('');

  // Courier Registration
  const [courierName, setCourierName] = useState('');
  const [courierPhone, setCourierPhone] = useState('');
  const [courierPassword, setCourierPassword] = useState('');
  const [courierNationalId, setCourierNationalId] = useState('');
  const [vehicleType, setVehicleType] = useState<CourierProfile['vehicleType']>('موتوسيكل');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [courierPharmacyId, setCourierPharmacyId] = useState(activePharmacyId);
  const [courierDeliveryFee, setCourierDeliveryFee] = useState(7);

  // New Pharmacy Form
  const [newPharmacyName, setNewPharmacyName] = useState('');
  const [newPharmacistName, setNewPharmacistName] = useState('');
  const [newPharmacyPhone, setNewPharmacyPhone] = useState('');
  const [newPharmacyAddress, setNewPharmacyAddress] = useState('');
  const [newPharmacyFee, setNewPharmacyFee] = useState(7);
  const [courierRegError, setCourierRegError] = useState('');
  const [newPharmacyError, setNewPharmacyError] = useState('');

  if (!isOpen) return null;

  // Handle Pharmacist Login
  const handlePharmacistLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const result = store.loginPharmacist(pharmaPassword);
    if (result.success) {
      setPharmaPassword('');
      setPharmaError('');
      onClose();
    } else {
      setPharmaError(result.error || 'كلمة المرور غير صحيحة');
    }
  };

  // Handle Courier Login
  const handleCourierLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const result = store.loginCourier(courierLoginPhone, courierLoginPassword);
    if (result.success) {
      setCourierLoginPhone('');
      setCourierLoginPassword('');
      setCourierLoginError('');
      onClose();
    } else {
      setCourierLoginError(result.error || 'بيانات الدخول غير صحيحة');
    }
  };

  // Handle Courier Registration
  const handleRegisterCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courierName.trim() || !courierPhone.trim() || !courierPassword.trim()) {
      setCourierRegError('برجاء استكمال الاسم ورقم الهاتف وكلمة المرور للمندوب');
      return;
    }

    setCourierRegError('');
    try {
      await store.registerCourierAsync({
        pharmacyId: courierPharmacyId || activePharmacyId,
        name: courierName.trim(),
        phone: courierPhone.trim(),
        password: courierPassword.trim(),
        vehicleType,
        vehicleNumber: vehicleNumber.trim() || 'بدون لوحة',
        nationalId: courierNationalId.trim(),
        deliveryFeePerOrder: courierDeliveryFee,
      });

      setCourierName('');
      setCourierPhone('');
      setCourierPassword('');
      setCourierNationalId('');
      setVehicleNumber('');
      setCourierRegError('');
      onClose();
    } catch (err: any) {
      setCourierRegError(err?.message || 'حدث خطأ أثناء حفظ بيانات المندوب');
    }
  };

  // Handle Add Pharmacy
  const handleAddPharmacy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPharmacyName) {
      setNewPharmacyError('برجاء إدخال اسم الصيدلية');
      return;
    }

    const created = store.addPharmacy({
      name: newPharmacyName,
      pharmacistName: newPharmacistName || 'د. صيدلي',
      phone: newPharmacyPhone || '01000000000',
      address: newPharmacyAddress || 'مصر',
      globalDeliveryFee: Number(newPharmacyFee) || 7,
    });

    setNewPharmacyName('');
    setNewPharmacistName('');
    setNewPharmacyPhone('');
    setNewPharmacyAddress('');
    setNewPharmacyError('');
    store.setActivePharmacy(created.id);
    store.setRole('pharmacist');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 text-white flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base">إدارة الحسابات والصيدليات</h3>
            <p className="text-slate-300 text-xs">
              توثيق المناديب وإدارة الصيدليات ومتابعة السجلات السحابية
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50 text-xs font-bold text-center">
          <button
            onClick={() => setActiveTab('login_pharma')}
            className={`py-3 px-2 border-b-2 transition ${
              activeTab === 'login_pharma'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            دخول صيدلي
          </button>
          <button
            onClick={() => setActiveTab('login_courier')}
            className={`py-3 px-2 border-b-2 transition ${
              activeTab === 'login_courier'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            دخول مندوب
          </button>
          <button
            onClick={() => setActiveTab('reg_courier')}
            className={`py-3 px-2 border-b-2 transition ${
              activeTab === 'reg_courier'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            + تسجيل مندوب
          </button>
          <button
            onClick={() => setActiveTab('add_pharma')}
            className={`py-3 px-2 border-b-2 transition ${
              activeTab === 'add_pharma'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            + صيدلية جديدة
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* TAB 1: Pharmacist Login */}
          {activeTab === 'login_pharma' && (
            <form onSubmit={handlePharmacistLogin} className="space-y-4">
              <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <div className="font-extrabold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  تسجيل دخول الصيدلي المصرح
                </div>
                <p className="text-[11px] text-emerald-800">
                  سجل الدخول بكلمة المرور الخاصة بإدارة الصيدلية
                </p>
              </div>

              {/* Select Pharmacy */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اختر الصيدلية النشطة:
                </label>
                <select
                  value={activePharmacyId}
                  onChange={(e) => store.setActivePharmacy(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                >
                  {pharmacies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.address})
                    </option>
                  ))}
                </select>
              </div>

              {/* Password Input */}
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
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                />
                {pharmaError && (
                  <p className="text-xs text-rose-600 font-bold mt-1">{pharmaError}</p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>دخول لوحة تحكم الصيدلي</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Courier Login */}
          {activeTab === 'login_courier' && (
            <form onSubmit={handleCourierLogin} className="space-y-4">
              <div className="bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-200 text-xs text-indigo-900">
                <div className="font-extrabold flex items-center gap-1.5 mb-1">
                  <Bike className="w-4 h-4 text-indigo-700" />
                  تسجيل دخول مندوب التوصيل
                </div>
                <p className="text-[11px] text-indigo-800">
                  سجل برقم هاتفك وكلمة المرور الخاصة بك المحددة أثناء التسجيل
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  رقم هاتف المندوب *
                </label>
                <input
                  type="tel"
                  required
                  value={courierLoginPhone}
                  onChange={(e) => {
                    setCourierLoginPhone(e.target.value);
                    setCourierLoginError('');
                  }}
                  placeholder="010xxxxxxxx"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-left focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  كلمة المرور للمندوب *
                </label>
                <input
                  type="password"
                  required
                  value={courierLoginPassword}
                  onChange={(e) => {
                    setCourierLoginPassword(e.target.value);
                    setCourierLoginError('');
                  }}
                  placeholder="كلمة المرور"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-hidden"
                />
                {courierLoginError && (
                  <p className="text-xs text-red-600 font-bold mt-1">{courierLoginError}</p>
                )}
              </div>

              {/* Quick List of registered couriers for easy testing */}
              {couriers.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-600 block mb-1.5">
                    المناديب المسجلين حالياً:
                  </span>
                  <div className="space-y-1">
                    {couriers.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setCourierLoginPhone(c.phone);
                          setCourierLoginPassword(c.password);
                        }}
                        className="p-1.5 bg-white hover:bg-slate-100 rounded border border-slate-200 cursor-pointer flex justify-between items-center"
                      >
                        <span className="font-bold text-slate-800">{c.name} ({c.vehicleType})</span>
                        <span className="font-mono text-slate-500 text-[11px]">{c.phone}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>دخول شاشة المندوب</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Courier Registration with Password & Pharmacy selection */}
          {activeTab === 'reg_courier' && (
            <form onSubmit={handleRegisterCourier} className="space-y-3.5">
              {courierRegError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{courierRegError}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الصيدلية التابع لها المندوب *
                </label>
                <select
                  value={courierPharmacyId}
                  onChange={(e) => setCourierPharmacyId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  {pharmacies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم المندوب *
                  </label>
                  <input
                    type="text"
                    required
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    placeholder="مثال: يوسف إبراهيم"
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
                    value={courierPhone}
                    onChange={(e) => setCourierPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-left focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    كلمة المرور للمندوب *
                  </label>
                  <input
                    type="password"
                    required
                    value={courierPassword}
                    onChange={(e) => setCourierPassword(e.target.value)}
                    placeholder="كلمة سر المندوب"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الرقم القومي (اختياري)
                  </label>
                  <input
                    type="text"
                    value={courierNationalId}
                    onChange={(e) => setCourierNationalId(e.target.value)}
                    placeholder="14 رقم"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-left"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    وسيلة النقل
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) =>
                      setVehicleType(e.target.value as CourierProfile['vehicleType'])
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
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="مثال: ق ط أ 123"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  قيمة عمولة المندوب للأوردر (الافتراضي 7 ج)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={courierDeliveryFee}
                    onChange={(e) => setCourierDeliveryFee(Number(e.target.value))}
                    className="w-full pl-12 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono"
                  />
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">
                    جنيه
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>تسجيل المندوب وحفظه سحابياً</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: Add New Pharmacy (امكانيه اضافه اكتر من صيدليه) */}
          {activeTab === 'add_pharma' && (
            <form onSubmit={handleAddPharmacy} className="space-y-3.5">
              <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200 text-xs text-emerald-900">
                <div className="font-extrabold flex items-center gap-1.5 mb-1">
                  <Building2 className="w-4 h-4 text-emerald-700" />
                  إضافة فرع أو صيدلية جديدة (خاص بالمدير الصيدلي)
                </div>
                <p className="text-[11px] text-emerald-800">
                  لكل صيدلية مناديبها الخاصين بها وأوردراتها المنفصلة وحصالتها السحابية المستقلة
                </p>
              </div>

              {newPharmacyError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{newPharmacyError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الصيدلية / الفرع *
                </label>
                <input
                  type="text"
                  required
                  value={newPharmacyName}
                  onChange={(e) => setNewPharmacyName(e.target.value)}
                  placeholder="مثال: صيدلية الأمل - فرع المهندسين"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم الصيدلي المسؤول
                  </label>
                  <input
                    type="text"
                    value={newPharmacistName}
                    onChange={(e) => setNewPharmacistName(e.target.value)}
                    placeholder="د. أحمد"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    هاتف الصيدلية
                  </label>
                  <input
                    type="tel"
                    value={newPharmacyPhone}
                    onChange={(e) => setNewPharmacyPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-left"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان الصيدلية بالتفصيل
                </label>
                <input
                  type="text"
                  value={newPharmacyAddress}
                  onChange={(e) => setNewPharmacyAddress(e.target.value)}
                  placeholder="الشارع، المنطقة، المحافظة"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  قيمة عمولة الأوردر الافتراضية لمناديب هذه الصيدلية
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={newPharmacyFee}
                    onChange={(e) => setNewPharmacyFee(Number(e.target.value))}
                    className="w-full pl-12 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono"
                  />
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">
                    جنيه
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة الصيدلية واعتمادها</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
