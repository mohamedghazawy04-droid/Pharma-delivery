import React, { useState, useEffect } from 'react';
import { PackageCheck, X, BellRing, Sparkles } from 'lucide-react';
import { notificationService, DeliveryAlertItem } from '../services/notificationService';

export const DeliveryToast: React.FC = () => {
  const [activeAlert, setActiveAlert] = useState<DeliveryAlertItem | null>(null);

  useEffect(() => {
    const unsubscribe = notificationService.onDeliveryAlert((alert) => {
      setActiveAlert(alert);
      // Auto dismiss after 6 seconds
      const timer = setTimeout(() => {
        setActiveAlert((current) => (current?.id === alert.id ? null : current));
      }, 6000);
      return () => clearTimeout(timer);
    });

    return unsubscribe;
  }, []);

  if (!activeAlert) return null;

  return (
    <div className="fixed top-20 left-4 sm:left-6 z-50 max-w-sm w-full animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-emerald-500/40 relative overflow-hidden ring-4 ring-emerald-500/20">
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500" />

        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
            <PackageCheck className="w-6 h-6 animate-bounce" />
          </div>

          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                <BellRing className="w-3.5 h-3.5" />
                <span>إشعار تسليم أوردر جديد</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {activeAlert.timestamp}
              </span>
            </div>

            <h4 className="text-sm font-black text-white truncate">
              كابتن {activeAlert.courierName}
            </h4>

            <p className="text-xs text-slate-300 leading-snug">
              تم تسليم الأوردر{' '}
              <strong className="text-white font-mono">{activeAlert.orderNumber}</strong> بقيمة{' '}
              <strong className="text-emerald-400 font-mono font-extrabold text-sm">
                {activeAlert.orderValue} ج
              </strong>{' '}
              ({activeAlert.paymentMethod})
            </p>

            <div className="pt-1 text-[10px] text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>صيدلية: {activeAlert.pharmacyName}</span>
            </div>
          </div>

          <button
            onClick={() => setActiveAlert(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
