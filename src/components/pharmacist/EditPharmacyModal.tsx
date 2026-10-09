import React, { useState, useEffect } from 'react';
import { X, Building2, Save, User, Phone, MapPin, Coins, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Pharmacy } from '../../types';
import { store } from '../../services/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pharmacy: Pharmacy | null;
}

export const EditPharmacyModal: React.FC<Props> = ({ isOpen, onClose, pharmacy }) => {
  const [name, setName] = useState('');
  const [pharmacistName, setPharmacistName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState<number>(7);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (pharmacy && isOpen) {
      setName(pharmacy.name || '');
      setPharmacistName(pharmacy.pharmacistName || '');
      setPhone(pharmacy.phone || '');
      setAddress(pharmacy.address || '');
      setDeliveryFee(pharmacy.globalDeliveryFee || 7);
      setError('');
      setSuccess(false);
    }
  }, [pharmacy, isOpen]);

  if (!isOpen || !pharmacy) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى إدخال اسم الصيدلية');
      return;
    }

    store.updatePharmacy(pharmacy.id, {
      name: name.trim(),
      pharmacistName: pharmacistName.trim() || 'د. صيدلي',
      phone: phone.trim() || '01000000000',
      address: address.trim() || 'مصر',
      globalDeliveryFee: Number(deliveryFee) || 7,
    });

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Building2 className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">تعديل بيانات الصيدلية أو الفرع</h3>
              <p className="text-emerald-100/80 text-xs">
                تحديث الاسم والعنوان ورقم التواصل ليعتمد فوراً سحابياً
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>تم حفظ التعديلات بنجاح وتحديث كافة الشاشات سحابياً!</span>
            </div>
          )}

          {/* Pharmacy Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم الصيدلية أو الفرع *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                placeholder="مثال: صيدليه الديب"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Pharmacist Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم الصيدلي المسئول
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={pharmacistName}
                  onChange={(e) => setPharmacistName(e.target.value)}
                  placeholder="د. محمد"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رقم هاتف الصيدلية
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010xxxxxxxxx"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-left focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              عنوان الفرع بالتفصيل
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="مثال: الحي ١١ الاتحاد التعاوني"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Default Delivery Fee */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              عمولة التوصيل الافتراضية لمناديب هذا الفرع (جنيه)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(Number(e.target.value))}
                className="w-full pl-12 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono focus:bg-white focus:outline-hidden"
              />
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">
                جنيه
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>حفظ وتحديث سحابياً</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
