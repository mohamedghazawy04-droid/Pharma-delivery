import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Zap,
  DollarSign,
  AlertTriangle,
  Bike,
  Plus,
  User,
  Phone,
} from 'lucide-react';
import { CourierProfile, OrderType, PaymentMethod } from '../types';
import { store } from '../services/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  couriers: CourierProfile[];
  globalDeliveryFee: number;
}

export const NewOrderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  couriers,
  globalDeliveryFee,
}) => {
  const [orderValue, setOrderValue] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('عادي');
  const [selectedCourierId, setSelectedCourierId] = useState(couriers[0]?.id || '');
  const [isAddingNewCourier, setIsAddingNewCourier] = useState(couriers.length === 0);
  const [newCourierName, setNewCourierName] = useState('');
  const [newCourierPhone, setNewCourierPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customDeliveryFee, setCustomDeliveryFee] = useState<number>(globalDeliveryFee || 7);
  const [quickNote, setQuickNote] = useState('');
  const [formError, setFormError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFormError('');
      setOrderType('عادي');
      if (couriers.length > 0) {
        if (!selectedCourierId || !couriers.some((c) => c.id === selectedCourierId)) {
          setSelectedCourierId(couriers[0].id);
          setCustomDeliveryFee(couriers[0].deliveryFeePerOrder || globalDeliveryFee || 7);
        }
        setIsAddingNewCourier(false);
      } else {
        setIsAddingNewCourier(true);
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, couriers, globalDeliveryFee]);

  if (!isOpen) return null;

  const handleCourierChange = (courierId: string) => {
    setSelectedCourierId(courierId);
    setFormError('');
    const courier = couriers.find((c) => c.id === courierId);
    if (courier) {
      setCustomDeliveryFee(courier.deliveryFeePerOrder || 7);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numVal = parseFloat(orderValue);
    if (isNaN(numVal) || numVal <= 0) {
      setFormError('برجاء إدخال قيمة الأوردر بالجنيه');
      inputRef.current?.focus();
      return;
    }

    let targetCourierId = selectedCourierId;

    if (isAddingNewCourier || couriers.length === 0) {
      if (!newCourierName.trim()) {
        setFormError('برجاء إدخال اسم كابتن التوصيل المستلم للطلب');
        return;
      }
      const activePharma = store.getActivePharmacy();
      const createdCourier = store.registerCourier({
        pharmacyId: activePharma.id,
        name: newCourierName.trim(),
        phone: newCourierPhone.trim() || '01000000000',
        password: '123',
        vehicleType: 'موتوسيكل',
        vehicleNumber: 'بدون لوحة',
        deliveryFeePerOrder: customDeliveryFee,
      });
      targetCourierId = createdCourier.id;
    }

    if (!targetCourierId) {
      setFormError('برجاء اختيار المندوب أو كتابة اسمه لإسناد الأوردر له');
      return;
    }

    store.addFastOrder({
      orderValue: numVal,
      orderType,
      paymentMethod,
      courierId: targetCourierId,
      deliveryFee: customDeliveryFee,
      quickNote,
    });

    setOrderValue('');
    setNewCourierName('');
    setNewCourierPhone('');
    setQuickNote('');
    setFormError('');
    onClose();
  };

  const handlePreset = (val: number) => {
    setOrderValue(String(val));
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">إضافة أوردر سريع (قيمة فقط)</h3>
              <p className="text-emerald-100 text-xs">
                تسجيل فوري للأوردر وإسناده للمندوب المطلوب
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

        {/* Fast Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Huge Order Value Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                قيمة الأوردر بالجنيه *
              </span>
              <span className="text-[11px] text-slate-400">
                (اضغط Enter للحفظ السريع)
              </span>
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="number"
                step="any"
                min="1"
                required
                value={orderValue}
                onChange={(e) => setOrderValue(e.target.value)}
                placeholder="0"
                className="w-full text-center text-3xl font-extrabold font-mono py-3.5 bg-slate-50 border-2 border-emerald-500 rounded-2xl focus:bg-white focus:outline-hidden focus:ring-4 focus:ring-emerald-500/20 text-slate-900 transition"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                جنيه
              </span>
            </div>

            {/* Quick Values Buttons */}
            <div className="flex items-center justify-between gap-1 mt-2 flex-wrap">
              <span className="text-[10px] text-slate-400 font-bold ml-1">قيم سريعة:</span>
              {[50, 80, 100, 150, 200, 300].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePreset(preset)}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono font-bold transition"
                >
                  {preset}ج
                </button>
              ))}
            </div>
          </div>

          {/* Order Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>نوع الأوردر *</span>
              <span className="text-[11px] text-slate-400 font-normal">ينعكس فورياً عند المندوب</span>
            </label>
            <div className="grid grid-cols-5 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs">
              {(['عادي', 'مستعجل', 'روشتة', 'أدوية ثلاجة', 'مستلزمات'] as OrderType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setOrderType(type)}
                  className={`py-2 px-1 text-center font-bold rounded-lg transition text-[11px] ${
                    orderType === type
                      ? type === 'مستعجل'
                        ? 'bg-red-600 text-white shadow-xs'
                        : type === 'أدوية ثلاجة'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : type === 'روشتة'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 bg-white/60'
                  }`}
                >
                  {type === 'عادي' && '🟢 عادي'}
                  {type === 'مستعجل' && '⚡ مستعجل'}
                  {type === 'روشتة' && '📝 روشتة'}
                  {type === 'أدوية ثلاجة' && '❄️ ثلاجة'}
                  {type === 'مستلزمات' && '🩹 مستلزمات'}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              طريقة التحصيل *
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  paymentMethod === 'cash'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                💵 نقدي
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('visa')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  paymentMethod === 'visa'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                💳 فيزا
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('instapay')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  paymentMethod === 'instapay'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ⚡ انستاباي
              </button>
            </div>
          </div>

          {/* Courier Selection or Instant Name Creation */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Bike className="w-4 h-4 text-slate-500" />
                <span>المندوب المستلم *</span>
              </label>

              {couriers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsAddingNewCourier(!isAddingNewCourier)}
                  className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isAddingNewCourier ? 'اختيار من القائمة' : '+ إضافة كابتن جديد'}</span>
                </button>
              )}
            </div>

            {isAddingNewCourier || couriers.length === 0 ? (
              <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    اسم الكابتن الجديد *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={newCourierName}
                      onChange={(e) => setNewCourierName(e.target.value)}
                      placeholder="مثال: مصطفى أحمد"
                      className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-emerald-500 outline-hidden"
                    />
                    <User className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    رقم هاتف الكابتن (اختياري)
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={newCourierPhone}
                      onChange={(e) => setNewCourierPhone(e.target.value)}
                      placeholder="010XXXXXXXX"
                      className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:border-emerald-500 outline-hidden"
                    />
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                  </div>
                </div>
              </div>
            ) : (
              <select
                value={selectedCourierId}
                onChange={(e) => handleCourierChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
              >
                {couriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    كابتن {c.name} {c.phone ? `(${c.phone})` : ''} - عمولة: {c.deliveryFeePerOrder} ج
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Delivery Fee */}
          <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-900 block">
                عمولة المندوب:
              </span>
              <span className="text-[10px] text-amber-700">
                تضاف فوراً لحصالة المندوب عند التمام
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                value={customDeliveryFee}
                onChange={(e) => setCustomDeliveryFee(Number(e.target.value))}
                className="w-16 px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-amber-950 text-center"
              />
              <span className="text-xs font-bold text-amber-800">جنيه</span>
            </div>
          </div>

          {/* Quick Note */}
          <div>
            <input
              type="text"
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              placeholder="ملاحظة سريعة أو عنوان العميل (اختياري)..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition shadow-md flex items-center justify-center gap-1.5"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>تسجيل وحفظ الأوردر ⚡</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
