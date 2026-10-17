import React, { useState } from 'react';
import {
  UserCheck,
  Bike,
  Plus,
  Building2,
  Users,
  Bell,
  LogOut,
  HardDrive,
  Check,
} from 'lucide-react';
import { CourierProfile, Pharmacy } from '../types';
import { playStoppageBellSound, requestNotificationPermission } from '../utils/audio';
import { notificationService } from '../services/notificationService';
import { store } from '../services/store';
import { InstallAppBanner } from './InstallAppBanner';

interface Props {
  pharmacies: Pharmacy[];
  activePharmacyId: string;
  onSelectPharmacy: (id: string) => void;
  onOpenManagePharmacies?: () => void;
  couriers: CourierProfile[];
  onOpenNewOrder: () => void;
  onOpenAuthModal: () => void;
  onOpenGoogleDrive?: () => void;
  onOpenSplash?: () => void;
  activeAlertCount: number;
}

export const Header: React.FC<Props> = ({
  pharmacies,
  activePharmacyId,
  onSelectPharmacy,
  onOpenManagePharmacies,
  couriers,
  onOpenNewOrder,
  onOpenAuthModal,
  onOpenGoogleDrive,
  onOpenSplash,
  activeAlertCount,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  const activePharma =
    pharmacies.find((p) => p.id === activePharmacyId) || pharmacies[0];

  const handleTestSoundAndPermission = async () => {
    playStoppageBellSound();
    await requestNotificationPermission();
    notificationService.testNotification(activePharma ? activePharma.name : 'صيدلية الديب');
  };

  const handleCopyCourierLink = () => {
    const courierUrl = `${window.location.origin}${window.location.pathname}?mode=courier`;
    navigator.clipboard.writeText(courierUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <header className="bg-white border-b border-zinc-300 sticky top-0 z-40 shadow-xs selection:bg-black selection:text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Zone 1: Brand & Pharmacy Switcher - Monochrome */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-md border border-zinc-800">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="font-black text-sm sm:text-base text-black block leading-tight tracking-tight">
                  فارما ديليفري
                </span>
                <span className="text-[10px] text-zinc-500 font-bold block">
                  لوحة إدارة وتتبع الصيدلي
                </span>
              </div>
            </div>

            {/* Pharmacy Branch Dropdown */}
            {pharmacies.length > 1 ? (
              <div className="flex items-center gap-1.5 bg-zinc-100 border border-zinc-300 px-2 py-1 rounded-xl">
                <Building2 className="w-3.5 h-3.5 text-black" />
                <select
                  value={activePharmacyId}
                  onChange={(e) => onSelectPharmacy(e.target.value)}
                  className="bg-transparent text-xs font-bold text-zinc-900 outline-hidden cursor-pointer max-w-[140px] sm:max-w-none truncate"
                >
                  {pharmacies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {onOpenManagePharmacies && (
                  <button
                    onClick={onOpenManagePharmacies}
                    title="إدارة وإضافة فروع الصيدليات"
                    className="p-1 text-black hover:text-zinc-700 hover:bg-zinc-200 rounded-md transition text-[11px] font-bold underline"
                  >
                    إدارة
                  </button>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-1 bg-zinc-100 text-black border border-zinc-300 px-2.5 py-1 rounded-xl text-xs font-bold">
                <span>{activePharma?.name || 'صيدليه الديب'}</span>
                {onOpenManagePharmacies && (
                  <button
                    onClick={onOpenManagePharmacies}
                    title="إدارة وإضافة فروع الصيدليات"
                    className="p-1 text-black hover:text-zinc-700 hover:bg-zinc-200 rounded-md transition text-[11px] font-bold underline"
                  >
                    إدارة
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Zone 2: Dedicated Pharmacist Identity & Share Courier Beacon Link */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-black border border-zinc-300 rounded-xl text-xs font-black shadow-2xs">
              <UserCheck className="w-4 h-4 text-black" />
              <span className="hidden sm:inline">لوحة تحكم الصيدلي</span>
              <span className="sm:hidden">الصيدلي</span>
            </div>

            {/* Share Courier Link Button */}
            <button
              onClick={handleCopyCourierLink}
              title="انسخ رابط المندوب لإرساله له على واتساب لبث موقعه وعرض أوردراته فقط"
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${
                copiedLink
                  ? 'bg-black text-white border-black'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-black border-zinc-300'
              }`}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Bike className="w-3.5 h-3.5" />}
              <span>
                {copiedLink
                  ? 'تم نسخ الرابط! أرسله للمندوب على واتساب ✔️'
                  : '📱 نسخ رابط المندوب (لبث موقعه)'}
              </span>
            </button>

            {/* Dr. Mohamed Elghazawy Signature Badge */}
            {onOpenSplash && (
              <button
                onClick={onOpenSplash}
                title="Made by dr.mohamed elghazawy - عرض شاشة الانطلاق"
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 bg-black hover:bg-zinc-800 text-white rounded-xl text-[11px] font-bold border border-black shadow-xs transition cursor-pointer"
              >
                <img
                  src="/delivery_motorcycle.jpg"
                  alt=""
                  className="w-4 h-4 rounded-full object-cover bw-motorcycle"
                />
                <span className="font-mono text-[10px] text-zinc-100 font-black">
                  dr.mohamed elghazawy
                </span>
              </button>
            )}
          </div>

          {/* Zone 3: Primary Actions - Black and White */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 1-Click PWA Install Button */}
            <InstallAppBanner variant="compact" />

            {/* Alarm Sound & Browser Notification Test */}
            <button
              onClick={handleTestSoundAndPermission}
              title="تجربة رنين جرس الإنذار الحقيقي وتفعيل إشعارات المتصفح"
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition"
            >
              <Bell className="w-3.5 h-3.5 text-black" />
              <span>فحص الجرس</span>
            </button>

            {/* Account & Multi-Pharmacy Modal button */}
            <button
              onClick={onOpenAuthModal}
              title="إضافة كابتن توصيل جديد أو إدارة الفروع"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-300 hover:bg-zinc-100 text-zinc-900 rounded-xl text-xs font-bold transition"
            >
              <Users className="w-3.5 h-3.5 text-zinc-700" />
              <span className="hidden sm:inline">إضافة مناديب وفروع</span>
              <span className="sm:hidden">المناديب</span>
            </button>

            {/* Google Drive & Cloud Backup button */}
            {onOpenGoogleDrive && (
              <button
                onClick={onOpenGoogleDrive}
                title="تكامل Google Drive والنسخ السحابي وتصدير التقارير"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-black border border-zinc-300 rounded-xl text-xs font-bold transition shadow-2xs"
              >
                <HardDrive className="w-3.5 h-3.5 text-black" />
                <span>Google Drive</span>
              </button>
            )}

            {/* Quick Add Order Button for Pharmacist */}
            <button
              onClick={onOpenNewOrder}
              className="flex items-center gap-1 px-3.5 py-2 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>إضافة أوردر</span>
            </button>

            {/* Logout button */}
            <button
              onClick={() => store.logout()}
              title="تسجيل الخروج والعودة لشاشة الدخول"
              className="flex items-center gap-1 p-2 text-zinc-500 hover:text-black hover:bg-zinc-200 rounded-xl transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline text-xs font-bold">خروج</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
