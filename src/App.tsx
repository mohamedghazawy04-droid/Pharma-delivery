import React, { useEffect, useState } from 'react';
import { store } from './services/store';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { StoppageAlertBanner } from './components/StoppageAlertBanner';
import { PharmacistDashboard } from './components/pharmacist/PharmacistDashboard';
import { CourierBeaconView } from './components/courier/CourierBeaconView';
import { NewOrderModal } from './components/NewOrderModal';
import { TransferOrderModal } from './components/TransferOrderModal';
import { EditOrderModal } from './components/EditOrderModal';
import { AuthModal } from './components/AuthModal';
import { PiggyBankModal } from './components/PiggyBankModal';
import { ManagePharmaciesModal } from './components/pharmacist/ManagePharmaciesModal';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { DeliveryToast } from './components/DeliveryToast';
import { LaunchSplashScreen } from './components/LaunchSplashScreen';
import { Order, ShiftSummaryArchive } from './types';

export default function App() {
  const [state, setState] = useState(store.getState());
  const [showSplash, setShowSplash] = useState(true);

  // Modals state
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [transferOrder, setTransferOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isManagePharmaciesOpen, setIsManagePharmaciesOpen] = useState(false);
  const [piggyBankSummary, setPiggyBankSummary] = useState<ShiftSummaryArchive | null>(null);
  const [isPiggyBankOpen, setIsPiggyBankOpen] = useState(false);
  const [isGoogleDriveOpen, setIsGoogleDriveOpen] = useState(false);

  // Subscribe to reactive store
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setState({ ...store.getState() });
    });
    return unsubscribe;
  }, []);

  // Determine active pharmacy
  const activePharmacy =
    state.pharmacies.find((p) => p.id === state.activePharmacyId) || state.pharmacies[0];

  const pharmacyCouriers = state.couriers.filter(
    (c) => c.pharmacyId === activePharmacy.id
  );

  const activeAlertingCouriers = state.couriers.filter(
    (c) => c.isOnDuty && !c.shift.isEnded && c.isStoppageAlertActive
  );

  // Check if opened via dedicated courier beacon link
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isCourierBeacon = Boolean(
    urlParams &&
      (urlParams.has('courierId') ||
        urlParams.has('c') ||
        urlParams.get('mode') === 'courier' ||
        urlParams.get('role') === 'courier')
  );

  // 1. Courier Beacon & Orders View (Dedicated mobile page for the courier)
  if (isCourierBeacon) {
    const initialCourierId =
      urlParams?.get('courierId') || urlParams?.get('c') || undefined;

    return (
      <CourierBeaconView
        pharmacy={activePharmacy}
        allCouriers={pharmacyCouriers.length > 0 ? pharmacyCouriers : state.couriers}
        orders={state.orders}
        initialCourierId={initialCourierId}
      />
    );
  }

  // 2. Fast Launch Splash Screen with 3D Motorcycle and "Made by dr.mohamed elghazawy" Signature
  if (showSplash && !isCourierBeacon) {
    return (
      <LaunchSplashScreen
        onLaunch={() => setShowSplash(false)}
        pharmacyName={activePharmacy.name}
      />
    );
  }

  // 3. Main Pharmacist App (Desktop, Laptop, PC, and Central Admin)
  if (!state.authenticatedAsPharmacist) {
    return (
      <LoginScreen
        pharmacies={state.pharmacies}
        activePharmacyId={state.activePharmacyId}
      />
    );
  }

  const handleOpenPiggyBankForCourier = (summary?: ShiftSummaryArchive) => {
    if (summary) {
      setPiggyBankSummary(summary);
      setIsPiggyBankOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-950 flex flex-col font-['Cairo',sans-serif] selection:bg-black selection:text-white">
      {/* Real-time Stoppage Alerts Banner for Pharmacist */}
      <StoppageAlertBanner
        couriers={state.couriers}
        currentRole="pharmacist"
        currentCourierId=""
      />

      {/* Real-time Order Delivered Notification Toast */}
      <DeliveryToast />

      {/* Desktop / Laptop Top Navigation Header */}
      <Header
        pharmacies={state.pharmacies}
        activePharmacyId={state.activePharmacyId}
        onSelectPharmacy={(id) => store.setActivePharmacy(id)}
        onOpenManagePharmacies={() => setIsManagePharmaciesOpen(true)}
        couriers={pharmacyCouriers}
        onOpenNewOrder={() => setIsNewOrderModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenGoogleDrive={() => setIsGoogleDriveOpen(true)}
        onOpenSplash={() => setShowSplash(true)}
        activeAlertCount={activeAlertingCouriers.length}
      />

      {/* Main Pharmacist Workspace (Optimized for PC & Laptop) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <PharmacistDashboard
          pharmacy={activePharmacy}
          pharmacies={state.pharmacies}
          couriers={state.couriers}
          orders={state.orders}
          shiftSummaries={state.shiftSummaries}
          onOpenNewOrder={() => setIsNewOrderModalOpen(true)}
          onOpenTransferModal={(ord) => setTransferOrder(ord)}
          onOpenEditOrder={(ord) => setEditingOrder(ord)}
          onOpenPiggyBank={(summary) => {
            setPiggyBankSummary(summary);
            setIsPiggyBankOpen(true);
          }}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onOpenGoogleDrive={() => setIsGoogleDriveOpen(true)}
          onOpenSplash={() => setShowSplash(true)}
        />
      </main>

      {/* Footer with Dr. Mohamed Elghazawy Signature in Black & White */}
      <footer className="bg-white border-t border-zinc-300 py-4 text-center text-xs text-zinc-600">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-800">
              فارما ديليفري © {new Date().getFullYear()} · نظام إدارة وتتبع مناديب الصيدلية وتسجيل الواردات
            </span>
          </div>

          {/* Official Signature Button in Footer - Black & White Luxury */}
          <button
            onClick={() => setShowSplash(true)}
            title="Made by dr.mohamed elghazawy - انقر لعرض شاشة الانطلاق السريعة"
            className="flex items-center gap-2 px-3.5 py-1.5 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold border border-black shadow-md transition cursor-pointer"
          >
            <img
              src="/delivery_motorcycle.jpg"
              alt="Motorcycle"
              className="w-4 h-4 rounded-full object-cover bw-motorcycle"
            />
            <span className="font-mono text-[11px] font-black tracking-wide text-zinc-100">
              Made by dr.mohamed elghazawy
            </span>
            <span className="text-zinc-400 text-[10px]">·</span>
            <span className="text-[10px] text-zinc-300 font-bold">صيدلية الديب</span>
          </button>

          <div className="flex items-center gap-4 text-zinc-500 font-semibold">
            <span>نظام سحابي مشفر</span>
            <span>·</span>
            <span>تتبع GPS حي للصيدلي</span>
            <span>·</span>
            <span>أوردرات سريعة بالقيمة</span>
            <span>·</span>
            <span>متوافق تماماً مع الكمبيوتر واللابتوب والموبايل</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <NewOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        couriers={pharmacyCouriers}
        globalDeliveryFee={activePharmacy.globalDeliveryFee || 7}
      />

      {transferOrder && (
        <TransferOrderModal
          isOpen={!!transferOrder}
          onClose={() => setTransferOrder(null)}
          order={transferOrder}
          couriers={pharmacyCouriers}
        />
      )}

      {editingOrder && (
        <EditOrderModal
          isOpen={!!editingOrder}
          onClose={() => setEditingOrder(null)}
          order={editingOrder}
          couriers={pharmacyCouriers}
        />
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentRole="pharmacist"
        pharmacies={state.pharmacies}
        activePharmacyId={state.activePharmacyId}
        couriers={pharmacyCouriers}
        currentCourierId=""
      />

      <ManagePharmaciesModal
        isOpen={isManagePharmaciesOpen}
        onClose={() => setIsManagePharmaciesOpen(false)}
        pharmacies={state.pharmacies}
        activePharmacyId={state.activePharmacyId}
        couriers={state.couriers}
        orders={state.orders}
      />

      <PiggyBankModal
        isOpen={isPiggyBankOpen}
        onClose={() => setIsPiggyBankOpen(false)}
        summary={piggyBankSummary}
      />

      <GoogleDriveModal
        isOpen={isGoogleDriveOpen}
        onClose={() => setIsGoogleDriveOpen(false)}
        activePharmacy={activePharmacy}
        orders={state.orders}
        couriers={state.couriers}
      />
    </div>
  );
}
