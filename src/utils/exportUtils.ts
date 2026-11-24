import { FarmDataStore } from '../types/farm';
import { DEFAULT_STOCK_ITEMS, STOCK_CATEGORY_META } from './stockUtils';
import { generateAcreSubPlots } from './acreUtils';

function escapeHtml(str: string | number | undefined | null): string {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeCsvCell(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * 1) Export Complete Farm Data as Microsoft Excel (.xls) UTF-8 HTML Workbook
 * Opens natively in MS Excel, LibreOffice Calc, and Google Sheets with full Hindi font support,
 * colored table headers, currency formatting, and all 6 farm ledgers.
 */
export function exportFarmDataToExcel(store: FarmDataStore): void {
  const stockItems =
    store.stockItems && store.stockItems.length > 0
      ? store.stockItems
      : DEFAULT_STOCK_ITEMS;
  const stockMovements = store.stockMovements || [];

  const totalMachinery = store.machineryRecords.reduce((a, b) => a + b.totalAmount, 0);
  const totalLabour = store.labourRecords.reduce((a, b) => a + b.totalAmount, 0);
  const totalMaterials = store.materialRecords.reduce((a, b) => a + b.totalAmount, 0);
  const totalExpense = totalMachinery + totalLabour + totalMaterials;

  const totalCredit = store.aadtiRecords
    .filter((r) => r.type === 'credit')
    .reduce((a, b) => a + b.amount, 0);
  const totalDebit = store.aadtiRecords
    .filter((r) => r.type === 'debit')
    .reduce((a, b) => a + b.amount, 0);

  const totalStockValue = stockItems.reduce(
    (sum, it) => sum + Math.round(it.currentStock * it.ratePerUnit),
    0
  );

  // Flatten all acres across plots
  const allAcres = store.plots.flatMap((plot) => {
    const subs =
      plot.subPlots && plot.subPlots.length > 0
        ? plot.subPlots
        : generateAcreSubPlots(
            plot.id,
            plot.name,
            plot.acres,
            plot.coordinates?.lat,
            plot.coordinates?.lng,
            plot.crop,
            plot.boundaries
          );
    return subs.map((sp) => ({
      plotName: plot.name,
      acreNumber: sp.acreNumber,
      acreName: sp.name,
      status: sp.acreStatus || 'Empty',
      crop: sp.cropName || 'खाली/गीला',
      sowingMethod: sp.sowingMethod || '-',
      sowingDate: sp.sowingDate || '-',
      machineryCost: sp.machineryExpense || 0,
      labourCost: sp.labourExpense || 0,
      materialCost: sp.materialExpense || 0,
      totalCost:
        (sp.machineryExpense || 0) +
        (sp.labourExpense || 0) +
        (sp.materialExpense || 0),
      entriesSummary: (sp.expenseEntries || [])
        .map(
          (e) =>
            `${e.machineryOrJob} (${e.workerName}: ₹${e.totalAmount}${
              e.reasonNote ? ` - ${e.reasonNote}` : ''
            })`
        )
        .join(' | '),
    }));
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const htmlWorkbook = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Naren Farm Ledger</x:Name>
          <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #0f172a; }
    h1 { font-size: 18px; font-weight: bold; color: #065f46; margin-bottom: 4px; }
    h2 { font-size: 14px; font-weight: bold; color: #1e293b; background: #e2e8f0; padding: 6px; margin-top: 18px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
    th { background-color: #065f46; color: #ffffff; font-weight: bold; padding: 7px 10px; border: 1px solid #94a3b8; text-align: left; }
    td { padding: 6px 10px; border: 1px solid #cbd5e1; vertical-align: top; }
    .num { text-align: right; font-weight: bold; }
    .total-row td { background-color: #fef3c7; font-weight: bold; }
  </style>
</head>
<body>
  <h1>🌾 ${escapeHtml(store.farmSettings.farmName)} — संपूर्ण कृषि हिसाब-किताब व गोदाम स्टॉक रिपोर्ट (Excel)</h1>
  <p><b>किसान / मालिक:</b> ${escapeHtml(store.farmSettings.ownerName)} | <b>स्थान:</b> ${escapeHtml(store.farmSettings.location)} | <b>रिपोर्ट तारीख:</b> ${todayStr}</p>

  <h2>1. 📊 कुल वित्तीय सारांश (Financial & Stock Summary)</h2>
  <table>
    <thead>
      <tr>
        <th>विवरण (Head)</th>
        <th>राशि (₹ / Value)</th>
        <th>नोट्स</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>🚜 कुल ट्रैक्टर व मशीनरी खर्च</td><td class="num">₹${totalMachinery.toLocaleString('en-IN')}</td><td>कुल ${store.machineryRecords.length} एंट्री</td></tr>
      <tr><td>🖐️ कुल छींटा (Broadcasting), स्प्रे व मजदूरी खर्च</td><td class="num">₹${totalLabour.toLocaleString('en-IN')}</td><td>कुल ${store.labourRecords.length} एंट्री</td></tr>
      <tr><td>🧪 कुल खाद, बीज व स्प्रे केमिकल खरीद खर्च</td><td class="num">₹${totalMaterials.toLocaleString('en-IN')}</td><td>कुल ${store.materialRecords.length} एंट्री</td></tr>
      <tr class="total-row"><td>💰 कुल सीजन खेती खर्च (Total Farm Expense)</td><td class="num">₹${totalExpense.toLocaleString('en-IN')}</td><td>बिना डबल-काउंटिंग शुद्ध खर्च</td></tr>
      <tr><td>🏪 मंडी फसल बिक्री कुल आमदनी (Credit)</td><td class="num">₹${totalCredit.toLocaleString('en-IN')}</td><td>आढ़ती उधार/एडवांस: ₹${totalDebit.toLocaleString('en-IN')}</td></tr>
      <tr><td>📦 गोदाम में बचे स्टॉक की कुल कीमत (Current Stock Value)</td><td class="num">₹${totalStockValue.toLocaleString('en-IN')}</td><td>कुल ${stockItems.length} स्टॉक आइटम</td></tr>
    </tbody>
  </table>

  <h2>2. 🌾 प्रति-एकड़ स्थिति व खर्च ब्यौरा (Per-Acre Status & Cost Diagnostic)</h2>
  <table>
    <thead>
      <tr>
        <th>खेत (Plot)</th>
        <th>एकड़ #</th>
        <th>स्थिति (Status)</th>
        <th>फसल (Crop)</th>
        <th>बिजाई तरीका</th>
        <th>बिजाई तारीख</th>
        <th>मशीनरी (₹)</th>
        <th>लेबर/छींटा/स्प्रे (₹)</th>
        <th>खाद/बीज/दवाई (₹)</th>
        <th>कुल एकड़ खर्च (₹)</th>
        <th>किए गए काम व कारण (Details & Reasons)</th>
      </tr>
    </thead>
    <tbody>
      ${allAcres
        .map(
          (ac) => `<tr>
        <td>${escapeHtml(ac.plotName)}</td>
        <td>एकड़ #${escapeHtml(ac.acreNumber)}</td>
        <td>${escapeHtml(ac.status)}</td>
        <td>${escapeHtml(ac.crop)}</td>
        <td>${escapeHtml(ac.sowingMethod)}</td>
        <td>${escapeHtml(ac.sowingDate)}</td>
        <td class="num">₹${ac.machineryCost.toLocaleString('en-IN')}</td>
        <td class="num">₹${ac.labourCost.toLocaleString('en-IN')}</td>
        <td class="num">₹${ac.materialCost.toLocaleString('en-IN')}</td>
        <td class="num">₹${ac.totalCost.toLocaleString('en-IN')}</td>
        <td>${escapeHtml(ac.entriesSummary || 'कोई खर्च दर्ज नहीं')}</td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <h2>3. 📦 गोदाम स्टॉक रजिस्टर (Godown Stock Inventory - Khad, Beej, Spray, Grain)</h2>
  <table>
    <thead>
      <tr>
        <th>विभाग (Category)</th>
        <th>आइटम का नाम (Item Name)</th>
        <th>पैकेजिंग (Unit)</th>
        <th>कुल आया/खरीदा (+)</th>
        <th>खेत में लगा (-)</th>
        <th>मंडी में बेचा (-)</th>
        <th>गोदाम में बचा स्टॉक</th>
        <th>दर (₹/Unit)</th>
        <th>कुल बची कीमत (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${stockItems
        .map(
          (it) => `<tr>
        <td>${escapeHtml(STOCK_CATEGORY_META[it.category]?.shortHi || it.category)}</td>
        <td>${escapeHtml(it.name)}</td>
        <td>${escapeHtml(it.unitLabelHi)}</td>
        <td class="num">${it.totalPurchasedOrHarvested}</td>
        <td class="num">${it.totalUsedInFarm}</td>
        <td class="num">${it.totalSold}</td>
        <td class="num">${it.currentStock} ${escapeHtml(it.unitLabelHi)}</td>
        <td class="num">₹${it.ratePerUnit.toLocaleString('en-IN')}</td>
        <td class="num">₹${Math.round(it.currentStock * it.ratePerUnit).toLocaleString('en-IN')}</td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <h2>4. 🚜 ट्रैक्टर व मशीनरी खाता (Machinery & Tractor Ledger)</h2>
  <table>
    <thead>
      <tr>
        <th>तारीख (Date)</th>
        <th>समय</th>
        <th>काम / मशीन (Activity)</th>
        <th>ड्राइवर / मालिक</th>
        <th>खेत / एकड़</th>
        <th>एकड़ संख्या</th>
        <th>रेट (₹/एकड़)</th>
        <th>कुल राशि (₹)</th>
        <th>भुगतान स्थिति</th>
        <th>नोट्स / प्रयुक्त स्टॉक</th>
      </tr>
    </thead>
    <tbody>
      ${store.machineryRecords
        .map(
          (m) => `<tr>
        <td>${escapeHtml(m.date)}</td>
        <td>${escapeHtml(m.workTimeSlot || '-')}</td>
        <td>${escapeHtml(m.activity)}</td>
        <td>${escapeHtml(m.driverName)}</td>
        <td>${escapeHtml(m.plotName)}</td>
        <td class="num">${m.acres}</td>
        <td class="num">₹${m.ratePerUnit.toLocaleString('en-IN')}</td>
        <td class="num">₹${m.totalAmount.toLocaleString('en-IN')}</td>
        <td>${m.isPaid ? 'नकद दे दिया (Paid)' : 'बाकी (Unpaid)'}</td>
        <td>${escapeHtml(m.notes || '-')}</td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <h2>5. 🖐️ छींटा (Broadcasting), फोलियर स्प्रे व मजदूरी खाता (Labour, Spray & Foliar Ledger)</h2>
  <table>
    <thead>
      <tr>
        <th>तारीख (Date)</th>
        <th>समय</th>
        <th>कार्य प्रकार (Spray / Broadcasting / Labour)</th>
        <th>मजदूर / टोली का नाम</th>
        <th>खेत / एकड़</th>
        <th>दर प्रकार</th>
        <th>दर (₹)</th>
        <th>कुल राशि (₹)</th>
        <th>भुगतान स्थिति</th>
        <th>प्रयुक्त दवाई/खाद व नोट्स</th>
      </tr>
    </thead>
    <tbody>
      ${store.labourRecords
        .map(
          (l) => `<tr>
        <td>${escapeHtml(l.date)}</td>
        <td>${escapeHtml(l.workTimeSlot || '-')}</td>
        <td>${escapeHtml(l.activity)}</td>
        <td>${escapeHtml(l.mateName)}</td>
        <td>${escapeHtml(l.plotName)}</td>
        <td>${escapeHtml(l.rateType)}</td>
        <td class="num">₹${l.ratePerWorkerOrAcre.toLocaleString('en-IN')}</td>
        <td class="num">₹${l.totalAmount.toLocaleString('en-IN')}</td>
        <td>${l.isPaid ? 'दे दिया (Paid)' : 'बाकी (Unpaid)'}</td>
        <td>${escapeHtml(l.notes || '-')}</td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <h2>6. 🧪 खाद, बीज व स्प्रे दवाई खरीद खाता (Materials Purchase Ledger)</h2>
  <table>
    <thead>
      <tr>
        <th>तारीख (Date)</th>
        <th>सामान का नाम (Item)</th>
        <th>श्रेणी</th>
        <th>दुकान / विक्रेता</th>
        <th>मात्रा</th>
        <th>इकाई</th>
        <th>दर (₹)</th>
        <th>कुल राशि (₹)</th>
        <th>नोट्स</th>
      </tr>
    </thead>
    <tbody>
      ${store.materialRecords
        .map(
          (mat) => `<tr>
        <td>${escapeHtml(mat.date)}</td>
        <td>${escapeHtml(mat.itemName)}</td>
        <td>${escapeHtml(mat.type)}</td>
        <td>${escapeHtml(mat.vendor)}</td>
        <td class="num">${mat.quantity}</td>
        <td>${escapeHtml(mat.unit)}</td>
        <td class="num">₹${mat.ratePerUnit.toLocaleString('en-IN')}</td>
        <td class="num">₹${mat.totalAmount.toLocaleString('en-IN')}</td>
        <td>${escapeHtml(mat.notes || '-')}</td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <h2>7. 🏪 मंडी आढ़ती खाता व फसल बिक्री (Mandi Aadti Passbook)</h2>
  <table>
    <thead>
      <tr>
        <th>तारीख</th>
        <th>आढ़ती फर्म</th>
        <th>प्रकार</th>
        <th>विवरण</th>
        <th>राशि (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${store.aadtiRecords
        .map(
          (a) => `<tr>
        <td>${escapeHtml(a.date)}</td>
        <td>${escapeHtml(a.aadtiName)}</td>
        <td>${a.type === 'credit' ? 'फसल बिक्री जमा (+)' : 'उधार/नकद लिया (-)'}</td>
        <td>${escapeHtml(a.description)}</td>
        <td class="num">${a.type === 'credit' ? '+' : '-'}₹${a.amount.toLocaleString('en-IN')}</td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <h2>8. 🔄 गोदाम स्टॉक आवक-जावक इतिहास (Stock Movements Log)</h2>
  <table>
    <thead>
      <tr>
        <th>तारीख</th>
        <th>आइटम</th>
        <th>आवक / जावक प्रकार</th>
        <th>मात्रा</th>
        <th>खेत / एकड़ / पार्टी</th>
        <th>कारण / नोट</th>
        <th>कुल मूल्य (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${stockMovements
        .map(
          (mv) => `<tr>
        <td>${escapeHtml(mv.date)}</td>
        <td>${escapeHtml(mv.itemName)}</td>
        <td>${
          mv.movementType === 'use_in_acre'
            ? 'खेत में इस्तेमाल (-)'
            : mv.movementType === 'sell_out'
            ? 'मंडी बिक्री (-)'
            : 'गोदाम आवक/खरीद (+)'
        }</td>
        <td class="num">${
          mv.movementType === 'use_in_acre' || mv.movementType === 'sell_out'
            ? '-'
            : '+'
        }${mv.quantity} ${escapeHtml(mv.unitLabelHi)}</td>
        <td>${escapeHtml(
          mv.acreNumber ? `एकड़ #${mv.acreNumber}` : mv.partyName || '-'
        )}</td>
        <td>${escapeHtml(mv.reasonOrNote || '-')}</td>
        <td class="num">₹${mv.totalValue.toLocaleString('en-IN')}</td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>
</body>
</html>`;

  const blob = new Blob(['\uFEFF', htmlWorkbook], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Naren_Farm_Complete_Hisab_${todayStr}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 2) Export Universal UTF-8 CSV (with BOM) for Google Sheets / Mobile Excel Apps
 */
export function exportFarmDataToCSV(store: FarmDataStore): void {
  const stockItems =
    store.stockItems && store.stockItems.length > 0
      ? store.stockItems
      : DEFAULT_STOCK_ITEMS;
  const rows: string[][] = [];

  rows.push([
    'Naren Farm Tracker - Complete CSV Export',
    store.farmSettings.farmName,
    new Date().toISOString().split('T')[0],
  ]);
  rows.push([]);

  rows.push(['--- 1. GODOWN STOCK (गोदाम स्टॉक) ---']);
  rows.push([
    'Category',
    'Item Name',
    'Unit',
    'Total In (+)',
    'Used in Farm (-)',
    'Sold (-)',
    'Current Stock',
    'Rate (Rs)',
    'Total Value (Rs)',
  ]);
  stockItems.forEach((it) => {
    rows.push([
      it.category,
      it.name,
      it.unitLabelHi,
      String(it.totalPurchasedOrHarvested),
      String(it.totalUsedInFarm),
      String(it.totalSold),
      String(it.currentStock),
      String(it.ratePerUnit),
      String(Math.round(it.currentStock * it.ratePerUnit)),
    ]);
  });
  rows.push([]);

  rows.push(['--- 2. MACHINERY LEDGER (ट्रैक्टर व मशीनरी खर्च) ---']);
  rows.push([
    'Date',
    'Time Slot',
    'Activity',
    'Driver/Owner',
    'Plot/Acre',
    'Acres',
    'Rate',
    'Total Amount (Rs)',
    'Paid Status',
    'Notes',
  ]);
  store.machineryRecords.forEach((m) => {
    rows.push([
      m.date,
      m.workTimeSlot || '',
      m.activity,
      m.driverName,
      m.plotName,
      String(m.acres),
      String(m.ratePerUnit),
      String(m.totalAmount),
      m.isPaid ? 'Paid' : 'Unpaid',
      m.notes || '',
    ]);
  });
  rows.push([]);

  rows.push([
    '--- 3. LABOUR, SPRAY & BROADCASTING LEDGER (छींटा, स्प्रे व मजदूरी) ---',
  ]);
  rows.push([
    'Date',
    'Time Slot',
    'Activity',
    'Worker/Mate',
    'Plot/Acre',
    'Rate Type',
    'Rate',
    'Total Amount (Rs)',
    'Paid Status',
    'Notes',
  ]);
  store.labourRecords.forEach((l) => {
    rows.push([
      l.date,
      l.workTimeSlot || '',
      l.activity,
      l.mateName,
      l.plotName,
      l.rateType,
      String(l.ratePerWorkerOrAcre),
      String(l.totalAmount),
      l.isPaid ? 'Paid' : 'Unpaid',
      l.notes || '',
    ]);
  });
  rows.push([]);

  rows.push(['--- 4. MATERIALS PURCHASE (खाद, बीज व स्प्रे खरीद) ---']);
  rows.push([
    'Date',
    'Item Name',
    'Type',
    'Vendor',
    'Quantity',
    'Unit',
    'Rate',
    'Total Amount (Rs)',
    'Notes',
  ]);
  store.materialRecords.forEach((mat) => {
    rows.push([
      mat.date,
      mat.itemName,
      mat.type,
      mat.vendor,
      String(mat.quantity),
      mat.unit,
      String(mat.ratePerUnit),
      String(mat.totalAmount),
      mat.notes || '',
    ]);
  });

  const csvString = rows
    .map((r) => r.map((cell) => escapeCsvCell(cell)).join(','))
    .join('\r\n');

  const todayStr = new Date().toISOString().split('T')[0];
  const blob = new Blob(['\uFEFF', csvString], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Naren_Farm_Data_${todayStr}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 3) Export / Print Complete Farm Report as PDF
 * Injects a dedicated `#naren-pdf-print-portal` with `@media print` rules so calling this from ANY tab
 * prints a clean, multi-page A4 PDF report without needing `window.open`.
 */
export function exportFarmDataToPDF(store: FarmDataStore): void {
  const existingPortal = document.getElementById('naren-pdf-print-portal');
  if (existingPortal) {
    existingPortal.remove();
  }
  const existingStyle = document.getElementById('naren-pdf-print-style');
  if (existingStyle) {
    existingStyle.remove();
  }

  const stockItems =
    store.stockItems && store.stockItems.length > 0
      ? store.stockItems
      : DEFAULT_STOCK_ITEMS;

  const totalMachinery = store.machineryRecords.reduce((a, b) => a + b.totalAmount, 0);
  const totalLabour = store.labourRecords.reduce((a, b) => a + b.totalAmount, 0);
  const totalMaterials = store.materialRecords.reduce((a, b) => a + b.totalAmount, 0);
  const totalExpense = totalMachinery + totalLabour + totalMaterials;
  const totalStockValue = stockItems.reduce(
    (sum, it) => sum + Math.round(it.currentStock * it.ratePerUnit),
    0
  );
  const todayStr = new Date().toISOString().split('T')[0];

  const allAcres = store.plots.flatMap((plot) => {
    const subs =
      plot.subPlots && plot.subPlots.length > 0
        ? plot.subPlots
        : generateAcreSubPlots(
            plot.id,
            plot.name,
            plot.acres,
            plot.coordinates?.lat,
            plot.coordinates?.lng,
            plot.crop,
            plot.boundaries
          );
    return subs.map((sp) => ({
      plotName: plot.name,
      acreNumber: sp.acreNumber,
      status: sp.acreStatus || 'Empty',
      crop: sp.cropName || 'खाली/गीला',
      sowingMethod: sp.sowingMethod || '-',
      machineryCost: sp.machineryExpense || 0,
      labourCost: sp.labourExpense || 0,
      materialCost: sp.materialExpense || 0,
      totalCost:
        (sp.machineryExpense || 0) +
        (sp.labourExpense || 0) +
        (sp.materialExpense || 0),
    }));
  });

  const styleEl = document.createElement('style');
  styleEl.id = 'naren-pdf-print-style';
  styleEl.innerHTML = `
    #naren-pdf-print-portal {
      display: none;
    }
    @media print {
      body > *:not(#naren-pdf-print-portal) {
        display: none !important;
      }
      #naren-pdf-print-portal {
        display: block !important;
        padding: 16px;
        font-family: 'Segoe UI', Arial, sans-serif;
        color: #0f172a;
        background: #ffffff;
      }
      #naren-pdf-print-portal h1 {
        font-size: 20px;
        margin: 0 0 6px 0;
        color: #065f46;
      }
      #naren-pdf-print-portal h2 {
        font-size: 14px;
        margin: 16px 0 6px 0;
        padding: 5px 8px;
        background: #f1f5f9;
        border-left: 4px solid #059669;
      }
      #naren-pdf-print-portal table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
        margin-bottom: 12px;
      }
      #naren-pdf-print-portal th, #naren-pdf-print-portal td {
        border: 1px solid #cbd5e1;
        padding: 5px 7px;
        text-align: left;
      }
      #naren-pdf-print-portal th {
        background: #ecfdf5;
        font-weight: bold;
      }
      #naren-pdf-print-portal .num {
        text-align: right;
        font-weight: bold;
      }
      #naren-pdf-print-portal .kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-bottom: 14px;
      }
      #naren-pdf-print-portal .kpi-box {
        border: 1px solid #94a3b8;
        border-radius: 6px;
        padding: 8px;
      }
    }
  `;
  document.head.appendChild(styleEl);

  const portalEl = document.createElement('div');
  portalEl.id = 'naren-pdf-print-portal';
  portalEl.innerHTML = `
    <h1>🌾 ${escapeHtml(store.farmSettings.farmName)} — आधिकारिक पीडीएफ रिपोर्ट (PDF Farm Ledger)</h1>
    <p style="font-size:12px; margin-bottom:12px;">
      <b>किसान:</b> ${escapeHtml(store.farmSettings.ownerName)} &nbsp;|&nbsp;
      <b>स्थान:</b> ${escapeHtml(store.farmSettings.location)} &nbsp;|&nbsp;
      <b>तारीख:</b> ${todayStr}
    </p>

    <div class="kpi-grid">
      <div class="kpi-box">
        <div style="font-size:10px; color:#475569;">कुल सीजन खर्च</div>
        <div style="font-size:16px; font-weight:bold;">₹${totalExpense.toLocaleString('en-IN')}</div>
      </div>
      <div class="kpi-box">
        <div style="font-size:10px; color:#475569;">मशीनरी व ट्रैक्टर</div>
        <div style="font-size:16px; font-weight:bold;">₹${totalMachinery.toLocaleString('en-IN')}</div>
      </div>
      <div class="kpi-box">
        <div style="font-size:10px; color:#475569;">छींटा, स्प्रे व लेबर</div>
        <div style="font-size:16px; font-weight:bold;">₹${totalLabour.toLocaleString('en-IN')}</div>
      </div>
      <div class="kpi-box">
        <div style="font-size:10px; color:#475569;">गोदाम बचा स्टॉक</div>
        <div style="font-size:16px; font-weight:bold;">₹${totalStockValue.toLocaleString('en-IN')}</div>
      </div>
    </div>

    <h2>1. 🌾 प्रति-एकड़ स्थिति व खर्च सारांश (Per-Acre Summary)</h2>
    <table>
      <thead>
        <tr>
          <th>एकड़ #</th>
          <th>स्थिति</th>
          <th>फसल</th>
          <th>बिजाई विधि</th>
          <th>मशीनरी (₹)</th>
          <th>स्प्रे/छींटा/लेबर (₹)</th>
          <th>खाद/बीज/दवाई (₹)</th>
          <th>कुल खर्च (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${allAcres
          .map(
            (ac) => `<tr>
          <td>एकड़ #${escapeHtml(ac.acreNumber)}</td>
          <td>${escapeHtml(ac.status)}</td>
          <td>${escapeHtml(ac.crop)}</td>
          <td>${escapeHtml(ac.sowingMethod)}</td>
          <td class="num">₹${ac.machineryCost.toLocaleString('en-IN')}</td>
          <td class="num">₹${ac.labourCost.toLocaleString('en-IN')}</td>
          <td class="num">₹${ac.materialCost.toLocaleString('en-IN')}</td>
          <td class="num">₹${ac.totalCost.toLocaleString('en-IN')}</td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>

    <h2>2. 📦 गोदाम स्टॉक विवरण (Godown Stock Inventory)</h2>
    <table>
      <thead>
        <tr>
          <th>आइटम का नाम</th>
          <th>इकाई</th>
          <th>कुल आया (+)</th>
          <th>खेत में लगा (-)</th>
          <th>बेचा (-)</th>
          <th>बचा स्टॉक</th>
          <th>कुल कीमत (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${stockItems
          .map(
            (it) => `<tr>
          <td>${escapeHtml(it.name)}</td>
          <td>${escapeHtml(it.unitLabelHi)}</td>
          <td class="num">${it.totalPurchasedOrHarvested}</td>
          <td class="num">${it.totalUsedInFarm}</td>
          <td class="num">${it.totalSold}</td>
          <td class="num">${it.currentStock} ${escapeHtml(it.unitLabelHi)}</td>
          <td class="num">₹${Math.round(it.currentStock * it.ratePerUnit).toLocaleString('en-IN')}</td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>

    <h2>3. 🚜 ट्रैक्टर, मशीनरी, स्प्रे व छींटा खर्च रजिस्टर (Recent Operations & Expenses)</h2>
    <table>
      <thead>
        <tr>
          <th>तारीख</th>
          <th>श्रेणी</th>
          <th>काम / गतिविधि</th>
          <th>किसने किया / पार्टी</th>
          <th>खेत / एकड़</th>
          <th>राशि (₹)</th>
          <th>नोट्स / प्रयुक्त स्टॉक</th>
        </tr>
      </thead>
      <tbody>
        ${store.machineryRecords
          .map(
            (m) => `<tr>
          <td>${escapeHtml(m.date)}</td>
          <td>मशीनरी</td>
          <td>${escapeHtml(m.activity)}</td>
          <td>${escapeHtml(m.driverName)}</td>
          <td>${escapeHtml(m.plotName)}</td>
          <td class="num">₹${m.totalAmount.toLocaleString('en-IN')}</td>
          <td>${escapeHtml(m.notes || '-')}</td>
        </tr>`
          )
          .join('')}
        ${store.labourRecords
          .map(
            (l) => `<tr>
          <td>${escapeHtml(l.date)}</td>
          <td>छींटा / स्प्रे / लेबर</td>
          <td>${escapeHtml(l.activity)}</td>
          <td>${escapeHtml(l.mateName)}</td>
          <td>${escapeHtml(l.plotName)}</td>
          <td class="num">₹${l.totalAmount.toLocaleString('en-IN')}</td>
          <td>${escapeHtml(l.notes || '-')}</td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>
  `;

  document.body.appendChild(portalEl);
  setTimeout(() => {
    window.print();
  }, 80);
}
