import React, { useState, useEffect, useRef } from 'react';
import { X, DollarSign, Bike, Check, Zap, AlertTriangle } from 'lucide-react';
import { CourierProfile, PaymentMethod } from '../types';
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
  const [orderValue, setOrderValue] = useState<string>('');
  const [selectedCourierId, setSelectedCourierId] = useState(couriers[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customDeliveryFee, setCustomDeliveryFee] = useState<number>(globalDeliveryFee || 7);
  const [quickNote, setQuickNote] = useState('');
  const [formError, setFormError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFormError('');
      if (couriers.length > 0 && !selectedCourierId) {
        setSelectedCourierId(couriers[0].id);
        setCustomDeliveryFee(couriers[0].deliveryFeePerOrder || globalDeliveryFee || 7);
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, couriers, selectedCourierId, globalDeliveryFee]);

  if (!isOpen) return null;

  const handleCourierChange = (courierId: string) => {
    setSelectedCourierId(courierId);
    setFormError('');
    const courier = couriers.find((c) => c.id === courierId);
    if (courier) {
      setCustomDeliveryFee(courier.deliveryFeePerOrder);
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

    if (!selectedCourierId) {
      setFormError('برجاء اختيار المندوب لإسناد الأوردر له');
      return;
    }

    store.addFastOrder({
      orderValue: numVal,
      paymentMethod,
      courierId: selectedCourierId,
      deliveryFee: customDeliveryFee,
      quickNote,
    });

    setOrderValue('');
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
                إدخال فوري للقيمة بدون بيانات عميل لسرعة العمل
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
                className="w-full pl-14 pr-4 py-3 bg-slate-50 border-2 border-emerald-500/40 rounded-2xl text-2xl font-black font-mono text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-hidden transition"
              />
              <span className="absolute left-4 top-3.5 text-sm font-bold text-slate-400">
                جنيه
              </span>
            </div>

            {/* Quick preset buttons */}
            <div className="flex items-center gap-1.5 mt-2">
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

          {/* Payment Method: Cash vs Visa vs InstaPay */}
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

          {/* Select Courier */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <Bike className="w-4 h-4 text-slate-500" />
              المندوب المستلم *
            </label>
            {couriers.length === 0 ? (
              <div className="p-3 bg-amber-50 text-amber-900 text-xs rounded-xl border border-amber-200">
                لا يوجد مناديب مسجلين في هذه الصيدلية حتى الآن. يمكنك تسجيل مندوب من زر الحسابات.
              </div>
            ) : (
              <select
                value={selectedCourierId}
                onChange={(e) => handleCourierChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-hidden"
              >
                {couriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.vehicleType}) - عمولة: {c.deliveryFeePerOrder} ج
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Courier Delivery Fee (7 EGP customizable) */}
          <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-900 block">
                عمولة المندوب المضافة للمحفظة:
              </span>
              <span className="text-[10px] text-amber-700">
                تضاف فوراً لحصالة المندوب
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

          {/* Quick optional note */}
          <div>
            <input
              type="text"
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              placeholder="ملاحظة سريعة اختيارية (مثال: باقي 200 ج)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Actions */}
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
              disabled={couriers.length === 0}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>إرسال الأوردر فوراً (+{customDeliveryFee} ج)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
