import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  X,
  Coins,
  Receipt,
  Calendar,
  Clock,
  Bike,
  CheckCircle2,
  Loader2,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';
import { ShiftSummaryArchive, Pharmacy } from '../../types';
import {
  exportShiftSummaryToPdf,
  exportConsolidatedShiftsToPdf,
  printShiftSummaryDocument,
} from '../../services/pdfExportService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  summary: ShiftSummaryArchive | null;
  pharmacy: Pharmacy;
  allPharmacySummaries?: ShiftSummaryArchive[];
}

export const ShiftPdfModal: React.FC<Props> = ({
  isOpen,
  onClose,
  summary,
  pharmacy,
  allPharmacySummaries = [],
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportMode, setExportMode] = useState<'single' | 'consolidated'>(
    summary ? 'single' : 'consolidated'
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentSummary = summary || allPharmacySummaries[0] || null;

  const handleDownloadSinglePdf = async () => {
    if (!currentSummary) return;
    setIsExporting(true);
    setSuccessMessage(null);
    try {
      await exportShiftSummaryToPdf(currentSummary, pharmacy);
      setSuccessMessage('تم تحميل ملف الـ PDF بنجاح للاحتفاظ به رقمياً أو طباعته!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Error generating shift PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadConsolidatedPdf = async () => {
    if (allPharmacySummaries.length === 0) return;
    setIsExporting(true);
    setSuccessMessage(null);
    try {
      await exportConsolidatedShiftsToPdf(allPharmacySummaries, pharmacy);
      setSuccessMessage(
        `تم تصدير ملف الـ PDF المجمع بنجاح لـ (${allPharmacySummaries.length}) شفتات!`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Error generating consolidated PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDirectPrint = () => {
    if (!currentSummary) return;
    printShiftSummaryDocument(currentSummary, pharmacy);
  };

  const netCashDue = currentSummary
    ? Math.max(0, currentSummary.totalCashCollected - currentSummary.totalDeliveryFees)
    : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">تصدير ملخص الشيفت إلى PDF</h3>
              <p className="text-slate-300 text-xs">
                مستند مالي معتمد للحفظ الرقمي أو الطباعة الورقية في الصيدلية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Success Banner */}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          {allPharmacySummaries.length > 1 && (
            <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setExportMode('single')}
                disabled={!currentSummary}
                className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  exportMode === 'single'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>ملخص شيفت فردي</span>
              </button>
              <button
                type="button"
                onClick={() => setExportMode('consolidated')}
                className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  exportMode === 'consolidated'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>سجل مجمع لكل الشفتات ({allPharmacySummaries.length})</span>
              </button>
            </div>
          )}

          {/* SINGLE SHIFT PREVIEW */}
          {exportMode === 'single' && currentSummary ? (
            <div className="space-y-4">
              {/* Document Overview Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bike className="w-4 h-4 text-indigo-600" />
                    <span className="font-extrabold text-sm text-slate-900">
                      الكابتن: {currentSummary.courierName}
                    </span>
                  </div>
                  <span className="text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full font-bold">
                    {currentSummary.shiftDate}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">أرباح المندوب (الحصالة):</span>
                    <strong className="text-amber-800 font-mono text-sm">
                      {currentSummary.totalDeliveryFees.toFixed(2)} ج
                    </strong>
                    <span className="text-[10px] text-slate-400 block">
                      عن {currentSummary.totalOrdersCount} أوردر
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">الكاش المحصل مع المندوب:</span>
                    <strong className="text-emerald-700 font-mono text-sm">
                      {currentSummary.totalCashCollected.toFixed(2)} ج
                    </strong>
                    <span className="text-[10px] text-slate-400 block">نقدي</span>
                  </div>
                </div>

                <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs flex items-center justify-between">
                  <span className="font-bold text-emerald-900">
                    صافي النقدية الموردة لخزينة الصيدلية:
                  </span>
                  <span className="font-black text-emerald-800 font-mono text-sm">
                    {netCashDue.toFixed(2)} ج
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>الصيدلية: {pharmacy.name} · د. {pharmacy.pharmacistName}</span>
                </div>
              </div>

              {/* Action Buttons for Single Shift */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleDownloadSinglePdf}
                  disabled={isExporting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري توليد ملف الـ PDF عالي الدقة...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>تحميل ملف PDF رسمي (جاهز للطباعة أو الأرشفة)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDirectPrint}
                  disabled={isExporting}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  <span>طباعة مباشرة لإيصال الشيفت / حفظ كـ PDF عبر المتصفح</span>
                </button>
              </div>
            </div>
          ) : (
            /* CONSOLIDATED SHIFTS PREVIEW */
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900">
                    السجل المالي المجمع لشفتات {pharmacy.name}
                  </span>
                  <span className="text-[11px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full font-bold">
                    {allPharmacySummaries.length} شفتات
                  </span>
                </div>

                <p className="text-xs text-slate-600">
                  يتضمن هذا التقرير جدولاً شاملاً لكافة الشفتات المنتهية مع الإجماليات الكلية للمبيعات، الكاش المسلم للخزينة، وأرباح وحصالة كل مندوب.
                </p>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">إجمالي الأوردرات</span>
                    <strong className="font-mono text-slate-900">
                      {allPharmacySummaries.reduce((a, b) => a + (b.totalOrdersCount || 0), 0)}
                    </strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">إجمالي أرباح المناديب</span>
                    <strong className="font-mono text-amber-800">
                      {allPharmacySummaries
                        .reduce((a, b) => a + (b.totalDeliveryFees || 0), 0)
                        .toFixed(2)}{' '}
                      ج
                    </strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">إجمالي الكاش المحصل</span>
                    <strong className="font-mono text-emerald-700">
                      {allPharmacySummaries
                        .reduce((a, b) => a + (b.totalCashCollected || 0), 0)
                        .toFixed(2)}{' '}
                      ج
                    </strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Consolidated */}
              <button
                type="button"
                onClick={handleDownloadConsolidatedPdf}
                disabled={isExporting || allPharmacySummaries.length === 0}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري تحضير وتصدير ملف الـ PDF المجمع...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>تحميل السجل المالي المجمع بصيغة PDF</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Quick Notice */}
          <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl text-[11px] text-indigo-900 leading-relaxed">
            💡 يتم استخراج ملف الـ PDF بتنسيق A4 رسمي جاهز للحفظ على الهاتف أو الكمبيوتر أو الطباعة الورقية لأرشفة حسابات الصيدلية.
          </div>
        </div>
      </div>
    </div>
  );
};
