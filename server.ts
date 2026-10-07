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
      name: 'صيدلية النور والشفاء',
      pharmacistName: 'د. صيدلي',
      phone: '01012345678',
      address: 'شارع التحرير - الدقي، الجيزة',
      password: 'pharmacist123',
      globalDeliveryFee: 7,
      coordinates: {
        lat: 30.0488,
        lng: 31.2112,
        address: 'صيدلية النور والشفاء - شارع مصدق، الدقي، الجيزة',
      },
      createdAt: '2026-10-06T00:00:00.000Z',
    },
    {
      id: 'pharma-branch-2',
      name: 'صيدلية الأمل والشفاء (فرع 2)',
      pharmacistName: 'د. أحمد',
      phone: '01123456789',
      address: 'شارع مصدق - المهندسين، الجيزة',
      password: 'pharmacist123',
      globalDeliveryFee: 7,
      coordinates: {
        lat: 30.055,
        lng: 31.205,
        address: 'شارع مصدق - المهندسين، الجيزة',
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

// -------------------------------------------------------------
// API Endpoints for Central Cloud Persistence
// -------------------------------------------------------------

// 1. Fetch current cloud state
app.get('/api/data', (_req, res) => {
  const data = readCloudData();
  res.json({ success: true, data });
});

// 2. Full Sync from client
app.post('/api/sync', (req, res) => {
  const { pharmacies, couriers, orders, shiftSummaries } = req.body;
  const current = readCloudData();

  const updated: CloudData = {
    pharmacies: Array.isArray(pharmacies) ? pharmacies : current.pharmacies,
    couriers: Array.isArray(couriers) ? couriers : current.couriers,
    orders: Array.isArray(orders) ? orders : current.orders,
    shiftSummaries: Array.isArray(shiftSummaries) ? shiftSummaries : current.shiftSummaries,
    lastUpdated: new Date().toISOString(),
  };

  saveCloudData(updated);
  res.json({ success: true, data: updated });
});

// 3. Add Pharmacy
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

// 4. Delete Pharmacy
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
