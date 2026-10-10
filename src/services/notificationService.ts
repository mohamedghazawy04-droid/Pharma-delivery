import { Order, CourierProfile, Pharmacy } from '../types';
import { playDeliverySuccessSound } from '../utils/audio';

export interface DeliveryAlertItem {
  id: string;
  orderId: string;
  orderNumber: string;
  orderValue: number;
  courierName: string;
  pharmacyName: string;
  paymentMethod: string;
  timestamp: string;
}

export interface CourierAlertItem {
  id: string;
  courierId: string;
  courierName: string;
  phone: string;
  vehicleType: string;
  pharmacyName: string;
  timestamp: string;
}

type PermissionListener = (permission: NotificationPermission | 'unsupported') => void;
type DeliveryAlertListener = (alert: DeliveryAlertItem) => void;
type CourierAlertListener = (alert: CourierAlertItem) => void;

class NotificationService {
  private permissionListeners: Set<PermissionListener> = new Set();
  private deliveryAlertListeners: Set<DeliveryAlertListener> = new Set();
  private courierAlertListeners: Set<CourierAlertListener> = new Set();
  private notifiedOrderIds: Set<string> = new Set();
  private notifiedCourierIds: Set<string> = new Set();
  private recentAlerts: DeliveryAlertItem[] = [];

