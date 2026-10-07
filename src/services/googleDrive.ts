import { getAccessToken } from './firebase';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  thumbnailLink?: string;
}

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

/**
 * Get or create "تقارير فارما ديليفري" folder in user's Google Drive
 */
export async function getOrCreatePharmaDriveFolder(): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error('يرجى تسجيل الدخول بحساب Google أولاً');

  const folderName = 'تقارير فارما ديليفري (Pharma Delivery)';

  // Search for existing folder
  const query = encodeURIComponent(
    `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const searchRes = await fetch(`${DRIVE_API_URL}/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (searchRes.ok) {
    const json = await searchRes.json();
    if (json.files && json.files.length > 0) {
      return json.files[0].id;
    }
  }

  // Create folder
  const createRes = await fetch(`${DRIVE_API_URL}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`فشل إنشاء مجلد Google Drive: ${errText}`);
  }

  const newFolder = await createRes.json();
  return newFolder.id;
}

/**
 * List files from Google Drive
 */
export async function listDriveFiles(customQuery?: string): Promise<DriveFileItem[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('يرجى تسجيل الدخول بحساب Google');

  const q = customQuery
    ? encodeURIComponent(`trashed = false and (${customQuery})`)
    : encodeURIComponent('trashed = false');

  const fields = encodeURIComponent('files(id, name, mimeType, size, modifiedTime, webViewLink)');
  const res = await fetch(`${DRIVE_API_URL}/files?q=${q}&fields=${fields}&pageSize=30&orderBy=modifiedTime desc`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'خطأ غير معروف' } }));
    throw new Error(err.error?.message || 'تعذر جلب ملفات Google Drive');
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Upload a text / json / csv file to Google Drive using multipart upload
 */
export async function uploadFileToDrive(params: {
  name: string;
  content: string;
  mimeType: string;
  folderId?: string;
  description?: string;
}): Promise<DriveFileItem> {
  const token = await getAccessToken();
  if (!token) throw new Error('يرجى تسجيل الدخول بحساب Google');

  const metadata: any = {
    name: params.name,
    mimeType: params.mimeType,
    description: params.description || 'تم إنشاؤه عبر نظام فارما ديليفري',
  };

  if (params.folderId) {
    metadata.parents = [params.folderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${params.mimeType}\r\n\r\n` +
    params.content +
    closeDelimiter;

  const res = await fetch(DRIVE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'فشل الرفع إلى Google Drive' } }));
    throw new Error(err.error?.message || 'فشل رفع الملف إلى Google Drive');
  }

  return await res.json();
}

/**
 * Delete a file from Google Drive
 * (Note: Must be preceded by explicit confirmation as per skill instructions)
 */
export async function deleteDriveFile(fileId: string): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) throw new Error('يرجى تسجيل الدخول بحساب Google');

  const res = await fetch(`${DRIVE_API_URL}/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({ error: { message: 'تعذر حذف الملف من Google Drive' } }));
    throw new Error(err.error?.message || 'تعذر حذف الملف');
  }

  return true;
}

/**
 * Export Pharmacy Delivery & Shift Report directly to Google Drive as CSV
 */
export async function exportOrdersReportToDrive(
  pharmacyName: string,
  orders: any[],
  couriers: any[]
): Promise<DriveFileItem> {
  const folderId = await getOrCreatePharmaDriveFolder();

  // Create CSV Content
  const headers = ['رقم الأوردر', 'الصيدلية', 'المندوب', 'قيمة الأوردر (ج)', 'طريقة الدفع', 'عمولة التوصيل', 'الحالة', 'وقت التسجيل'];
  const rows = orders.map((o) => {
    const courier = couriers.find((c) => c.id === o.courierId);
    return [
      o.id,
      pharmacyName,
      courier?.name || 'غير محدد',
      o.orderValue,
      o.paymentMethod === 'cash' ? 'كاش' : 'فيزا / إلكتروني',
      o.deliveryFee || 7,
      o.isArchived ? 'مؤرشف' : 'نشط',
      new Date(o.createdAt || Date.now()).toLocaleString('ar-EG'),
    ].map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const fileName = `تقرير_أوردرات_${pharmacyName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;

  return await uploadFileToDrive({
    name: fileName,
    content: csvContent,
    mimeType: 'text/csv',
    folderId,
    description: `تقرير أوردرات الصيدلية (${pharmacyName}) صادر من نظام فارما ديليفري`,
  });
}

/**
 * Full System Backup into Google Drive
 */
export async function backupFullSystemToDrive(systemState: any): Promise<DriveFileItem> {
  const folderId = await getOrCreatePharmaDriveFolder();
  const backupJson = JSON.stringify(systemState, null, 2);
  const fileName = `نسخة_احتياطية_فارما_ديليفري_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

  return await uploadFileToDrive({
    name: fileName,
    content: backupJson,
    mimeType: 'application/json',
    folderId,
    description: 'نسخة احتياطية شاملة لكافة الصيدليات والمناديب والأوردرات والحصالات في فارما ديليفري',
  });
}
