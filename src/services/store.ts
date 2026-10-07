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

const STORAGE_KEY = 'pharma_delivery_real_v3';
const SYNC_CHANNEL_NAME = 'pharma_real_sync_channel';

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

// Clean initial pharmacy without fake dummy couriers or fake orders
const DEFAULT_INITIAL_PHARMACY: Pharmacy = {
  id: 'pharma-main',
  name: 'صيدلية النور والشفاء',
  pharmacistName: 'د. صيدلي',
  phone: '01012345678',
  address: 'شارع التحرير - الدقي، الجيزة',
  password: 'pharmacist123', // As required by user
  globalDeliveryFee: 7, // 7 EGP per order
  coordinates: PHARMACY_BASE_LOCATION,
  createdAt: new Date().toISOString(),
};

function loadInitialState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.pharmacies && parsed.pharmacies.length > 0) {
        return {
          role: parsed.role || 'pharmacist',
          activePharmacyId: parsed.activePharmacyId || parsed.pharmacies[0].id,
          currentCourierId: parsed.currentCourierId || '',
          pharmacies: parsed.pharmacies,
          couriers: parsed.couriers || [], // Real data only
          orders: parsed.orders || [], // Real data only
          shiftSummaries: parsed.shiftSummaries || [],
          authenticatedAsPharmacist: parsed.authenticatedAsPharmacist || false,
          authenticatedCourierId: parsed.authenticatedCourierId || null,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to parse state from localStorage:', e);
  }

  // Pure clean state with NO fake orders and NO fake couriers
  return {
    role: 'pharmacist',
    activePharmacyId: DEFAULT_INITIAL_PHARMACY.id,
    currentCourierId: '',
    pharmacies: [DEFAULT_INITIAL_PHARMACY],
    couriers: [], // Empty, no fake couriers!
    orders: [], // Empty, no fake orders!
    shiftSummaries: [],
    authenticatedAsPharmacist: false,
    authenticatedCourierId: null,
  };
}

class Store {
  private state: AppState;
  private listeners: Set<() => void> = new Set();
  private syncChannel: BroadcastChannel | null = null;
  private tickerInterval: number | null = null;

  constructor() {
    this.state = loadInitialState();
    this.initSyncChannel();
    this.startRealStoppageTicker();
  }

  private initSyncChannel() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
        this.syncChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'SYNC_STATE') {
            this.state = event.data.state;
            this.notify(false);
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }
  }

  private persistAndBroadcast(broadcast = true) {
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
  }

  private notify(broadcast = true) {
    this.persistAndBroadcast(broadcast);
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
    return ph || this.state.pharmacies[0] || DEFAULT_INITIAL_PHARMACY;
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
    this.notify(true);
    return newPharmacy;
  }

  // Update Pharmacy
  public updatePharmacy(pharmacyId: string, updates: Partial<Pharmacy>) {
    this.state = {
      ...this.state,
      pharmacies: this.state.pharmacies.map((p) =>
        p.id === pharmacyId ? { ...p, ...updates } : p
      ),
    };
    this.notify(true);
  }

  // Pharmacist Authentication
  public loginPharmacist(password: string): { success: boolean; error?: string } {
    if (password === 'pharmacist123') {
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
      this.state = {
        ...this.state,
        role: 'courier',
        currentCourierId: courier.id,
        authenticatedCourierId: courier.id,
        activePharmacyId: courier.pharmacyId, // Switch to courier's pharmacy
      };
      this.notify(true);
      return { success: true, courier };
    }
    return { success: false, error: 'رقم الهاتف أو كلمة المرور للمندوب غير صحيحة' };
  }

  // Logout method (العودة لواجهة تسجيل الدخول الرئيسية)
  public logout() {
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

  // Edit existing order by Pharmacist (نقدي أو فيزا أو انستاباي / القيمة / المندوب)
  // Changes reflect INSTANTLY on courier's screen via reactive state & BroadcastChannel
  public updateOrder(
    orderId: string,
    updates: {
      orderValue?: number;
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
        : existingOrder.deliveryFee;

    const updatedOrders = this.state.orders.map((ord) => {
      if (ord.id === orderId) {
        return {
          ...ord,
          orderValue: updates.orderValue !== undefined ? Number(updates.orderValue) : ord.orderValue,
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
            deliveryFee: targetCourier.deliveryFeePerOrder,
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

  // Update order status
  public updateOrderStatus(orderId: string, status: Order['status']) {
    const order = this.state.orders.find((o) => o.id === orderId);
    if (!order) return;

    const isDeliveredNow = status === 'delivered' && order.status !== 'delivered';
    const deliveredAt = isDeliveredNow ? new Date().toISOString() : order.deliveredAt;

    let updatedCouriers = this.state.couriers;
    if (isDeliveredNow) {
      playCoinSound();
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
              totalDeliveryEarnings: c.shift.totalDeliveryEarnings + order.deliveryFee,
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
      orders: this.state.orders.map((o) =>
        o.id === orderId ? { ...o, status, deliveredAt } : o
      ),
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

  // REAL STOPPAGE INACTIVITY TICKER (الانذار حقيقي)
  private startRealStoppageTicker() {
    if (this.tickerInterval) return;
    this.tickerInterval = window.setInterval(() => {
      let stateChanged = false;
      let hasActiveUnacknowledgedAlert = false;

      const updatedCouriers = this.state.couriers.map((courier) => {
        if (!courier.isOnDuty || courier.shift.isEnded) return courier;

        if (courier.currentLocation.isStationary) {
          const newStationary = courier.currentLocation.stationarySeconds + 1;
          const shouldAlert = newStationary >= 300; // 5 minutes (300 seconds)
          const alertNowActive = shouldAlert && !courier.stoppageAlertAcknowledged;

          if (alertNowActive) {
            hasActiveUnacknowledgedAlert = true;
            // Send real browser notification on the threshold
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
            stateChanged = true;
            return {
              ...courier,
              currentLocation: {
                ...courier.currentLocation,
                stationarySeconds: newStationary,
              },
              isStoppageAlertActive: alertNowActive,
            };
          }
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

  // Simulate or set stoppage time (for testing the real alarm)
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
    this.state = {
      ...this.state,
      couriers: this.state.couriers.map((c) => {
        if (c.id === courierId) {
          const prevLat = c.currentLocation.lat;
          const prevLng = c.currentLocation.lng;
          const distanceMeters = calculateDistanceMeters(prevLat, prevLng, lat, lng);
          const now = Date.now();
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
  }

  // Register real Courier with Password and Pharmacy association
  public registerCourier(data: {
    pharmacyId: string;
    name: string;
    phone: string;
    password: string; // Required
    vehicleType: CourierProfile['vehicleType'];
    vehicleNumber: string;
    nationalId?: string;
    deliveryFeePerOrder?: number;
  }): CourierProfile {
    const pharmacy = this.state.pharmacies.find((p) => p.id === data.pharmacyId) || this.getActivePharmacy();

    const newCourier: CourierProfile = {
      id: `courier-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      pharmacyId: data.pharmacyId,
      name: data.name,
      phone: data.phone,
      password: data.password,
      vehicleType: data.vehicleType,
      vehicleNumber: data.vehicleNumber,
      nationalId: data.nationalId,
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

    this.state = {
      ...this.state,
      couriers: [...this.state.couriers, newCourier],
      currentCourierId: newCourier.id,
      role: 'courier',
      authenticatedCourierId: newCourier.id,
    };
    this.notify(true);
    return newCourier;
  }
}

export const store = new Store();
