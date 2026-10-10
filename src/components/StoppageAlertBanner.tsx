import React from 'react';
import {
  BellRing,
  Navigation,
  Volume2,
  VolumeX,
  CheckCircle,
  WifiOff,
  Phone,
  RefreshCw,
} from 'lucide-react';
import { store } from '../services/store';
import { CourierProfile } from '../types';
import { formatDurationSeconds } from '../utils/geo';
import { stopRepeatingAlarm } from '../utils/audio';

interface Props {
  couriers: CourierProfile[];
  currentRole: 'pharmacist' | 'courier';
  currentCourierId: string;
}

export const StoppageAlertBanner: React.FC<Props> = ({
  couriers,
  currentRole,
  currentCourierId,
}) => {
  const [isMuted, setIsMuted] = React.useState(false);

  // 1. Couriers currently in stoppage alert status (>= 5 minutes stationary)
  const stoppageCouriers = couriers.filter(
    (c) => c.isOnDuty && !c.shift.isEnded && c.isStoppageAlertActive
  );

  // 2. Couriers currently in offline internet disconnect alert status (>= 5 minutes or disconnected)
  const offlineCouriers = couriers.filter(
    (c) => c.isOnDuty && !c.shift.isEnded && c.isOfflineAlertActive
  );

  if (stoppageCouriers.length === 0 && offlineCouriers.length === 0) {
    return null;
  }

  const handleMuteToggle = () => {
    if (!isMuted) {
      stopRepeatingAlarm();
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  const handleAcknowledgeStoppage = (courierId: string) => {
    store.acknowledgeStoppageAlert(courierId);
  };

  const handleAcknowledgeOffline = (courierId: string) => {
    store.acknowledgeOfflineAlert(courierId);
  };

  const handleMoveSimulate = (courierId: string) => {
    store.simulateCourierMovement(courierId);
  };

  const handleRestoreConnection = (courierId: string) => {
    store.sendCourierHeartbeat(courierId, true);
  };

  return (
    <div className="space-y-0 sticky top-0 z-40">
      {/* 1. Offline Internet Disconnect Alert Banner */}
      {offlineCouriers.length > 0 && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-700 text-white shadow-xl animate-pulse border-b-2 border-orange-900">
          <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Alert Description */}
              <div className="flex items-center gap-3 text-right w-full sm:w-auto">
                <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-sm shrink-0 animate-bounce">
                  <WifiOff className="w-6 h-6 text-yellow-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm sm:text-base tracking-wide">
                      ⚠️ إنذار: انقطاع اتصال الإنترنت بالهاتف (تجاوز 5 دقائق)!
                    </span>
                    <span className="bg-yellow-300 text-amber-950 text-xs px-2 py-0.5 rounded-full font-black">
                      {offlineCouriers.length} مندوب مقطوع
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-amber-100 font-medium mt-0.5">
                    المناديب غير المتصلين:{' '}
                    {offlineCouriers.map((c) => {
                      const minutes = Math.floor((c.offlineSeconds || 300) / 60);
                      return (
                        <span key={c.id} className="ml-3 font-bold text-yellow-200">
                          {c.name} (منذ {minutes} دقائق)
                        </span>
                      );
                    })}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                <button
                  onClick={handleMuteToggle}
                  title={isMuted ? 'إعادة تشغيل الصوت' : 'كتم جرس الإنذار'}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-black/20 hover:bg-black/30 rounded-xl text-xs font-semibold transition"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-yellow-300" /> : <Volume2 className="w-4 h-4" />}
                  <span>{isMuted ? 'صوت مكتوم' : 'كتم الجرس'}</span>
                </button>

                {offlineCouriers.map((c) => (
                  <div key={c.id} className="flex items-center gap-1.5">
                    <a
                      href={`tel:${c.phone}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow transition"
                      title="اتصال هاتفي مباشر بالمندوب"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>اتصال بـ {c.name.split(' ')[0]} ({c.phone})</span>
                    </a>

                    <button
                      onClick={() => handleRestoreConnection(c.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition"
                      title="إعادة فحص الاتصال"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>فحص الاتصال</span>
                    </button>

                    <button
                      onClick={() => handleAcknowledgeOffline(c.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white text-orange-900 hover:bg-orange-50 rounded-xl text-xs font-bold shadow transition"
                      title="إلغاء تنبيه الانقطاع"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>إلغاء التنبيه</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Physical Stoppage Alert Banner */}
      {stoppageCouriers.length > 0 && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-lg animate-pulse border-b-2 border-red-800">
          <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Alert Description */}
              <div className="flex items-center gap-3 text-right w-full sm:w-auto">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm shrink-0 animate-bounce">
                  <BellRing className="w-6 h-6 text-yellow-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm sm:text-base tracking-wide">
                      ⚠️ إنذار توقف مندوب تجاوز 5 دقائق متواصلة!
                    </span>
                    <span className="bg-yellow-400 text-red-950 text-xs px-2 py-0.5 rounded-full font-bold">
                      {stoppageCouriers.length} مندوب
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-red-100 font-medium">
                    المناديب المتوقفون:{' '}
                    {stoppageCouriers.map((c) => (
                      <span key={c.id} className="ml-2 font-bold text-yellow-200">
                        {c.name} ({formatDurationSeconds(c.currentLocation.stationarySeconds)})
                      </span>
                    ))}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                <button
                  onClick={handleMuteToggle}
                  title={isMuted ? 'إعادة تشغيل الصوت' : 'كتم جرس الإنذار'}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-semibold transition"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-yellow-300" /> : <Volume2 className="w-4 h-4" />}
                  <span>{isMuted ? 'صوت مكتوم' : 'كتم الجرس'}</span>
                </button>

                {stoppageCouriers.map((c) => (
                  <div key={c.id} className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveSimulate(c.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold shadow transition"
                      title="تحريك المندوب على الخريطة لإنهاء التوقف"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>استئناف حركة {c.name.split(' ')[0]}</span>
                    </button>
                    <button
                      onClick={() => handleAcknowledgeStoppage(c.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white text-red-700 hover:bg-red-50 rounded-lg text-xs font-bold shadow transition"
                      title="إلغاء الإنذار الحالي"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>تأكيد الإشعار</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
