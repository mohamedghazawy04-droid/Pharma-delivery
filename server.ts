import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'cloud_store.json');

app.use(express.json({ limit: '15mb' }));

// Ensure persistent cloud data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface CloudData {
  pharmacies: any[];
  couriers: any[];
  orders: any[];
  shiftSummaries: any[];
  deletedCourierIds?: string[];
  lastUpdated: string;
}

const DEFAULT_COURIER_01000321253 = {
  id: 'courier-01000321253',
  name: 'كابتن التوصيل',
  phone: '01000321253',
  password: '123',
  vehicleType: 'موتوسيكل',
  vehicleNumber: '٧٨٩٥',
  pharmacyId: 'pharma-main',
  deliveryFeePerOrder: 7,
  isOnDuty: true,
  currentLocation: {
    lat: 29.97056,
    lng: 30.89801,
    address: 'الجيزه ٦ اكتوبر الاتحاد التعاوني عماره ٦٢ بجوار مجمع المحاكم الحى ١١ صيدليه الديب',
    speedKmH: 0,
    lastMovedTimestamp: Date.now(),
    isStationary: true,
    stationarySeconds: 0,
    accuracy: 15,
    isGpsLive: true,
  },
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
  isInternetOnline: true,
  offlineSeconds: 0,
};

const DEFAULT_INITIAL_DATA: CloudData = {
  pharmacies: [
    {
      id: 'pharma-main',
      name: 'صيدليه الديب',
      pharmacistName: 'د.محمد',
      phone: '01000321253',
      address: 'الجيزه ٦ اكتوبر الاتحاد التعاوني عماره ٦٢ بجوار مجمع المحاكم الحى ١١ صيدليه الديب',
      password: 'pharmacist123',
      globalDeliveryFee: 7,
      coordinates: {
        lat: 29.97056,
        lng: 30.89801,
        address: 'الجيزه ٦ اكتوبر الاتحاد التعاوني عماره ٦٢ بجوار مجمع المحاكم الحى ١١ صيدليه الديب',
      },
      createdAt: '2026-10-06T00:00:00.000Z',
    },
  ],
  couriers: [DEFAULT_COURIER_01000321253],
  orders: [],
  shiftSummaries: [],
  deletedCourierIds: [],
  lastUpdated: new Date().toISOString(),
};

function readCloudData(): CloudData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.pharmacies) && parsed.pharmacies.length > 0) {
        // Strip out any fake/unwanted placeholder pharmacies
        parsed.pharmacies = parsed.pharmacies.filter(
          (p: any) => p.name !== 'صيدلية النور والشفاء (فرع 2)' && p.id !== 'pharma-branch-2'
        ).map((p: any) => {
          if (p.id === 'pharma-main') {
            return {
              ...p,
              name: 'صيدليه الديب',
              phone: '01000321253',
              address: 'الجيزه ٦ اكتوبر الاتحاد التعاوني عماره ٦٢ بجوار مجمع المحاكم الحى ١١ صيدليه الديب',
              coordinates: {
                lat: 29.97056,
                lng: 30.89801,
                address: 'الجيزه ٦ اكتوبر الاتحاد التعاوني عماره ٦٢ بجوار مجمع المحاكم الحى ١١ صيدليه الديب',
              },
            };
          }
          return p;
        });
        if (parsed.pharmacies.length === 0) {
          parsed.pharmacies = DEFAULT_INITIAL_DATA.pharmacies;
        }

        const deletedSet = new Set<string>(parsed.deletedCourierIds || []);
        if (Array.isArray(parsed.couriers)) {
          // Strictly exclude deleted couriers
          parsed.couriers = parsed.couriers.filter(
            (c: any) => c && c.id && !deletedSet.has(c.id)
          );
        } else {
          parsed.couriers = [];
        }

        parsed.deletedCourierIds = Array.from(deletedSet);
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading cloud store file:', err);
  }

  // Write default initial state if missing or empty
  saveCloudData(DEFAULT_INITIAL_DATA);
  return DEFAULT_INITIAL_DATA;
}

// Real-time Server-Sent Events (SSE) connections pool for sub-second mobile updates
const sseClients: Set<express.Response> = new Set();

