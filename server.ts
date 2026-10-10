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
  lastUpdated: string;
}

const DEFAULT_INITIAL_DATA: CloudData = {
  pharmacies: [
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
  ],
  couriers: [],
  orders: [],
  shiftSummaries: [],
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
        );
        if (parsed.pharmacies.length === 0) {
          parsed.pharmacies = DEFAULT_INITIAL_DATA.pharmacies;
        }
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

function saveCloudData(data: CloudData) {
  try {
    const payload = {
      ...data,
      lastUpdated: new Date().toISOString(),
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');
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

// 1. Fetch current cloud state
app.get('/api/data', (_req, res) => {
  const data = readCloudData();
  res.json({ success: true, data });
});

// 2. Full Sync from client (Merges by ID so clients don't overwrite each other)
app.post('/api/sync', (req, res) => {
  const { pharmacies, couriers, orders, shiftSummaries } = req.body;
  const current = readCloudData();

  const mergedPharmacies = Array.isArray(pharmacies)
    ? mergeById(current.pharmacies, pharmacies)
    : current.pharmacies;
  const mergedCouriers = Array.isArray(couriers)
    ? mergeById(current.couriers, couriers)
    : current.couriers;
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

// 3.1 Update Courier
app.post('/api/courier/update', (req, res) => {
  const { courierId, updates } = req.body;
  if (!courierId || !updates) {
    return res.status(400).json({ success: false, error: 'معرف المندوب والتحديثات مطلوبة' });
  }

  const current = readCloudData();
  current.couriers = current.couriers.map((c) =>
    c.id === courierId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
  );
  saveCloudData(current);
  res.json({ success: true, couriers: current.couriers });
});

// 3.2 Delete Courier
app.post('/api/courier/delete', (req, res) => {
  const { courierId } = req.body;
  if (!courierId) {
    return res.status(400).json({ success: false, error: 'معرف المندوب مطلوب' });
  }

  const current = readCloudData();
  current.couriers = current.couriers.filter((c) => c.id !== courierId);
  saveCloudData(current);
  console.log(`[Server] Courier removed: ${courierId}`);
  res.json({ success: true, couriers: current.couriers });
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
