import React, { useState, useEffect, useRef } from 'react';
import {
  Pill,
  DollarSign,
  CreditCard,
  Banknote,
  Zap,
  Navigation,
  Radio,
  Plus,
  Bike,
  CheckCircle,
  MessageCircle,
  Link as LinkIcon,
  Check,
  TrendingUp,
  MapPin,
  Clock,
  Edit2,
  Trash2,
  ArrowRight,
  ShieldCheck,
  User,
  Phone,
  Search,
  RotateCcw,
  Sparkles,
  Smartphone,
  FileText,
  BadgeCheck,
  ChevronRight,
  ChevronLeft,
  RotateCw,
  Layers,
  Play,
  Pause,
} from 'lucide-react';
import { CourierProfile, Order, PaymentMethod, Pharmacy } from '../../types';
import { store } from '../../services/store';
import { playCoinSound } from '../../utils/audio';

interface Props {
  pharmacy: Pharmacy;
  couriers: CourierProfile[];
  orders: Order[];
  onOpenLiveMap: () => void;
  onOpenNewOrderModal: () => void;
  onOpenAddCourierModal: () => void;
  onOpenSplash?: () => void;
}

// Popular pharmacy pills / medicines quick badges
const COMMON_PILLS = [
  'بانادول إكسترا',
  'أوجمنتين 1 جم',
  'كونكور 5 مجم',
  'أنتينال كبسول',
  'كيتوفان 50',
  'أوميجا 3 بلس',
  'فيتامين C زنك',
  'روشتة علاجية',
];

interface CubeDefinition {
  id: number;
  key: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

export const PharmacistPreviewCubes: React.FC<Props> = ({
  pharmacy,
  couriers,
  orders,
  onOpenLiveMap,
  onOpenNewOrderModal,
  onOpenAddCourierModal,
  onOpenSplash,
}) => {
  // -----------------------------------------------------------------
  // 3D Revolving Stage State
  // -----------------------------------------------------------------
  const [activeCubeIndex, setActiveCubeIndex] = useState(0); // 0 to 5
  const [isAutoTurning, setIsAutoTurning] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false); // flip active cube 180°
  const [viewMode, setViewMode] = useState<'revolving' | 'grid'>('revolving');
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number>(0);

  // -----------------------------------------------------------------
  // Cube 1 State: إضافة الأدوية إلى أسماء المناديب (Add Pills to Deliveries)
  // -----------------------------------------------------------------
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [pillItemName, setPillItemName] = useState('');
  const [selectedPills, setSelectedPills] = useState<string[]>([]);
  const [pillOrderValue, setPillOrderValue] = useState('');
  const [selectedCourierId, setSelectedCourierId] = useState(couriers[0]?.id || '');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cash');
  const [fastAddSuccess, setFastAddSuccess] = useState(false);

