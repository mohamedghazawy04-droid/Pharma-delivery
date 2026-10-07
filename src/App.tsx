import React, { useEffect, useState } from 'react';
import { store } from './services/store';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { StoppageAlertBanner } from './components/StoppageAlertBanner';
import { PharmacistDashboard } from './components/pharmacist/PharmacistDashboard';
import { CourierDashboard } from './components/courier/CourierDashboard';
import { NewOrderModal } from './components/NewOrderModal';
import { TransferOrderModal } from './components/TransferOrderModal';
import { EditOrderModal } from './components/EditOrderModal';
import { AuthModal } from './components/AuthModal';
import { PiggyBankModal } from './components/PiggyBankModal';
import { ManagePharmaciesModal } from './components/pharmacist/ManagePharmaciesModal';
import { Order, ShiftSummaryArchive } from './types';
import { Bike, Plus } from 'lucide-react';

export default function App() {
  const [state, setState] = useState(store.getState());

  // Modals state
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [transferOrder, setTransferOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isManagePharmaciesOpen, setIsManagePharmaciesOpen] = useState(false);
  const [piggyBankSummary, setPiggyBankSummary] = useState<ShiftSummaryArchive | null>(null);
  const [isPiggyBankOpen, setIsPiggyBankOpen] = useState(false);

  // Subscribe to reactive store
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setState({ ...store.getState() });
    });
    return unsubscribe;
  }, []);

  const isAuthenticated = state.authenticatedAsPharmacist || Boolean(state.authenticatedCourierId);

  // If user is not yet logged in, show the landing LoginScreen
  if (!isAuthenticated) {
    return (
      <LoginScreen
        pharmacies={state.pharmacies}
        activePharmacyId={state.activePharmacyId}
      />
    );
  }

  const activePharmacy =
    state.pharmacies.find((p) => p.id === state.activePharmacyId) || state.pharmacies[0];

  const pharmacyCouriers = state.couriers.filter(
    (c) => c.pharmacyId === activePharmacy.id
  );

  const activeAlertingCouriers = state.couriers.filter(
    (c) => c.isOnDuty && !c.shift.isEnded && c.isStoppageAlertActive
  );

  const currentCourier =
    pharmacyCouriers.find((c) => c.id === state.currentCourierId) ||
    pharmacyCouriers[0] ||
    state.couriers[0];

  const handleOpenPiggyBankForCourier = (summary?: ShiftSummaryArchive) => {
    if (summary) {
      setPiggyBankSummary(summary);
      setIsPiggyBankOpen(true);
    } else if (currentCourier) {
      // Preview summary for current courier's active shift
      const courierOrders = state.orders.filter(
        (o) => o.courierId === currentCourier.id && o.pharmacyId === activePharmacy.id
      );
      const previewSummary: ShiftSummaryArchive = {
        id: `preview-${Date.now()}`,
        pharmacyId: activePharmacy.id,
        courierId: currentCourier.id,
        courierName: currentCourier.name,
        shiftDate: new Date().toLocaleDateString('ar-EG', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        startTime: currentCourier.shift.startTime,
        endTime: new Date().toISOString(),
        totalOrdersCount: currentCourier.shift.totalOrdersDelivered,
        totalDeliveryFees: currentCourier.shift.totalDeliveryEarnings,
        totalCashCollected: currentCourier.shift.totalCollectedCash,
        totalVisaCollected: currentCourier.shift.totalCollectedVisa,
        totalInstapayCollected: currentCourier.shift.totalCollectedInstapay,
        orders: courierOrders.map((o) => ({
          orderNumber: o.orderNumber,
          orderValue: o.orderValue,
          deliveryFee: o.deliveryFee,
          paymentMethod: o.paymentMethod,
          deliveredAt: o.deliveredAt,
        })),
      };
      setPiggyBankSummary(previewSummary);
      setIsPiggyBankOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-['Cairo',sans-serif]">
      {/* 5-minute Inactivity Stoppage Real Alert Banner */}
      <StoppageAlertBanner
        couriers={state.couriers}
        currentRole={state.role}
        currentCourierId={state.currentCourierId}
      />

      {/* Top Header conforming to Top Bar Contract */}
      <Header
        currentRole={state.role}
        onRoleChange={(role) => store.setRole(role)}
        pharmacies={state.pharmacies}
        activePharmacyId={state.activePharmacyId}
        onSelectPharmacy={(id) => store.setActivePharmacy(id)}
        onOpenManagePharmacies={() => setIsManagePharmaciesOpen(true)}
        couriers={pharmacyCouriers}
        currentCourierId={state.currentCourierId}
        onCourierSelect={(id) => store.setCurrentCourier(id)}
        onOpenNewOrder={() => setIsNewOrderModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        activeAlertCount={activeAlertingCouriers.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {state.role === 'pharmacist' ? (
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
          />
        ) : currentCourier ? (
          <CourierDashboard
            courier={currentCourier}
            orders={state.orders}
            pharmacy={activePharmacy}
            allCouriers={pharmacyCouriers}
            onOpenPiggyBankModal={() => handleOpenPiggyBankForCourier()}
          />
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-4 max-w-lg mx-auto">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center text-3xl mx-auto">
              <Bike className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-800">
              لا يوجد مندوب مسجل حالياً في {activePharmacy.name}
            </h3>
            <p className="text-xs text-slate-500">
              لتجربة شاشة المندوب، يرجى تسجيل حساب مندوب جديد أو تسجيل الدخول برقم الهاتف وكلمة المرور.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>تسجيل أو دخول كمندوب</span>
              </button>
              <button
                onClick={() => store.setRole('pharmacist')}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                العودة للصيدلي
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            فارما ديليفري © {new Date().getFullYear()} · نظام إدارة أوردرات الصيدلية والمناديب
          </span>
          <div className="flex items-center gap-4 text-slate-400">
            <span>نظام مشفر ومحمي</span>
            <span>·</span>
            <span>أوردرات سريعة بالقيمة فقط</span>
            <span>·</span>
            <span>تعدد الصيدليات</span>
            <span>·</span>
            <span>إنذار حقيقي 5 دقائق</span>
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

      <TransferOrderModal
        isOpen={transferOrder !== null}
        onClose={() => setTransferOrder(null)}
        order={transferOrder}
        couriers={pharmacyCouriers}
      />

      <EditOrderModal
        isOpen={editingOrder !== null}
        onClose={() => setEditingOrder(null)}
        order={editingOrder}
        couriers={pharmacyCouriers}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentRole={state.role}
        pharmacies={state.pharmacies}
        activePharmacyId={state.activePharmacyId}
        couriers={state.couriers}
        currentCourierId={state.currentCourierId}
      />

      <PiggyBankModal
        isOpen={isPiggyBankOpen}
        onClose={() => setIsPiggyBankOpen(false)}
        summary={piggyBankSummary}
      />

      <ManagePharmaciesModal
        isOpen={isManagePharmaciesOpen}
        onClose={() => setIsManagePharmaciesOpen(false)}
        pharmacies={state.pharmacies}
        activePharmacyId={state.activePharmacyId}
        couriers={state.couriers}
        orders={state.orders}
      />
    </div>
  );
}
