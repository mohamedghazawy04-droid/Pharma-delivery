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
  Loader2,
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

  // Confirmation state for deleting a pharmacy (In-App dialog, no window.confirm!)
  const [pharmacyToDelete, setPharmacyToDelete] = useState<Pharmacy | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // New Pharmacy form state
  const [name, setName] = useState('');
  const [pharmacistName, setPharmacistName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState<number>(7);
  const [formError, setFormError] = useState('');

  if (!isOpen) return null;

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4500);
  };

  const handleSwitchPharmacy = (pharmacyId: string) => {
    store.setActivePharmacy(pharmacyId);
    const target = pharmacies.find((p) => p.id === pharmacyId);
    showFeedback('success', `تم التحويل بنجاح للعمل بصيدلية: ${target?.name || ''}`);
  };

  const initiateDelete = (pharmacy: Pharmacy) => {
    if (pharmacies.length <= 1) {
      showFeedback(
        'error',
        'لا يمكن حذف الصيدلية الوحيدة المتبقية في المنظومة. يجب أن يتوفر فرع واحد على الأقل.'
      );
      return;
    }
    setPharmacyToDelete(pharmacy);
  };

  const confirmDelete = async () => {
    if (!pharmacyToDelete) return;

    setIsDeleting(true);
    try {
      const deletedName = pharmacyToDelete.name;
      const res = store.deletePharmacy(pharmacyToDelete.id);

      if (res.success) {
        showFeedback('success', `تم حذف فرع (${deletedName}) بنجاح ومزامنة البيانات سحابياً.`);
        setPharmacyToDelete(null);
      } else {
        showFeedback('error', res.error || 'تعذر إتمام حذف الصيدلية');
      }
    } catch (err) {
      showFeedback('error', 'حدث خطأ غير متوقع أثناء حذف الصيدلية');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('برجاء كتابة اسم الصيدلية أو الفرع الجديد');
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
    setFormError('');
    setActiveTab('list');
    showFeedback('success', `تمت إضافة (${created.name}) بنجاح والتحويل إليها كصيدلية نشطة!`);
  };

  // Helper counts for pending deletion pharmacy
  const pendingCouriersCount = pharmacyToDelete
    ? couriers.filter((c) => c.pharmacyId === pharmacyToDelete.id).length
    : 0;
  const pendingOrdersCount = pharmacyToDelete
    ? orders.filter((o) => o.pharmacyId === pharmacyToDelete.id && !o.isArchived).length
    : 0;

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
                إضافة وحذف الصيدليات والتنقل السلس بينها مع الحفظ السحابي
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

        {/* Status / Feedback Banner */}
        {statusMessage && (
          <div
            className={`px-6 py-3 text-xs font-bold flex items-center justify-between gap-2 transition-all ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-b border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
          <button
            onClick={() => {
              setActiveTab('list');
              setPharmacyToDelete(null);
            }}
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
            onClick={() => {
              setActiveTab('add');
              setPharmacyToDelete(null);
            }}
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

        <div className="p-6 max-h-[75vh] overflow-y-auto relative">
          {/* IN-APP REAL DELETION CONFIRMATION OVERLAY (Replaces blocked window.confirm) */}
          {pharmacyToDelete && (
            <div className="mb-6 p-5 bg-rose-50/90 border-2 border-rose-300 rounded-2xl shadow-lg animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-rose-600 text-white rounded-2xl shadow-sm shrink-0">
                  <Trash2 className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-rose-950 text-sm flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      تأكيد حذف الصيدلية نهائياً من المنظومة
                    </h4>
                    <span className="text-[10px] bg-rose-200 text-rose-800 font-extrabold px-2 py-0.5 rounded-full">
                      إجراء نهائي
                    </span>
                  </div>

                  <p className="text-xs text-rose-900 font-bold leading-relaxed">
                    هل أنت متأكد من رغبتك في حذف الصيدلية:
                    <span className="block text-sm font-black text-rose-950 my-1 bg-white/80 p-2 rounded-xl border border-rose-200">
                      🏢 {pharmacyToDelete.name}
                    </span>
                  </p>

                  <div className="text-[11px] text-rose-800 space-y-1 bg-rose-100/70 p-2.5 rounded-xl border border-rose-200">
                    <p className="flex items-center gap-1.5 font-semibold">
                      <span>• العنوان:</span>
                      <strong>{pharmacyToDelete.address}</strong>
                    </p>
                    {pendingCouriersCount > 0 && (
                      <p className="flex items-center gap-1.5 text-rose-900 font-bold">
                        <Bike className="w-3.5 h-3.5 text-rose-700" />
                        <span>سيتم إزالة ({pendingCouriersCount}) مناديب مرتبطين بهذا الفرع.</span>
                      </p>
                    )}
                    {pendingOrdersCount > 0 && (
                      <p className="flex items-center gap-1.5 text-rose-900 font-bold">
                        <Package className="w-3.5 h-3.5 text-rose-700" />
                        <span>سيتم إزالة ({pendingOrdersCount}) أوردرات نشطة تابعة للفرع.</span>
                      </p>
                    )}
                    <p className="text-rose-700 font-medium pt-1">
                      ⚠️ سيتم حذف الفرع وبياناته من السحابة المركزية لجميع المستخدمين فوراً.
                    </p>
                  </div>

                  {/* Confirmation Buttons */}
                  <div className="flex items-center gap-2 pt-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setPharmacyToDelete(null)}
                      disabled={isDeleting}
                      className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition shadow-xs"
                    >
                      إلغاء والاحتفاظ بالصيدلية
                    </button>
                    <button
                      type="button"
                      onClick={confirmDelete}
                      disabled={isDeleting}
                      className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جاري الحذف السحابي...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span>نعم، حذف الصيدلية الآن</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: List & Switch & Delete */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    اضغط على <strong>«التبديل والعمل بها»</strong> للتحويل الفوري لأي صيدلية، أو اضغط زر الحذف لحذف أي فرع مع التأكيد الفوري.
                  </span>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('add');
                    setPharmacyToDelete(null);
                  }}
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
                  const isBeingDeleted = pharmacyToDelete?.id === pharmacy.id;

                  return (
                    <div
                      key={pharmacy.id}
                      className={`rounded-2xl p-4 border transition-all ${
                        isBeingDeleted
                          ? 'bg-rose-50/50 border-rose-400 ring-2 ring-rose-400/30'
                          : isActive
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
                            onClick={() => initiateDelete(pharmacy)}
                            disabled={pharmacies.length <= 1}
                            title={
                              pharmacies.length <= 1
                                ? 'لا يمكن حذف الصيدلية الوحيدة في المنظومة'
                                : 'حذف هذه الصيدلية نهائياً مع التأكيد'
                            }
                            className={`p-2 rounded-xl transition flex items-center justify-center gap-1 text-xs font-bold ${
                              pharmacies.length <= 1
                                ? 'text-slate-300 bg-slate-100 cursor-not-allowed'
                                : 'text-rose-600 hover:bg-rose-50 hover:text-rose-700 border border-rose-200'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">حذف</span>
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
                  بمجرد الإضافة، يتم حفظ الفرع سحابياً والتحويل للعمل به وتلقي أوردراته ومناديبه المستقلين.
                </p>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
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
                    setFormError('');
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
