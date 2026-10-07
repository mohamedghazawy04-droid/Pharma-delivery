import React, { useState, useEffect } from 'react';
import { X, Edit3, DollarSign, Bike, Check, CreditCard, Banknote, Send, Sparkles } from 'lucide-react';
import { CourierProfile, Order, PaymentMethod } from '../types';
import { store } from '../services/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  couriers: CourierProfile[];
}

export const EditOrderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  order,
  couriers,
}) => {
  const [orderValue, setOrderValue] = useState<number | string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [courierId, setCourierId] = useState('');
  const [deliveryFee, setDeliveryFee] = useState<number>(7);
  const [quickNote, setQuickNote] = useState('');

  useEffect(() => {
    if (order) {
      setOrderValue(order.orderValue);
      setPaymentMethod(order.paymentMethod);
      setCourierId(order.courierId);
      setDeliveryFee(order.deliveryFee);
      setQuickNote(order.quickNote || '');
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numVal = parseFloat(String(orderValue));
    if (isNaN(numVal) || numVal <= 0) {
      alert('برجاء إدخال قيمة صحيحة للأوردر');
      return;
    }

    store.updateOrder(order.id, {
      orderValue: numVal,
      paymentMethod,
      courierId,
      deliveryFee: Number(deliveryFee),
      quickNote,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <Edit3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">
                تعديل أوردر {order.orderNumber}
              </h3>
              <p className="text-amber-100 text-xs">
                التعديل ينعكس فورياً ومباشرة على شاشة المندوب
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Order Value */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              قيمة الأوردر بالجنيه *
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="1"
                required
                value={orderValue}
                onChange={(e) => setOrderValue(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black font-mono text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-hidden"
              />
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                جنيه
              </span>
            </div>
          </div>

          {/* Payment Method: Cash vs Visa vs InstaPay */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              طريقة التحصيل * (تحديث فوري عند المندوب)
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-1 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                  paymentMethod === 'cash'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>نقدي</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('visa')}
                className={`py-2 px-1 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                  paymentMethod === 'visa'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>فيزا</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('instapay')}
                className={`py-2 px-1 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                  paymentMethod === 'instapay'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>انستاباي</span>
              </button>
            </div>
          </div>

          {/* Re-assign Courier */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Bike className="w-3.5 h-3.5 text-slate-500" />
              المندوب المسند له *
            </label>
            <select
              value={courierId}
              onChange={(e) => setCourierId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden"
            >
              {couriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.vehicleType}) - عمولة: {c.deliveryFeePerOrder} ج
                </option>
              ))}
            </select>
          </div>

          {/* Delivery Commission */}
          <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-900 block">
                عمولة المندوب (المحفظة):
              </span>
              <span className="text-[10px] text-amber-700">
                قيمة العمولة المضافة لحصالة المندوب
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(Number(e.target.value))}
                className="w-16 px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-amber-950 text-center"
              />
              <span className="text-xs font-bold text-amber-800">جنيه</span>
            </div>
          </div>

          {/* Quick Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظة سريعة
            </label>
            <input
              type="text"
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              placeholder="مثال: العميل سيدفع باقي 200 ج"
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
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>حفظ التعديل وتحديث شاشة المندوب فوراً</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
