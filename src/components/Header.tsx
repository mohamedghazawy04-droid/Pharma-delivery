import React from 'react';
import {
  UserCheck,
  Bike,
  Plus,
  Building2,
  Users,
  Bell,
  LogOut,
} from 'lucide-react';
import { UserRole, CourierProfile, Pharmacy } from '../types';
import { playStoppageBellSound, requestNotificationPermission } from '../utils/audio';
import { store } from '../services/store';

interface Props {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  pharmacies: Pharmacy[];
  activePharmacyId: string;
  onSelectPharmacy: (id: string) => void;
  couriers: CourierProfile[];
  currentCourierId: string;
  onCourierSelect: (id: string) => void;
  onOpenNewOrder: () => void;
  onOpenAuthModal: () => void;
  activeAlertCount: number;
}

export const Header: React.FC<Props> = ({
  currentRole,
  onRoleChange,
  pharmacies,
  activePharmacyId,
  onSelectPharmacy,
  couriers,
  currentCourierId,
  onCourierSelect,
  onOpenNewOrder,
  onOpenAuthModal,
  activeAlertCount,
}) => {
  const activePharmacy = pharmacies.find((p) => p.id === activePharmacyId) || pharmacies[0];

  const handleTestSoundAndPermission = () => {
    requestNotificationPermission();
    playStoppageBellSound();
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg shadow-sm">
                💊
              </span>
              <span>فارما ديليفري</span>
            </span>

            {/* Active Pharmacy Badge / Switcher */}
            {pharmacies.length > 0 && (
              <div className="hidden lg:flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl text-xs font-bold text-emerald-900">
                <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                <select
                  value={activePharmacyId}
                  onChange={(e) => onSelectPharmacy(e.target.value)}
                  className="bg-transparent text-emerald-950 font-extrabold cursor-pointer outline-hidden"
                >
                  {pharmacies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Zone 2: Navigation Links / Segmented Role Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => onRoleChange('pharmacist')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  currentRole === 'pharmacist'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>الصيدلي</span>
              </button>

              <button
                onClick={() => onRoleChange('courier')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  currentRole === 'courier'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bike className="w-3.5 h-3.5 text-indigo-600" />
                <span>المندوب</span>
              </button>
            </div>

            {/* Courier selector when in courier view */}
            {currentRole === 'courier' && couriers.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
                <span className="text-[11px] text-slate-500 font-medium">المندوب:</span>
                <select
                  value={currentCourierId}
                  onChange={(e) => onCourierSelect(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
                >
                  {couriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.vehicleType})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Zone 3: Primary Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Alarm Sound & Browser Notification Test */}
            <button
              onClick={handleTestSoundAndPermission}
              title="تجربة رنين جرس الإنذار الحقيقي وتفعيل إشعارات المتصفح"
              className="hidden md:flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <Bell className="w-3.5 h-3.5 text-red-600" />
              <span>فحص الجرس</span>
            </button>

            {/* Account & Multi-Pharmacy Modal button */}
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              <Users className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">الحسابات والمناديب</span>
              <span className="sm:hidden">الحسابات</span>
            </button>

            {/* Quick Add Order Button for Pharmacist */}
            {currentRole === 'pharmacist' && (
              <button
                onClick={onOpenNewOrder}
                className="flex items-center gap-1 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>أوردر سريع</span>
              </button>
            )}

            {/* Logout button to return to login screen */}
            <button
              onClick={() => store.logout()}
              title="تسجيل الخروج والعودة لشاشة الدخول"
              className="flex items-center gap-1 p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
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
