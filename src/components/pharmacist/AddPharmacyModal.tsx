import React, { useState } from 'react';
import { X, Building2, Plus, Check } from 'lucide-react';
import { store } from '../../services/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AddPharmacyModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [pharmacistName, setPharmacistName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState<number>(7);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('برجاء إدخال اسم الصيدلية أو الفرع');
      return;
    }

    const created = store.addPharmacy({
      name: name.trim(),
      pharmacistName: pharmacistName.trim() || 'د. صيدلي',
      phone: phone.trim() || '01000000000',
      address: address.trim() || 'الفرع الرئيسي',
      globalDeliveryFee: Number(deliveryFee) || 7,
    });

    store.setActivePharmacy(created.id);
    setName('');
    setPharmacistName('');
    setPhone('');
    setAddress('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">إضافة صيدلية / فرع جديد</h3>
              <p className="text-emerald-100 text-xs">
                خاصية حصرية للمدير الصيدلي
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم الصيدلية أو الفرع الجديد *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: صيدلية الأمل - فرع 2"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم الصيدلي المسئول
              </label>
              <input
                type="text"
                value={pharmacistName}
                onChange={(e) => setPharmacistName(e.target.value)}
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
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-left"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              عنوان الفرع
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="الشارع، المنطقة، المحافظة"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              عمولة الأوردر الافتراضية لمناديب هذا الفرع
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(Number(e.target.value))}
                className="w-full pl-12 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono"
              />
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">
                جنيه
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
              <Plus className="w-4 h-4" />
              <span>إضافة الصيدلية واعتمادها</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
