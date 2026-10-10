import {
  CourierProfile,
  Order,
  Pharmacy,
  ShiftSummaryArchive,
  UserRole,
} from '../types';
import {
  PHARMACY_BASE_LOCATION,
  getSimulatedNextPosition,
  calculateDistanceMeters,
} from '../utils/geo';
import {
  playCoinSound,
  playShiftFanfare,
  sendRealBrowserNotification,
  startRepeatingAlarm,
  stopRepeatingAlarm,
} from '../utils/audio';
import { db, handleFirestoreError, OperationType } from './firebase';
import { doc, setDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';
import { notificationService } from './notificationService';

const STORAGE_KEY = 'pharma_delivery_real_v4';
const SYNC_CHANNEL_NAME = 'pharma_real_sync_channel';

// Helper to merge arrays by unique ID so multi-client sync never overwrites or loses data
function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map<string, T>();
  (existing || []).forEach((item) => {
    if (item && item.id) map.set(item.id, item);
  });
  (incoming || []).forEach((item) => {
    if (item && item.id) {
      const prev = map.get(item.id);
      map.set(item.id, prev ? { ...prev, ...item } : item);
    }
  });
  return Array.from(map.values());
}

interface AppState {
  role: UserRole;
  activePharmacyId: string;
  currentCourierId: string;
  pharmacies: Pharmacy[];
  couriers: CourierProfile[];
  orders: Order[];
  shiftSummaries: ShiftSummaryArchive[];
  authenticatedAsPharmacist: boolean;
  authenticatedCourierId: string | null;
}

// Clean initial pharmacies with user pharmacy صيدليه الديب as the SOLE real pharmacy
const DEFAULT_INITIAL_PHARMACIES: Pharmacy[] = [
  {
    id: 'pharma-main',
    name: 'صيدليه الديب',
    pharmacistName: 'د.محمد',
    phone: '01063629587',
    address: 'الحي ١١ الاتحاد التعاوني',
    password: 'pharmacist123',
    globalDeliveryFee: 7,
    coordinates: {
      lat: 30.05688,
      lng: 31.20572,
      address: 'الحي ١١ الاتحاد التعاوني',
    },
    createdAt: '2026-10-06T00:00:00.000Z',
  },
];

function loadInitialState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.pharmacies && Array.isArray(parsed.pharmacies) && parsed.pharmacies.length > 0) {
        // Filter out any stale dummy/fake pharmacies
        const cleanPharmacies: Pharmacy[] = parsed.pharmacies.filter(
          (p: Pharmacy) =>
            p &&
            p.id !== 'pharma-branch-2' &&
            !p.name.includes('النور والشفاء')
        );

        const finalPharmacies =
          cleanPharmacies.length > 0 ? cleanPharmacies : DEFAULT_INITIAL_PHARMACIES;

        const activeStillExists = finalPharmacies.some(
          (p) => p.id === parsed.activePharmacyId
        );
        const finalActiveId = activeStillExists
          ? parsed.activePharmacyId
          : finalPharmacies[0].id;

        const isCourierUrl =
          typeof window !== 'undefined' &&
          (new URLSearchParams(window.location.search).get('role') === 'courier' ||
            new URLSearchParams(window.location.search).get('mode') === 'courier');

        const savedCourierAuthId = typeof localStorage !== 'undefined' ? localStorage.getItem('pharma_courier_auth_id') : null;
        const savedPharmaAuth = typeof localStorage !== 'undefined' ? localStorage.getItem('pharma_admin_authenticated') === 'true' : false;

        const finalCourierAuthId = parsed.authenticatedCourierId || savedCourierAuthId || null;
        const isPharmaAuth = parsed.authenticatedAsPharmacist || savedPharmaAuth;

        // If URL explicitly targets courier, role is courier.
        // Otherwise, the default control dashboard is pharmacist.
        const finalRole: UserRole = isCourierUrl ? 'courier' : 'pharmacist';

        return {
          role: finalRole,
          activePharmacyId: finalActiveId,
          currentCourierId: finalCourierAuthId || parsed.currentCourierId || '',
          pharmacies: finalPharmacies,
          couriers: parsed.couriers || [], // Real data only
          orders: parsed.orders || [], // Real data only
          shiftSummaries: parsed.shiftSummaries || [],
          authenticatedAsPharmacist: isPharmaAuth,
          authenticatedCourierId: isCourierUrl ? finalCourierAuthId : null,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to parse state from localStorage:', e);
  }

  const isCourierUrl =
    typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).get('role') === 'courier' ||
      new URLSearchParams(window.location.search).get('mode') === 'courier');

  const savedCourierAuthId = typeof localStorage !== 'undefined' ? localStorage.getItem('pharma_courier_auth_id') : null;
  const savedPharmaAuth = typeof localStorage !== 'undefined' ? localStorage.getItem('pharma_admin_authenticated') === 'true' : false;

  // Pure clean state with only real pharmacy صيدليه الديب, NO fake pharmacies, NO fake orders and NO fake couriers
  return {
    role: isCourierUrl ? 'courier' : 'pharmacist',
    activePharmacyId: DEFAULT_INITIAL_PHARMACIES[0].id,
    currentCourierId: savedCourierAuthId || '',
    pharmacies: DEFAULT_INITIAL_PHARMACIES,
    couriers: [], // Empty, no fake couriers!
    orders: [], // Empty, no fake orders!
    shiftSummaries: [],
    authenticatedAsPharmacist: savedPharmaAuth,
    authenticatedCourierId: isCourierUrl ? savedCourierAuthId : null,
  };
}

class Store {
  private state: AppState;
  private listeners: Set<() => void> = new Set();
  private syncChannel: BroadcastChannel | null = null;
  private tickerInterval: number | null = null;
  private cloudPollInterval: number | null = null;
  private lastCloudTimestamp = '';
  private isInitialLoadDone = false;
  private knownCourierIds: Set<string> = new Set();

  constructor() {
    this.state = loadInitialState();
    (this.state.couriers || []).forEach((c) => {
      if (c && c.id) this.knownCourierIds.add(c.id);
    });

    this.initSyncChannel();
    this.startRealStoppageTicker();
    this.fetchCloudData();
    this.startCloudPolling();
    this.initFirestoreSync();

    // Mark initial load done after brief moment so live arrivals trigger notifications
    setTimeout(() => {
      this.isInitialLoadDone = true;
    }, 2000);
  }

