import React, { useEffect, useState } from 'react';
import { ArrowRight, Sparkles, Bike, ShieldCheck, Zap } from 'lucide-react';

interface Props {
  onLaunch: () => void;
  pharmacyName?: string;
}

export const LaunchSplashScreen: React.FC<Props> = ({ onLaunch, pharmacyName = 'صيدليه الديب' }) => {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Fast automatic launch timer (1.2s)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          handleFinish();
          return 100;
        }
        return prev + 6;
      });
    }, 60);

    return () => clearInterval(interval);
  }, []);

  const handleFinish = () => {
    setIsExiting(true);
    setTimeout(() => {
      onLaunch();
    }, 280);
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4 font-['Cairo',sans-serif] text-white selection:bg-white selection:text-black transition-opacity duration-300 ${
        isExiting ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Subtle Monochrome Spotlights */}
      <div className="absolute top-1/4 -right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-zinc-800/40 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-md w-full mx-auto text-center space-y-6">
        {/* 3D Delivery Motorcycle Hero Showcase - Monochrome */}
        <div className="relative mx-auto w-56 h-56 sm:w-64 sm:h-64 rounded-3xl overflow-hidden p-2 bg-zinc-900 border-2 border-zinc-700 shadow-2xl shadow-black flex items-center justify-center group">
          <img
            src="/delivery_motorcycle.jpg"
            alt="Pharmacy Delivery Motorcycle"
            className="w-full h-full object-cover rounded-2xl drop-shadow-2xl bw-motorcycle transform transition duration-500 group-hover:scale-105"
          />
          <div className="absolute -bottom-2 inset-x-0 h-16 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
          <span className="absolute top-3 right-3 px-3 py-1 bg-white text-black rounded-full text-[10px] font-black tracking-wide uppercase border border-zinc-300 flex items-center gap-1 shadow-lg">
            <Zap className="w-3 h-3 text-black fill-black" />
            <span>Fast Launch</span>
          </span>
        </div>

        {/* Title & Pharmacy */}
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span>فارما ديليفري</span>
            <span className="text-zinc-400">⚡</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-semibold">
            نظام إدارة وتوجيه وتتبع أوردرات {pharmacyName}
          </p>
        </div>

        {/* Doctor Mohamed Elghazawy Signature Block in Luxury B&W */}
        <div className="mx-auto max-w-xs p-3.5 rounded-2xl bg-zinc-900/90 backdrop-blur-md border border-zinc-700 shadow-xl text-center space-y-1">
          <span className="text-[10px] tracking-widest uppercase text-zinc-400 font-bold block">
            Official System Signature
          </span>
          <div className="text-base sm:text-lg font-black text-white font-mono tracking-wide flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-white" />
            <span className="text-white">
              Made by dr.mohamed elghazawy
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 font-bold block">
            تم التطوير بواسطة د. محمد الغزاوي لصيدلية الديب
          </span>
        </div>

        {/* Progress Bar & Fast Action Button in B&W */}
        <div className="space-y-3 pt-2">
          <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-700 p-0.5">
            <div
              className="bg-white h-full rounded-full transition-all duration-75 shadow-[0_0_12px_rgba(255,255,255,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <button
            onClick={handleFinish}
            className="w-full py-3.5 px-6 bg-white hover:bg-zinc-200 text-black rounded-2xl text-xs sm:text-sm font-black shadow-xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <span>دخول فوري للوحة التحكم السريعة</span>
            <ArrowRight className="w-4 h-4 rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
};
