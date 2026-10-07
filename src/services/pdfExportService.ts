import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ShiftSummaryArchive, Pharmacy } from '../types';

/**
 * Format timestamp into Arabic time string
 */
function formatTime(isoString?: string): string {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date into Arabic readable string
 */
function formatDate(isoString?: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Calculate shift duration string
 */
function calculateDuration(startTime: string, endTime: string): string {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return 'غير محدد';
  const diffMs = end - start;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours} ساعة و ${minutes} دقيقة`;
}

/**
 * Render single shift HTML string for A4 document
 */
function buildSingleShiftHtml(summary: ShiftSummaryArchive, pharmacy: Pharmacy): string {
  const totalSales =
    summary.totalCashCollected + summary.totalVisaCollected + summary.totalInstapayCollected;
  const duration = calculateDuration(summary.startTime, summary.endTime);
  const formattedStart = formatTime(summary.startTime);
  const formattedEnd = formatTime(summary.endTime);
  const formattedDate = summary.shiftDate || formatDate(summary.startTime);
  const netDueCashToPharmacy = Math.max(0, summary.totalCashCollected - summary.totalDeliveryFees);

  const ordersRows = (summary.orders || [])
    .map((ord, idx) => {
      const pLabel =
        ord.paymentMethod === 'cash'
          ? 'نقدي (كاش)'
          : ord.paymentMethod === 'visa'
          ? 'فيزا (POS)'
          : 'انستاباي';
      const delTime = ord.deliveredAt ? formatTime(ord.deliveredAt) : '--:--';

      return `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 6px 8px; text-align: center; color: #64748b; font-weight: bold;">${idx + 1}</td>
        <td style="padding: 6px 8px; text-align: right; font-weight: bold; color: #0f172a; font-family: monospace;">${ord.orderNumber}</td>
        <td style="padding: 6px 8px; text-align: center; color: #475569;">${delTime}</td>
        <td style="padding: 6px 8px; text-align: center;">
          <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background: ${
            ord.paymentMethod === 'cash' ? '#dcfce7; color: #166534;' : ord.paymentMethod === 'visa' ? '#f3e8ff; color: #6b21a8;' : '#e0f2fe; color: #0369a1;'
          }">${pLabel}</span>
        </td>
        <td style="padding: 6px 8px; text-align: left; font-family: monospace; font-weight: bold; color: #0f172a;">${Number(ord.orderValue).toFixed(2)} ج</td>
        <td style="padding: 6px 8px; text-align: left; font-family: monospace; font-weight: bold; color: #b45309;">${Number(ord.deliveryFee).toFixed(2)} ج</td>
      </tr>
    `;
    })
    .join('');

  return `
    <div style="width: 794px; min-height: 1120px; padding: 36px 42px; background: #ffffff; color: #0f172a; font-family: system-ui, -apple-system, sans-serif; direction: rtl; box-sizing: border-box; position: relative;">
      
      <!-- Header with Pharmacy Details & Logo -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 20px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="background: #0284c7; color: #ffffff; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold;">💊</div>
            <h1 style="font-size: 22px; font-weight: 800; margin: 0; color: #0f172a;">${pharmacy.name}</h1>
          </div>
          <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">
            العنوان: ${pharmacy.address} · الهاتف: <span style="direction: ltr; display: inline-block; font-family: monospace;">${pharmacy.phone}</span>
          </p>
          <p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0;">
            الصيدلي المسئول: <strong>${pharmacy.pharmacistName}</strong>
          </p>
        </div>

        <div style="text-align: left;">
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 8px 14px; border-radius: 10px; display: inline-block;">
            <span style="font-size: 11px; color: #0284c7; font-weight: bold; display: block;">تقرير مالي معتمد</span>
            <span style="font-size: 14px; font-weight: 800; color: #0369a1; font-family: monospace;">إغلاق شيفت #${summary.id.slice(-6).toUpperCase()}</span>
          </div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">
            تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      <!-- Title Banner -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 style="font-size: 16px; font-weight: 800; margin: 0; color: #1e293b;">
            ملخص ومحفظة الشيفت للكابتن: <span style="color: #0284c7;">${summary.courierName}</span>
          </h2>
          <p style="font-size: 11px; color: #64748b; margin: 3px 0 0 0;">
            تاريخ الشيفت: <strong>${formattedDate}</strong> · مدة العمل: <strong>${duration}</strong>
          </p>
        </div>
        <div style="display: flex; gap: 14px; font-size: 11px; color: #475569;">
          <div>بدء: <strong style="color: #059669; font-family: monospace;">${formattedStart}</strong></div>
          <div>انتهاء: <strong style="color: #d97706; font-family: monospace;">${formattedEnd}</strong></div>
        </div>
      </div>

      <!-- Financial Cards (4 Key Metrics) -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
        <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 10px; padding: 10px 12px; text-align: center;">
          <span style="font-size: 10px; font-weight: bold; color: #92400e; display: block;">أرباح المندوب (الحصالة)</span>
          <span style="font-size: 18px; font-weight: 800; color: #78350f; font-family: monospace; display: block; margin-top: 2px;">${summary.totalDeliveryFees.toFixed(2)} ج</span>
          <span style="font-size: 9px; color: #b45309;">عن (${summary.totalOrdersCount}) أوردر</span>
        </div>

        <div style="background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 10px; padding: 10px 12px; text-align: center;">
          <span style="font-size: 10px; font-weight: bold; color: #166534; display: block;">كاش محصل باليد</span>
          <span style="font-size: 18px; font-weight: 800; color: #14532d; font-family: monospace; display: block; margin-top: 2px;">${summary.totalCashCollected.toFixed(2)} ج</span>
          <span style="font-size: 9px; color: #15803d;">نقدي جاهز للتوريد</span>
        </div>

        <div style="background: #f3e8ff; border: 1px solid #e9d5ff; border-radius: 10px; padding: 10px 12px; text-align: center;">
          <span style="font-size: 10px; font-weight: bold; color: #6b21a8; display: block;">فيزا + انستاباي</span>
          <span style="font-size: 18px; font-weight: 800; color: #581c87; font-family: monospace; display: block; margin-top: 2px;">${(summary.totalVisaCollected + summary.totalInstapayCollected).toFixed(2)} ج</span>
          <span style="font-size: 9px; color: #7e22ce;">مدفوعات إلكترونية</span>
        </div>

        <div style="background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 10px; padding: 10px 12px; text-align: center;">
          <span style="font-size: 10px; font-weight: bold; color: #075985; display: block;">إجمالي قيمة المبيعات</span>
          <span style="font-size: 18px; font-weight: 800; color: #0c4a6e; font-family: monospace; display: block; margin-top: 2px;">${totalSales.toFixed(2)} ج</span>
          <span style="font-size: 9px; color: #0284c7;">حجم مبيعات الشيفت</span>
        </div>
      </div>

      <!-- Financial Settlement Calculation Box -->
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px 16px; margin-bottom: 22px;">
        <div style="font-size: 12px; font-weight: bold; color: #334155; margin-bottom: 6px; display: flex; justify-content: space-between;">
          <span>تسوية الحساب ومستحقات الخزينة (Settlement Summary):</span>
          <span style="color: #64748b; font-size: 11px;">العملة: جنيه مصري (EGP)</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; padding: 4px 0; border-bottom: 1px dashed #e2e8f0;">
          <span>إجمالي النقدية المحصلة مع المندوب:</span>
          <strong style="font-family: monospace;">+ ${summary.totalCashCollected.toFixed(2)} ج</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #b45309; padding: 4px 0; border-bottom: 1px dashed #e2e8f0;">
          <span>مستحقات وعمولة المندوب (أتعاب التوصيل المستحقة):</span>
          <strong style="font-family: monospace;">- ${summary.totalDeliveryFees.toFixed(2)} ج</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 800; color: #0f172a; padding: 6px 0 0 0;">
          <span>صافي النقدية المطلوب توريدها لخزينة الصيدلية:</span>
          <span style="font-size: 15px; color: #059669; font-family: monospace;">${netDueCashToPharmacy.toFixed(2)} جنيه مصري</span>
        </div>
      </div>

      <!-- Detailed Orders Table -->
      <div style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h3 style="font-size: 13px; font-weight: 800; color: #1e293b; margin: 0;">
            جدول أوردرات الشيفت المسلمة (${summary.orders?.length || 0} أوردر)
          </h3>
          <span style="font-size: 10px; color: #64748b;">مرتبة حسب التسليم</span>
        </div>

        <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #f1f5f9; color: #334155; font-size: 10px; font-weight: 800; border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 7px 8px; text-align: center; width: 36px;">م</th>
              <th style="padding: 7px 8px; text-align: right;">رقم الأوردر</th>
              <th style="padding: 7px 8px; text-align: center;">وقت التسليم</th>
              <th style="padding: 7px 8px; text-align: center;">طريقة الدفع</th>
              <th style="padding: 7px 8px; text-align: left;">قيمة الأوردر</th>
              <th style="padding: 7px 8px; text-align: left;">عمولة التوصيل</th>
            </tr>
          </thead>
          <tbody>
            ${ordersRows || '<tr><td colspan="6" style="text-align: center; padding: 12px; color: #94a3b8;">لا توجد أوردرات مسجلة</td></tr>'}
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc; font-weight: bold; font-size: 11px; border-top: 2px solid #cbd5e1;">
              <td colspan="4" style="padding: 8px; text-align: right; color: #334155;">الإجمالي العام:</td>
              <td style="padding: 8px; text-align: left; font-family: monospace; color: #0f172a;">${totalSales.toFixed(2)} ج</td>
              <td style="padding: 8px; text-align: left; font-family: monospace; color: #b45309;">${summary.totalDeliveryFees.toFixed(2)} ج</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Signatures & Stamp Footer -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 36px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; text-align: center;">
        <div>
          <span style="font-weight: bold; color: #475569; display: block; margin-bottom: 30px;">توقيع واستلام المندوب:</span>
          <div style="border-bottom: 1px dotted #94a3b8; width: 140px; margin: 0 auto 4px auto;"></div>
          <span style="font-size: 10px; color: #64748b;">الكابتن: ${summary.courierName}</span>
        </div>

        <div>
          <span style="font-weight: bold; color: #475569; display: block; margin-bottom: 30px;">اعتماد الصيدلي المسئول:</span>
          <div style="border-bottom: 1px dotted #94a3b8; width: 140px; margin: 0 auto 4px auto;"></div>
          <span style="font-size: 10px; color: #64748b;">د. ${pharmacy.pharmacistName}</span>
        </div>

        <div>
          <span style="font-weight: bold; color: #475569; display: block; margin-bottom: 12px;">خاتم الصيدلية الرسمي:</span>
          <div style="width: 75px; height: 50px; border: 1.5px dashed #94a3b8; border-radius: 8px; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #94a3b8;">
            مكان الخاتم
          </div>
        </div>
      </div>

      <!-- Watermark Note -->
      <div style="margin-top: 24px; text-align: center; font-size: 9px; color: #94a3b8;">
        تم استخراج هذا التقرير آلياً عبر منظومة «فارما ديليفري» السحابية لإدارة وتتبع مناديب الصيدلية.
      </div>
    </div>
  `;
}

/**
 * Render multi-shifts consolidated report HTML string
 */
function buildConsolidatedShiftsHtml(summaries: ShiftSummaryArchive[], pharmacy: Pharmacy): string {
  const totalOrders = summaries.reduce((acc, s) => acc + (s.totalOrdersCount || 0), 0);
  const totalCourierEarnings = summaries.reduce((acc, s) => acc + (s.totalDeliveryFees || 0), 0);
  const totalCash = summaries.reduce((acc, s) => acc + (s.totalCashCollected || 0), 0);
  const totalVisa = summaries.reduce((acc, s) => acc + (s.totalVisaCollected || 0), 0);
  const totalInstapay = summaries.reduce((acc, s) => acc + (s.totalInstapayCollected || 0), 0);
  const totalSales = totalCash + totalVisa + totalInstapay;

  const rows = summaries
    .map((s, idx) => {
      const shiftSales = s.totalCashCollected + s.totalVisaCollected + s.totalInstapayCollected;
      const formattedDate = s.shiftDate || formatDate(s.startTime);

      return `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 8px; text-align: center; color: #64748b; font-weight: bold;">${idx + 1}</td>
        <td style="padding: 8px; text-align: right; font-weight: bold; color: #0f172a;">${s.courierName}</td>
        <td style="padding: 8px; text-align: center; color: #475569;">${formattedDate}</td>
        <td style="padding: 8px; text-align: center; font-family: monospace; font-weight: bold;">${s.totalOrdersCount}</td>
        <td style="padding: 8px; text-align: left; font-family: monospace; font-weight: bold; color: #b45309;">${s.totalDeliveryFees.toFixed(2)} ج</td>
        <td style="padding: 8px; text-align: left; font-family: monospace; font-weight: bold; color: #166534;">${s.totalCashCollected.toFixed(2)} ج</td>
        <td style="padding: 8px; text-align: left; font-family: monospace; font-weight: bold; color: #6b21a8;">${(s.totalVisaCollected + s.totalInstapayCollected).toFixed(2)} ج</td>
        <td style="padding: 8px; text-align: left; font-family: monospace; font-weight: 800; color: #0f172a;">${shiftSales.toFixed(2)} ج</td>
      </tr>
    `;
    })
    .join('');

  return `
    <div style="width: 794px; min-height: 1120px; padding: 36px 42px; background: #ffffff; color: #0f172a; font-family: system-ui, -apple-system, sans-serif; direction: rtl; box-sizing: border-box; position: relative;">
      
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 20px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="background: #0284c7; color: #ffffff; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold;">📊</div>
            <h1 style="font-size: 22px; font-weight: 800; margin: 0; color: #0f172a;">${pharmacy.name}</h1>
          </div>
          <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">
            العنوان: ${pharmacy.address} · الصيدلي المسئول: ${pharmacy.pharmacistName}
          </p>
        </div>

        <div style="text-align: left;">
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 8px 14px; border-radius: 10px; display: inline-block;">
            <span style="font-size: 11px; color: #0284c7; font-weight: bold; display: block;">سجل مالي مجمع</span>
            <span style="font-size: 14px; font-weight: 800; color: #0369a1;">شفتات منتهية (${summaries.length})</span>
          </div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">
            تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}
          </div>
        </div>
      </div>

      <!-- Title -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 18px; margin-bottom: 20px;">
        <h2 style="font-size: 16px; font-weight: 800; margin: 0; color: #1e293b;">
          السجل المالي المجمع لجميع شفتات المناديب المنتهية
        </h2>
        <p style="font-size: 11px; color: #64748b; margin: 3px 0 0 0;">
          حسابات تسليم الخزينة، أرباح المناديب، ومبيعات الأوردرات
        </p>
      </div>

      <!-- Summary KPIs -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 22px;">
        <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px; text-align: center;">
          <span style="font-size: 10px; color: #475569; font-weight: bold; display: block;">إجمالي الأوردرات</span>
          <span style="font-size: 18px; font-weight: 800; color: #0f172a; font-family: monospace;">${totalOrders} أوردر</span>
        </div>

        <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 10px; padding: 10px; text-align: center;">
          <span style="font-size: 10px; color: #92400e; font-weight: bold; display: block;">أرباح المناديب (الحصالة)</span>
          <span style="font-size: 18px; font-weight: 800; color: #78350f; font-family: monospace;">${totalCourierEarnings.toFixed(2)} ج</span>
        </div>

        <div style="background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 10px; padding: 10px; text-align: center;">
          <span style="font-size: 10px; color: #166534; font-weight: bold; display: block;">إجمالي الكاش المحصل</span>
          <span style="font-size: 18px; font-weight: 800; color: #14532d; font-family: monospace;">${totalCash.toFixed(2)} ج</span>
        </div>

        <div style="background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 10px; padding: 10px; text-align: center;">
          <span style="font-size: 10px; color: #075985; font-weight: bold; display: block;">إجمالي المبيعات</span>
          <span style="font-size: 18px; font-weight: 800; color: #0c4a6e; font-family: monospace;">${totalSales.toFixed(2)} ج</span>
        </div>
      </div>

      <!-- Ledger Table -->
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
        <thead>
          <tr style="background: #f1f5f9; color: #334155; font-size: 10px; font-weight: 800; border-bottom: 2px solid #cbd5e1;">
            <th style="padding: 8px; text-align: center; width: 32px;">م</th>
            <th style="padding: 8px; text-align: right;">اسم المندوب</th>
            <th style="padding: 8px; text-align: center;">تاريخ الشيفت</th>
            <th style="padding: 8px; text-align: center;">الأوردرات</th>
            <th style="padding: 8px; text-align: left;">عمولة المندوب</th>
            <th style="padding: 8px; text-align: left;">كاش محصل</th>
            <th style="padding: 8px; text-align: left;">إلكتروني</th>
            <th style="padding: 8px; text-align: left;">إجمالي المبيعات</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="8" style="text-align: center; padding: 12px; color: #94a3b8;">لا توجد شفتات</td></tr>'}
        </tbody>
        <tfoot>
          <tr style="background: #f8fafc; font-weight: bold; font-size: 11px; border-top: 2px solid #cbd5e1;">
            <td colspan="3" style="padding: 9px; text-align: right; color: #334155;">الإجماليات الكلية:</td>
            <td style="padding: 9px; text-align: center; font-family: monospace;">${totalOrders}</td>
            <td style="padding: 9px; text-align: left; font-family: monospace; color: #b45309;">${totalCourierEarnings.toFixed(2)} ج</td>
            <td style="padding: 9px; text-align: left; font-family: monospace; color: #166534;">${totalCash.toFixed(2)} ج</td>
            <td style="padding: 9px; text-align: left; font-family: monospace; color: #6b21a8;">${(totalVisa + totalInstapay).toFixed(2)} ج</td>
            <td style="padding: 9px; text-align: left; font-family: monospace; color: #0f172a;">${totalSales.toFixed(2)} ج</td>
          </tr>
        </tfoot>
      </table>

      <!-- Signatures -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 40px; padding-top: 18px; border-top: 1px solid #e2e8f0; font-size: 11px; text-align: center;">
        <div>
          <span style="font-weight: bold; color: #475569; display: block; margin-bottom: 35px;">اعتماد الصيدلي المسئول / مدير الفرع:</span>
          <div style="border-bottom: 1px dotted #94a3b8; width: 160px; margin: 0 auto 4px auto;"></div>
          <span style="font-size: 10px; color: #64748b;">د. ${pharmacy.pharmacistName}</span>
        </div>

        <div>
          <span style="font-weight: bold; color: #475569; display: block; margin-bottom: 12px;">خاتم الصيدلية الرسمي:</span>
          <div style="width: 80px; height: 50px; border: 1.5px dashed #94a3b8; border-radius: 8px; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #94a3b8;">
            مكان الخاتم
          </div>
        </div>
      </div>

      <div style="margin-top: 24px; text-align: center; font-size: 9px; color: #94a3b8;">
        تم استخراج هذا التقرير آلياً عبر منظومة «فارما ديليفري» السحابية.
      </div>
    </div>
  `;
}

/**
 * Helper to mount an offscreen node, take a screenshot via html2canvas, and build jsPDF
 */
async function htmlToPdf(htmlString: string, fileName: string): Promise<jsPDF> {
  // Create temporary container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '-9999px';
  container.style.zIndex = '-9999';
  container.style.width = '794px';
  container.style.backgroundColor = '#ffffff';
  container.innerHTML = htmlString;

  document.body.appendChild(container);

  try {
    // Wait briefly for CSS and layout reflow
    await new Promise((r) => setTimeout(r, 150));

    const canvas = await html2canvas(container, {
      scale: 2, // 300 DPI high resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210;
    const pdfHeight = 297;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfHeight;

    // If multi-page
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(fileName);
    return pdf;
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Export single shift summary to PDF
 */
export async function exportShiftSummaryToPdf(
  summary: ShiftSummaryArchive,
  pharmacy: Pharmacy
): Promise<jsPDF> {
  const safeDate = (summary.shiftDate || 'شيفت').replace(/[/\\?%*:|"<>]/g, '-');
  const safeCourier = (summary.courierName || 'المندوب').replace(/[/\\?%*:|"<>]/g, '_');
  const fileName = `تقرير_شيفت_${safeCourier}_${safeDate}.pdf`;

  const html = buildSingleShiftHtml(summary, pharmacy);
  return await htmlToPdf(html, fileName);
}

/**
 * Export consolidated multi-shifts summary to PDF
 */
export async function exportConsolidatedShiftsToPdf(
  summaries: ShiftSummaryArchive[],
  pharmacy: Pharmacy
): Promise<jsPDF> {
  const dateStr = new Date().toLocaleDateString('ar-EG').replace(/[/\\?%*:|"<>]/g, '-');
  const safePharma = pharmacy.name.replace(/[/\\?%*:|"<>]/g, '_');
  const fileName = `سجل_شفتات_${safePharma}_${dateStr}.pdf`;

  const html = buildConsolidatedShiftsHtml(summaries, pharmacy);
  return await htmlToPdf(html, fileName);
}

/**
 * Print Shift Summary directly using a hidden iframe
 */
export function printShiftSummaryDocument(
  summary: ShiftSummaryArchive,
  pharmacy: Pharmacy
) {
  const html = buildSingleShiftHtml(summary, pharmacy);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(`
    <!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>طباعة ملخص شيفت - ${summary.courierName}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 2000);
  }, 300);
}
