import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Coins,
  CheckCircle2,
  Clock,
  Calendar,
  X,
  Printer,
  BadgeDollarSign,
  TrendingUp,
  Receipt,
  UserCheck,
  Download,
  Loader2,
  FileText,
} from 'lucide-react';
import { ShiftSummaryArchive, Pharmacy } from '../types';
import { store } from '../services/store';
import {
  exportShiftSummaryToPdf,
  printShiftSummaryDocument,
} from '../services/pdfExportService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  summary: ShiftSummaryArchive | null;
  pharmacy?: Pharmacy;
}

export const PiggyBankModal: React.FC<Props> = ({
  isOpen,
  onClose,
  summary,
  pharmacy,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && summary) {
      setExportSuccess(false);
      // Fire confetti burst
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899'],
        });
      } catch (e) {
        // Safe fallback
      }
    }
  }, [isOpen, summary]);

  if (!isOpen || !summary) return null;

  const currentPharmacy = pharmacy || store.getActivePharmacy();

  const startDate = new Date(summary.startTime);
  const endDate = new Date(summary.endTime);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  // Calculate shift duration in hours and minutes
  const durationMs = Math.max(0, endDate.getTime() - startDate.getTime());
  const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
  const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

  const handleExportPdf = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    try {
      await exportShiftSummaryToPdf(summary, currentPharmacy);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    printShiftSummaryDocument(summary, currentPharmacy);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-amber-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Golden Piggy Bank Theme */}
        <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 px-6 pt-8 pb-10 text-white text-center relative overflow-hidden">
          {/* Subtle decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-yellow-300/20 rounded-full blur-xl pointer-events-none" />

          {/* Golden Piggy Bank Icon Badge */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-xl shadow-amber-700/20 mb-3 border-4 border-amber-200 relative group">
            <Coins className="w-10 h-10 text-amber-500 animate-pulse" />
            <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">
              تم الإنهاء
            </span>
          </div>

          <h3 className="text-2xl font-extrabold tracking-tight">
            حصالة ومحفظة الشيفت الذهبية
          </h3>
          <p className="text-amber-100 text-sm mt-1 font-medium">
            تقرير إجمالي العمل والأرباح للكابتن: <span className="font-bold text-white underline">{summary.courierName}</span>
          </p>

          {/* Big Earnings Highlight (المحفظة / الحصالة) */}
          <div className="mt-5 bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20 inline-block min-w-[260px]">
            <span className="text-xs uppercase tracking-wider text-amber-100 font-semibold block mb-1">
              إجمالي أرباح وعمولة المندوب (في الحصالة)
            </span>
            <div className="text-4xl font-extrabold font-mono tabular-nums text-white flex items-center justify-center gap-1">
              <span>{summary.totalDeliveryFees}</span>
              <span className="text-lg font-bold">جنيه</span>
            </div>
            <span className="text-xs text-amber-100 font-medium block mt-1">
              عن إجمالي ({summary.totalOrdersCount}) أوردر تم تسليمهم
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Shift Time Card */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
            <div>
              <span className="text-[11px] text-slate-700 block mb-0.5 font-semibold">وقت تسجيل الدخول</span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 font-mono flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                {formatTime(startDate)}
              </span>
            </div>
            <div className="border-x border-slate-200 px-2">
              <span className="text-[11px] text-slate-700 block mb-0.5 font-semibold">وقت تسجيل الخروج</span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 font-mono flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                {formatTime(endDate)}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-700 block mb-0.5 font-semibold">مدة العمل الفعلية</span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 font-mono">
                {durationHours} س و {durationMinutes} د
              </span>
            </div>
          </div>

          {/* Pharmacy Collection Breakdown */}
          <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase">
              <Receipt className="w-4 h-4 text-emerald-600" />
              مبالغ الأدوية المحصلة لتسليمها لخزينة الصيدلية
            </h4>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-emerald-50/60 border border-emerald-100 p-2.5 rounded-xl">
                <span className="text-[11px] text-emerald-800 font-medium block">
                  💵 نقدي (كاش)
                </span>
                <span className="text-base font-bold font-mono tabular-nums text-emerald-700">
                  {summary.totalCashCollected} جنيه
                </span>
              </div>
              <div className="bg-purple-50/60 border border-purple-100 p-2.5 rounded-xl">
                <span className="text-[11px] text-purple-800 font-medium block">
                  💳 فيزا (POS)
                </span>
                <span className="text-base font-bold font-mono tabular-nums text-purple-700">
                  {summary.totalVisaCollected} جنيه
                </span>
              </div>
              <div className="bg-blue-50/60 border border-blue-100 p-2.5 rounded-xl">
                <span className="text-[11px] text-blue-800 font-medium block">
                  ⚡ انستاباي
                </span>
                <span className="text-base font-bold font-mono tabular-nums text-blue-700">
                  {summary.totalInstapayCollected} جنيه
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-sm">
              <span className="font-semibold text-slate-700">إجمالي قيمة مبيعات الشيفت:</span>
              <span className="font-bold font-mono text-slate-900 text-base">
                {summary.totalCashCollected + summary.totalVisaCollected + summary.totalInstapayCollected} جنيه
              </span>
            </div>
          </div>

          {/* Orders summary list */}
          {summary.orders && summary.orders.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700">
                سجل أوردرات الشيفت ({summary.orders.length})
              </h4>
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-xs">
                {summary.orders.map((ord, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800">
                        {ord.orderNumber}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        ({ord.paymentMethod === 'cash' ? 'نقدي' : ord.paymentMethod === 'visa' ? 'فيزا' : 'انستاباي'})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-600 font-mono">
                        قيمة: {ord.orderValue} ج
                      </span>
                      <span className="text-amber-700 font-mono font-bold">
                        عمولة: +{ord.deliveryFee} ج
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export Success Banner */}
          {exportSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>تم تحميل ملف الـ PDF بنجاح وحفظه على جهازك!</span>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExporting}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>توليد PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>تصدير ملف PDF</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition"
                title="طباعة إيصال ورقي رسمي"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>طباعة</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow transition"
            >
              إغلاق وحفظ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
