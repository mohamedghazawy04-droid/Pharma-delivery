import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Lock,
  Building2,
  Check,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Pharmacy } from '../types';
import { store } from '../services/store';

interface Props {
  pharmacies: Pharmacy[];
  activePharmacyId: string;
}

export const LoginScreen: React.FC<Props> = ({
  pharmacies,
  activePharmacyId,
}) => {
  const [selectedPharmacyId, setSelectedPharmacyId] = useState(activePharmacyId);
  const [pharmaPassword, setPharmaPassword] = useState('');
  const [pharmaError, setPharmaError] = useState('');

  useEffect(() => {
    if (!selectedPharmacyId && pharmacies.length > 0) {
      setSelectedPharmacyId(activePharmacyId || pharmacies[0].id);
    }
  }, [pharmacies, activePharmacyId]);

  const handlePharmacistLogin = (e: React.FormEvent) => {
    e.preventDefault();
    store.setActivePharmacy(selectedPharmacyId);
    const res = store.loginPharmacist(pharmaPassword);
    if (!res.success) {
      setPharmaError(res.error || 'كلمة المرور غير صحيحة');
    } else {
      setPharmaPassword('');
      setPharmaError('');
    }
  };

  const activePharmaObj = pharmacies.find((p) => p.id === selectedPharmacyId) || pharmacies[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-right font-['Cairo',sans-serif] selection:bg-emerald-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Logo and Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xl shadow-emerald-900/30 ring-4 ring-emerald-500/20 animate-in zoom-in duration-300">
            <Building2 className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              فارما ديليفري
            </h1>
            <p className="text-xs sm:text-sm text-emerald-300/80 font-bold mt-1">
              منظومة إدارة وتتبع مناديب الصيدلية وتسجيل الواردات
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="mt-8 bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  تسجيل دخول الصيدلي المشرف
                </h2>
                <p className="text-xs text-slate-500">
                  لوحة تحكم مركزية لإدارة الأوردرات وتتبع المناديب
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handlePharmacistLogin} className="space-y-4">
            {pharmacies.length > 1 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  فرع الصيدلية *
                </label>
                <select
                  value={selectedPharmacyId}
                  onChange={(e) => setSelectedPharmacyId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 outline-hidden transition"
                >
                  {pharmacies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.address})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activePharmaObj && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-950">
                <div className="flex items-center justify-between font-bold mb-0.5">
                  <span>الصيدلية الحالية:</span>
                  <span className="text-emerald-800 font-extrabold">{activePharmaObj.name}</span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {activePharmaObj.address}
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                كلمة مرور الصيدلي *
              </label>
              <input
                type="password"
                required
                autoFocus
                value={pharmaPassword}
                onChange={(e) => {
                  setPharmaPassword(e.target.value);
                  setPharmaError('');
                }}
                placeholder="••••••••"
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:border-emerald-500 outline-hidden transition"
              />
              {pharmaError && (
                <p className="text-xs text-rose-600 font-bold mt-1.5">{pharmaError}</p>
              )}
              <span className="text-[11px] text-slate-400 block mt-1">
                كلمة المرور الافتراضية: <code className="font-mono font-bold text-slate-700">pharmacist123</code>
              </span>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <UserCheck className="w-4 h-4" />
                <span>دخول لوحة تحكم الصيدلي</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  store.setActivePharmacy(selectedPharmacyId);
                  store.loginPharmacist('pharmacist123');
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>⚡ دخول سريع مباشر (للكمبيوتر واللابتوب)</span>
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              💡 <strong>ملاحظة للمناديب:</strong> المندوب لا يحتاج لتسجيل دخول أو حساب؛ يتم تزويده برابط مخصص من قِبل الصيدلي لبث موقعه ومتابعة الأوردرات المطلوب توصيلها.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500 mt-6 font-medium">
          فارما ديليفري © {new Date().getFullYear()} · يعمل بكفاءة وسرعة على أجهزة الكمبيوتر واللابتوب والموبايل
        </p>
      </div>
    </div>
  );
};