  // -----------------------------------------------------------------
  // Cube 2 & 3 State: تغيير طريقة الدفع والقيم فورياً أثناء العمل
  // -----------------------------------------------------------------
  const [searchOrderQuery, setSearchOrderQuery] = useState('');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editDeliveryFee, setEditDeliveryFee] = useState<string>('');
  const [editPills, setEditPills] = useState<string>('');
  const [editCustomerName, setEditCustomerName] = useState<string>('');

  // -----------------------------------------------------------------
  // Cube 6 State: روابط المناديب والنسخ
  // -----------------------------------------------------------------
  const [copiedCourierId, setCopiedCourierId] = useState<string | null>(null);

  // Filter couriers and orders belonging to this pharmacy
  const pharmacyCouriers = couriers.filter((c) => c.pharmacyId === pharmacy.id);
  const activeOrders = orders.filter(
    (o) =>
      o.pharmacyId === pharmacy.id &&
      !o.isArchived &&
      o.status !== 'delivered' &&
      o.status !== 'cancelled'
  );

  const deliveredOrders = orders.filter(
    (o) => o.pharmacyId === pharmacy.id && o.status === 'delivered' && !o.isArchived
  );

  // Incomings & Treasury breakdown
  const totalCash = pharmacyCouriers.reduce(
    (sum, c) => sum + (c.shift.totalCollectedCash || 0),
    0
  );
  const totalVisa = pharmacyCouriers.reduce(
    (sum, c) => sum + (c.shift.totalCollectedVisa || 0),
    0
  );
  const totalInstapay = pharmacyCouriers.reduce(
    (sum, c) => sum + (c.shift.totalCollectedInstapay || 0),
    0
  );
  const totalVodafone = pharmacyCouriers.reduce(
    (sum, c) => sum + (c.shift.totalCollectedVodafoneCash || 0),
    0
  );
  const totalEarnings = pharmacyCouriers.reduce(
    (sum, c) => sum + (c.shift.totalDeliveryEarnings || 0),
    0
  );
  const totalGross = totalCash + totalVisa + totalInstapay + totalVodafone;
  const netPharmacy = Math.max(0, totalGross - totalEarnings);

  // Auto-turning effect
  useEffect(() => {
    if (!isAutoTurning) return;
    const interval = setInterval(() => {
      setActiveCubeIndex((prev) => (prev + 1) % 6);
      setIsFlipped(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [isAutoTurning]);

  // Handle Cube Navigation
  const handleNextCube = () => {
    setActiveCubeIndex((prev) => (prev + 1) % 6);
    setIsFlipped(false);
  };

  const handlePrevCube = () => {
    setActiveCubeIndex((prev) => (prev - 1 + 6) % 6);
    setIsFlipped(false);
  };

  const handleSelectCube = (idx: number) => {
    setActiveCubeIndex(idx);
    setIsFlipped(false);
  };

  // Toggle quick pill badge selection
  const handleTogglePillBadge = (pill: string) => {
    setSelectedPills((prev) =>
      prev.includes(pill) ? prev.filter((p) => p !== pill) : [...prev, pill]
    );
  };

  // Submit Cube 1: Fast Add Pills to Delivery
  const handleFastAddPillOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(pillOrderValue);
    if (isNaN(val) || val <= 0) return;

    const courierTarget = selectedCourierId || pharmacyCouriers[0]?.id;
    if (!courierTarget) {
      onOpenAddCourierModal();
      return;
    }

    const assignedC = pharmacyCouriers.find((c) => c.id === courierTarget);

    const allPills = [...selectedPills];
    if (pillItemName.trim()) {
      allPills.push(pillItemName.trim());
    }

    const pillsSummaryText =
      allPills.length > 0 ? allPills.join(' + ') : 'أدوية روشتة سريعة';

    store.addFastOrder({
      pharmacyId: pharmacy.id,
      orderValue: val,
      orderType: 'عادي',
      paymentMethod: selectedPayment,
      courierId: courierTarget,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      pills: allPills,
      pillsSummary: pillsSummaryText,
      quickNote: pillsSummaryText,
      courierName: assignedC?.name,
      courierPhone: assignedC?.phone,
      deliveryFee: assignedC?.deliveryFeePerOrder || pharmacy.globalDeliveryFee || 7,
    });

    playCoinSound();
    setPillOrderValue('');
    setPillItemName('');
    setSelectedPills([]);
    setCustomerName('');
    setCustomerPhone('');
    setFastAddSuccess(true);
    setTimeout(() => setFastAddSuccess(false), 2200);
  };

  // 1-Click Payment Change for any active order
  const handleQuickPaymentChange = (orderId: string, newMethod: PaymentMethod) => {
    store.updateOrder(orderId, { paymentMethod: newMethod });
  };

  // 1-Click Deliver status change
  const handleQuickMarkDelivered = (orderId: string) => {
    store.updateOrderStatus(orderId, 'delivered');
  };

  // Save inline value edit
  const handleSaveInlineEdit = (orderId: string) => {
    const num = parseFloat(editValue);
    const feeNum = parseFloat(editDeliveryFee);

    store.updateOrder(orderId, {
      orderValue: !isNaN(num) && num > 0 ? num : undefined,
      deliveryFee: !isNaN(feeNum) && feeNum >= 0 ? feeNum : undefined,
      customerName: editCustomerName.trim() || undefined,
      pillsSummary: editPills.trim() || undefined,
      quickNote: editPills.trim() || undefined,
    });
    setEditingOrderId(null);
  };

  // Copy Courier Beacon Link
  const handleCopyCourierLink = (c: CourierProfile) => {
    const url = `${window.location.origin}${window.location.pathname}?c=${c.id}&mode=courier`;
    navigator.clipboard.writeText(url);
    setCopiedCourierId(c.id);
    setTimeout(() => setCopiedCourierId(null), 3000);
  };

  // Share Courier Beacon Link via WhatsApp
  const handleShareWhatsApp = (c: CourierProfile) => {
    const url = `${window.location.origin}${window.location.pathname}?c=${c.id}&mode=courier`;
    const msg = encodeURIComponent(
      `أهلاً يا كابتن ${c.name}، هذا رابط أوردراتك وبث موقعك لصيدلية ${pharmacy.name}:\n${url}\nافتح الرابط واضغط "تشغيل بث موقعي الحي" لتظهر للصيدلي على الخريطة أثناء الطريق.`
    );
    const cleanPhone = (c.phone || '').replace(/\D/g, '');
    const waUrl =
      cleanPhone.length >= 10
        ? `https://wa.me/2${cleanPhone.replace(/^0+/, '')}?text=${msg}`
        : `https://wa.me/?text=${msg}`;
    window.open(waUrl, '_blank');
  };

  // Filtered active orders for Cube 2 & 3
  const filteredActiveOrders = activeOrders.filter((ord) => {
    if (!searchOrderQuery.trim()) return true;
    const q = searchOrderQuery.toLowerCase();
    return (
      ord.orderNumber.toLowerCase().includes(q) ||
      (ord.customerName && ord.customerName.toLowerCase().includes(q)) ||
      (ord.courierName && ord.courierName.toLowerCase().includes(q)) ||
      (ord.pillsSummary && ord.pillsSummary.toLowerCase().includes(q)) ||
      String(ord.orderValue).includes(q)
    );
  });

  // Definitions for all 6 Cubes - High Contrast Black & White
  const CUBES: CubeDefinition[] = [
    {
      id: 0,
      key: 'pills',
      title: 'إضافة أدوية للمندوب',
      subtitle: 'إسناد الحبوب وأسماء العملاء للأوردرات',
      icon: <Pill className="w-5 h-5 text-white" />,
    },
    {
      id: 1,
      key: 'payment',
      title: 'تغيير طريقة دفع العميل',
      subtitle: 'تبديل فوري بين نقدي وفيزا وانستاباي',
      icon: <CreditCard className="w-5 h-5 text-white" />,
    },
    {
      id: 2,
      key: 'values',
      title: 'تعديل قيم الأوردرات فورياً',
      subtitle: 'تعديل مالي سريع أثناء ضغط العمل',
      icon: <DollarSign className="w-5 h-5 text-white" />,
    },
    {
      id: 3,
      key: 'radar',
      title: 'رادار وتتبع المناديب على الطريق',
      subtitle: 'مشاركة المندوب الوحيدة: بث إحداثيات GPS',
      icon: <Navigation className="w-5 h-5 text-white" />,
    },
    {
      id: 4,
      key: 'treasury',
      title: 'تسجيل الواردات وصافي الصيدلية',
      subtitle: 'كاش العهدة، إلكتروني، وصافي التوريد',
      icon: <Banknote className="w-5 h-5 text-white" />,
    },
    {
      id: 5,
      key: 'couriers',
      title: 'كباتن التوصيل وروابط الواتساب',
      subtitle: 'إضافة فورية وإرسال روابط التتبع المباشر',
      icon: <Bike className="w-5 h-5 text-white" />,
    },
  ];

  const activeCube = CUBES[activeCubeIndex];

  // Mouse drag rotation handlers for smooth tactile 3D control
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartX.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartX.current;
    if (Math.abs(deltaX) > 40) {
      if (deltaX > 0) {
        handlePrevCube();
      } else {
        handleNextCube();
      }
      dragStartX.current = e.clientX;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      className="w-full font-['Cairo',sans-serif] selection:bg-black selection:text-white space-y-4"
    >
      {/* ============================================================= */}
      {/* 1. TOP STATUS & SIGNATURE COCKPIT BAR (BLACK AND WHITE LUXURY) */}
      {/* ============================================================= */}
      <div className="bg-black rounded-3xl p-4 sm:p-5 border-2 border-zinc-800 shadow-2xl text-white flex flex-col md:flex-row items-center justify-between gap-3 relative overflow-hidden">
        {/* Subtle Monochrome Spotlights */}
        <div className="absolute top-0 right-1/4 w-80 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-32 bg-zinc-800/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3.5 z-10 w-full md:w-auto justify-between md:justify-start">
          {/* 3D Delivery Motorcycle Thumbnail - Monochrome */}
          <div
            onClick={onOpenSplash}
            title="انقر لتشغيل شاشة الانطلاق السريعة Made by dr.mohamed elghazawy"
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-zinc-900 p-0.5 shadow-xl shadow-black shrink-0 border border-zinc-700 flex items-center justify-center transform hover:scale-105 hover:rotate-3 transition duration-300 cursor-pointer"
          >
            <img
              src="/delivery_motorcycle.jpg"
              alt="Pharmacy Delivery Motorcycle"
              className="w-full h-full object-cover rounded-xl bw-motorcycle"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-1.5">
                <span>منصة توجيه الأدوية والوحدات 3D</span>
                <span className="text-zinc-400">⚡</span>
              </h2>
              <span className="px-2.5 py-0.5 bg-zinc-900 text-white border border-zinc-700 rounded-full text-[10px] font-black flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                <span>وحدة موحدة دوّارة (B&W)</span>
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium">
              تتحول وتدور المكعبات في مكانها بسلاسة 3D لعرض وإدارة الأدوية وطرق الدفع وتتبع الطريق
            </p>
          </div>
        </div>

        {/* Central Controls: View Switcher & Auto Turn */}
        <div className="flex items-center gap-2 z-10 flex-wrap justify-center">
          {/* 3D Revolving vs Grid Toggle */}
          <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-700 text-xs font-bold">
            <button
              onClick={() => setViewMode('revolving')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'revolving'
                  ? 'bg-white text-black shadow-md font-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>المنصة الدوّارة 3D</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-black shadow-md font-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>المكعبات الـ 6 معاً</span>
            </button>
          </div>

          {/* Auto Turn Toggle */}
          <button
            onClick={() => setIsAutoTurning(!isAutoTurning)}
            className={`px-3 py-1.5 rounded-2xl text-xs font-extrabold border transition flex items-center gap-1.5 cursor-pointer shadow-md ${
              isAutoTurning
                ? 'bg-white text-black border-white animate-pulse'
                : 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-700'
            }`}
            title="تشغيل دوران المكعبات التلقائي المستمر"
          >
            {isAutoTurning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isAutoTurning ? 'إيقاف الدوران' : 'دوران تلقائي حي'}</span>
          </button>

          {/* Official Signature Badge in B&W */}
          <div
            onClick={onOpenSplash}
            title="Made by dr.mohamed elghazawy - عرض شاشة الانطلاق"
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 px-3.5 py-1.5 rounded-2xl border border-zinc-700 shrink-0 shadow-md cursor-pointer transition"
          >
            <ShieldCheck className="w-4 h-4 text-white shrink-0" />
            <div className="text-right leading-tight">
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-300 font-bold block">
                Made by dr.mohamed elghazawy
              </span>
              <span className="text-[11px] font-black text-white">
                د. محمد الغزاوي · {pharmacy.name}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 2. MAIN VIEWPORT: THE REVOLVING 3D CUBE STAGE (BLACK AND WHITE) */}
      {/* ============================================================= */}
      {viewMode === 'revolving' ? (
        <div
          onMouseDown={handleMouseDown}
          className="relative bg-zinc-950 rounded-3xl p-4 sm:p-6 lg:p-8 border-2 border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden select-none"
          style={{ minHeight: '620px' }}
        >
          {/* 3D Glowing Monochrome Pedestal under the cube */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-80 sm:w-[500px] h-32 rounded-[100%] bg-white/10 blur-xl pointer-events-none transform -rotate-x-60 animate-pedestal-bw" />
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-64 sm:w-[420px] h-20 rounded-[100%] border-2 border-zinc-600 shadow-[0_0_30px_rgba(255,255,255,0.2)] pointer-events-none transform -rotate-x-60" />

          {/* Top Stage Navigation Bar */}
          <div className="relative z-20 flex items-center justify-between mb-4 pb-3 border-b border-zinc-800 text-white">
            {/* Previous Cube Button */}
            <button
              onClick={handlePrevCube}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-black text-white rounded-2xl border border-zinc-700 hover:border-zinc-500 text-xs font-bold transition shadow-lg cursor-pointer group"
              title="تدوير للمكعب السابق"
            >
              <ChevronRight className="w-4 h-4 transform group-hover:-translate-x-0.5 transition" />
              <span className="hidden sm:inline">السابق (Cube {((activeCubeIndex - 1 + 6) % 6) + 1})</span>
            </button>

            {/* Active Cube Title & 3D Flip Action */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                <span className="px-3 py-0.5 rounded-full text-xs font-black bg-zinc-900 text-white border border-zinc-700">
                  المكعب {activeCubeIndex + 1} من 6 · {activeCube.title}
                </span>
                <button
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="px-2.5 py-1 bg-white hover:bg-zinc-200 text-black border border-white rounded-xl text-[11px] font-black transition flex items-center gap-1 cursor-pointer"
                  title="قلب وجه المكعب 3D"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>{isFlipped ? 'الوجه التفاعلي' : 'قلب المكعب 3D'}</span>
                </button>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium mt-1">
                {activeCube.subtitle}
              </p>
            </div>

            {/* Next Cube Button */}
            <button
              onClick={handleNextCube}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-black text-white rounded-2xl border border-zinc-700 hover:border-zinc-500 text-xs font-bold transition shadow-lg cursor-pointer group"
              title="تدوير للمكعب التالي"
            >
              <span className="hidden sm:inline">التالي (Cube {((activeCubeIndex + 1) % 6) + 1})</span>
              <ChevronLeft className="w-4 h-4 transform group-hover:translate-x-0.5 transition" />
            </button>
          </div>

          {/* ========================================================= */}
          {/* 3D REVOLVING STAGE CONTAINER WITH PERSPECTIVE */}
          {/* ========================================================= */}
          <div
            className="relative z-10 w-full max-w-2xl mx-auto flex items-center justify-center py-2"
            style={{ perspective: '1400px' }}
          >
            {/* The Active 3D Cube with smooth animated transform */}
            <div
              className="w-full transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform preserve-3d"
              style={{
                transform: `rotateY(${isFlipped ? 180 : 0}deg) scale(1)`,
                transformStyle: 'preserve-3d',
              }}
            >
              {/* --------------------------------------------------- */}
              {/* FRONT FACE OF ACTIVE CUBE (Black and White Luxury) */}
              {/* --------------------------------------------------- */}
              {!isFlipped ? (
                <div className="bg-white rounded-3xl p-5 sm:p-6 border-3 border-zinc-800 border-b-8 border-b-black shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                  {/* Top Bar of Active Cube */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-lg border border-zinc-800">
                        {activeCube.icon}
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-black bg-zinc-100 px-2 py-0.5 rounded-full inline-block mb-0.5 border border-zinc-300">
                          Cube {activeCubeIndex + 1} 🎲 الوحدة الموحدة
                        </span>
                        <h3 className="text-base font-black text-black">
                          {activeCube.title}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsFlipped(true)}
                        className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-black border border-zinc-300 rounded-xl transition text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="قلب المكعب لعرض الإحصائيات والملخص 3D"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">قلب 3D</span>
                      </button>
                    </div>
                  </div>

                  {/* DYNAMIC CONTENT FOR CUBE 1, 2, 3, 4, 5, 6 - BLACK AND WHITE */}
                  {/* =================================================== */}
                  {/* CUBE 1: إضافة الأدوية إلى أسماء المناديب */}
                  {/* =================================================== */}
                  {activeCubeIndex === 0 && (
                    <form onSubmit={handleFastAddPillOrder} className="space-y-3">
                      <p className="text-xs text-zinc-700 font-semibold">
                        اكتب اسم العميل، اختر الأدوية أو اكتبها، وحدد المندوب وقيمة الطلب لإسناده فوراً:
                      </p>

                      {/* Customer Name & Phone */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[11px] font-bold text-zinc-800 block mb-1">
                            اسم العميل / المستلم
                          </label>
                          <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="مثال: أ. أحمد مصطفى"
                            className="w-full px-3 py-2 bg-zinc-50 border-2 border-zinc-300 rounded-xl text-xs font-bold text-black focus:bg-white focus:outline-hidden focus:border-black shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-zinc-800 block mb-1">
                            رقم موبايل العميل (اختياري)
                          </label>
                          <input
                            type="tel"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="010xxxxxxxx"
                            className="w-full px-3 py-2 bg-zinc-50 border-2 border-zinc-300 rounded-xl text-xs font-bold text-black focus:bg-white focus:outline-hidden focus:border-black shadow-2xs"
                          />
                        </div>
                      </div>

                      {/* Quick Pills Badges Selection - High Contrast B&W */}
                      <div>
                        <label className="text-[11px] font-bold text-zinc-800 block mb-1">
                          أدوية وحبوب شائعة (انقر للإضافة السريعة):
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {COMMON_PILLS.map((p) => {
                            const isSelected = selectedPills.includes(p);
                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={() => handleTogglePillBadge(p)}
                                className={`text-[11px] px-2.5 py-1 rounded-xl font-bold transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-black text-white shadow-md font-black border border-black'
                                    : 'bg-white hover:bg-zinc-100 text-black border border-zinc-400'
                                }`}
                              >
                                {isSelected ? '✓ ' : '+ '}
                                {p}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Custom Pills Input */}
                      <div>
                        <label className="text-[11px] font-bold text-zinc-800 block mb-1">
                          أو اكتب اسم الدواء / الروشتة المطلوب توصيلها:
                        </label>
                        <input
                          type="text"
                          value={pillItemName}
                          onChange={(e) => setPillItemName(e.target.value)}
                          placeholder="مثال: بنادول إكسترا + أوجمنتين 1 جم + قطرة عين"
                          className="w-full px-3 py-2.5 bg-white border-2 border-zinc-400 rounded-xl text-xs font-bold text-black focus:outline-hidden focus:border-black shadow-2xs"
                        />
                      </div>

                      {/* Order Value & Courier Selection */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[11px] font-bold text-zinc-800 block mb-1">
                            قيمة الأوردر بالجنيه *
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="any"
                              min="1"
                              required
                              value={pillOrderValue}
                              onChange={(e) => setPillOrderValue(e.target.value)}
                              placeholder="120"
                              className="w-full pl-8 pr-3 py-2 bg-white border-2 border-zinc-800 rounded-xl text-sm font-black font-mono text-black focus:outline-hidden focus:border-black shadow-2xs"
                            />
                            <span className="absolute left-2.5 top-2.5 text-xs font-black text-zinc-500">
                              ج.م
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-zinc-800 block mb-1">
                            المندوب المستلم للطلب *
                          </label>
                          <select
                            value={selectedCourierId || pharmacyCouriers[0]?.id || ''}
                            onChange={(e) => setSelectedCourierId(e.target.value)}
                            className="w-full px-3 py-2 bg-white border-2 border-zinc-400 rounded-xl text-xs font-bold text-black focus:outline-hidden focus:border-black shadow-2xs"
                          >
                            {pharmacyCouriers.length === 0 ? (
                              <option value="">+ إضافة كابتن أولاً</option>
                            ) : (
                              pharmacyCouriers.map((c) => (
                                <option key={c.id} value={c.id}>
                                  🛵 {c.name} ({c.vehicleType})
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                      </div>

                      {/* Payment Method Selector - Monochrome */}
                      <div>
                        <label className="text-[11px] font-bold text-zinc-800 block mb-1">
                          طريقة دفع العميل:
                        </label>
                        <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                          <button
                            type="button"
                            onClick={() => setSelectedPayment('cash')}
                            className={`py-2 rounded-xl transition text-center cursor-pointer ${
                              selectedPayment === 'cash'
                                ? 'bg-black text-white shadow-md font-black border border-black'
                                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300'
                            }`}
                          >
                            💵 نقدي
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedPayment('visa')}
                            className={`py-2 rounded-xl transition text-center cursor-pointer ${
                              selectedPayment === 'visa'
                                ? 'bg-black text-white shadow-md font-black border border-black'
                                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300'
                            }`}
                          >
                            💳 فيزا POS
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedPayment('instapay')}
                            className={`py-2 rounded-xl transition text-center cursor-pointer ${
                              selectedPayment === 'instapay'
                                ? 'bg-black text-white shadow-md font-black border border-black'
                                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300'
                            }`}
                          >
                            ⚡ انستاباي
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedPayment('vodafone_cash')}
                            className={`py-2 rounded-xl transition text-center cursor-pointer ${
                              selectedPayment === 'vodafone_cash'
                                ? 'bg-black text-white shadow-md font-black border border-black'
                                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300'
                            }`}
                          >
                            📱 فودافون
                          </button>
                        </div>
                      </div>

                      {/* Submit Button in Black */}
                      <button
                        type="submit"
                        className="w-full py-3 bg-black hover:bg-zinc-800 text-white rounded-2xl text-xs sm:text-sm font-black shadow-xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                      >
                        {fastAddSuccess ? (
                          <Check className="w-5 h-5 text-white" />
                        ) : (
                          <Plus className="w-5 h-5 text-white" />
                        )}
                        <span>
                          {fastAddSuccess
                            ? 'تم إسناد الأدوية والأوردر بنجاح للمندوب ✔️'
                            : 'إسناد الأدوية للمندوب فوراً (Enter)'}
                        </span>
                      </button>
                    </form>
                  )}

                  {/* =================================================== */}
                  {/* CUBE 2: تغيير طريقة دفع العميل */}
                  {/* =================================================== */}
                  {activeCubeIndex === 1 && (
                    <div className="space-y-3">
                      <p className="text-xs text-zinc-700 font-semibold">
                        بضغطة واحدة على أي أوردر نشط، غيّر كيف سيدفع العميل للمندوب (كاش أو فيزا أو انستاباي أو فودافون):
                      </p>

                      {/* Search in active orders */}
                      <div className="relative">
                        <Search className="w-4 h-4 absolute right-3 top-2.5 text-zinc-400" />
                        <input
                          type="text"
                          value={searchOrderQuery}
                          onChange={(e) => setSearchOrderQuery(e.target.value)}
                          placeholder="ابحث برقم الأوردر، اسم العميل، أو اسم الكابتن..."
                          className="w-full pr-9 pl-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs font-bold text-black"
                        />
                      </div>

                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {filteredActiveOrders.length === 0 ? (
                          <div className="p-6 bg-zinc-100 rounded-2xl border border-zinc-300 text-center text-xs text-zinc-800 space-y-1">
                            <p className="font-extrabold text-sm">لا توجد أوردرات نشطة لتغيير طريقة دفعها</p>
                            <p className="text-zinc-500">
                              انتقل إلى المكعب 1 لإضافة أوردر أدوية جديد
                            </p>
                          </div>
                        ) : (
                          filteredActiveOrders.map((ord) => (
                            <div
                              key={ord.id}
                              className="p-3 bg-zinc-50 hover:bg-white rounded-2xl border border-zinc-300 shadow-2xs space-y-2 transition"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-black bg-zinc-200 px-2 py-0.5 rounded-lg">
                                    {ord.orderNumber}
                                  </span>
                                  <span className="font-extrabold text-black">
                                    {ord.customerName ? `👤 ${ord.customerName}` : `🛵 كابتن ${ord.courierName || 'المندوب'}`}
                                  </span>
                                </div>
                                <span className="font-mono font-black text-black text-sm">
                                  {ord.orderValue} جنيه
                                </span>
                              </div>

                              {ord.pillsSummary && (
                                <p className="text-[11px] text-zinc-700 bg-white p-1.5 rounded-lg border border-zinc-300 font-semibold">
                                  💊 {ord.pillsSummary}
                                </p>
                              )}

                              {/* 1-Tap Payment Selector - Monochrome */}
                              <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                                <button
                                  type="button"
                                  onClick={() => handleQuickPaymentChange(ord.id, 'cash')}
                                  className={`py-1.5 rounded-xl transition cursor-pointer text-center ${
                                    ord.paymentMethod === 'cash'
                                      ? 'bg-black text-white shadow-md font-black border border-black'
                                      : 'bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-300'
                                  }`}
                                >
                                  💵 كاش
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickPaymentChange(ord.id, 'visa')}
                                  className={`py-1.5 rounded-xl transition cursor-pointer text-center ${
                                    ord.paymentMethod === 'visa'
                                      ? 'bg-black text-white shadow-md font-black border border-black'
                                      : 'bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-300'
                                  }`}
                                >
                                  💳 فيزا
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickPaymentChange(ord.id, 'instapay')}
                                  className={`py-1.5 rounded-xl transition cursor-pointer text-center ${
                                    ord.paymentMethod === 'instapay'
                                      ? 'bg-black text-white shadow-md font-black border border-black'
                                      : 'bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-300'
                                  }`}
                                >
                                  ⚡ انستا
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickPaymentChange(ord.id, 'vodafone_cash')}
                                  className={`py-1.5 rounded-xl transition cursor-pointer text-center ${
                                    ord.paymentMethod === 'vodafone_cash'
                                      ? 'bg-black text-white shadow-md font-black border border-black'
                                      : 'bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-300'
                                  }`}
                                >
                                  📱 فودافون
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* =================================================== */}
                  {/* CUBE 3: تعديل وتغيير قيم الأوردرات فورياً */}
                  {/* =================================================== */}
                  {activeCubeIndex === 2 && (
                    <div className="space-y-3">
                      <p className="text-xs text-zinc-700 font-semibold">
                        تعديل مالي سريع لسعر أي أوردر وعمولة المندوب واسم العميل أثناء ضغط العمل:
                      </p>

                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {filteredActiveOrders.length === 0 ? (
                          <div className="p-6 bg-zinc-100 rounded-2xl border border-zinc-300 text-center text-xs text-zinc-800 space-y-1">
                            <p className="font-extrabold text-sm">لا توجد أوردرات لتعديل قيمها</p>
                            <p className="text-zinc-500">
                              سجل أوردر جديد في المكعب 1 لتعديل سعره وملاحظاته هنا
                            </p>
                          </div>
                        ) : (
                          filteredActiveOrders.map((ord) => {
                            const isEditing = editingOrderId === ord.id;

                            return (
                              <div
                                key={ord.id}
                                className="p-3 bg-zinc-50 hover:bg-white rounded-2xl border border-zinc-300 shadow-2xs space-y-2 transition"
                              >
                                {isEditing ? (
                                  <div className="space-y-2 animate-in fade-in">
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-[10px] font-bold text-zinc-700 block mb-0.5">
                                          قيمة الأوردر بالجنيه:
                                        </label>
                                        <input
                                          type="number"
                                          step="any"
                                          value={editValue}
                                          onChange={(e) => setEditValue(e.target.value)}
                                          className="w-full px-2.5 py-1.5 bg-white border-2 border-black rounded-xl text-xs font-mono font-black text-black"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-bold text-zinc-700 block mb-0.5">
                                          عمولة التوصيل للمندوب:
                                        </label>
                                        <input
                                          type="number"
                                          step="any"
                                          value={editDeliveryFee}
                                          onChange={(e) => setEditDeliveryFee(e.target.value)}
                                          className="w-full px-2.5 py-1.5 bg-white border-2 border-black rounded-xl text-xs font-mono font-black text-black"
                                        />
                                      </div>
                                    </div>

                                    <div>
                                      <input
                                        type="text"
                                        value={editCustomerName}
                                        onChange={(e) => setEditCustomerName(e.target.value)}
                                        placeholder="اسم العميل"
                                        className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-xl text-xs font-bold"
                                      />
                                    </div>

                                    <div>
                                      <input
                                        type="text"
                                        value={editPills}
                                        onChange={(e) => setEditPills(e.target.value)}
                                        placeholder="الأدوية والحبوب المضافة"
                                        className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-xl text-xs"
                                      />
                                    </div>

                                    <div className="flex items-center gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => handleSaveInlineEdit(ord.id)}
                                        className="flex-1 py-1.5 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                                      >
                                        حفظ التعديل ✔️
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingOrderId(null)}
                                        className="px-3 py-1.5 bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold"
                                      >
                                        إلغاء
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between text-xs">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono font-black text-black bg-zinc-200 px-2 py-0.5 rounded-lg">
                                          {ord.orderNumber}
                                        </span>
                                        <span className="font-extrabold text-black">
                                          {ord.customerName || ord.courierName || 'طلب دليفري'}
                                        </span>
                                      </div>
                                      <span className="text-zinc-600 text-[11px] block mt-0.5 font-medium">
                                        💊 {ord.pillsSummary || 'أدوية روشتة'}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <div className="text-left">
                                        <span className="font-mono font-black text-black text-base block">
                                          {ord.orderValue} ج
                                        </span>
                                        <span className="text-[10px] text-zinc-500 font-bold">
                                          (+{ord.deliveryFee} توصيل)
                                        </span>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingOrderId(ord.id);
                                          setEditValue(String(ord.orderValue));
                                          setEditDeliveryFee(String(ord.deliveryFee || 7));
                                          setEditCustomerName(ord.customerName || '');
                                          setEditPills(ord.pillsSummary || '');
                                        }}
                                        className="p-2 bg-zinc-200 hover:bg-zinc-300 text-black rounded-xl transition cursor-pointer"
                                        title="تعديل القيمة والبيانات"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleQuickMarkDelivered(ord.id)}
                                        className="p-2 bg-black hover:bg-zinc-800 text-white rounded-xl transition cursor-pointer"
                                        title="تم التسليم للعميل بنجاح"
                                      >
                                        <Check className="w-4 h-4 text-white" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* =================================================== */}
                  {/* CUBE 4: رادار وتتبع المناديب على الطريق */}
                  {/* =================================================== */}
                  {activeCubeIndex === 3 && (
                    <div className="space-y-3">
                      <div className="bg-zinc-100 p-3 rounded-2xl border border-zinc-300 text-xs text-black font-bold flex items-start gap-2">
                        <Radio className="w-4 h-4 text-black shrink-0 mt-0.5" />
                        <span>
                          <strong>مشاركة المندوب الوحيدة في التطبيق:</strong> بث إحداثيات موقعه الحي GPS أثناء خط السير ليظهر للصيدلي على الخريطة والرادار مع السرعة والمسافة دون أي تعقيد.
                        </span>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {pharmacyCouriers.length === 0 ? (
                          <div className="p-6 bg-zinc-100 rounded-2xl border border-zinc-300 text-center text-xs text-zinc-700">
                            لا يوجد مناديب مسجلين بعد لتتبعهم
                          </div>
                        ) : (
                          pharmacyCouriers.map((c) => {
                            const isMoving = (c.currentLocation?.speedKmH || 0) > 0;

                            return (
                              <div
                                key={c.id}
                                className="p-3 bg-zinc-50 hover:bg-white rounded-2xl border border-zinc-300 shadow-2xs flex items-center justify-between text-xs transition"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold">
                                    <Bike className="w-5 h-5 text-white" />
                                  </div>
                                  <div>
                                    <p className="font-black text-black text-sm">{c.name}</p>
                                    <p className="text-[11px] text-zinc-500 font-semibold">
                                      {c.currentLocation?.address || 'بالقرب من الصيدلية'} · {c.phone}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                                      isMoving
                                        ? 'bg-black text-white'
                                        : 'bg-zinc-200 text-zinc-800'
                                    }`}
                                  >
                                    {isMoving ? `⚡ ${c.currentLocation.speedKmH} كم/س` : '🛑 متوقف'}
                                  </span>

                                  <button
                                    onClick={() => handleCopyCourierLink(c)}
                                    className="p-2 bg-zinc-200 hover:bg-zinc-300 text-black rounded-xl text-xs font-bold transition"
                                    title="نسخ رابط التتبع"
                                  >
                                    <LinkIcon className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <button
                        onClick={onOpenLiveMap}
                        className="w-full py-3 bg-black hover:bg-zinc-800 text-white rounded-2xl text-xs sm:text-sm font-black shadow-lg transition flex items-center justify-center gap-2 cursor-pointer mt-1"
                      >
                        <Radio className="w-4 h-4 text-white" />
                        <span>فتح رادار الخريطة الحية والتتبع الكامل 🛰️</span>
                      </button>
                    </div>
                  )}

                  {/* =================================================== */}
                  {/* CUBE 5: تسجيل الواردات وصافي الصيدلية */}
                  {/* =================================================== */}
                  {activeCubeIndex === 4 && (
                    <div className="space-y-3">
                      <p className="text-xs text-zinc-700 font-semibold">
                        بيان تفصيلي بالمبالغ والتحصيلات في عهدة المناديب وصافي توريد الصيدلية:
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-3 bg-zinc-50 rounded-2xl border-2 border-zinc-300">
                          <span className="text-[11px] text-zinc-600 font-bold block mb-1">
                            💵 كاش في العهدة
                          </span>
                          <span className="font-mono font-black text-black text-lg">
                            {totalCash} <span className="text-xs">ج.م</span>
                          </span>
                        </div>

                        <div className="p-3 bg-zinc-50 rounded-2xl border-2 border-zinc-300">
                          <span className="text-[11px] text-zinc-600 font-bold block mb-1">
                            💳 مدفوع فيزا (POS)
                          </span>
                          <span className="font-mono font-black text-black text-lg">
                            {totalVisa} <span className="text-xs">ج.م</span>
                          </span>
                        </div>

                        <div className="p-3 bg-zinc-50 rounded-2xl border-2 border-zinc-300">
                          <span className="text-[11px] text-zinc-600 font-bold block mb-1">
                            ⚡ محول انستاباي
                          </span>
                          <span className="font-mono font-black text-black text-lg">
                            {totalInstapay} <span className="text-xs">ج.م</span>
                          </span>
                        </div>

                        <div className="p-3 bg-zinc-50 rounded-2xl border-2 border-zinc-300">
                          <span className="text-[11px] text-zinc-600 font-bold block mb-1">
                            🛵 عمولات المناديب
                          </span>
                          <span className="font-mono font-black text-black text-lg">
                            {totalEarnings} <span className="text-xs">ج.م</span>
                          </span>
                        </div>
                      </div>

                      {/* Net Pharmacy Box - Solid Black */}
                      <div className="p-4 bg-black text-white rounded-2xl flex items-center justify-between shadow-xl border border-zinc-800">
                        <div>
                          <span className="text-[11px] text-zinc-400 font-bold block">
                            صافي توريد الصيدلية
                          </span>
                          <span className="font-mono font-black text-white text-xl sm:text-2xl">
                            {netPharmacy} جنيه
                          </span>
                        </div>
                        <div className="text-left">
                          <span className="text-[11px] text-zinc-400 block font-bold">
                            إجمالي المحصل
                          </span>
                          <span className="font-mono font-black text-white text-base">
                            {totalGross} ج.م
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* =================================================== */}
                  {/* CUBE 6: كباتن التوصيل وروابط الواتساب */}
                  {/* =================================================== */}
                  {activeCubeIndex === 5 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-zinc-700 font-semibold">
                          أرسل رابط التتبع للمندوب على واتساب (دون كلمات مرور):
                        </p>
                        <button
                          onClick={onOpenAddCourierModal}
                          className="px-3 py-1 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-white" />
                          <span>+ إضافة كابتن</span>
                        </button>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {pharmacyCouriers.length === 0 ? (
                          <div className="p-6 bg-zinc-100 rounded-2xl border border-zinc-300 text-center space-y-2">
                            <p className="text-xs text-black font-bold">
                              لا يوجد مناديب مسجلين حالياً
                            </p>
                            <button
                              onClick={onOpenAddCourierModal}
                              className="px-3 py-1.5 bg-black text-white rounded-xl text-xs font-bold"
                            >
                              + إضافة اسم كابتن جديد
                            </button>
                          </div>
                        ) : (
                          pharmacyCouriers.map((c) => (
                            <div
                              key={c.id}
                              className="p-3 bg-zinc-50 hover:bg-white rounded-2xl border border-zinc-300 shadow-2xs flex items-center justify-between gap-2 transition"
                            >
                              <div>
                                <p className="text-xs font-black text-black">{c.name}</p>
                                <p className="text-[11px] text-zinc-500 font-mono font-semibold">
                                  {c.phone || 'بدون هاتف'} · عمولة: {c.deliveryFeePerOrder} ج
                                </p>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleCopyCourierLink(c)}
                                  className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                                    copiedCourierId === c.id
                                      ? 'bg-black text-white'
                                      : 'bg-zinc-200 hover:bg-zinc-300 text-black'
                                  }`}
                                  title="نسخ رابط المندوب"
                                >
                                  {copiedCourierId === c.id ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                                </button>

                                <button
                                  onClick={() => handleShareWhatsApp(c)}
                                  className="p-2 bg-black hover:bg-zinc-800 text-white border border-black rounded-xl text-xs font-bold transition cursor-pointer"
                                  title="إرسال الرابط عبر واتساب"
                                >
                                  <MessageCircle className="w-4 h-4 text-white" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* --------------------------------------------------- */
                /* BACK FACE OF ACTIVE CUBE (Black and White Analytics) */
                /* --------------------------------------------------- */
                <div
                  className="bg-black rounded-3xl p-6 border-3 border-zinc-700 border-b-8 border-b-zinc-800 shadow-2xl text-white relative overflow-hidden"
                  style={{ transform: 'rotateY(180deg)' }}
                >
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-white" />
                      <h3 className="text-base font-black text-white">
                        لوحة المؤشرات السريعة · Cube {activeCubeIndex + 1}
                      </h3>
                    </div>
                    <button
                      onClick={() => setIsFlipped(false)}
                      className="px-3 py-1 bg-white hover:bg-zinc-200 text-black rounded-xl text-xs font-black transition"
                    >
                      الرجوع للوجه الأمامي ↺
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                    <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800">
                      <span className="text-zinc-400 block mb-1">المناديب النشطين:</span>
                      <span className="text-xl font-black font-mono text-white">
                        {pharmacyCouriers.length} كابتن
                      </span>
                    </div>

                    <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800">
                      <span className="text-zinc-400 block mb-1">أوردرات في الطريق:</span>
                      <span className="text-xl font-black font-mono text-white">
                        {activeOrders.length} أوردر
                      </span>
                    </div>

                    <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800">
                      <span className="text-zinc-400 block mb-1">تم تسليمه اليوم:</span>
                      <span className="text-xl font-black font-mono text-white">
                        {deliveredOrders.length} مكتمل
                      </span>
                    </div>

                    <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800">
                      <span className="text-zinc-400 block mb-1">كاش بالعهدة:</span>
                      <span className="text-xl font-black font-mono text-white">
                        {totalCash} ج
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">التوقيع الرسمي المعتمد:</span>
                    <span className="font-mono font-bold text-white">
                      Made by dr.mohamed elghazawy
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* 3D CUBES REVOLVING DOCK (6 CONNECTED CUBES IN B&W) */}
          {/* ========================================================= */}
          <div className="relative z-20 mt-4 pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
              {CUBES.map((cube, idx) => {
                const isActive = activeCubeIndex === idx;

                return (
                  <button
                    key={cube.id}
                    onClick={() => handleSelectCube(idx)}
                    className={`flex-1 min-w-[120px] p-2.5 rounded-2xl transition-all duration-300 flex flex-col items-center justify-center gap-1.5 cursor-pointer relative ${
                      isActive
                        ? 'bg-white text-black shadow-xl border-2 border-white transform -translate-y-1.5'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    <div className={`p-1.5 rounded-xl ${isActive ? 'bg-black text-white' : 'bg-zinc-950 text-zinc-400'}`}>
                      {cube.icon}
                    </div>
                    <span className="text-[11px] font-black text-center whitespace-nowrap">
                      {cube.title.split(' ')[0]} {cube.title.split(' ')[1] || ''}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-black text-white font-black' : 'bg-black text-zinc-500'
                    }`}>
                      Cube {idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================= */
        /* 3. UNIFIED 3D GRID VIEW IN MONOCHROME */
        /* ============================================================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CUBES.map((cube, idx) => {
            const isSelected = activeCubeIndex === idx;

            return (
              <div
                key={cube.id}
                onClick={() => setActiveCubeIndex(idx)}
                className={`bg-white rounded-3xl p-5 border-2 transition-all duration-300 flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'border-black border-b-6 border-b-black shadow-xl -translate-y-1'
                    : 'border-zinc-300 hover:border-black shadow-md hover:-translate-y-0.5'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-md font-bold">
                        {cube.icon}
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">
                          Cube {idx + 1}
                        </span>
                        <h3 className="text-xs font-black text-black">
                          {cube.title}
                        </h3>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-zinc-100 text-black border border-zinc-300">
                      نشط
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-600 mb-2 font-medium">
                    {cube.subtitle}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveCubeIndex(idx);
                    setViewMode('revolving');
                  }}
                  className="w-full mt-3 py-2 bg-zinc-100 hover:bg-black hover:text-white text-black rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>فتح في المنصة الدوّارة 3D</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
