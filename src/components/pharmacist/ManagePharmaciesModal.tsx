import React, { useState } from 'react';
import {
  X,
  Building2,
  Plus,
  Trash2,
  Check,
  CheckCircle2,
  ArrowRightLeft,
  Bike,
  Package,
  Phone,
  MapPin,
  Coins,
  AlertTriangle,
  User,
} from 'lucide-react';
import { Pharmacy, CourierProfile, Order } from '../../types';
import { store } from '../../services/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pharmacies: Pharmacy[];
  activePharmacyId: string;
  couriers: CourierProfile[];
  orders: Order[];
}

export const ManagePharmaciesModal: React.FC<Props> = ({
  isOpen,
  onClose,
  pharmacies,
  activePharmacyId,
  couriers,
  orders,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');

  // New Pharmacy form
  const [name, setName] = useState('');
  const [pharmacistName, setPharmacistName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState<number>(7);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSwitchPharmacy = (pharmacyId: string) => {
    store.setActivePharmacy(pharmacyId);
  };

  const handleDeletePharmacy = (pharmacy: Pharmacy) => {
    if (pharmacies.length <= 1) {
      alert('لا يمكن حذف الصيدلية الوحيدة في المنظومة. يجب توفر صيدلية واحدة على الأقل.');
      return;
    }

    const pharmaCouriers = couriers.filter((c) => c.pharmacyId === pharmacy.id);
    const pharmaOrders = orders.filter((o) => o.pharmacyId === pharmacy.id);

    const confirmText =
      `هل أنت متأكد من حذف (${pharmacy.name})؟\n` +
      `سيتم إزالة الصيدلية وبياناتها${
        pharmaCouriers.length > 0 ? ` وعدد (${pharmaCouriers.length}) مناديب تابعين لها` : ''
      }${pharmaOrders.length > 0 ? ` وعدد (${pharmaOrders.length}) أوردرات` : ''}.\n\n` +
      `هل تريد تأكيد الحذف نهائياً؟`;

    if (window.confirm(confirmText)) {
      const res = store.deletePharmacy(pharmacy.id);
      if (!res.success) {
        alert(res.error || 'تعذر حذف الصيدلية');
      }
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('برجاء كتابة اسم الصيدلية أو الفرع');
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
    setErrorMsg('');
    setActiveTab('list');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">إدارة الصيدليات والفروع والتبديل</h3>
              <p className="text-emerald-100 text-xs">
                إضافة وحذف الصيدليات والتنقل السلس بينها (خاصية المدير الصيدلي)
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

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-3 px-4 border-b-2 transition flex items-center justify-center gap-2 ${
              activeTab === 'list'
                ? 'border-emerald-600 text-emerald-800 bg-white font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>قائمة الصيدليات المسجلة ({pharmacies.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-3 px-4 border-b-2 transition flex items-center justify-center gap-2 ${
              activeTab === 'add'
                ? 'border-emerald-600 text-emerald-800 bg-white font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>+ إضافة صيدلية أو فرع جديد</span>
          </button>
        </div>

        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {/* TAB 1: List & Switch & Delete */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    اضغط على <strong>«التبديل والعمل بها»</strong> للتحويل الفوري لأي صيدلية وعرض مناديبها وأوردراتها.
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('add')}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة فرع</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {pharmacies.map((pharmacy) => {
                  const isActive = pharmacy.id === activePharmacyId;
                  const pharmaCouriers = couriers.filter((c) => c.pharmacyId === pharmacy.id);
                  const pharmaOrders = orders.filter(
                    (o) => o.pharmacyId === pharmacy.id && !o.isArchived
                  );

                  return (
                    <div
                      key={pharmacy.id}
                      className={`rounded-2xl p-4 border transition-all ${
                        isActive
                          ? 'bg-emerald-50/40 border-emerald-400 shadow-sm ring-2 ring-emerald-500/20'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-sm text-slate-900">
                              {pharmacy.name}
                            </h4>
                            {isActive ? (
                              <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>الصيدلية النشطة حالياً</span>
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{pharmacy.address}</span>
                            </span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span className="font-mono">{pharmacy.phone}</span>
                            </span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              <span>{pharmacy.pharmacistName}</span>
                            </span>
                          </div>

                          {/* Quick Stats of this Pharmacy */}
                          <div className="flex items-center gap-3 text-[11px] pt-1">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                              <Bike className="w-3 h-3 text-indigo-600" />
                              <span>{pharmaCouriers.length} مناديب</span>
                            </span>
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                              <Package className="w-3 h-3 text-emerald-600" />
                              <span>{pharmaOrders.length} أوردرات نشطة</span>
                            </span>
                            <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                              <Coins className="w-3 h-3 text-amber-600" />
                              <span>عمولة: {pharmacy.globalDeliveryFee || 7} ج</span>
                            </span>
                          </div>
                        </div>

                        {/* Action buttons: Switch & Delete */}
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          {!isActive ? (
                            <button
                              onClick={() => handleSwitchPharmacy(pharmacy.id)}
                              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                              <span>تبديل والعمل بها</span>
                            </button>
                          ) : (
                            <span className="px-3 py-1.5 bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              <span>مفعلة الآن</span>
                            </span>
                          )}

                          {/* Delete Pharmacy Button */}
                          <button
                            onClick={() => handleDeletePharmacy(pharmacy)}
                            disabled={pharmacies.length <= 1}
                            title={
                              pharmacies.length <= 1
                                ? 'لا يمكن حذف الصيدلية الوحيدة في المنظومة'
                                : 'حذف هذه الصيدلية نهائياً'
                            }
                            className={`p-2 rounded-xl transition flex items-center justify-center ${
                              pharmacies.length <= 1
                                ? 'text-slate-300 bg-slate-100 cursor-not-allowed'
                                : 'text-rose-600 hover:bg-rose-50 hover:text-rose-700 border border-rose-200'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Add Pharmacy Form */}
          {activeTab === 'add' && (
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200 text-xs text-emerald-900">
                <div className="font-extrabold flex items-center gap-1.5 mb-1">
                  <Building2 className="w-4 h-4 text-emerald-700" />
                  إضافة فرع أو صيدلية جديدة واعتمادها فوراً
                </div>
                <p className="text-[11px] text-emerald-800">
                  بمجرد الإضافة، يمكنك التبديل إليها وإضافة مناديبها الخاصين بها وتلقي أوردراتها المستقلة.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الصيدلية أو الفرع الجديد *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="مثال: صيدلية الأمل - فرع 2"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم الصيدلي المسئول
                  </label>
                  <input
                    type="text"
                    value={pharmacistName}
                    onChange={(e) => setPharmacistName(e.target.value)}
                    placeholder="د. أحمد"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-left focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان الفرع بالتفصيل
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="الشارع، المنطقة، المحافظة"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عمولة الأوردر الافتراضية لمناديب هذا الفرع (7 جنيه أو أكثر أو أقل)
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

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition"
                >
                  العودة للقائمة
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة الصيدلية والتبديل إليها فوراً</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
