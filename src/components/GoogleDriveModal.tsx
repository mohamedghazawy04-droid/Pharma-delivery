import React, { useState, useEffect } from 'react';
import {
  X,
  HardDrive,
  FileText,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FolderPlus,
  ExternalLink,
  ShieldCheck,
  Database,
  FileSpreadsheet,
  FileCode,
  File,
  Loader2,
  LogOut,
} from 'lucide-react';
import {
  signInWithGoogleDrive,
  signOutGoogle,
  getAccessToken,
  initGoogleAuth,
} from '../services/firebase';
import {
  listDriveFiles,
  exportOrdersReportToDrive,
  backupFullSystemToDrive,
  uploadFileToDrive,
  deleteDriveFile,
  DriveFileItem,
  getOrCreatePharmaDriveFolder,
} from '../services/googleDrive';
import { store } from '../services/store';
import { Pharmacy, Order, CourierProfile } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activePharmacy: Pharmacy;
  orders: Order[];
  couriers: CourierProfile[];
}

export const GoogleDriveModal: React.FC<Props> = ({
  isOpen,
  onClose,
  activePharmacy,
  orders,
  couriers,
}) => {
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Destructive Delete Confirmation State (MANDATORY per Workspace Skill)
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);
  const [isDeletingFile, setIsDeletingFile] = useState(false);

  // Quick Upload State
  const [customFileName, setCustomFileName] = useState('');
  const [customFileContent, setCustomFileContent] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 5000);
  };

  useEffect(() => {
    if (!isOpen) return;

    // Check existing auth state
    initGoogleAuth(
      (user, t) => {
        setGoogleUser(user);
        setToken(t);
        fetchFiles();
      },
      () => {
        setGoogleUser(null);
        setToken(null);
        setFiles([]);
      }
    );

    getAccessToken().then((t) => {
      if (t) {
        setToken(t);
        fetchFiles();
      }
    });
  }, [isOpen]);

  const handleSignIn = async () => {
    setIsLoadingAuth(true);
    try {
      const res = await signInWithGoogleDrive();
      if (res) {
        setGoogleUser(res.user);
        setToken(res.accessToken);
        showNotice('success', `تم ربط حساب Google بنجاح: ${res.user.email || res.user.displayName}`);
        await fetchFiles();
      }
    } catch (err: any) {
      console.error('Google Drive sign in failed:', err);
      showNotice('error', err.message || 'فشل تسجيل الدخول بحساب Google');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutGoogle();
      setGoogleUser(null);
      setToken(null);
      setFiles([]);
      showNotice('success', 'تم تسجيل الخروج من Google Drive بنجاح');
    } catch (err: any) {
      showNotice('error', 'تعذر تسجيل الخروج');
    }
  };

  const fetchFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const data = await listDriveFiles();
      setFiles(data);
    } catch (err: any) {
      console.error('Failed to load drive files:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleExportReport = async () => {
    setIsExporting(true);
    try {
      const pharmacyOrders = orders.filter((o) => o.pharmacyId === activePharmacy.id);
      const uploaded = await exportOrdersReportToDrive(activePharmacy.name, pharmacyOrders, couriers);
      showNotice('success', `تم تصدير وحفظ تقرير الأوردرات (${uploaded.name}) في مجلد Google Drive بنجاح!`);
      await fetchFiles();
    } catch (err: any) {
      showNotice('error', err.message || 'فشل تصدير التقرير إلى Google Drive');
    } finally {
      setIsExporting(false);
    }
  };

  const handleBackupSystem = async () => {
    setIsBackingUp(true);
    try {
      const state = store.getState();
      const uploaded = await backupFullSystemToDrive(state);
      showNotice('success', `تم حفظ النسخة الاحتياطية الشاملة (${uploaded.name}) على Google Drive بنجاح!`);
      await fetchFiles();
    } catch (err: any) {
      showNotice('error', err.message || 'فشل إنشاء النسخة الاحتياطية');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleCustomUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFileName.trim() || !customFileContent.trim()) {
      showNotice('error', 'يرجى كتابة اسم الملف ومحتواه');
      return;
    }

    try {
      const folderId = await getOrCreatePharmaDriveFolder();
      await uploadFileToDrive({
        name: customFileName.trim(),
        content: customFileContent.trim(),
        mimeType: 'text/plain',
        folderId,
      });

      showNotice('success', `تم رفع الملف (${customFileName}) إلى Google Drive بنجاح!`);
      setCustomFileName('');
      setCustomFileContent('');
      setShowUploadForm(false);
      await fetchFiles();
    } catch (err: any) {
      showNotice('error', err.message || 'فشل رفع الملف');
    }
  };

  // Perform Destructive Deletion with In-App Confirmation
  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    setIsDeletingFile(true);

    try {
      await deleteDriveFile(fileToDelete.id);
      showNotice('success', `تم حذف الملف (${fileToDelete.name}) من Google Drive بنجاح.`);
      setFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id));
      setFileToDelete(null);
    } catch (err: any) {
      showNotice('error', err.message || 'فشل حذف الملف');
    } finally {
      setIsDeletingFile(false);
    }
  };

  if (!isOpen) return null;

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('spreadsheet') || mimeType.includes('csv')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    }
    if (mimeType.includes('json') || mimeType.includes('javascript')) {
      return <FileCode className="w-5 h-5 text-indigo-600" />;
    }
    if (mimeType.includes('folder')) {
      return <FolderPlus className="w-5 h-5 text-amber-600" />;
    }
    return <FileText className="w-5 h-5 text-blue-600" />;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-2xl">
              <HardDrive className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base">تكامل Google Drive والنسخ السحابي</h3>
                <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">
                  Google Workspace
                </span>
              </div>
              <p className="text-blue-100 text-xs">
                تصدير تقارير الأوردرات، والنسخ الاحتياطي ومزامنة ملفات الصيدلية سحابياً
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`px-6 py-3 text-xs font-bold flex items-center justify-between gap-2 border-b ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {/* SECTION 1: Google Account Connection Bar */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            {token && googleUser ? (
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {googleUser.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    alt="Google Profile"
                    className="w-11 h-11 rounded-full border-2 border-blue-400 shadow-xs"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                    {googleUser.displayName?.[0] || 'G'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900">
                      {googleUser.displayName || 'مستخدم Google'}
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      متصل بـ Google Drive
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">{googleUser.email}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-center sm:text-right">
                <h4 className="font-extrabold text-sm text-slate-800">
                  ربط المنظومة بحساب Google الخاص بك
                </h4>
                <p className="text-xs text-slate-500">
                  قم بتسجيل الدخول لمنح التطبيق صلاحيات حفظ التقارير والنسخ الاحتياطي في Google Drive
                </p>
              </div>
            )}

            <div>
              {token ? (
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-500" />
                  <span>تسجيل الخروج</span>
                </button>
              ) : (
                /* Official Google Sign-In Button as required by Workspace Integration skill */
                <button
                  onClick={handleSignIn}
                  disabled={isLoadingAuth}
                  className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-2xl text-xs font-black shadow-sm transition flex items-center gap-2.5 hover:shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isLoadingAuth ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                    </svg>
                  )}
                  <span>تسجيل الدخول بحساب Google (Google Drive)</span>
                </button>
              )}
            </div>
          </div>

          {/* SECTION 2: Instant Drive Operations (Export & Backup) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Export Orders to Drive */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4.5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-blue-950">
                    تصدير تقرير أوردرات الصيدلية إلى Google Drive
                  </h4>
                  <p className="text-[11px] text-blue-800">
                    إنشاء ملف جدول (CSV) بكافة أوردرات فرع «{activePharmacy.name}» ورفعه تلقائياً
                  </p>
                </div>
              </div>

              <button
                onClick={handleExportReport}
                disabled={!token || isExporting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التصدير والرفع لـ Drive...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>تصدير تقرير الأوردرات لـ Google Drive الآن</span>
                  </>
                )}
              </button>
            </div>

            {/* Full System Backup to Drive */}
            <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4.5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-indigo-950">
                    نسخ احتياطي شامل للنظام على Google Drive
                  </h4>
                  <p className="text-[11px] text-indigo-800">
                    حفظ نسخة احتياطية لكافة الفروع والمناديب والأوردرات والحصالات
                  </p>
                </div>
              </div>

              <button
                onClick={handleBackupSystem}
                disabled={!token || isBackingUp}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isBackingUp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري إنشاء النسخة الاحتياطية...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    <span>حفظ نسخة احتياطية كاملة على Google Drive</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Upload Form Toggle */}
          {token && (
            <div>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowUploadForm(!showUploadForm)}
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 underline flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{showUploadForm ? 'إخفاء نموذج رفع ملف مخصص' : '+ رفع ملاحظة أو روشتة نصية لـ Google Drive'}</span>
                </button>
              </div>

              {showUploadForm && (
                <form
                  onSubmit={handleCustomUpload}
                  className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      اسم الملف في Google Drive
                    </label>
                    <input
                      type="text"
                      required
                      value={customFileName}
                      onChange={(e) => setCustomFileName(e.target.value)}
                      placeholder="مثال: روشتة_مريض_أحمد.txt أو تعليمات_التوصيل.txt"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      محتوى الملف / تفاصيل الروشتة أو الملاحظة
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={customFileContent}
                      onChange={(e) => setCustomFileContent(e.target.value)}
                      placeholder="اكتب تفاصيل الروشتة أو الملاحظة هنا..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowUploadForm(false)}
                      className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>رفع لـ Google Drive</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* DESTRUCTIVE CONFIRMATION MODAL OVERLAY (Mandatory Requirement of Workspace Skill) */}
          {fileToDelete && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-rose-600 text-white rounded-xl shrink-0">
                  <Trash2 className="w-5 h-5 animate-pulse" />
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="font-black text-rose-950 text-sm flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    تأكيد حذف الملف من Google Drive نهائياً
                  </h4>
                  <p className="text-xs text-rose-900 leading-relaxed">
                    هل أنت متأكد من رغبتك في حذف الملف «<strong>{fileToDelete.name}</strong>» من حساب Google Drive الخاص بك؟
                    <br />
                    <span className="text-[11px] text-rose-700 font-semibold">
                      ⚠️ هذا الإجراء سيقوم بحذف الملف نهائياً ولا يمكن التراجع عنه.
                    </span>
                  </p>
                  <div className="flex items-center gap-2 pt-2 justify-end">
                    <button
                      onClick={() => setFileToDelete(null)}
                      disabled={isDeletingFile}
                      className="px-3.5 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
                    >
                      إلغاء والاحتفاظ بالملف
                    </button>
                    <button
                      onClick={confirmDeleteFile}
                      disabled={isDeletingFile}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isDeletingFile ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>جاري الحذف من Drive...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>نعم، حذف الملف الآن</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: Google Drive Files Explorer */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-slate-600" />
                <h4 className="font-extrabold text-sm text-slate-900">
                  ملفات وتقارير Google Drive ({filteredFiles.length})
                </h4>
              </div>

              {token && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث في ملفات Drive..."
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium w-full sm:w-48 focus:outline-hidden"
                  />
                  <button
                    onClick={fetchFiles}
                    disabled={isLoadingFiles}
                    title="تحديث قائمة الملفات"
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              )}
            </div>

            {!token ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 space-y-2">
                <HardDrive className="w-8 h-8 mx-auto text-slate-400" />
                <p className="text-xs font-bold">
                  سجل الدخول بحساب Google بأعلى الصفحة لعرض وتصفح ملفاتك وتقارير الصيدلية السحابية.
                </p>
              </div>
            ) : isLoadingFiles ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                <p className="text-xs font-bold">جاري جلب الملفات من Google Drive...</p>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 space-y-2">
                <FileText className="w-8 h-8 mx-auto text-slate-400" />
                <p className="text-xs font-bold">لا توجد ملفات حالياً. اضغط على تصدير تقرير الأوردرات لإنشاء أول ملف في Google Drive.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-3.5 hover:bg-slate-50 transition flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-slate-100 rounded-xl shrink-0">
                        {getFileIcon(file.mimeType)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-slate-900 truncate">
                            {file.name}
                          </p>
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              title="فتح في Google Drive"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span>
                            {file.modifiedTime
                              ? new Date(file.modifiedTime).toLocaleDateString('ar-EG')
                              : 'تاريخ غير محدد'}
                          </span>
                          {file.size && (
                            <>
                              <span>•</span>
                              <span>{(Number(file.size) / 1024).toFixed(1)} ك.ب</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>فتح</span>
                        </a>
                      )}
                      <button
                        onClick={() => setFileToDelete(file)}
                        title="حذف الملف من Google Drive"
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
