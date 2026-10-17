import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Share, PlusSquare, CheckCircle, X, Sparkles } from 'lucide-react';

interface InstallAppBannerProps {
  variant?: 'banner' | 'compact' | 'card';
  title?: string;
}

export const InstallAppBanner: React.FC<InstallAppBannerProps> = ({
  variant = 'banner',
  title,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already running standalone on phone home screen, hide banner
  if (isInstalled || isDismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstallSuccess(true);
        setTimeout(() => setIsDismissed(true), 3500);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // General mobile fallback
      setShowIOSModal(true);
    }
  };

  if (variant === 'compact') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-xs transition animate-pulse"
          title="تثبيت التطبيق على الموبايل بضغطة زر واحدة"
        >
          <Download className="w-3.5 h-3.5" />
          <span>تثبيت التطبيق 📲</span>
        </button>

        {showIOSModal && (
          <IOSInstallModal onClose={() => setShowIOSModal(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 text-white rounded-2xl p-4 shadow-lg border border-emerald-500/30 relative overflow-hidden my-3">
        {/* Background glow decoration */}
        <div className="absolute -left-10 -bottom-10 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-10 -top-10 w-24 h-24 bg-teal-400/20 rounded-full blur-xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-white/15 backdrop-blur-xs rounded-2xl border border-white/20 shrink-0 text-amber-300">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm sm:text-base text-white">
                  {title || 'تثبيت تطبيق فارما ديليفري على الموبايل'}
                </h4>
                <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>ضغطة واحدة</span>
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5 leading-relaxed">
                سهولة فتح البرنامج بدون متصفح وتلقي إشعارات الأوردرات الجديدة مباشرة على جهاز المندوب أو الصيدلي!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
            {installSuccess ? (
              <div className="w-full sm:w-auto px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>تم التثبيت بنجاح! ستجده على شاشة هاتفك</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-white hover:bg-emerald-50 text-emerald-950 rounded-xl text-xs font-black shadow-md transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-700" />
                <span>تثبيت البرنامج الآن 📲</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-2 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition"
              title="إغلاق التنبيه"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showIOSModal && (
        <IOSInstallModal onClose={() => setShowIOSModal(false)} />
      )}
    </>
  );
};

export const IOSInstallModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-slate-900 shadow-2xl border border-slate-200 space-y-4 text-right">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">إضافة التطبيق لهاتفك</h3>
              <p className="text-xs text-slate-500">طريقة التثبيت السريعة في ثوانٍ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          لتثبيت البرنامج ليصبح أيقونة على شاشة موبايلك مثل تطبيقات المتجر الرسمية:
        </p>

        <div className="space-y-3 text-xs">
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center shrink-0 text-xs">
              1
            </span>
            <div>
              <strong className="block text-slate-900 mb-0.5">اضغط على زر المشاركة أو الخيارات:</strong>
              <span className="text-slate-600 flex items-center gap-1.5 mt-1">
                زر المشاركة <Share className="w-4 h-4 text-blue-600" /> في سفاري (أسفل الشاشة) أو القائمة ⠇ في كروم (أعلى اليمين).
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center shrink-0 text-xs">
              2
            </span>
            <div>
              <strong className="block text-slate-900 mb-0.5">اختر إضافة إلى الشاشة الرئيسية:</strong>
              <span className="text-slate-600 flex items-center gap-1.5 mt-1">
                انقر على <PlusSquare className="w-4 h-4 text-emerald-600" /> (إضافة للشاشة الرئيسية / Add to Home screen).
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center shrink-0 text-xs">
              3
            </span>
            <div>
              <strong className="block text-slate-900 mb-0.5">اضغط "إضافة" (Add):</strong>
              <span className="text-slate-600 mt-1 block">
                سيظهر التطبيق فوراً على شاشة هاتفك ويمكنك فتحه في أي وقت بلمسة واحدة!
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
        >
          فهمت ذلك، تم ✔️
        </button>
      </div>
    </div>
  );
};