  // Handle incoming couriers from Firestore, API polling, or multi-tabs
  private handleIncomingCouriers(incomingCouriers: CourierProfile[]) {
    if (!Array.isArray(incomingCouriers) || incomingCouriers.length === 0) return;

    const prevCouriers = this.state.couriers || [];
    const existingIds = new Set(prevCouriers.map((c) => c.id));
    const newCouriers = incomingCouriers.filter(
      (c) => !existingIds.has(c.id) && !this.knownCourierIds.has(c.id)
    );

    // If initial sync completed and a new courier joined from mobile, alert the pharmacist!
    if (this.isInitialLoadDone && newCouriers.length > 0) {
      newCouriers.forEach((newC) => {
        this.knownCourierIds.add(newC.id);
        notificationService.notifyNewCourierRegistered(newC, this.state.pharmacies);
      });
    } else {
      incomingCouriers.forEach((c) => {
        if (c && c.id) this.knownCourierIds.add(c.id);
      });
    }

    const merged = mergeById(prevCouriers, incomingCouriers);
    const hasDifference =
      merged.length !== prevCouriers.length ||
      JSON.stringify(merged) !== JSON.stringify(prevCouriers);

    if (hasDifference) {
      this.state = {
        ...this.state,
        couriers: merged,
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {}

      this.listeners.forEach((listener) => listener());
    }
  }

  // Real-time synchronization via Cloud Firestore (synchronizes preview and web page globally)
  private initFirestoreSync() {
    if (typeof window === 'undefined' || !db) return;

    // 1. Listen to individual couriers collection for instant multi-device registration sync
    try {
      const couriersColRef = collection(db, 'couriers');
      onSnapshot(
        couriersColRef,
        (snapshot) => {
          const incoming: CourierProfile[] = [];
          snapshot.forEach((docSnap) => {
            if (docSnap.exists()) {
              incoming.push(docSnap.data() as CourierProfile);
            }
          });
          if (incoming.length > 0) {
            this.handleIncomingCouriers(incoming);
          }
        },
        (error) => {
          console.warn('Firestore couriers collection onSnapshot:', error);
        }
      );
    } catch (err) {
      console.warn('Failed to listen to couriers collection:', err);
    }

    // 2. Listen to system cloud state
    try {
      const stateDocRef = doc(db, 'system', 'cloud_state');
      onSnapshot(
        stateDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const cloudData = snapshot.data();
            if (
              cloudData &&
              Array.isArray(cloudData.pharmacies) &&
              cloudData.pharmacies.length > 0
            ) {
              const rawPharmacies: Pharmacy[] = cloudData.pharmacies;
              const cleanPharmacies = rawPharmacies.filter(
                (p) => p && p.id !== 'pharma-branch-2' && !p.name.includes('النور والشفاء')
              );
              const incomingPharmacies: Pharmacy[] =
                cleanPharmacies.length > 0 ? cleanPharmacies : DEFAULT_INITIAL_PHARMACIES;
              const activeStillExists = incomingPharmacies.some(
                (p) => p.id === this.state.activePharmacyId
              );

              // Process couriers from cloudData
              if (Array.isArray(cloudData.couriers)) {
                this.handleIncomingCouriers(cloudData.couriers);
              }

              // Check for newly delivered orders to notify
              if (Array.isArray(cloudData.orders)) {
                const incomingOrders: Order[] = cloudData.orders;
                incomingOrders.forEach((cloudOrd) => {
                  if (cloudOrd.status === 'delivered') {
                    const prev = this.state.orders.find((p) => p.id === cloudOrd.id);
                    if (prev && prev.status !== 'delivered') {
                      const courier = (cloudData.couriers || this.state.couriers).find(
                        (c: any) => c.id === cloudOrd.courierId
                      );
                      const pharmacy = (incomingPharmacies || this.state.pharmacies).find(
                        (p: any) => p.id === cloudOrd.pharmacyId
                      );
                      notificationService.notifyOrderDelivered({
                        order: cloudOrd,
                        courier,
                        pharmacy,
                      });
                    }
                  }
                });
              }

              this.state = {
                ...this.state,
                pharmacies: incomingPharmacies,
                couriers: Array.isArray(cloudData.couriers)
                  ? mergeById(this.state.couriers, cloudData.couriers)
                  : this.state.couriers,
                orders: Array.isArray(cloudData.orders)
                  ? cloudData.orders
                  : this.state.orders,
                shiftSummaries: Array.isArray(cloudData.shiftSummaries)
                  ? cloudData.shiftSummaries
                  : this.state.shiftSummaries,
                activePharmacyId: activeStillExists
                  ? this.state.activePharmacyId
                  : incomingPharmacies[0]?.id || 'pharma-main',
              };

              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
              } catch (e) {}

              this.listeners.forEach((listener) => listener());
            }
          } else {
            // Document not yet created: seed it with current state
            setDoc(stateDocRef, {
              pharmacies: this.state.pharmacies,
              couriers: this.state.couriers,
              orders: this.state.orders,
              shiftSummaries: this.state.shiftSummaries,
              lastUpdated: new Date().toISOString(),
            }).catch((err) => console.warn('Firestore seeding error:', err));
          }
        },
        (error) => {
          console.warn('Firestore onSnapshot listener error:', error);
        }
      );
    } catch (err) {
      console.warn('Failed to initialize Firestore sync:', err);
    }
  }

  private initSyncChannel() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
        this.syncChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'SYNC_STATE') {
            const prevOrders = this.state.orders;
            const nextOrders: Order[] = event.data.state.orders || [];

            // Check if any order became delivered from another tab
            nextOrders.forEach((newOrd) => {
              if (newOrd.status === 'delivered') {
                const prev = prevOrders.find((p) => p.id === newOrd.id);
                if (prev && prev.status !== 'delivered') {
                  const courier = (event.data.state.couriers || []).find((c: any) => c.id === newOrd.courierId);
                  const pharmacy = (event.data.state.pharmacies || []).find((p: any) => p.id === newOrd.pharmacyId);
                  notificationService.notifyOrderDelivered({
                    order: newOrd,
                    courier,
                    pharmacy,
                  });
                }
              }
            });

            // Check for new couriers via sync
            if (event.data.state && Array.isArray(event.data.state.couriers)) {
              this.handleIncomingCouriers(event.data.state.couriers);
            }

            // CRITICAL: Merge ONLY shared business data (couriers, orders, pharmacies, shifts)
            // DO NOT overwrite this window/device's local session role or auth!
            const incomingState = event.data.state;
            this.state = {
              ...this.state,
              pharmacies: incomingState.pharmacies ? mergeById(this.state.pharmacies, incomingState.pharmacies) : this.state.pharmacies,
              couriers: incomingState.couriers ? mergeById(this.state.couriers, incomingState.couriers) : this.state.couriers,
              orders: incomingState.orders ? mergeById(this.state.orders, incomingState.orders) : this.state.orders,
              shiftSummaries: incomingState.shiftSummaries ? mergeById(this.state.shiftSummaries, incomingState.shiftSummaries) : this.state.shiftSummaries,
            };
            this.notify(false, false);
          } else if (event.data && event.data.type === 'ORDER_DELIVERED') {
            notificationService.notifyOrderDelivered({
              order: event.data.order,
              courier: event.data.courier,
              pharmacy: event.data.pharmacy,
            });
          } else if (event.data && event.data.type === 'COURIER_REGISTERED') {
            if (event.data.courier) {
              notificationService.notifyNewCourierRegistered(
                event.data.courier,
                event.data.pharmacies || this.state.pharmacies
              );
              this.handleIncomingCouriers([event.data.courier]);
            }
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }
  }

  // Fetch from central cloud database (authoritative source of truth)
  public async fetchCloudData(): Promise<void> {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const cloudData = json.data;
          const rawServerPharmacies: Pharmacy[] = Array.isArray(cloudData.pharmacies)
            ? cloudData.pharmacies
            : [];
          const cleanPharmacies = rawServerPharmacies.filter(
            (p) => p && p.id !== 'pharma-branch-2' && !p.name.includes('النور والشفاء')
          );
          const serverPharmacies: Pharmacy[] =
            cleanPharmacies.length > 0 ? cleanPharmacies : DEFAULT_INITIAL_PHARMACIES;

          if (serverPharmacies.length > 0) {
            const activeStillExists = serverPharmacies.some(
              (p) => p.id === this.state.activePharmacyId
            );

            // Ingest incoming couriers with real-time new courier alert
            if (Array.isArray(cloudData.couriers)) {
              this.handleIncomingCouriers(cloudData.couriers);
            }

            // Detect newly delivered orders from cloud polling
            if (Array.isArray(cloudData.orders)) {
              const incomingOrders: Order[] = cloudData.orders;
              incomingOrders.forEach((cloudOrd) => {
                if (cloudOrd.status === 'delivered') {
                  const prev = this.state.orders.find((p) => p.id === cloudOrd.id);
                  if (prev && prev.status !== 'delivered') {
                    const courier = (cloudData.couriers || this.state.couriers).find(
                      (c: any) => c.id === cloudOrd.courierId
                    );
                    const pharmacy = (serverPharmacies || this.state.pharmacies).find(
                      (p: any) => p.id === cloudOrd.pharmacyId
                    );
                    notificationService.notifyOrderDelivered({
                      order: cloudOrd,
                      courier,
                      pharmacy,
                    });
                  }
                }
              });
            }

            this.state = {
              ...this.state,
              pharmacies: serverPharmacies,
              couriers: Array.isArray(cloudData.couriers)
                ? mergeById(this.state.couriers, cloudData.couriers)
                : this.state.couriers,
              orders: Array.isArray(cloudData.orders)
                ? mergeById(this.state.orders, cloudData.orders)
                : this.state.orders,
              shiftSummaries: Array.isArray(cloudData.shiftSummaries)
                ? cloudData.shiftSummaries
                : this.state.shiftSummaries,
              activePharmacyId: activeStillExists
                ? this.state.activePharmacyId
                : serverPharmacies[0]?.id || 'pharma-main',
            };

            this.lastCloudTimestamp = cloudData.lastUpdated || '';

            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
            } catch (e) {}

            this.listeners.forEach((listener) => listener());
          }
        }
      }
    } catch (err) {
      // Offline fallback
    }
  }

  private startCloudPolling() {
    if (typeof window === 'undefined') return;
    if (this.cloudPollInterval) return;
    this.cloudPollInterval = window.setInterval(() => {
      this.fetchCloudData();
    }, 2500);
  }

  // Send updates to cloud server
  private async pushToCloudServer() {
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacies: this.state.pharmacies,
          couriers: this.state.couriers,
          orders: this.state.orders,
          shiftSummaries: this.state.shiftSummaries,
        }),
      });
    } catch (err) {
      // Will sync on next cycle
    }

    // Also persist directly to Cloud Firestore
    try {
      if (typeof window !== 'undefined' && db) {
        setDoc(
          doc(db, 'system', 'cloud_state'),
          {
            pharmacies: this.state.pharmacies,
            couriers: this.state.couriers,
            orders: this.state.orders,
            shiftSummaries: this.state.shiftSummaries,
            lastUpdated: new Date().toISOString(),
          },
          { merge: true }
        ).catch(() => {});
      }
    } catch (e) {
      // Offline fallback
    }
  }

  private persistAndBroadcast(broadcast = true, syncCloud = true) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      if (broadcast && this.syncChannel) {
        this.syncChannel.postMessage({
          type: 'SYNC_STATE',
          state: this.state,
        });
      }
    } catch (e) {
      console.error('Failed to save state to localStorage:', e);
    }

    if (syncCloud) {
      this.pushToCloudServer();
    }
  }

  private notify(broadcast = true, syncCloud = true) {
    this.persistAndBroadcast(broadcast, syncCloud);
    this.listeners.forEach((listener) => listener());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): AppState {
    return this.state;
  }

  // Active Pharmacy Helper
  public getActivePharmacy(): Pharmacy {
    const ph = this.state.pharmacies.find((p) => p.id === this.state.activePharmacyId);
    return ph || this.state.pharmacies[0] || DEFAULT_INITIAL_PHARMACIES[0];
  }

  public setActivePharmacy(pharmacyId: string) {
    this.state = {
      ...this.state,
      activePharmacyId: pharmacyId,
    };
    this.notify(true);
  }

  // Create New Pharmacy (امكانيه اضافه اكتر من صيدليه)
  public addPharmacy(pharmacyData: {
    name: string;
    pharmacistName: string;
    phone: string;
    address: string;
    password?: string;
    globalDeliveryFee?: number;
    lat?: number;
    lng?: number;
  }): Pharmacy {
    const newPharmacy: Pharmacy = {
      id: `pharma-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: pharmacyData.name,
      pharmacistName: pharmacyData.pharmacistName,
      phone: pharmacyData.phone,
      address: pharmacyData.address,
      password: 'pharmacist123', // Required: pharmacist123
      globalDeliveryFee: pharmacyData.globalDeliveryFee || 7,
      coordinates: {
        lat: pharmacyData.lat || 30.0488 + (Math.random() - 0.5) * 0.02,
        lng: pharmacyData.lng || 31.2112 + (Math.random() - 0.5) * 0.02,
        address: pharmacyData.address,
      },
      createdAt: new Date().toISOString(),
    };

    this.state = {
      ...this.state,
      pharmacies: [...this.state.pharmacies, newPharmacy],
      activePharmacyId: newPharmacy.id,
    };
    this.notify(true, false);

    // Persist to central cloud storage immediately
    fetch('/api/pharmacy/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPharmacy),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          this.lastCloudTimestamp = res.data.lastUpdated || '';
        }
      })
      .catch((err) => console.warn('Cloud pharmacy add sync error:', err));

    return newPharmacy;
  }

  // Update Pharmacy (تعديل بيانات واسم الصيدلية)
  public updatePharmacy(pharmacyId: string, updates: Partial<Pharmacy>): { success: boolean } {
    this.state = {
      ...this.state,
      pharmacies: this.state.pharmacies.map((p) =>
        p.id === pharmacyId ? { ...p, ...updates } : p
      ),
    };
    this.notify(true, true);

    fetch('/api/pharmacy/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pharmacyId, updates }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          this.lastCloudTimestamp = res.data.lastUpdated || '';
        }
      })
      .catch((err) => console.warn('Cloud pharmacy update sync error:', err));

    return { success: true };
  }

  // Delete / Remove Pharmacy (إزالة الصيدلية نهائياً)
  public deletePharmacy(pharmacyId: string): { success: boolean; error?: string } {
    if (this.state.pharmacies.length <= 1) {
      return {
        success: false,
        error: 'لا يمكن حذف الصيدلية الوحيدة في المنظومة. يجب توفر صيدلية واحدة على الأقل.',
      };
    }

    const remainingPharmacies = this.state.pharmacies.filter((p) => p.id !== pharmacyId);
    const newActiveId =
      this.state.activePharmacyId === pharmacyId
        ? remainingPharmacies[0].id
        : this.state.activePharmacyId;

    // Remove associated couriers, orders, and shift summaries for the deleted pharmacy
    const remainingCouriers = this.state.couriers.filter((c) => c.pharmacyId !== pharmacyId);
    const remainingOrders = this.state.orders.filter((o) => o.pharmacyId !== pharmacyId);
    const remainingSummaries = this.state.shiftSummaries.filter(
      (s) => s.pharmacyId !== pharmacyId
    );

    this.state = {
      ...this.state,
      pharmacies: remainingPharmacies,
      activePharmacyId: newActiveId,
      couriers: remainingCouriers,
      orders: remainingOrders,
      shiftSummaries: remainingSummaries,
      currentCourierId: remainingCouriers.find((c) => c.id === this.state.currentCourierId)
        ? this.state.currentCourierId
        : remainingCouriers[0]?.id || '',
    };

    // Update local storage, broadcast to open tabs, and sync with cloud immediately
    this.notify(true, true);

    // Call server delete API directly to remove from cloud_store.json
    fetch('/api/pharmacy/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pharmacyId }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          this.lastCloudTimestamp = res.data.lastUpdated || '';
        }
      })
      .catch((err) => console.warn('Cloud pharmacy delete sync error:', err));

    return { success: true };
  }

  // Pharmacist Authentication
  public loginPharmacist(password: string): { success: boolean; error?: string } {
    if (password === 'pharmacist123') {
      try {
        localStorage.setItem('pharma_admin_authenticated', 'true');
      } catch (e) {}

      this.state = {
        ...this.state,
        role: 'pharmacist',
        authenticatedAsPharmacist: true,
      };
      this.notify(true);
      return { success: true };
    }
    return { success: false, error: 'كلمة مرور الصيدلي غير صحيحة' };
  }

  // Courier Authentication
  public loginCourier(phone: string, password: string): { success: boolean; courier?: CourierProfile; error?: string } {
    const courier = this.state.couriers.find(
      (c) => c.phone.trim() === phone.trim() && c.password.trim() === password.trim()
    );

    if (courier) {
      try {
        localStorage.setItem('pharma_courier_auth_id', courier.id);
      } catch (e) {}

      this.state = {
        ...this.state,
        role: 'courier',
        currentCourierId: courier.id,
        authenticatedCourierId: courier.id,
        activePharmacyId: courier.pharmacyId, // Switch to courier's pharmacy
        couriers: this.state.couriers.map((c) =>
          c.id === courier.id ? { ...c, isOnDuty: true } : c
        ),
      };
      this.notify(true);
      return { success: true, courier };
    }
    return { success: false, error: 'رقم الهاتف أو كلمة المرور للمندوب غير صحيحة' };
  }

  // Asynchronous login that pulls freshest data from cloud if not found in local memory
  public async loginCourierAsync(
    phone: string,
    password: string
  ): Promise<{ success: boolean; courier?: CourierProfile; error?: string }> {
    const initialCheck = this.loginCourier(phone, password);
    if (initialCheck.success) return initialCheck;

    // Refresh cloud data in case courier registered from another device
    try {
      await this.fetchCloudData();
    } catch (e) {}

    return this.loginCourier(phone, password);
  }

  // Logout method (العودة لواجهة تسجيل الدخول الرئيسية)
  public logout() {
    try {
      localStorage.removeItem('pharma_courier_auth_id');
      localStorage.removeItem('pharma_admin_authenticated');
    } catch (e) {}
    this.state = {
      ...this.state,
      authenticatedAsPharmacist: false,
      authenticatedCourierId: null,
    };
    this.notify(true);
  }

  // Role switching
  public setRole(role: UserRole, courierId?: string) {
    this.state = {
      ...this.state,
      role,
      currentCourierId: courierId || this.state.currentCourierId,
    };
    this.notify(true);
  }

  public setCurrentCourier(courierId: string) {
    this.state = {
      ...this.state,
      currentCourierId: courierId,
    };
    this.notify(true);
  }

  // Global & Courier Fee Management
  public setPharmacyDeliveryFee(pharmacyId: string, fee: number) {
    this.state = {
      ...this.state,
      pharmacies: this.state.pharmacies.map((p) =>
        p.id === pharmacyId ? { ...p, globalDeliveryFee: fee } : p
      ),
      couriers: this.state.couriers.map((c) =>
        c.pharmacyId === pharmacyId ? { ...c, deliveryFeePerOrder: fee } : c
      ),
    };
    this.notify(true);
  }

  public setCourierDeliveryFee(courierId: string, fee: number) {
    this.state = {
      ...this.state,
      couriers: this.state.couriers.map((c) =>
        c.id === courierId ? { ...c, deliveryFeePerOrder: fee } : c
      ),
    };
    this.notify(true);
  }

  // ULTRA FAST ORDER ADDITION: VALUE ONLY (بدون بيانات عميل)
  public addFastOrder(data: {
    pharmacyId?: string;
    orderValue: number; // Required value
    orderType?: import('../types').OrderType;
    paymentMethod: 'cash' | 'visa' | 'instapay';
    courierId: string;
    deliveryFee?: number;
    quickNote?: string;
  }) {
    const targetPharmacyId = data.pharmacyId || this.state.activePharmacyId;
    const targetCourier = this.state.couriers.find((c) => c.id === data.courierId);
    const pharmacy = this.state.pharmacies.find((p) => p.id === targetPharmacyId) || this.getActivePharmacy();

    const assignedFee =
      data.deliveryFee ??
      (targetCourier ? targetCourier.deliveryFeePerOrder : pharmacy.globalDeliveryFee || 7);

    // Auto-incremental order number for this pharmacy
    const pharmacyOrdersCount = this.state.orders.filter(
      (o) => o.pharmacyId === targetPharmacyId
    ).length;
    const orderNumber = `#${pharmacyOrdersCount + 1}`;

    const newOrder: Order = {
      id: `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      pharmacyId: targetPharmacyId,
      orderNumber,
      orderType: data.orderType || 'عادي',
      orderValue: Number(data.orderValue),
      deliveryFee: Number(assignedFee),
      paymentMethod: data.paymentMethod,
      courierId: data.courierId,
      status: 'assigned',
      createdAt: new Date().toISOString(),
      assignedAt: new Date().toISOString(),
      isArchived: false,
      quickNote: data.quickNote?.trim() || undefined,
    };

    playCoinSound();

    this.state = {
      ...this.state,
      orders: [newOrder, ...this.state.orders],
    };
    this.notify(true);
    return newOrder;
  }

  // Edit existing order by Pharmacist (نوع الأوردر / القيمة / نقدي أو فيزا أو انستاباي / المندوب)
  // Changes reflect INSTANTLY on courier's screen via reactive state & BroadcastChannel
  public updateOrder(
    orderId: string,
    updates: {
      orderValue?: number;
      orderType?: import('../types').OrderType;
      paymentMethod?: 'cash' | 'visa' | 'instapay';
      courierId?: string;
      deliveryFee?: number;
      quickNote?: string;
    }
  ) {
    const existingOrder = this.state.orders.find((o) => o.id === orderId);
    if (!existingOrder) return;

    const oldCourierId = existingOrder.courierId;
    const newCourierId = updates.courierId || existingOrder.courierId;
    const targetCourier = this.state.couriers.find((c) => c.id === newCourierId);

    const deliveryFee =
      updates.deliveryFee !== undefined
        ? Number(updates.deliveryFee)
        : oldCourierId !== newCourierId && targetCourier
        ? targetCourier.deliveryFeePerOrder
        : existingOrder.deliveryFee || 7;

    const updatedOrders = this.state.orders.map((ord) => {
      if (ord.id === orderId) {
        const newOrderVal =
          updates.orderValue !== undefined ? Number(updates.orderValue) : ord.orderValue;
        const newOrderType = updates.orderType !== undefined ? updates.orderType : ord.orderType || 'عادي';
        const isDelivered = ord.status === 'delivered';

        return {
          ...ord,
          orderValue: newOrderVal,
          orderType: newOrderType,
          totalValueWithDelivery: isDelivered ? newOrderVal + 7 : undefined,
          paymentMethod: updates.paymentMethod || ord.paymentMethod,
          courierId: newCourierId,
          deliveryFee,
          quickNote: updates.quickNote !== undefined ? updates.quickNote : ord.quickNote,
          updatedAt: new Date().toISOString(),
        };
      }
      return ord;
    });

    playCoinSound();

    this.state = {
      ...this.state,
      orders: updatedOrders,
    };
    this.notify(true);
  }

  // Transfer order to another courier
  public transferOrder(orderId: string, targetCourierId: string) {
    const targetCourier = this.state.couriers.find((c) => c.id === targetCourierId);
    if (!targetCourier) return;

    this.state = {
      ...this.state,
      orders: this.state.orders.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            courierId: targetCourierId,
            deliveryFee: targetCourier.deliveryFeePerOrder || 7,
            assignedAt: new Date().toISOString(),
            status: 'assigned',
            updatedAt: new Date().toISOString(),
          };
        }
        return ord;
      }),
    };
    this.notify(true);
  }

  // Update order status (في حالة تمام الأوردر تضاف قيمة 7 جنيه للأوردر ولحصالة المندوب)
  public updateOrderStatus(orderId: string, status: Order['status']) {
    const order = this.state.orders.find((o) => o.id === orderId);
    if (!order) return;

    const isDeliveredNow = status === 'delivered' && order.status !== 'delivered';
    const deliveredAt = isDeliveredNow ? new Date().toISOString() : order.deliveredAt;
    const completedFeeToAdd = 7; // قيمة 7 جنيه تضاف للأوردر عند التمام

    let updatedCouriers = this.state.couriers;
    if (isDeliveredNow) {
      const courier = this.state.couriers.find((c) => c.id === order.courierId);
      const pharmacy = this.state.pharmacies.find((p) => p.id === order.pharmacyId);

      const deliveredOrderPayload: Order = {
        ...order,
        status: 'delivered',
        deliveredAt,
        completedFeeAdded: completedFeeToAdd,
        deliveryFee: completedFeeToAdd,
        totalValueWithDelivery: order.orderValue + completedFeeToAdd,
      };

      // Trigger Web Notification for the Pharmacist
      notificationService.notifyOrderDelivered({
        order: deliveredOrderPayload,
        courier,
        pharmacy,
      });

      // Broadcast explicit delivery event across tabs
      if (this.syncChannel) {
        this.syncChannel.postMessage({
          type: 'ORDER_DELIVERED',
          order: deliveredOrderPayload,
          courier,
          pharmacy,
        });
      }

      updatedCouriers = this.state.couriers.map((c) => {
        if (c.id === order.courierId) {
          const isCash = order.paymentMethod === 'cash';
          const isVisa = order.paymentMethod === 'visa';
          const isInstapay = order.paymentMethod === 'instapay';

          return {
            ...c,
            shift: {
              ...c.shift,
              totalOrdersDelivered: c.shift.totalOrdersDelivered + 1,
              // تضاف 7 جنيه لحصالة وأرباح المندوب عند تمام الأوردر
              totalDeliveryEarnings: c.shift.totalDeliveryEarnings + completedFeeToAdd,
              totalCollectedCash: isCash
                ? c.shift.totalCollectedCash + order.orderValue
                : c.shift.totalCollectedCash,
              totalCollectedVisa: isVisa
                ? c.shift.totalCollectedVisa + order.orderValue
                : c.shift.totalCollectedVisa,
              totalCollectedInstapay: isInstapay
                ? c.shift.totalCollectedInstapay + order.orderValue
                : c.shift.totalCollectedInstapay,
            },
          };
        }
        return c;
      });
    }

    this.state = {
      ...this.state,
      couriers: updatedCouriers,
      orders: this.state.orders.map((o) => {
        if (o.id === orderId) {
          if (status === 'delivered') {
            return {
              ...o,
              status,
              deliveredAt,
              completedFeeAdded: completedFeeToAdd,
              deliveryFee: completedFeeToAdd,
              totalValueWithDelivery: o.orderValue + completedFeeToAdd,
            };
          }
          return { ...o, status, deliveredAt };
        }
        return o;
      }),
    };
    this.notify(true);
  }

  // Save / Archive Courier Orders (Page appears completely clean & empty)
  public archiveCourierOrders(courierId: string) {
    const archiveTimestamp = new Date().toISOString();
    this.state = {
      ...this.state,
      orders: this.state.orders.map((ord) => {
        if (ord.courierId === courierId && !ord.isArchived) {
          return {
            ...ord,
            isArchived: true,
            archivedAt: archiveTimestamp,
          };
        }
        return ord;
      }),
    };
    this.notify(true);
  }

  // Restore courier archived orders
  public restoreCourierOrders(courierId: string) {
    this.state = {
      ...this.state,
      orders: this.state.orders.map((ord) => {
        if (ord.courierId === courierId && ord.isArchived) {
          return {
            ...ord,
            isArchived: false,
          };
        }
        return ord;
      }),
    };
    this.notify(true);
  }

  // End Shift
  public endCourierShift(courierId: string): ShiftSummaryArchive | null {
    const courier = this.state.couriers.find((c) => c.id === courierId);
    if (!courier) return null;

    const endTime = new Date().toISOString();
    const courierOrders = this.state.orders.filter(
      (o) => o.courierId === courierId && o.pharmacyId === courier.pharmacyId
    );

    const summary: ShiftSummaryArchive = {
      id: `shift-${Date.now()}`,
      pharmacyId: courier.pharmacyId,
      courierId: courier.id,
      courierName: courier.name,
      shiftDate: new Date().toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      startTime: courier.shift.startTime,
      endTime,
      totalOrdersCount: courier.shift.totalOrdersDelivered,
      totalDeliveryFees: courier.shift.totalDeliveryEarnings,
      totalCashCollected: courier.shift.totalCollectedCash,
      totalVisaCollected: courier.shift.totalCollectedVisa,
      totalInstapayCollected: courier.shift.totalCollectedInstapay,
      orders: courierOrders.map((o) => ({
        orderNumber: o.orderNumber,
        orderValue: o.orderValue,
        deliveryFee: o.deliveryFee,
        paymentMethod: o.paymentMethod,
        deliveredAt: o.deliveredAt,
      })),
    };

    // Archive current orders
    const updatedOrders = this.state.orders.map((ord) => {
      if (ord.courierId === courierId) {
        return {
          ...ord,
          isArchived: true,
          archivedAt: endTime,
        };
      }
      return ord;
    });

    const updatedCouriers = this.state.couriers.map((c) => {
      if (c.id === courierId) {
        return {
          ...c,
          isOnDuty: false,
          isStoppageAlertActive: false,
          stoppageAlertAcknowledged: true,
          shift: {
            ...c.shift,
            isEnded: true,
            endTime,
          },
        };
      }
      return c;
    });

    playShiftFanfare();

    this.state = {
      ...this.state,
      couriers: updatedCouriers,
      orders: updatedOrders,
      shiftSummaries: [summary, ...this.state.shiftSummaries],
    };
    this.notify(true);
    return summary;
  }

  // Start new shift
  public startNewShift(courierId: string) {
    const startTime = new Date().toISOString();
    this.state = {
      ...this.state,
      couriers: this.state.couriers.map((c) => {
        if (c.id === courierId) {
          return {
            ...c,
            isOnDuty: true,
            isStoppageAlertActive: false,
            stoppageAlertAcknowledged: false,
            currentLocation: {
              ...c.currentLocation,
              isStationary: false,
              stationarySeconds: 0,
              speedKmH: 15,
              lastMovedTimestamp: Date.now(),
            },
            shift: {
              startTime,
              isEnded: false,
              totalOrdersDelivered: 0,
              totalDeliveryEarnings: 0,
              totalCollectedCash: 0,
              totalCollectedVisa: 0,
              totalCollectedInstapay: 0,
            },
          };
        }
        return c;
      }),
    };
    this.notify(true);
  }

  // REAL STOPPAGE & OFFLINE DISCONNECT INACTIVITY TICKER (الانذار الحقيقي للتوقف وانقطاع الإنترنت)
  private startRealStoppageTicker() {
    if (this.tickerInterval) return;
    this.tickerInterval = window.setInterval(() => {
      let stateChanged = false;
      let hasActiveUnacknowledgedAlert = false;
      const now = Date.now();

      const updatedCouriers = this.state.couriers.map((courier) => {
        if (!courier.isOnDuty || courier.shift.isEnded) return courier;

        let courierModified = false;
        let newCourier = { ...courier };

        // 1. Stationary Stoppage Check (توقف الحركة لأكثر من 5 دقائق)
        if (courier.currentLocation.isStationary) {
          const newStationary = courier.currentLocation.stationarySeconds + 1;
          const shouldAlertStoppage = newStationary >= 300; // 5 minutes
          const alertNowActive = shouldAlertStoppage && !courier.stoppageAlertAcknowledged;

          if (alertNowActive) {
            hasActiveUnacknowledgedAlert = true;
            if (newStationary === 300) {
              sendRealBrowserNotification(
                '⚠️ إنذار توقف مندوب متواصل (5 دقائق)',
                `المندوب ${courier.name} متوقف منذ 5 دقائق في الموقع: ${courier.currentLocation.address}`
              );
            }
          }

          if (
            newStationary !== courier.currentLocation.stationarySeconds ||
            courier.isStoppageAlertActive !== alertNowActive
          ) {
            courierModified = true;
            newCourier = {
              ...newCourier,
              currentLocation: {
                ...newCourier.currentLocation,
                stationarySeconds: newStationary,
              },
              isStoppageAlertActive: alertNowActive,
            };
          }
        }

        // 2. Internet Disconnect & Heartbeat Check (إنذار انقطاع الإنترنت لأكثر من 5 دقائق أو 10 دقائق)
        const lastPing =
          courier.lastSeenTimestamp ||
          courier.currentLocation.lastMovedTimestamp ||
          Date.parse(courier.createdAt) ||
          now;
        const secondsSincePing = Math.max(0, Math.floor((now - lastPing) / 1000));
        const isOfflineDetected =
          courier.isInternetOnline === false || secondsSincePing >= 300; // 5 دقائق

        if (isOfflineDetected) {
          hasActiveUnacknowledgedAlert = true;
          // Notify pharmacist when reaching 5 minutes (300s) or 10 minutes (600s)
          if (secondsSincePing === 300 || secondsSincePing === 600) {
            const minutesOff = Math.floor(secondsSincePing / 60);
            sendRealBrowserNotification(
              `⚠️ إنذار: انقطاع الإنترنت عن المندوب (${minutesOff} دقائق)`,
              `الكابتن ${courier.name} غير متصل بالإنترنت منذ ${minutesOff} دقائق! الهاتف لا يستجيب للـ GPS.`
            );
          }
        }

        if (
          courier.isOfflineAlertActive !== isOfflineDetected ||
          courier.offlineSeconds !== secondsSincePing
        ) {
          courierModified = true;
          newCourier = {
            ...newCourier,
            isOfflineAlertActive: isOfflineDetected,
            offlineSeconds: secondsSincePing,
          };
        }

        if (courierModified) {
          stateChanged = true;
          return newCourier;
        }

        return courier;
      });

      if (hasActiveUnacknowledgedAlert) {
        startRepeatingAlarm();
      } else {
        stopRepeatingAlarm();
      }

      if (stateChanged) {
        this.state = {
          ...this.state,
          couriers: updatedCouriers,
        };
        this.notify(true);
      }
    }, 1000);
  }

  // Periodic courier heartbeat from active mobile
  public sendCourierHeartbeat(courierId: string, isOnline = true) {
    const now = Date.now();
    this.state = {
      ...this.state,
      couriers: this.state.couriers.map((c) => {
        if (c.id === courierId) {
          return {
            ...c,
            lastSeenTimestamp: now,
            isInternetOnline: isOnline,
            isOfflineAlertActive: isOnline ? false : c.isOfflineAlertActive,
            offlineSeconds: isOnline ? 0 : c.offlineSeconds,
          };
        }
        return c;
      }),
    };
    this.notify(true);

    // Sync to server and Firestore
    fetch('/api/courier/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courierId,
        isInternetOnline: isOnline,
        lastSeenTimestamp: now,
      }),
    }).catch(() => {});

    if (typeof window !== 'undefined' && db) {
      setDoc(
        doc(db, 'couriers', courierId),
        {
          lastSeenTimestamp: now,
          isInternetOnline: isOnline,
          isOfflineAlertActive: isOnline ? false : undefined,
          offlineSeconds: isOnline ? 0 : undefined,
        },
        { merge: true }
      ).catch(() => {});
    }
  }

  // Set Internet connection online/offline status directly
  public setCourierInternetStatus(courierId: string, isOnline: boolean) {
    this.sendCourierHeartbeat(courierId, isOnline);
  }

  // Simulate stoppage time (for testing the real alarm)
  public simulateStoppage(courierId: string, seconds = 301) {
    this.state = {
      ...this.state,
      couriers: this.state.couriers.map((c) => {
        if (c.id === courierId) {
          return {
            ...c,
            currentLocation: {
              ...c.currentLocation,
              isStationary: true,
              speedKmH: 0,
              stationarySeconds: seconds,
            },
            isStoppageAlertActive: seconds >= 300,
            stoppageAlertAcknowledged: false,
          };
        }
        return c;
      }),
    };
    if (seconds >= 300) {
      startRepeatingAlarm();
      sendRealBrowserNotification(
        '⚠️ إنذار توقف مندوب (5 دقائق)',
        `تم رصد توقف المندوب أكثر من 5 دقائق!`
      );
    }
    this.notify(true);
  }

  // Simulate offline internet disconnection (for testing the offline alarm)
  public simulateOffline(courierId: string, minutes = 5) {
    const fakeLastSeen = Date.now() - minutes * 60 * 1000 - 5000;
    this.state = {
      ...this.state,
      couriers: this.state.couriers.map((c) => {
        if (c.id === courierId) {
          return {
            ...c,
            lastSeenTimestamp: fakeLastSeen,
            isInternetOnline: false,
            isOfflineAlertActive: true,
            offlineSeconds: minutes * 60 + 5,
          };
        }
        return c;
      }),
    };
    startRepeatingAlarm();
    sendRealBrowserNotification(
      `⚠️ إنذار: انقطاع الإنترنت عن المندوب (${minutes} دقائق)`,
      `تم رصد انقطاع الاتصال بالإنترنت منذ ${minutes} دقائق!`
    );
    this.notify(true);
  }

  public acknowledgeStoppageAlert(courierId: string) {
    this.state = {
      ...this.state,
      couriers: this.state.couriers.map((c) => {
        if (c.id === courierId) {
          return {
            ...c,
            isStoppageAlertActive: false,
            stoppageAlertAcknowledged: true,
          };
        }
        return c;
      }),
    };
    stopRepeatingAlarm();
    this.notify(true);
  }

  public acknowledgeOfflineAlert(courierId: string) {
    this.state = {
      ...this.state,
      couriers: this.state.couriers.map((c) => {
        if (c.id === courierId) {
          return {
            ...c,
            isOfflineAlertActive: false,
          };
        }
        return c;
      }),
    };
    stopRepeatingAlarm();
    this.notify(true);
  }

  // Courier Movement
  public simulateCourierMovement(courierId: string) {
    this.state = {
      ...this.state,
      couriers: this.state.couriers.map((c) => {
        if (c.id === courierId) {
          const nextPos = getSimulatedNextPosition(
            c.currentLocation.lat,
            c.currentLocation.lng,
            0.0006
          );
          return {
            ...c,
            currentLocation: {
              ...c.currentLocation,
              lat: nextPos.lat,
              lng: nextPos.lng,
              speedKmH: 20 + Math.floor(Math.random() * 15),
              isStationary: false,
              stationarySeconds: 0,
              lastMovedTimestamp: Date.now(),
            },
            isStoppageAlertActive: false,
            stoppageAlertAcknowledged: false,
          };
        }
        return c;
      }),
    };
    stopRepeatingAlarm();
    this.notify(true);
  }

  // Real GPS from physical device with movement & drift filtering
  public updateCourierGPS(
    courierId: string,
    lat: number,
    lng: number,
    speed?: number | null,
    accuracy?: number,
    heading?: number | null,
    altitude?: number | null,
    address?: string
  ) {
    const now = Date.now();
    this.state = {
      ...this.state,
      couriers: this.state.couriers.map((c) => {
        if (c.id === courierId) {
          const prevLat = c.currentLocation.lat;
          const prevLng = c.currentLocation.lng;
          const distanceMeters = calculateDistanceMeters(prevLat, prevLng, lat, lng);
          const timeDeltaSec = Math.max(
            1,
            (now - (c.currentLocation.lastMovedTimestamp || now)) / 1000
          );

          // Physical Movement threshold:
          // Either hardware sensor speed > 0.8 m/s (~3 km/h), OR displacement > 18 meters (overcoming GPS drift).
          const hardwareSpeedKmH =
            typeof speed === 'number' && !isNaN(speed) && speed > 0 ? speed * 3.6 : null;
          const calculatedSpeedKmH = (distanceMeters / timeDeltaSec) * 3.6;
          const effectiveSpeed = hardwareSpeedKmH ?? calculatedSpeedKmH;

          const isMoving =
            (typeof speed === 'number' && speed > 0.8) || distanceMeters > 18;

          const finalSpeed = isMoving ? Math.min(130, Math.round(effectiveSpeed)) : 0;
          const newStationarySeconds = isMoving ? 0 : c.currentLocation.stationarySeconds;

          return {
            ...c,
            lastSeenTimestamp: now,
            isInternetOnline: true,
            isOfflineAlertActive: false,
            offlineSeconds: 0,
            currentLocation: {
              ...c.currentLocation,
              lat,
              lng,
              address: address || c.currentLocation.address,
              speedKmH: finalSpeed,
              isStationary: !isMoving,
              stationarySeconds: newStationarySeconds,
              lastMovedTimestamp: isMoving ? now : c.currentLocation.lastMovedTimestamp,
              accuracy:
                accuracy !== undefined ? Math.round(accuracy) : c.currentLocation.accuracy,
              heading: heading ?? c.currentLocation.heading,
              altitude: altitude ? Math.round(altitude) : c.currentLocation.altitude,
              lastGpsUpdate: new Date().toISOString(),
              isGpsLive: true,
            },
            isStoppageAlertActive: isMoving ? false : c.isStoppageAlertActive,
            stoppageAlertAcknowledged: isMoving ? false : c.stoppageAlertAcknowledged,
          };
        }
        return c;
      }),
    };
    this.notify(true);

    // Direct instantaneous cloud synchronization for real 100% live tracking
    const updatedCourier = this.state.couriers.find((c) => c.id === courierId);
    if (updatedCourier) {
      fetch('/api/courier/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courierId,
          location: updatedCourier.currentLocation,
          lastSeenTimestamp: now,
          isInternetOnline: true,
        }),
      }).catch((e) => console.warn('GPS location push error:', e));

      if (typeof window !== 'undefined' && db) {
        setDoc(
          doc(db, 'couriers', courierId),
          {
            currentLocation: updatedCourier.currentLocation,
            lastSeenTimestamp: now,
            isInternetOnline: true,
            isOfflineAlertActive: false,
            offlineSeconds: 0,
          },
          { merge: true }
        ).catch((e) => console.warn('Firestore GPS update error:', e));
      }
    }
  }

  // Register real Courier with Password and Pharmacy association
  public async registerCourierAsync(data: {
    pharmacyId: string;
    name: string;
    phone: string;
    password: string; // Required
    vehicleType: CourierProfile['vehicleType'];
    vehicleNumber: string;
    nationalId?: string;
    deliveryFeePerOrder?: number;
  }): Promise<CourierProfile> {
    const pharmacy =
      this.state.pharmacies.find((p) => p.id === data.pharmacyId) || this.getActivePharmacy();

    const newCourier: CourierProfile = {
      id: `courier-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      pharmacyId: pharmacy.id,
      name: data.name.trim(),
      phone: data.phone.trim(),
      password: data.password.trim(),
      vehicleType: data.vehicleType,
      vehicleNumber: data.vehicleNumber.trim() || 'بدون لوحة',
      nationalId: data.nationalId?.trim(),
      deliveryFeePerOrder: data.deliveryFeePerOrder || pharmacy.globalDeliveryFee || 7,
      currentLocation: {
        lat: pharmacy.coordinates.lat + (Math.random() - 0.5) * 0.005,
        lng: pharmacy.coordinates.lng + (Math.random() - 0.5) * 0.005,
        address: `محيط ${pharmacy.name}`,
        speedKmH: 0,
        lastMovedTimestamp: Date.now(),
        isStationary: false,
        stationarySeconds: 0,
      },
      isOnDuty: true,
      shift: {
        startTime: new Date().toISOString(),
        isEnded: false,
        totalOrdersDelivered: 0,
        totalDeliveryEarnings: 0,
        totalCollectedCash: 0,
        totalCollectedVisa: 0,
        totalCollectedInstapay: 0,
      },
      isStoppageAlertActive: false,
      stoppageAlertAcknowledged: false,
      createdAt: new Date().toISOString(),
    };

    // 1. Mark as known locally so registering device doesn't trigger duplicate alert for itself
    this.knownCourierIds.add(newCourier.id);

    // 2. Immediate local state update
    const isPharma = this.state.authenticatedAsPharmacist;
    if (!isPharma) {
      try {
        localStorage.setItem('pharma_courier_auth_id', newCourier.id);
      } catch (e) {}
    }

    this.state = {
      ...this.state,
      couriers: mergeById(this.state.couriers, [newCourier]),
      currentCourierId: newCourier.id,
      role: isPharma ? 'pharmacist' : 'courier',
      authenticatedAsPharmacist: isPharma,
      authenticatedCourierId: isPharma ? this.state.authenticatedCourierId : newCourier.id,
      activePharmacyId: pharmacy.id,
    };
    this.notify(true);

    // 3. Post to Server API directly
    try {
      const res = await fetch('/api/courier/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCourier),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.couriers) {
          this.state.couriers = mergeById(this.state.couriers, json.couriers);
        }
      }
    } catch (err) {
      console.warn('API courier registration fallback:', err);
    }

    // 4. Save directly into Firestore collection & system document
    try {
      if (typeof window !== 'undefined' && db) {
        await setDoc(doc(db, 'couriers', newCourier.id), newCourier);
        await setDoc(
          doc(db, 'system', 'cloud_state'),
          {
            couriers: this.state.couriers,
            lastUpdated: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    } catch (e) {
      console.warn('Firestore courier write fallback:', e);
    }

    // 5. Broadcast to other open tabs on this browser
    if (this.syncChannel) {
      this.syncChannel.postMessage({
        type: 'COURIER_REGISTERED',
        courier: newCourier,
        pharmacies: this.state.pharmacies,
      });
    }

    return newCourier;
  }

  // Synchronous wrapper for backward compatibility
  public registerCourier(data: {
    pharmacyId: string;
    name: string;
    phone: string;
    password: string;
    vehicleType: CourierProfile['vehicleType'];
    vehicleNumber: string;
    nationalId?: string;
    deliveryFeePerOrder?: number;
  }): CourierProfile {
    const pharmacy =
      this.state.pharmacies.find((p) => p.id === data.pharmacyId) || this.getActivePharmacy();

    const newCourier: CourierProfile = {
      id: `courier-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      pharmacyId: pharmacy.id,
      name: data.name.trim(),
      phone: data.phone.trim(),
      password: data.password.trim(),
      vehicleType: data.vehicleType,
      vehicleNumber: data.vehicleNumber.trim() || 'بدون لوحة',
      nationalId: data.nationalId?.trim(),
      deliveryFeePerOrder: data.deliveryFeePerOrder || pharmacy.globalDeliveryFee || 7,
      currentLocation: {
        lat: pharmacy.coordinates.lat + (Math.random() - 0.5) * 0.005,
        lng: pharmacy.coordinates.lng + (Math.random() - 0.5) * 0.005,
        address: `محيط ${pharmacy.name}`,
        speedKmH: 0,
        lastMovedTimestamp: Date.now(),
        isStationary: false,
        stationarySeconds: 0,
      },
      isOnDuty: true,
      shift: {
        startTime: new Date().toISOString(),
        isEnded: false,
        totalOrdersDelivered: 0,
        totalDeliveryEarnings: 0,
        totalCollectedCash: 0,
        totalCollectedVisa: 0,
        totalCollectedInstapay: 0,
      },
      isStoppageAlertActive: false,
      stoppageAlertAcknowledged: false,
      createdAt: new Date().toISOString(),
    };

    this.knownCourierIds.add(newCourier.id);
    this.state = {
      ...this.state,
      couriers: mergeById(this.state.couriers, [newCourier]),
      currentCourierId: newCourier.id,
      role: 'courier',
      authenticatedCourierId: newCourier.id,
      activePharmacyId: pharmacy.id,
    };
    this.notify(true);

    // Background push to API and Firestore
    this.registerCourierAsync(data).catch(() => {});

    return newCourier;
  }

  // Delete courier permanently
  public async deleteCourier(courierId: string): Promise<boolean> {
    const courierToDelete = this.state.couriers.find((c) => c.id === courierId);
    if (!courierToDelete) return false;

    // Remove from in-memory state
    this.knownCourierIds.delete(courierId);
    this.state = {
      ...this.state,
      couriers: this.state.couriers.filter((c) => c.id !== courierId),
      orders: this.state.orders.filter((o) => o.courierId !== courierId),
      currentCourierId:
        this.state.currentCourierId === courierId ? '' : this.state.currentCourierId,
    };
    this.notify(true);

    // Call server delete API
    try {
      await fetch('/api/courier/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courierId }),
      });
    } catch (e) {
      console.warn('Server delete courier fallback:', e);
    }

    // Delete from Firestore
    try {
      if (typeof window !== 'undefined' && db) {
        await deleteDoc(doc(db, 'couriers', courierId));
      }
    } catch (e) {
      console.warn('Firestore deleteDoc fallback:', e);
    }

    return true;
  }

  // Reassign courier to another pharmacy branch
  public async reassignCourierPharmacy(
    courierId: string,
    newPharmacyId: string
  ): Promise<boolean> {
    const courier = this.state.couriers.find((c) => c.id === courierId);
    if (!courier) return false;

    const targetPharma =
      this.state.pharmacies.find((p) => p.id === newPharmacyId) || this.getActivePharmacy();

    const updatedCourier: CourierProfile = {
      ...courier,
      pharmacyId: targetPharma.id,
      deliveryFeePerOrder: courier.deliveryFeePerOrder || targetPharma.globalDeliveryFee || 7,
      currentLocation: {
        ...courier.currentLocation,
        address: `محيط ${targetPharma.name}`,
        lat: targetPharma.coordinates.lat + (Math.random() - 0.5) * 0.005,
        lng: targetPharma.coordinates.lng + (Math.random() - 0.5) * 0.005,
      },
    };

    this.state = {
      ...this.state,
      couriers: this.state.couriers.map((c) => (c.id === courierId ? updatedCourier : c)),
    };
    this.notify(true);

    // Call server API
    try {
      await fetch('/api/courier/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courierId,
          updates: {
            pharmacyId: targetPharma.id,
            deliveryFeePerOrder: updatedCourier.deliveryFeePerOrder,
            currentLocation: updatedCourier.currentLocation,
          },
        }),
      });
    } catch (e) {}

    // Update in Firestore
    try {
      if (typeof window !== 'undefined' && db) {
        await setDoc(doc(db, 'couriers', courierId), updatedCourier, { merge: true });
      }
    } catch (e) {}

    return true;
  }
}

export const store = new Store();
