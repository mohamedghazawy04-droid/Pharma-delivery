import React, { useState } from 'react';
import { X, ArrowRightLeft, Bike, Check } from 'lucide-react';
import { CourierProfile, Order } from '../types';
import { store } from '../services/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  couriers: CourierProfile[];
}

export const TransferOrderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  order,
  couriers,
}) => {
  if (!isOpen || !order) return null;

  const currentCourier = couriers.find((c) => c.id === order.courierId);
  const otherCouriers = couriers.filter((c) => c.id !== order.courierId);
  const [targetCourierId, setTargetCourierId] = useState(
    otherCouriers[0]?.id || ''
  );

  const handleTransfer = () => {
    if (!targetCourierId) return;
    store.transferOrder(order.id, targetCourierId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            <h3 className="font-extrabold text-base">تحويل الأوردر لمندوب آخر</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">رقم الأوردر:</span>
              <span className="font-mono font-bold text-slate-800">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">القيمة:</span>
              <span className="font-mono font-bold text-slate-800">{order.orderValue} جنيه ({order.paymentMethod === 'cash' ? 'نقدي' : order.paymentMethod === 'visa' ? 'فيزا' : 'انستاباي'})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">المندوب الحالي:</span>
              <span className="font-bold text-indigo-700">{currentCourier?.name || 'غير محدد'}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
              <Bike className="w-4 h-4 text-blue-600" />
              اختر المندوب الجديد لاستلام الأوردر:
            </label>
            <div className="space-y-2">
              {otherCouriers.map((c) => (
                <label
                  key={c.id}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                    targetCourierId === c.id
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="targetCourier"
                      value={c.id}
                      checked={targetCourierId === c.id}
                      onChange={() => setTargetCourierId(c.id)}
                      className="text-indigo-600"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-800">{c.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {c.vehicleType} · عمولة: {c.deliveryFeePerOrder} ج
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      c.isOnDuty ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {c.isOnDuty ? 'في الشيفت' : 'متاح'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition"
            >
              إلغاء
            </button>
            <button
              onClick={handleTransfer}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>تأكيد التحويل</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
