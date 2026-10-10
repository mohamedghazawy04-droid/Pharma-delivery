export type UserRole = 'pharmacist' | 'courier';

export interface LocationCoordinates {
  lat: number;
  lng: number;
  address?: string;
}

export interface Pharmacy {
  id: string;
  name: string;
  pharmacistName: string;
  phone: string;
  address: string;
  password: string; // Required: "pharmacist123"
  globalDeliveryFee: number; // default: 7 EGP
  coordinates: LocationCoordinates;
  createdAt: string;
}

export interface CourierShiftInfo {
  startTime: string; // ISO string
  isEnded: boolean;
  endTime?: string;
  totalOrdersDelivered: number;
  totalDeliveryEarnings: number;
  totalCollectedCash: number; // نقدي
  totalCollectedVisa: number; // فيزا
  totalCollectedInstapay: number; // انستاباي
}

export interface CourierProfile {
  id: string;
  pharmacyId: string; // Each courier belongs to a specific pharmacy
  name: string;
  phone: string;
  password: string; // Courier's password
  vehicleType: 'موتوسيكل' | 'سكوتر' | 'دراجة' | 'سيارة';
  vehicleNumber: string;
  nationalId?: string; // رقم البطاقة القومية
  deliveryFeePerOrder: number; // default: 7 EGP
  currentLocation: {
    lat: number;
    lng: number;
    address: string;
    speedKmH: number;
    lastMovedTimestamp: number; // timestamp in ms
    isStationary: boolean;
    stationarySeconds: number;
    accuracy?: number; // GPS accuracy in meters (e.g. ±5m)
    heading?: number; // degrees (0-360)
    altitude?: number; // meters
    lastGpsUpdate?: string; // ISO string
    isGpsLive?: boolean; // true when streaming from physical GPS device
  };
  isOnDuty: boolean;
  shift: CourierShiftInfo;
  isStoppageAlertActive: boolean;
  stoppageAlertAcknowledged: boolean;
  lastSeenTimestamp?: number; // timestamp in ms of last active heartbeat/GPS ping
  isOfflineAlertActive?: boolean; // true if internet closed or disconnected for >= 5 minutes
  offlineSeconds?: number; // seconds since last heartbeat
  isInternetOnline?: boolean; // whether courier's device reports online
  createdAt: string;
}

export type OrderStatus = 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
// نوع الأوردر (عادي / مستعجل / روشتة / أدوية ثلاجة / مستلزمات)
export type OrderType = 'عادي' | 'مستعجل' | 'روشتة' | 'أدوية ثلاجة' | 'مستلزمات';
// نقدي أو فيزا أو انستاباي
export type PaymentMethod = 'cash' | 'visa' | 'instapay';

export interface Order {
  id: string;
  pharmacyId: string;
  orderNumber: string; // auto sequence like #1, #2 or ORD-101
  orderType?: OrderType; // نوع الأوردر
  orderValue: number; // قيمة الأوردر الأساسية بالجنيه
  deliveryFee: number; // قيمة المندوب (7 ج تضاف عند تمام التوصيل)
  completedFeeAdded?: number; // 7 جنيه المضافة عند تمام الأوردر
  totalValueWithDelivery?: number; // إجمالي القيمة بعد تمام التوصيل (قيمة الأوردر + 7 ج)
  paymentMethod: PaymentMethod; // 'cash' | 'visa' | 'instapay'
  courierId: string;
  status: OrderStatus;
  createdAt: string;
  assignedAt: string;
  deliveredAt?: string;
  isArchived: boolean; // إذا اختار الصيدلي حفظ الأوردرات تختفي من المندوب
  archivedAt?: string;
  quickNote?: string;
  updatedAt?: string; // إذا قام الصيدلي بتعديل الأوردر (ينعكس فورياً عند المندوب)
}

export interface ShiftSummaryArchive {
  id: string;
  pharmacyId: string;
  courierId: string;
  courierName: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  totalOrdersCount: number;
  totalDeliveryFees: number; // أرباح المندوب (الحصالة)
  totalCashCollected: number; // نقدي
  totalVisaCollected: number; // فيزا
  totalInstapayCollected: number; // انستاباي
  orders: {
    orderNumber: string;
    orderValue: number;
    deliveryFee: number;
    paymentMethod: PaymentMethod;
    deliveredAt?: string;
  }[];
}