  constructor() {
    // If permission changes or already granted, keep state updated
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public getPermission(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  public async requestPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (!this.isSupported()) return 'unsupported';

    try {
      const permission = await Notification.requestPermission();
      this.permissionListeners.forEach((listener) => listener(permission));
      return permission;
    } catch (e) {
      console.warn('Error requesting notification permission:', e);
      return Notification.permission;
    }
  }

  public onPermissionChange(listener: PermissionListener): () => void {
    this.permissionListeners.add(listener);
    return () => this.permissionListeners.delete(listener);
  }

  public onDeliveryAlert(listener: DeliveryAlertListener): () => void {
    this.deliveryAlertListeners.add(listener);
    return () => this.deliveryAlertListeners.delete(listener);
  }

  public onCourierAlert(listener: CourierAlertListener): () => void {
    this.courierAlertListeners.add(listener);
    return () => this.courierAlertListeners.delete(listener);
  }

  public getRecentAlerts(): DeliveryAlertItem[] {
    return [...this.recentAlerts];
  }

  public clearRecentAlerts() {
    this.recentAlerts = [];
  }

  /**
   * Alert the pharmacist when a new courier registers on mobile
   */
  public notifyNewCourierRegistered(courier: CourierProfile, pharmacies: Pharmacy[]) {
    if (this.notifiedCourierIds.has(courier.id)) return;
    this.notifiedCourierIds.add(courier.id);

    const targetPharma = pharmacies.find((p) => p.id === courier.pharmacyId);
    const pharmacyName = targetPharma?.name || 'الصيدلية';

    // 1. Play auditory chime
    playDeliverySuccessSound();

    // 2. Prepare Alert Item
    const alertItem: CourierAlertItem = {
      id: `courier-alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      courierId: courier.id,
      courierName: courier.name,
      phone: courier.phone,
      vehicleType: courier.vehicleType,
      pharmacyName,
      timestamp: new Date().toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    // 3. Emit in-app listeners
    this.courierAlertListeners.forEach((listener) => listener(alertItem));

    // 4. Trigger Web Notifications API if supported
    if (this.isSupported() && Notification.permission === 'granted') {
      try {
        const title = `🛵 انضمام مندوب جديد: ${courier.name}`;
        const body = `سجل الكابتن ${courier.name} (${courier.phone} - ${courier.vehicleType}) للعمل بصيدلية: ${pharmacyName}.`;
        const notification = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: `courier-reg-${courier.id}`,
        });
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (err) {
        console.warn('Courier Web Notification failed:', err);
      }
    }
  }

  /**
   * Main function called when an order is marked as delivered
   * Alerts the pharmacist using Web Notifications API, sound, and in-app banner
   */
  public notifyOrderDelivered(params: {
    order: Order;
    courier?: CourierProfile;
    pharmacy?: Pharmacy;
    force?: boolean;
  }) {
    const { order, courier, pharmacy, force } = params;

    // Prevent duplicate notification for the exact same order unless forced
    if (!force && this.notifiedOrderIds.has(order.id)) {
      return;
    }
    this.notifiedOrderIds.add(order.id);

    const courierName = courier?.name || 'المندوب';
    const pharmacyName = pharmacy?.name || 'الصيدلية';
    const paymentLabel =
      order.paymentMethod === 'cash'
        ? 'نقدي (كاش)'
        : order.paymentMethod === 'visa'
        ? 'فيزا إلكتروني'
        : 'انستاباي';

    // 1. Play auditory chime
    playDeliverySuccessSound();

    // 2. Prepare Alert Item
    const alertItem: DeliveryAlertItem = {
      id: `alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderId: order.id,
      orderNumber: order.orderNumber || `#${order.id.slice(-4)}`,
      orderValue: order.orderValue,
      courierName,
      pharmacyName,
      paymentMethod: paymentLabel,
      timestamp: new Date().toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };

    // Keep up to 25 recent alerts
    this.recentAlerts = [alertItem, ...this.recentAlerts.slice(0, 24)];

    // 3. Emit in-app listeners
    this.deliveryAlertListeners.forEach((listener) => listener(alertItem));

    // 4. Trigger Web Notifications API
    if (this.isSupported()) {
      if (Notification.permission === 'granted') {
        try {
          const title = `📦 تم تسليم أوردر بنجاح! (${courierName})`;
          const body = `قام الكابتن ${courierName} بتسليم الأوردر ${alertItem.orderNumber} بقيمة ${order.orderValue} ج (${paymentLabel}) لصالح ${pharmacyName}.`;

          const notification = new Notification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `order-delivered-${order.id}`,
            data: {
              orderId: order.id,
              pharmacyId: order.pharmacyId,
              courierId: order.courierId,
            },
          });

          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        } catch (err) {
          console.warn('Web Notification constructor failed:', err);
        }
      } else if (Notification.permission === 'default') {
        // Automatically request if permission was never prompted yet
        this.requestPermission();
      }
    }
  }

  /**
   * Test Web Notification for the Pharmacist
   */
  public async testNotification(pharmacyName = 'صيدليه الديب') {
    if (this.isSupported() && Notification.permission === 'default') {
      await this.requestPermission();
    }

    this.notifyOrderDelivered({
      order: {
        id: `test-${Date.now()}`,
        pharmacyId: 'pharma-main',
        orderNumber: '#تجريبي',
        orderValue: 185,
        deliveryFee: 7,
        paymentMethod: 'cash',
        courierId: 'test-courier',
        status: 'delivered',
        createdAt: new Date().toISOString(),
        assignedAt: new Date().toISOString(),
        deliveredAt: new Date().toISOString(),
        isArchived: false,
      },
      courier: {
        id: 'test-courier',
        pharmacyId: 'pharma-main',
        name: 'أحمد محمود',
        phone: '01012345678',
        password: '',
        vehicleType: 'موتوسيكل',
        vehicleNumber: 'أ ب ج 123',
        deliveryFeePerOrder: 7,
        currentLocation: {
          lat: 30.0488,
          lng: 31.2112,
          address: 'شارع التحرير',
          speedKmH: 0,
          lastMovedTimestamp: Date.now(),
          isStationary: false,
          stationarySeconds: 0,
        },
        isOnDuty: true,
        shift: {
          startTime: '',
          totalOrdersDelivered: 1,
          totalDeliveryEarnings: 7,
          totalCollectedCash: 185,
          totalCollectedVisa: 0,
          totalCollectedInstapay: 0,
          isEnded: false,
        },
        isStoppageAlertActive: false,
        stoppageAlertAcknowledged: false,
        createdAt: new Date().toISOString(),
      },
      pharmacy: {
        id: 'pharma-main',
        name: pharmacyName,
        pharmacistName: 'د. صيدلي',
        phone: '01000000000',
        address: 'شارع التحرير',
        password: 'pharmacist123',
        globalDeliveryFee: 7,
        coordinates: { lat: 30.0488, lng: 31.2112, address: 'شارع التحرير' },
        createdAt: new Date().toISOString(),
      },
      force: true,
    });
  }
}

export const notificationService = new NotificationService();
