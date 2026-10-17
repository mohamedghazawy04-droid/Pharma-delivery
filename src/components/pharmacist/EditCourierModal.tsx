import React, { useState } from 'react';
import { CourierProfile, Pharmacy } from '../../types';
import { store } from '../../services/store';
import { User, Phone, Lock, Bike, DollarSign, Building2, X, Check, AlertTriangle } from 'lucide-react';

interface EditCourierModalProps {
  isOpen: boolean;
  onClose: () => void;
  courier: CourierProfile;
  pharmacies: Pharmacy[];
}

export const EditCourierModal: React.FC<EditCourierModalProps> = ({
  isOpen,
  onClose,
  courier,
  pharmacies,
}) => {
  const [name, setName] = useState(courier.name);
  const [phone, setPhone] = useState(courier.phone);
  const [password, setPassword] = useState(courier.password || '123456');
  const [vehicleType, setVehicleType] = useState<CourierProfile['vehicleType']>(
    courier.vehicleType || 'موتوسيكل'
  );
  const [deliveryFeePerOrder, setDeliveryFeePerOrder] = useState<number>(
    courier.deliveryFeePerOrder || 7
  );
  const [pharmacyId, setPharmacyId] = useState(courier.pharmacyId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('يرجى إدخال اسم المندوب');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('يرجى إدخال رقم هاتف المندوب');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await store.updateCourier(courier.id, {
        name: name.trim(),
        phone: phone.trim(),
        password: password.trim(),
        vehicleType,
        deliveryFeePerOrder: Number(deliveryFeePerOrder) || 7,
        pharmacyId,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'حدث خطأ أثناء تعديل بيانات المندوب');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <User className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">تعديل بيانات المندوب</h3>
              <p className="text-indigo-100 text-xs">
                تعديل الاسم والهاتف وكلمة المرور وقيمة العمولة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-right">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Courier Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              اسم المندوب / الكابتن *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: مصطفى أحمد"
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-hidden transition"
              />
              <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
          </div>

          {/* Courier Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              رقم الهاتف (لتسجيل الدخول والاتصال) *
            </label>
            <div className="relative">
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010XXXXXXXX"
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-hidden transition"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              كلمة المرور لدخول المندوب على هاتفه
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="123456"
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-hidden transition"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
          </div>

          {/* Commission & Vehicle in 2 columns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                عمولة الأوردر (ج)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={deliveryFeePerOrder}
                  onChange={(e) => setDeliveryFeePerOrder(Number(e.target.value))}
                  className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-indigo-500 outline-hidden"
                />
                <DollarSign className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                وسيلة المواصلات
              </label>
              <div className="relative">
                <select
                  value={vehicleType}
                  onChange={(e) =>
                    setVehicleType(e.target.value as CourierProfile['vehicleType'])
                  }
                  className="w-full pl-2 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 outline-hidden"
                >
                  <option value="موتوسيكل">موتوسيكل 🛵</option>
                  <option value="سكوتر">سكوتر 🛴</option>
                  <option value="دراجة">دراجة 🚲</option>
                  <option value="سيارة">سيارة 🚗</option>
                </select>
                <Bike className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Pharmacy Branch */}
          {pharmacies.length > 1 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                الصيدلية التابع لها المندوب
              </label>
              <div className="relative">
                <select
                  value={pharmacyId}
                  onChange={(e) => setPharmacyId(e.target.value)}
                  className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 outline-hidden"
                >
                  {pharmacies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <Building2 className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-3 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
