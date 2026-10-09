import React, { useState, useEffect } from 'react';
import { PackageCheck, X, BellRing, Sparkles, Bike } from 'lucide-react';
import {
  notificationService,
  DeliveryAlertItem,
  CourierAlertItem,
} from '../services/notificationService';

export const DeliveryToast: React.FC = () => {
  const [activeDeliveryAlert, setActiveDeliveryAlert] = useState<DeliveryAlertItem | null>(null);
  const [activeCourierAlert, setActiveCourierAlert] = useState<CourierAlertItem | null>(null);

  useEffect(() => {
    const unsubDelivery = notificationService.onDeliveryAlert((alert) => {
      setActiveDeliveryAlert(alert);
      const timer = setTimeout(() => {
        setActiveDeliveryAlert((current) => (current?.id === alert.id ? null : current));
      }, 6000);
      return () => clearTimeout(timer);
    });

    const unsubCourier = notificationService.onCourierAlert((alert) => {
      setActiveCourierAlert(alert);
      const timer = setTimeout(() => {
        setActiveCourierAlert((current) => (current?.id === alert.id ? null : current));
      }, 7000);
      return () => clearTimeout(timer);
    });

    return () => {
      unsubDelivery();
      unsubCourier();
    };
  }, []);

  return (
    <div className="fixed top-20 left-4 sm:left-6 z-50 max-w-sm w-full space-y-3 pointer-events-none">
      {/* 1. New Courier Registration Alert */}
      {activeCourierAlert && (
        <div className="pointer-events-auto bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-indigo-500/50 relative overflow-hidden ring-4 ring-indigo-500/20 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-indigo-400 via-sky-400 to-indigo-600" />

          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 shrink-0">
              <Bike className="w-6 h-6 animate-pulse" />
            </div>

            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-extrabold text-indigo-400 uppercase tracking-wide flex items-center gap-1">
                  <BellRing className="w-3.5 h-3.5" />
                  <span>انضمام مندوب جديد!</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {activeCourierAlert.timestamp}
                </span>
              </div>

              <h4 className="text-sm font-black text-white truncate">
                كابتن {activeCourierAlert.courierName}
              </h4>

              <p className="text-xs text-slate-300 leading-snug">
                سجل المندوب بنجاح عبر الموبايل ({activeCourierAlert.phone} - {activeCourierAlert.vehicleType})
              </p>

              <div className="pt-1 text-[10px] text-indigo-300 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>فرع: {activeCourierAlert.pharmacyName}</span>
              </div>
            </div>

            <button
              onClick={() => setActiveCourierAlert(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Order Delivered Alert */}
      {activeDeliveryAlert && (
        <div className="pointer-events-auto bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-emerald-500/40 relative overflow-hidden ring-4 ring-emerald-500/20 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500" />

          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
              <PackageCheck className="w-6 h-6 animate-bounce" />
            </div>

            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                  <BellRing className="w-3.5 h-3.5" />
                  <span>إشعار تسليم أوردر</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {activeDeliveryAlert.timestamp}
                </span>
              </div>

              <h4 className="text-sm font-black text-white truncate">
                كابتن {activeDeliveryAlert.courierName}
              </h4>

              <p className="text-xs text-slate-300 leading-snug">
                تم تسليم الأوردر{' '}
                <strong className="text-white font-mono">{activeDeliveryAlert.orderNumber}</strong> بقيمة{' '}
                <strong className="text-emerald-400 font-mono font-extrabold text-sm">
                  {activeDeliveryAlert.orderValue} ج
                </strong>{' '}
                ({activeDeliveryAlert.paymentMethod})
              </p>

              <div className="pt-1 text-[10px] text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>صيدلية: {activeDeliveryAlert.pharmacyName}</span>
              </div>
            </div>

            <button
              onClick={() => setActiveDeliveryAlert(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