function broadcastEvent(type: string, data: any) {
  const payload = `data: ${JSON.stringify({ type, data })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

function saveCloudData(data: CloudData) {
  try {
    const payload = {
      ...data,
      lastUpdated: new Date().toISOString(),
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    // Instantly notify all mobile and desktop clients of the new state
    broadcastEvent('SYNC', payload);
    return true;
  } catch (err) {
    console.error('Error saving cloud store file:', err);
    return false;
  }
}

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

// -------------------------------------------------------------
// API Endpoints for Central Cloud Persistence
// -------------------------------------------------------------

// 0. Server-Sent Events Stream for Instant Multi-Device Push
app.get('/api/events', (_req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  const current = readCloudData();
  res.write(`data: ${JSON.stringify({ type: 'INIT', data: current })}\n\n`);
  sseClients.add(res);

  _req.on('close', () => {
    sseClients.delete(res);
  });
});

// 1. Fetch current cloud state
app.get('/api/data', (_req, res) => {
  const data = readCloudData();
  res.json({ success: true, data });
});

// 2. Full Sync from client (Merges by ID so clients don't overwrite each other)
app.post('/api/sync', (req, res) => {
  const { pharmacies, couriers, orders, shiftSummaries, deletedCourierIds } = req.body;
  const current = readCloudData();

  const combinedDeleted = new Set<string>([
    ...(current.deletedCourierIds || []),
    ...(Array.isArray(deletedCourierIds) ? deletedCourierIds : []),
  ]);
  current.deletedCourierIds = Array.from(combinedDeleted);

  const mergedPharmacies = Array.isArray(pharmacies)
    ? mergeById(current.pharmacies, pharmacies)
    : current.pharmacies;

  // Filter out any couriers that were deleted
  const filteredCurrentCouriers = (current.couriers || []).filter(
    (c: any) => c && c.id && !combinedDeleted.has(c.id)
  );
  const incomingCouriersFiltered = Array.isArray(couriers)
    ? couriers.filter((c: any) => c && c.id && !combinedDeleted.has(c.id))
    : filteredCurrentCouriers;

  const mergedCouriers = mergeById(filteredCurrentCouriers, incomingCouriersFiltered);

  const mergedOrders = Array.isArray(orders)
    ? mergeById(current.orders, orders)
    : current.orders;
  const mergedShifts = Array.isArray(shiftSummaries)
    ? mergeById(current.shiftSummaries, shiftSummaries)
    : current.shiftSummaries;

  const updated: CloudData = {
    pharmacies: mergedPharmacies,
    couriers: mergedCouriers,
    orders: mergedOrders,
    shiftSummaries: mergedShifts,
    deletedCourierIds: current.deletedCourierIds,
    lastUpdated: new Date().toISOString(),
  };

  saveCloudData(updated);
  res.json({ success: true, data: updated });
});

// 3. Register Courier Directly
app.post('/api/courier/register', (req, res) => {
  const courier = req.body;
  if (!courier || !courier.name || !courier.phone) {
    return res.status(400).json({ success: false, error: 'بيانات المندوب غير مكتملة' });
  }

  const current = readCloudData();
  const phoneNormalized = courier.phone.trim();
  const existingIdx = current.couriers.findIndex(
    (c) => (c.phone && c.phone.trim() === phoneNormalized) || c.id === courier.id
  );

  let updatedCourier = courier;
  if (existingIdx >= 0) {
    current.couriers[existingIdx] = {
      ...current.couriers[existingIdx],
      ...courier,
      updatedAt: new Date().toISOString(),
    };
    updatedCourier = current.couriers[existingIdx];
  } else {
    current.couriers.push({
      ...courier,
      createdAt: courier.createdAt || new Date().toISOString(),
    });
  }

  saveCloudData(current);
  console.log(`[Server] Courier registered/synced: ${courier.name} (${courier.phone}) for pharmacy: ${courier.pharmacyId}`);
  res.json({ success: true, courier: updatedCourier, couriers: current.couriers });
});

// 3.1 Update Courier Data (اسم، هاتف، كلمة مرور، عمولة، صيدلية)
app.post('/api/courier/update', (req, res) => {
  const { courierId, updates } = req.body;
  if (!courierId || !updates) {
    return res.status(400).json({ success: false, error: 'معرف المندوب والتحديثات مطلوبة' });
  }

  const current = readCloudData();
  let found = false;
  current.couriers = current.couriers.map((c) => {
    if (c.id === courierId) {
      found = true;
      return {
        ...c,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
    }
    return c;
  });

  if (!found && updates.phone) {
    const norm = updates.phone.trim();
    current.couriers = current.couriers.map((c) => {
      if (c.phone && c.phone.trim() === norm) {
        found = true;
        return { ...c, ...updates, updatedAt: new Date().toISOString() };
      }
      return c;
    });
  }

  saveCloudData(current);
  console.log(`[Server] Courier updated: ${courierId} (${updates.name || ''})`);
  res.json({ success: true, couriers: current.couriers });
});

// 3.2 Delete Courier Permanently (With Tombstoning so it never resurrects)
app.post('/api/courier/delete', (req, res) => {
  const { courierId } = req.body;
  if (!courierId) {
    return res.status(400).json({ success: false, error: 'معرف المندوب مطلوب' });
  }

  const current = readCloudData();
  const deletedSet = new Set<string>(current.deletedCourierIds || []);
  deletedSet.add(courierId);
  current.deletedCourierIds = Array.from(deletedSet);
  current.couriers = current.couriers.filter((c) => c.id !== courierId);
  saveCloudData(current);
  console.log(`[Server] Courier deleted & tombstoned: ${courierId}`);
  res.json({ success: true, couriers: current.couriers, deletedCourierIds: current.deletedCourierIds });
});

// 3.3 Real-time Courier GPS Location update & Heartbeat
app.post('/api/courier/location', (req, res) => {
  const { courierId, location, lastSeenTimestamp, isInternetOnline } = req.body;
  if (!courierId || !location) {
    return res.status(400).json({ success: false, error: 'معرف المندوب والموقع مطلوبان' });
  }

  const current = readCloudData();
  const idx = current.couriers.findIndex((c) => c.id === courierId);
  if (idx >= 0) {
    current.couriers[idx].currentLocation = {
      ...current.couriers[idx].currentLocation,
      ...location,
      lastGpsUpdate: new Date().toISOString(),
      isGpsLive: true,
    };
    current.couriers[idx].lastSeenTimestamp = lastSeenTimestamp || Date.now();
    current.couriers[idx].isInternetOnline = isInternetOnline !== undefined ? isInternetOnline : true;
    current.couriers[idx].isOfflineAlertActive = false;
    current.couriers[idx].offlineSeconds = 0;
    saveCloudData(current);
  }
  res.json({ success: true });
});

// 3.4 Periodic Heartbeat / Internet status check
app.post('/api/courier/heartbeat', (req, res) => {
  const { courierId, isInternetOnline, lastSeenTimestamp } = req.body;
  if (!courierId) {
    return res.status(400).json({ success: false, error: 'معرف المندوب مطلوب' });
  }

  const current = readCloudData();
  const idx = current.couriers.findIndex((c) => c.id === courierId);
  if (idx >= 0) {
    current.couriers[idx].lastSeenTimestamp = lastSeenTimestamp || Date.now();
    current.couriers[idx].isInternetOnline = isInternetOnline !== undefined ? isInternetOnline : true;
    if (isInternetOnline !== false) {
      current.couriers[idx].isOfflineAlertActive = false;
      current.couriers[idx].offlineSeconds = 0;
    }
    saveCloudData(current);
  }
  res.json({ success: true, couriers: current.couriers });
});

// -------------------------------------------------------------
// Dedicated Real-Time Order Management Endpoints
// -------------------------------------------------------------

// 3.5 Create Order Directly (Instant Mobile Sync)
app.post('/api/order/create', (req, res) => {
  const order = req.body;
  if (!order || !order.id || !order.orderValue) {
    return res.status(400).json({ success: false, error: 'بيانات الأوردر غير مكتملة' });
  }

  const current = readCloudData();
  const existingIdx = current.orders.findIndex((o) => o.id === order.id);
  if (existingIdx >= 0) {
    current.orders[existingIdx] = { ...current.orders[existingIdx], ...order };
  } else {
    current.orders.unshift(order);
  }

  saveCloudData(current);
  console.log(`[Server] Order created: ${order.orderNumber} (${order.orderValue} EGP) for courier: ${order.courierId}`);
  res.json({ success: true, order, orders: current.orders });
});

// 3.6 Update Order Directly
app.post('/api/order/update', (req, res) => {
  const { orderId, updates } = req.body;
  if (!orderId || !updates) {
    return res.status(400).json({ success: false, error: 'معرف الأوردر والتحديثات مطلوبة' });
  }

  const current = readCloudData();
  current.orders = current.orders.map((o) =>
    o.id === orderId ? { ...o, ...updates, updatedAt: new Date().toISOString() } : o
  );
  saveCloudData(current);
  res.json({ success: true, orders: current.orders });
});

// 3.7 Deliver Order (Adds +7 EGP delivery fee and updates shift)
app.post('/api/order/deliver', (req, res) => {
  const { orderId, courierId, deliveredFeeAdded = 7 } = req.body;
  if (!orderId) {
    return res.status(400).json({ success: false, error: 'معرف الأوردر مطلوب' });
  }

  const current = readCloudData();
  const ordIdx = current.orders.findIndex((o) => o.id === orderId);
  if (ordIdx >= 0) {
    const ord = current.orders[ordIdx];
    current.orders[ordIdx] = {
      ...ord,
      status: 'delivered',
      deliveredAt: new Date().toISOString(),
      completedFeeAdded: deliveredFeeAdded,
      totalValueWithDelivery: Number(ord.orderValue) + Number(deliveredFeeAdded),
    };

    // Update courier shift earnings
    const cId = courierId || ord.courierId;
    const cIdx = current.couriers.findIndex((c) => c.id === cId);
    if (cIdx >= 0) {
      const c = current.couriers[cIdx];
      const fee = Number(ord.deliveryFee) || 7;
      const isCash = ord.paymentMethod === 'cash';
      const isVisa = ord.paymentMethod === 'visa';
      const isInsta = ord.paymentMethod === 'instapay';
      current.couriers[cIdx].shift = {
        ...c.shift,
        totalOrdersDelivered: (c.shift?.totalOrdersDelivered || 0) + 1,
        totalDeliveryEarnings: (c.shift?.totalDeliveryEarnings || 0) + fee,
        totalCollectedCash: (c.shift?.totalCollectedCash || 0) + (isCash ? Number(ord.orderValue) : 0),
        totalCollectedVisa: (c.shift?.totalCollectedVisa || 0) + (isVisa ? Number(ord.orderValue) : 0),
        totalCollectedInstapay: (c.shift?.totalCollectedInstapay || 0) + (isInsta ? Number(ord.orderValue) : 0),
      };
    }

    saveCloudData(current);
  }

  res.json({ success: true, orders: current.orders, couriers: current.couriers });
});

// 3.8 Get Orders
app.get('/api/orders', (req, res) => {
  const current = readCloudData();
  const courierId = req.query.courierId as string;
  const pharmacyId = req.query.pharmacyId as string;
  let result = current.orders;
  if (pharmacyId) {
    result = result.filter((o) => o.pharmacyId === pharmacyId);
  }
  if (courierId) {
    result = result.filter((o) => o.courierId === courierId);
  }
  res.json({ success: true, orders: result });
});

// 4. Add Pharmacy
app.post('/api/pharmacy/add', (req, res) => {
  const pharmacy = req.body;
  if (!pharmacy || !pharmacy.name) {
    return res.status(400).json({ success: false, error: 'اسم الصيدلية مطلوب' });
  }

  const current = readCloudData();
  const exists = current.pharmacies.some((p) => p.id === pharmacy.id);
  const updatedPharmacies = exists
    ? current.pharmacies.map((p) => (p.id === pharmacy.id ? pharmacy : p))
    : [...current.pharmacies, pharmacy];

  current.pharmacies = updatedPharmacies;
  saveCloudData(current);
  res.json({ success: true, data: current });
});

// 4. Update Pharmacy
app.post('/api/pharmacy/update', (req, res) => {
  const { id, updates } = req.body;
  if (!id || !updates) {
    return res.status(400).json({ success: false, error: 'معرف الصيدلية والتحديثات مطلوبة' });
  }

  const current = readCloudData();
  current.pharmacies = current.pharmacies.map((p) =>
    p.id === id ? { ...p, ...updates } : p
  );
  saveCloudData(current);
  res.json({ success: true, data: current });
});

// 5. Delete Pharmacy
app.post('/api/pharmacy/delete', (req, res) => {
  const { pharmacyId } = req.body;
  if (!pharmacyId) {
    return res.status(400).json({ success: false, error: 'معرف الصيدلية مطلوب' });
  }

  const current = readCloudData();
  if (current.pharmacies.length <= 1) {
    return res.status(400).json({
      success: false,
      error: 'لا يمكن حذف الصيدلية الوحيدة في المنظومة.',
    });
  }

  current.pharmacies = current.pharmacies.filter((p) => p.id !== pharmacyId);
  current.couriers = current.couriers.filter((c) => c.pharmacyId !== pharmacyId);
  current.orders = current.orders.filter((o) => o.pharmacyId !== pharmacyId);
  current.shiftSummaries = current.shiftSummaries.filter((s) => s.pharmacyId !== pharmacyId);

  saveCloudData(current);
  res.json({ success: true, data: current });
});

// 5. Health Check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// -------------------------------------------------------------
// Vite Middleware / Static Files Serving
// -------------------------------------------------------------

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cloud Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
