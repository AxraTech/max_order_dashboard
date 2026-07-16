import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  Row, Col, Card, Typography, Table, Tag, Select, DatePicker,
  Button, Spin, Space, Tabs, Statistic, message
} from 'antd';
import {
  ReloadOutlined, CalendarOutlined, FileTextOutlined,
  BarChartOutlined, DollarOutlined, ShoppingCartOutlined,
  StarOutlined, PercentageOutlined, DownloadOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../services/api';
import { CURRENCY } from '../../types/index';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx-js-style';

const { Title, Text } = Typography;

interface BranchInfo {
  id: string;
  code: string;
  name: string;
}

interface SalesRepInfo {
  id: string;
  code: string;
  user: { firstName: string; lastName: string };
}

interface CustomerInfo {
  id: string;
  code: string;
  name: string;
}

interface CategoryInfo {
  id: string;
  name: string;
}

export const Reports: React.FC = () => {
  const { user } = useAuthStore();

  // Scoping & Role checks
  const isBranchManager = user?.role?.name === 'BRANCH_MANAGER';
  const isCustomer = user?.role?.name === 'CUSTOMER';
  const isHQUser = user?.role?.name === 'SUPER_ADMIN' || user?.role?.name === 'HQ_MANAGER';

  // Filters State
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(29, 'days'),
    dayjs()
  ]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedRep, setSelectedRep] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Dropdown Lists State
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRepInfo[]>([]);
  const [customers, setCustomers] = useState<CustomerInfo[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [businessUnits, setBusinessUnits] = useState<any[]>([]);

  // Report Data States
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('daily');
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [systemSales, setSystemSales] = useState<any[]>([]);
  const [itemSales, setItemSales] = useState<any[]>([]);
  const [saleDetail, setSaleDetail] = useState<any[]>([]);
  const [kpiData, setKpiData] = useState<any[]>([]);
  // const [marketingData, setMarketingData] = useState<any>(null);

  // Fetch dropdown data on mount
  useEffect(() => {
    // If branch manager, lock branch
    if (isBranchManager && user?.branch?.id) {
      setSelectedBranch(user.branch.id);
    }

    api.get('/branches').then(res => {
      if (res.data.success) {
        setBranches(res.data.data.filter((b: any) => b.isActive));
      }
    }).catch(() => { });

    api.get('/sales-reps', { params: { limit: 200 } }).then(res => {
      if (res.data.success) setSalesReps(res.data.data);
    }).catch(() => { });

    api.get('/customers', { params: { limit: 200 } }).then(res => {
      if (res.data.success) setCustomers(res.data.data);
    }).catch(() => { });

    api.get('/products/categories').then(res => {
      if (res.data.success) setCategories(res.data.data);
    }).catch(() => { });

    api.get('/products/business-units').then(res => {
      if (res.data.success) setBusinessUnits(res.data.data);
    }).catch(() => { });
  }, [isBranchManager, user]);

  // Fetch report data based on active tab and filters
  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        dateFrom: dateRange?.[0]?.format('YYYY-MM-DD'),
        dateTo: dateRange?.[1]?.format('YYYY-MM-DD'),
        branchId: selectedBranch !== 'all' ? selectedBranch : undefined,
        salesRepId: selectedRep !== 'all' ? selectedRep : undefined,
        customerId: selectedCustomer !== 'all' ? selectedCustomer : undefined,
        categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
        businessUnitId: selectedBusinessUnit !== 'all' ? selectedBusinessUnit : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      };

      if (activeTab === 'daily') {
        const res = await api.get('/reports/daily-sales', { params });
        if (res.data.success) setDailySales(res.data.data);
      } else if (activeTab === 'system') {
        const res = await api.get('/reports/system-sales', { params });
        if (res.data.success) setSystemSales(res.data.data);
      } else if (activeTab === 'item') {
        const res = await api.get('/reports/item-sales', { params });
        if (res.data.success) setItemSales(res.data.data);
      } else if (activeTab === 'sale-detail') {
        const res = await api.get('/reports/sale-detail', { params });
        if (res.data.success) setSaleDetail(res.data.data);
      } else if (activeTab === 'kpi') {
        const res = await api.get('/reports/sales-rep-kpi', { params });
        if (res.data.success) setKpiData(res.data.data);
      }
      /*
      else if (activeTab === 'marketing') {
        const res = await api.get('/reports/marketing', { params });
        if (res.data.success) setMarketingData(res.data.data);
      }
      */
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [activeTab, dateRange, selectedBranch, selectedRep, selectedCustomer, selectedCategory, selectedBusinessUnit, selectedStatus]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Reset Filters
  const handleResetFilters = () => {
    setDateRange([dayjs().subtract(29, 'days'), dayjs()]);
    setSelectedBranch(isBranchManager && user?.branch?.id ? user.branch.id : 'all');
    setSelectedRep('all');
    setSelectedCustomer('all');
    setSelectedCategory('all');
    setSelectedBusinessUnit('all');
    setSelectedStatus('all');
  };

  // Format currency values for display/charts
  const formatValue = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `${(val / 100).toFixed(1)}K`;
    return val.toLocaleString();
  };

  // --- Dynamic KPIs Calculations ---

  const dailyKPIs = useMemo(() => {
    const totalRevenue = Math.round(dailySales.reduce((sum, item) => sum + item.totalAmount, 0));
    const totalOrders = dailySales.reduce((sum, item) => sum + item.orderCount, 0);
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const maxSales = dailySales.length > 0 ? Math.round(Math.max(...dailySales.map(item => item.totalAmount))) : 0;
    return { totalRevenue, totalOrders, avgOrderValue, maxSales };
  }, [dailySales]);

  const systemKPIs = useMemo(() => {
    const totalRevenue = Math.round(systemSales.reduce((sum, item) => sum + item.netSales, 0));
    const totalOrders = systemSales.length;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const cancelledCount = systemSales.filter(item => item.status === 'CANCELLED').length;
    return { totalRevenue, totalOrders, avgOrderValue, cancelledCount };
  }, [systemSales]);

  const itemKPIs = useMemo(() => {
    const totalQty = itemSales.reduce((sum, item) => sum + (item.salesQuantity || 0), 0);
    const totalRev = Math.round(itemSales.reduce((sum, item) => sum + (item.netSales || 0), 0));
    const distinctItems = new Set(itemSales.map(i => i.productCode)).size;
    const topItem = itemSales.length > 0 ? itemSales[0] : null;

    return { totalQty, totalRev, distinctItems, topItem };
  }, [itemSales]);

  // Order status breakdown data for System Sales tab chart
  const orderStatusPieData = useMemo(() => {
    const counts: Record<string, number> = {};
    systemSales.forEach(order => {
      counts[order.status] = (counts[order.status] || 0) + 1;
    });

    const colors: Record<string, string> = {
      'DRAFT': '#9CA3AF',
      'SUBMITTED': '#3B82F6',
      'BRANCH_REVIEW': '#8B5CF6',
      'PENDING': '#F59E0B',
      'APPROVED': '#10B981',
      'READY_FOR_DELIVERY': '#14B8A6',
      'INVOICED': '#06B6D4',
      'COMPLETED': '#6366F1',
      'CANCELLED': '#EF4444'
    };

    return Object.entries(counts).map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      value,
      color: colors[name] || '#cbd5e1'
    }));
  }, [systemSales]);

  // ─── Sale Detail Excel Export ───────────────────────────────────────────────
  /*
  const handleExportSaleDetail = () => {
    if (saleDetail.length === 0) { message.warning('No data to export'); return; }

    const branchName = selectedBranch === 'all'
      ? 'All Branches'
      : branches.find(b => b.id === selectedBranch)?.name || 'All Branches';

    // Dynamic company name reflecting the selected branch
    const companyName = `MEN Company (2026 -2027) New ( ${branchName} )`;
    const reportTitle = 'Sale Details Information By InvoiceDate AND Invoice ID';
    const fromDate = dateRange?.[0]?.format('DD/MM/YYYY') ?? '';
    const toDate = dateRange?.[1]?.format('DD/MM/YYYY') ?? '';
    const period = `From ${fromDate} To ${toDate}`;

    const COLS = ['No', 'Invoice ID', 'Invoice Date', 'Customer ID', 'Customer Name',
      'Stock ID', 'Stock Name', 'Cur:ID', 'Rate', 'Quantity', 'UM ID', 'Price',
      'Total Amount', 'Discount %', 'Discount', 'Net Price', 'Amount',
      'Commission', 'Expenses', 'Tax', 'NetAmount', 'Paid Amount',
      'Operator', 'Distribution', 'Staff', 'Warranty ID', 'Remark', 'Category'];

    // Build rows grouped by date → invoice with subtotals
    type WsRow = (string | number | null)[];
    const wsRows: WsRow[] = [];
    wsRows.push([companyName, ...Array(COLS.length - 1).fill(null)]);
    wsRows.push([reportTitle, ...Array(COLS.length - 1).fill(null)]);
    wsRows.push([period, ...Array(COLS.length - 1).fill(null)]);
    wsRows.push(COLS as WsRow);

    // Group rows by date then invoice
    const byDate: Record<string, Record<string, any[]>> = {};
    saleDetail.forEach((r: any) => {
      if (!byDate[r.invoiceDate]) byDate[r.invoiceDate] = {};
      if (!byDate[r.invoiceDate][r.invoiceId]) byDate[r.invoiceDate][r.invoiceId] = [];
      byDate[r.invoiceDate][r.invoiceId].push(r);
    });

    Object.entries(byDate).forEach(([date, byInv]) => {
      // Date header row
      const firstInvId = Object.keys(byInv)[0];
      wsRows.push([`${date}  ${firstInvId}`, ...Array(COLS.length - 1).fill(null)]);

      Object.entries(byInv).forEach(([_invId, lines]) => {
        lines.forEach((r: any) => {
          wsRows.push([r.no, r.invoiceId, r.invoiceDate, r.customerId, r.customerName,
          r.stockId, r.stockName, r.curId, r.rate, r.quantity, r.umId, r.price,
          r.totalAmount, r.discountPct, r.discount, r.netPrice, r.amount,
          r.commission, r.expenses, r.tax, r.netAmount, r.paidAmount,
          r.operator, r.distribution, r.staff, r.warrantyId, r.remark, r.category]);
        });

        // Invoice subtotal
        const subQty = lines.reduce((s: number, r: any) => s + r.quantity, 0);
        const subAmt = lines.reduce((s: number, r: any) => s + r.amount, 0);
        const subDisc = lines.reduce((s: number, r: any) => s + r.discount, 0);
        const subNet = lines.reduce((s: number, r: any) => s + r.netAmount, 0);
        wsRows.push([`Sub Total ( ${lines[0].invoiceId} )`,
          null, null, null, null, null, null, null, null, subQty, null, null,
          null, null, subDisc, null, subAmt, null, null, null, subNet, null,
          null, null, null, null, null, null]);
      });

      // Date subtotal
      const dateLines = Object.values(byInv).flat();
      const dQty = dateLines.reduce((s: number, r: any) => s + r.quantity, 0);
      const dAmt = dateLines.reduce((s: number, r: any) => s + r.amount, 0);
      const dDisc = dateLines.reduce((s: number, r: any) => s + r.discount, 0);
      const dNet = dateLines.reduce((s: number, r: any) => s + r.netAmount, 0);
      wsRows.push([`Sub Total ( ${date} )`,
        null, null, null, null, null, null, null, null, dQty, null, null,
        null, null, dDisc, null, dAmt, null, null, null, dNet, null,
        null, null, null, null, null, null]);
    });

    // Grand total row
    const gQty = saleDetail.reduce((s: number, r: any) => s + r.quantity, 0);
    const gAmt = saleDetail.reduce((s: number, r: any) => s + r.amount, 0);
    const gDisc = saleDetail.reduce((s: number, r: any) => s + r.discount, 0);
    const gNet = saleDetail.reduce((s: number, r: any) => s + r.netAmount, 0);
    wsRows.push(['Grand Total',
      null, null, null, null, null, null, null, null, gQty, null, null,
      null, null, gDisc, null, gAmt, null, null, null, gNet, null,
      null, null, null, null, null, null]);

    const ws = XLSX.utils.aoa_to_sheet(wsRows);

    // Column widths
    ws['!cols'] = [8, 14, 14, 14, 28, 20, 30, 8, 6, 10, 8, 14, 14, 12, 12, 14, 14,
      12, 12, 10, 14, 14, 12, 14, 20, 12, 16, 12].map(w => ({ wch: w }));

    // Merge title rows
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: COLS.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: COLS.length - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: COLS.length - 1 } },
    ];

    // Define alignment helper
    const centerAlign = { horizontal: 'center', vertical: 'center' };

    // Loop through all keys to style them beautifully
    Object.keys(ws).forEach(key => {
      if (key.startsWith('!')) return;
      const cell = ws[key];
      const rowNum = parseInt(key.replace(/^[A-Z]+/, ''), 10);

      if (rowNum === 1) {
        cell.s = {
          font: { bold: true, sz: 14, name: 'Calibri' },
          alignment: centerAlign
        };
      } else if (rowNum === 2) {
        cell.s = {
          font: { bold: true, sz: 12, name: 'Calibri' },
          alignment: centerAlign
        };
      } else if (rowNum === 3) {
        cell.s = {
          font: { sz: 10, italic: true, name: 'Calibri' },
          alignment: centerAlign
        };
      } else if (rowNum === 4) {
        // Headers row style
        cell.s = {
          font: { bold: true, sz: 10, name: 'Calibri' },
          alignment: centerAlign,
          fill: { fgColor: { rgb: 'EAEAEA' } },
          border: {
            top: { style: 'thin', color: { rgb: 'CCCCCC' } },
            bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
            left: { style: 'thin', color: { rgb: 'CCCCCC' } },
            right: { style: 'thin', color: { rgb: 'CCCCCC' } }
          }
        };
      } else {
        // Find if this is a subtotal / grandtotal or date header row
        const firstCellInRow = ws[`A${rowNum}`];
        const val = firstCellInRow ? String(firstCellInRow.v || '') : '';

        if (val.startsWith('Sub Total') || val === 'Grand Total') {
          cell.s = {
            font: { bold: true, sz: 10, name: 'Calibri' },
            fill: { fgColor: { rgb: 'F5F3FF' } } // Soft purple background for totals
          };
        } else if (val.includes('SAMPLE') || (val && !isNaN(Date.parse(val.split(' ')[0])))) {
          // Date section headers style
          cell.s = {
            font: { bold: true, sz: 10.5, name: 'Calibri' },
            fill: { fgColor: { rgb: 'F0F4F8' } } // Soft gray-blue background
          };
        } else {
          // Regular data rows
          const colLetter = key.replace(/[0-9]+/, '');
          const rightAlignCols = ['I', 'J', 'L', 'M', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'];

          cell.s = {
            font: { sz: 9.5, name: 'Calibri' },
            alignment: rightAlignCols.includes(colLetter) ? { horizontal: 'right' } : undefined
          };
        }
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'data');
    XLSX.writeFile(wb, `Sale_Report_${fromDate}_${toDate}.xlsx`);
    message.success('Sale Detail Report exported successfully!');
  };
  */

  const handleExportDailySales = () => {
    if (dailySales.length === 0) { message.warning('No data to export'); return; }

    const branchName = selectedBranch === 'all'
      ? 'All Branches'
      : branches.find(b => b.id === selectedBranch)?.name || 'All Branches';

    const companyName = `MEN Company (2026 -2027) New ( ${branchName} )`;
    const reportTitle = 'Daily Sales Performance Report';
    const fromDate = dateRange?.[0]?.format('DD/MM/YYYY') ?? '';
    const toDate = dateRange?.[1]?.format('DD/MM/YYYY') ?? '';
    const period = `From ${fromDate} To ${toDate}`;

    const COLS = ['Date', 'Orders Count', 'Subtotal (MMK)', 'Discount (MMK)', 'Tax (MMK)', 'Total Revenue (MMK)'];

    type WsRow = (string | number | null)[];
    const wsRows: WsRow[] = [];
    wsRows.push([companyName, ...Array(COLS.length - 1).fill(null)]);
    wsRows.push([reportTitle, ...Array(COLS.length - 1).fill(null)]);
    wsRows.push([period, ...Array(COLS.length - 1).fill(null)]);
    wsRows.push(COLS as WsRow);

    dailySales.forEach((r: any) => {
      wsRows.push([
        r.date,
        r.orderCount,
        Number(r.subtotal),
        Number(r.discount),
        Number(r.tax),
        Number(r.totalAmount)
      ]);
    });

    const gOrders = dailySales.reduce((s, r) => s + r.orderCount, 0);
    const gSub = dailySales.reduce((s, r) => s + Number(r.subtotal), 0);
    const gDisc = dailySales.reduce((s, r) => s + Number(r.discount), 0);
    const gTax = dailySales.reduce((s, r) => s + Number(r.tax), 0);
    const gTotal = dailySales.reduce((s, r) => s + Number(r.totalAmount), 0);
    wsRows.push(['Grand Total', gOrders, gSub, gDisc, gTax, gTotal]);

    const ws = XLSX.utils.aoa_to_sheet(wsRows);
    ws['!cols'] = [18, 14, 18, 18, 18, 20].map(w => ({ wch: w }));

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: COLS.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: COLS.length - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: COLS.length - 1 } },
    ];

    const centerAlign = { horizontal: 'center', vertical: 'center' };

    Object.keys(ws).forEach(key => {
      if (key.startsWith('!')) return;
      const cell = ws[key];
      const rowNum = parseInt(key.replace(/^[A-Z]+/, ''), 10);

      if (rowNum === 1) {
        cell.s = { font: { bold: true, sz: 14, name: 'Calibri' }, alignment: centerAlign };
      } else if (rowNum === 2) {
        cell.s = { font: { bold: true, sz: 12, name: 'Calibri' }, alignment: centerAlign };
      } else if (rowNum === 3) {
        cell.s = { font: { sz: 10, italic: true, name: 'Calibri' }, alignment: centerAlign };
      } else if (rowNum === 4) {
        cell.s = {
          font: { bold: true, sz: 10, name: 'Calibri' },
          alignment: centerAlign,
          fill: { fgColor: { rgb: 'EAEAEA' } },
          border: {
            top: { style: 'thin', color: { rgb: 'CCCCCC' } }, bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
            left: { style: 'thin', color: { rgb: 'CCCCCC' } }, right: { style: 'thin', color: { rgb: 'CCCCCC' } }
          }
        };
      } else {
        const firstCellInRow = ws[`A${rowNum}`];
        const val = firstCellInRow ? String(firstCellInRow.v || '') : '';

        if (val === 'Grand Total') {
          cell.s = {
            font: { bold: true, sz: 10, name: 'Calibri' },
            fill: { fgColor: { rgb: 'F5F3FF' } }
          };
        } else {
          const colLetter = key.replace(/[0-9]+/, '');
          const rightAlignCols = ['B', 'C', 'D', 'E', 'F'];
          cell.s = {
            font: { sz: 9.5, name: 'Calibri' },
            alignment: rightAlignCols.includes(colLetter) ? { horizontal: 'right' } : undefined
          };
        }
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daily_Sales');
    XLSX.writeFile(wb, `Daily_Sales_${fromDate}_${toDate}.xlsx`);
    message.success('Daily Sales Report exported successfully!');
  };

  const handleExportSystemSales = () => {
    if (systemSales.length === 0) { message.warning('No data to export'); return; }

    const branchName = selectedBranch === 'all'
      ? 'All Branches'
      : branches.find(b => b.id === selectedBranch)?.name || 'All Branches';

    const companyName = `MEN Company (2026 -2027) New ( ${branchName} )`;
    const reportTitle = 'System Sales Report (All Orders)';
    const fromDate = dateRange?.[0]?.format('DD/MM/YYYY') ?? '';
    const toDate = dateRange?.[1]?.format('DD/MM/YYYY') ?? '';
    const period = `From ${fromDate} To ${toDate}`;

    const COLS = [
      'Order No.', 'Order Date', 'Customer Code', 'Customer Name',
      'Sales Rep Name', 'Sales Team', 'Status', 'Gross Sales (MMK)',
      'Tax (MMK)', 'Sales Discount (MMK)', 'Manual Discount (MMK)', 'COD Discount (MMK)', 'Partner Commission (MMK)', 'Cashback (MMK)', 'Total Discount (MMK)',
      'FOC Qty', 'Sample Qty', 'Net Sales (MMK)'
    ];

    type WsRow = (string | number | null)[];
    const wsRows: WsRow[] = [];
    wsRows.push([companyName, ...Array(COLS.length - 1).fill(null)]);
    wsRows.push([reportTitle, ...Array(COLS.length - 1).fill(null)]);
    wsRows.push([period, ...Array(COLS.length - 1).fill(null)]);
    wsRows.push(COLS as WsRow);

    systemSales.forEach((r: any) => {
      wsRows.push([
        r.orderNumber,
        dayjs(r.orderDate).format('YYYY-MM-DD HH:mm'),
        r.customerCode,
        r.customerName,
        r.salesRepName,
        r.branchName,
        r.status.replace(/_/g, ' '),
        Number(r.grossSales),
        Number(r.tax),
        Number(r.promoDiscount),
        Number(r.manualDiscount),
        Number(r.codDiscount),
        Number(r.partnerCommission || 0),
        Number(r.cashback),
        Number(r.totalDiscount || 0),
        Number(r.focQty),
        Number(r.sampleQty),
        Number(r.netSales)
      ]);
    });

    const gGross = systemSales.reduce((s, r) => s + Number(r.grossSales), 0);
    const gTax = systemSales.reduce((s, r) => s + Number(r.tax), 0);
    const gPromo = systemSales.reduce((s, r) => s + Number(r.promoDiscount), 0);
    const gManual = systemSales.reduce((s, r) => s + Number(r.manualDiscount), 0);
    const gCod = systemSales.reduce((s, r) => s + Number(r.codDiscount), 0);
    const gPartner = systemSales.reduce((s, r) => s + Number(r.partnerCommission || 0), 0);
    const gTotalDisc = systemSales.reduce((s, r) => s + Number(r.totalDiscount || 0), 0);
    const gCash = systemSales.reduce((s, r) => s + Number(r.cashback), 0);
    const gFoc = systemSales.reduce((s, r) => s + Number(r.focQty), 0);
    const gSample = systemSales.reduce((s, r) => s + Number(r.sampleQty), 0);
    const gNet = systemSales.reduce((s, r) => s + Number(r.netSales), 0);
    wsRows.push([
      'Grand Total', null, null, null, null, null, null,
      gGross, gTax, gPromo, gManual, gCod, gPartner, gCash, gTotalDisc, gFoc, gSample, gNet
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsRows);
    ws['!cols'] = [14, 18, 14, 25, 20, 16, 14, 18, 16, 18, 18, 18, 18, 16, 18, 12, 12, 18].map(w => ({ wch: w }));

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: COLS.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: COLS.length - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: COLS.length - 1 } },
    ];

    const centerAlign = { horizontal: 'center', vertical: 'center' };

    Object.keys(ws).forEach(key => {
      if (key.startsWith('!')) return;
      const cell = ws[key];
      const rowNum = parseInt(key.replace(/^[A-Z]+/, ''), 10);

      if (rowNum === 1) {
        cell.s = { font: { bold: true, sz: 14, name: 'Calibri' }, alignment: centerAlign };
      } else if (rowNum === 2) {
        cell.s = { font: { bold: true, sz: 12, name: 'Calibri' }, alignment: centerAlign };
      } else if (rowNum === 3) {
        cell.s = { font: { sz: 10, italic: true, name: 'Calibri' }, alignment: centerAlign };
      } else if (rowNum === 4) {
        cell.s = {
          font: { bold: true, sz: 10, name: 'Calibri' },
          alignment: centerAlign,
          fill: { fgColor: { rgb: 'EAEAEA' } },
          border: {
            top: { style: 'thin', color: { rgb: 'CCCCCC' } }, bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
            left: { style: 'thin', color: { rgb: 'CCCCCC' } }, right: { style: 'thin', color: { rgb: 'CCCCCC' } }
          }
        };
      } else {
        const firstCellInRow = ws[`A${rowNum}`];
        const val = firstCellInRow ? String(firstCellInRow.v || '') : '';

        if (val === 'Grand Total') {
          cell.s = {
            font: { bold: true, sz: 10, name: 'Calibri' },
            fill: { fgColor: { rgb: 'F5F3FF' } }
          };
        } else {
          const colLetter = key.replace(/[0-9]+/, '');
          const rightAlignCols = ['H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];
          cell.s = {
            font: { sz: 9.5, name: 'Calibri' },
            alignment: rightAlignCols.includes(colLetter) ? { horizontal: 'right' } : undefined
          };
        }
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'System_Sales');
    XLSX.writeFile(wb, `System_Sales_${fromDate}_${toDate}.xlsx`);
    message.success('System Sales Report exported successfully!');
  };

  const handleExportItemSales = () => {
    if (itemSales.length === 0) { message.warning('No data to export'); return; }

    const branchName = selectedBranch === 'all'
      ? 'All Branches'
      : branches.find(b => b.id === selectedBranch)?.name || 'All Branches';

    const companyName = `MEN Company (2026 -2027) New ( ${branchName} )`;
    const reportTitle = 'Daily Sales Raw Data Report';
    const fromDate = dateRange?.[0]?.format('DD/MM/YYYY') ?? '';
    const toDate = dateRange?.[1]?.format('DD/MM/YYYY') ?? '';
    const period = `From ${fromDate} To ${toDate}`;

    const COLS = [
      'B.Unit', 'Supplier Name', 'Product Code', 'Product Name',
      'Customer ID', 'Company Name', 'Region', 'District',
      'City', 'Township', 'Main Channel', 'Sub-channel', 'Invoice ID',
      'Inv Date', 'Year', 'Quarter', 'Month', 'Unit Price',
      'UOM', 'Sales Qty', 'FOC Qty', 'Sample Qty', 'Total Qty',
      'Sales Rep', 'Sales Team', 'Remark'
    ];

    type WsRow = (string | number | null)[];
    const wsRows: WsRow[] = [];
    wsRows.push([companyName, ...Array(COLS.length - 1).fill(null)]);
    wsRows.push([reportTitle, ...Array(COLS.length - 1).fill(null)]);
    wsRows.push([period, ...Array(COLS.length - 1).fill(null)]);
    wsRows.push(COLS as WsRow);

    itemSales.forEach((r: any) => {
      wsRows.push([
        r.businessUnit, r.supplierName, r.productCode, r.productName,
        r.customerId, r.companyName, r.region, r.district,
        r.city, r.township, r.mainChannel, r.subChannel, r.invoiceId,
        r.invoiceDate, r.year, r.quarter, r.month, r.unitPrice,
        r.sellingUom, r.salesQuantity, r.focQuantity, r.sampleQuantity,
        r.totalQuantity, r.salesRepName, r.salesTeam, r.remark
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsRows);
    ws['!cols'] = COLS.map(() => ({ wch: 15 }));

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: COLS.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: COLS.length - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: COLS.length - 1 } },
    ];

    const centerAlign = { horizontal: 'center', vertical: 'center' };

    Object.keys(ws).forEach(key => {
      if (key.startsWith('!')) return;
      const cell = ws[key];
      const rowNum = parseInt(key.replace(/^[A-Z]+/, ''), 10);

      if (rowNum === 1) {
        cell.s = { font: { bold: true, sz: 14, name: 'Calibri' }, alignment: centerAlign };
      } else if (rowNum === 2) {
        cell.s = { font: { bold: true, sz: 12, name: 'Calibri' }, alignment: centerAlign };
      } else if (rowNum === 3) {
        cell.s = { font: { sz: 10, italic: true, name: 'Calibri' }, alignment: centerAlign };
      } else if (rowNum === 4) {
        cell.s = {
          font: { bold: true, sz: 10, name: 'Calibri' },
          alignment: centerAlign,
          fill: { fgColor: { rgb: 'EAEAEA' } },
          border: {
            top: { style: 'thin', color: { rgb: 'CCCCCC' } }, bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
            left: { style: 'thin', color: { rgb: 'CCCCCC' } }, right: { style: 'thin', color: { rgb: 'CCCCCC' } }
          }
        };
      } else {
        cell.s = { font: { sz: 9.5, name: 'Calibri' } };
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Item_Sales');
    XLSX.writeFile(wb, `Daily_Sales_Raw_Data_${fromDate}_${toDate}.xlsx`);
    message.success('Item Sales Report exported successfully!');
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Reports & Analytics</Title>
          <Text type="secondary">Operational sales performance, order trends, and inventory analysis</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchReportData}>Refresh Data</Button>
      </div>

      {/* Filter Panel */}
      <Card className="glass-card" variant="borderless" style={{ marginBottom: '20px' }}>
        <Space wrap size="middle" align="center">
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Date Range</div>
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(value) => {
                if (value?.[0] && value?.[1]) setDateRange([value[0], value[1]]);
              }}
              style={{ borderRadius: '12px', height: '42px' }}
              allowClear={false}
            />
          </div>

          {/* Branch Filter */}
          {isHQUser && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Branch</div>
              <Select
                value={selectedBranch}
                style={{ width: 180, borderRadius: '12px' }}
                onChange={setSelectedBranch}
              >
                <Select.Option value="all">All Branches</Select.Option>
                {branches.map(b => (
                  <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
                ))}
              </Select>
            </div>
          )}

          {/* Sales Representative Filter */}
          {(isHQUser || isBranchManager) && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Sales Rep / MSR</div>
              <Select
                value={selectedRep}
                style={{ width: 180, borderRadius: '12px' }}
                onChange={setSelectedRep}
              >
                <Select.Option value="all">All Reps</Select.Option>
                {salesReps.map(r => (
                  <Select.Option key={r.id} value={r.id}>{r.user.firstName} {r.user.lastName} ({r.code})</Select.Option>
                ))}
              </Select>
            </div>
          )}

          {/* Customer Filter */}
          {!isCustomer && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Customer</div>
              <Select
                value={selectedCustomer}
                style={{ width: 200, borderRadius: '12px' }}
                onChange={setSelectedCustomer}
                showSearch
                optionFilterProp="children"
              >
                <Select.Option value="all">All Customers</Select.Option>
                {customers.map(c => (
                  <Select.Option key={c.id} value={c.id}>{c.name} ({c.code})</Select.Option>
                ))}
              </Select>
            </div>
          )}

          {/* Category Filter (displayed only on Item Sales tab) */}
          {activeTab === 'item' && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Product Category</div>
              <Select
                value={selectedCategory}
                style={{ width: 180, borderRadius: '12px' }}
                onChange={setSelectedCategory}
              >
                <Select.Option value="all">All Categories</Select.Option>
                {categories.map(c => (
                  <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                ))}
              </Select>
            </div>
          )}

          {/* Status Filter (displayed only on System Sales tab) */}
          {activeTab === 'system' && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Order Status</div>
              <Select
                value={selectedStatus}
                style={{ width: 180, borderRadius: '12px' }}
                onChange={setSelectedStatus}
              >
                <Select.Option value="all">All Statuses</Select.Option>
                <Select.Option value="DRAFT">Draft</Select.Option>
                <Select.Option value="SUBMITTED">Submitted</Select.Option>
                <Select.Option value="BRANCH_REVIEW">Branch Review</Select.Option>
                <Select.Option value="PENDING">Pending</Select.Option>
                <Select.Option value="APPROVED">Approved</Select.Option>
                <Select.Option value="READY_FOR_DELIVERY">Ready For Delivery</Select.Option>
                <Select.Option value="INVOICED">Invoiced</Select.Option>
                <Select.Option value="COMPLETED">Completed</Select.Option>
                <Select.Option value="CANCELLED">Cancelled</Select.Option>
              </Select>
            </div>
          )}

          {/* Business Unit Filter */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Business Unit</div>
            <Select
              value={selectedBusinessUnit}
              style={{ width: 180, borderRadius: '12px' }}
              onChange={setSelectedBusinessUnit}
            >
              <Select.Option value="all">All Business Units</Select.Option>
              {businessUnits.map(bu => (
                <Select.Option key={bu.id} value={bu.id}>{bu.name}</Select.Option>
              ))}
            </Select>
          </div>

          <div>
            <div style={{ height: '22px' }}></div>
            <Button onClick={handleResetFilters} style={{ borderRadius: '12px', height: '42px' }}>Reset</Button>
          </div>
        </Space>
      </Card>

      {/* Tabs Layout */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        style={{ marginTop: 12 }}
        items={[
          // ================= DAILY SALES TAB =================
          {
            key: 'daily',
            label: (
              <span>
                <CalendarOutlined />
                Daily Sales
              </span>
            ),
            children: (
              <Spin spinning={loading}>
                {/* KPI Cards */}
                <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                  <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="Total Sales Revenue"
                        value={dailyKPIs.totalRevenue}
                        precision={2}
                        suffix={CURRENCY.symbol}
                        prefix={<DollarOutlined style={{ color: '#10B981' }} />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="Total Orders Count"
                        value={dailyKPIs.totalOrders}
                        prefix={<ShoppingCartOutlined style={{ color: '#3B82F6' }} />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="Avg. Order Value"
                        value={dailyKPIs.avgOrderValue}
                        precision={2}
                        suffix={CURRENCY.symbol}
                        prefix={<PercentageOutlined style={{ color: '#8B5CF6' }} />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="Peak Daily Sales"
                        value={dailyKPIs.maxSales}
                        precision={2}
                        suffix={CURRENCY.symbol}
                        prefix={<StarOutlined style={{ color: '#F59E0B' }} />}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* Trend Chart */}
                <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                  <Col span={24}>
                    <Card title="Sales Revenue Trend" className="glass-card" variant="borderless">
                      <div style={{ height: 300 }}>
                        {dailySales.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={dailySales} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                              <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                              <YAxis tickLine={false} tickFormatter={(v) => formatValue(v)} tick={{ fontSize: 11, fill: '#6b7280' }} />
                              <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString()} ${CURRENCY.symbol}`, 'Sales']} />
                              <Legend />
                              <Line type="monotone" name="Sales Revenue" dataKey="totalAmount" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <Text type="secondary">No sales data available for this range</Text>
                          </div>
                        )}
                      </div>
                    </Card>
                  </Col>
                </Row>

                <Card
                  className="glass-card"
                  variant="borderless"
                  title={<span style={{ fontWeight: 700 }}>Daily Sales Records</span>}
                  extra={
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={handleExportDailySales}
                      style={{ background: 'linear-gradient(135deg,#8B5CF6,#6366F1)', border: 'none', borderRadius: 10 }}
                    >
                      Export Excel
                    </Button>
                  }
                  styles={{ body: { padding: 0 } }}
                >
                  <Table
                    dataSource={dailySales.map((item, idx) => ({ ...item, key: idx }))}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    columns={[
                      { title: 'Date', dataIndex: 'date', key: 'date', sorter: (a, b) => a.date.localeCompare(b.date) },
                      { title: 'Orders Count', dataIndex: 'orderCount', key: 'orderCount', sorter: (a, b) => a.orderCount - b.orderCount },
                      { title: 'Subtotal', dataIndex: 'subtotal', key: 'subtotal', render: (v) => `${Number(v).toLocaleString()} ${CURRENCY.symbol}` },
                      { title: 'Discount', dataIndex: 'discount', key: 'discount', render: (v) => `${Number(v).toLocaleString()} ${CURRENCY.symbol}` },
                      { title: 'Tax', dataIndex: 'tax', key: 'tax', render: (v) => `${Number(v).toLocaleString()} ${CURRENCY.symbol}` },
                      { title: 'Total Revenue', dataIndex: 'totalAmount', key: 'totalAmount', sorter: (a, b) => a.totalAmount - b.totalAmount, render: (v) => <Text strong style={{ color: '#10B981' }}>{Number(v).toLocaleString()} {CURRENCY.symbol}</Text> }
                    ]}
                  />
                </Card>
              </Spin>
            )
          },

          // ================= SYSTEM SALES TAB =================
          {
            key: 'system',
            label: (
              <span>
                <FileTextOutlined />
                System Sales (All Orders)
              </span>
            ),
            children: (
              <Spin spinning={loading}>
                {/* KPI Cards */}
                <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                  <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="Sum Total Amount"
                        value={systemKPIs.totalRevenue}
                        precision={0}
                        suffix={CURRENCY.symbol}
                        prefix={<DollarOutlined style={{ color: '#3B82F6' }} />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="System Orders Listed"
                        value={systemKPIs.totalOrders}
                        prefix={<ShoppingCartOutlined style={{ color: '#6366F1' }} />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="AOV (Avg Order Value)"
                        value={systemKPIs.avgOrderValue}
                        precision={0}
                        suffix={CURRENCY.symbol}
                        prefix={<PercentageOutlined style={{ color: '#8B5CF6' }} />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%', borderLeft: systemKPIs.cancelledCount > 0 ? '3px solid #EF4444' : 'none' }}>
                      <Statistic
                        title="Cancelled Orders"
                        value={systemKPIs.cancelledCount}
                        styles={{ content: { color: systemKPIs.cancelledCount > 0 ? '#EF4444' : 'inherit' } }}
                        prefix={<ReloadOutlined />}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* Status Breakdown Charts */}
                <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                  <Col xs={24} md={12}>
                    <Card title="Orders by Status (Share)" className="glass-card" variant="borderless" style={{ height: '100%' }}>
                      <div style={{ display: 'flex', height: 260, alignItems: 'center' }}>
                        <div style={{ width: '50%', height: 250, position: 'relative' }}>
                          {orderStatusPieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                              <PieChart>
                                <Pie
                                  data={orderStatusPieData}
                                  innerRadius={50}
                                  outerRadius={70}
                                  paddingAngle={4}
                                  dataKey="value"
                                  stroke="none"
                                >
                                  {orderStatusPieData.map((entry, idx) => (
                                    <Cell key={`cell-${idx}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                              <Text type="secondary">No records</Text>
                            </div>
                          )}
                        </div>
                        <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '240px' }}>
                          {orderStatusPieData.map(item => (
                            <div key={item.name} style={{ fontSize: '12px' }}>
                              <Space size={6}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.color }}></div>
                                <Text type="secondary">{item.name}:</Text>
                                <Text strong>{item.value}</Text>
                              </Space>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  </Col>

                  <Col xs={24} md={12}>
                    <Card title="Order Amount Distribution" className="glass-card" variant="borderless" style={{ height: '100%' }}>
                      <div style={{ height: 260 }}>
                        {systemSales.length > 0 ? (
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={systemSales.slice(0, 15)} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                              <XAxis dataKey="orderNumber" tick={{ fontSize: 9, fill: '#6b7280' }} />
                              <YAxis tickFormatter={(v) => formatValue(v)} tick={{ fontSize: 10, fill: '#6b7280' }} />
                              <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString()} ${CURRENCY.symbol}`, 'Amount']} />
                              <Bar dataKey="netSales" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <Text type="secondary">No sales transactions available</Text>
                          </div>
                        )}
                      </div>
                    </Card>
                  </Col>
                </Row>

                <Card
                  className="glass-card"
                  variant="borderless"
                  title={<span style={{ fontWeight: 700 }}>System Sales Order Records</span>}
                  extra={
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={handleExportSystemSales}
                      style={{ background: 'linear-gradient(135deg,#8B5CF6,#6366F1)', border: 'none', borderRadius: 10 }}
                    >
                      Export Excel
                    </Button>
                  }
                  styles={{ body: { padding: 0 } }}
                >
                  <Table
                    dataSource={systemSales}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    scroll={{ x: 1500 }}
                    columns={[
                      { title: 'Order No.', dataIndex: 'orderNumber', key: 'orderNumber', sorter: (a, b) => a.orderNumber.localeCompare(b.orderNumber), render: (v) => <Text code strong>{v}</Text> },
                      { title: 'Order Date', dataIndex: 'orderDate', key: 'orderDate', sorter: (a, b) => a.orderDate.localeCompare(b.orderDate), render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm') },
                      { title: 'Customer', key: 'customer', render: (_, r) => <div><Text strong>{r.customerName}</Text><br /><Text type="secondary" style={{ fontSize: 11 }}>{r.customerCode}</Text></div> },
                      { title: 'Sales Rep Name', dataIndex: 'salesRepName', key: 'salesRepName' },
                      { title: 'Sales Team', dataIndex: 'branchName', key: 'branchName' },
                      {
                        title: 'Status',
                        dataIndex: 'status',
                        key: 'status',
                        render: (status) => (
                          <Tag style={{ borderRadius: '12px', border: 'none', fontWeight: 500 }} color={
                            status === 'COMPLETED' ? 'green' : status === 'APPROVED' ? 'blue' : status === 'CANCELLED' ? 'red' : 'orange'
                          }>
                            {status.replace(/_/g, ' ')}
                          </Tag>
                        )
                      },
                      { title: 'Gross Sales', dataIndex: 'grossSales', key: 'grossSales', render: (v) => `${Number(v).toLocaleString()} ${CURRENCY.symbol}` },
                      { title: 'Tax (5%)', dataIndex: 'tax', key: 'tax', render: (v) => `${Number(v).toLocaleString()} ${CURRENCY.symbol}` },
                      { title: 'Promo Disc.', dataIndex: 'promoDiscount', key: 'promoDiscount', render: (v) => `${Number(v).toLocaleString()} ${CURRENCY.symbol}` },
                      { title: 'Manual Disc.', dataIndex: 'manualDiscount', key: 'manualDiscount', render: (v) => `${Number(v).toLocaleString()} ${CURRENCY.symbol}` },
                      { title: 'COD Disc.', dataIndex: 'codDiscount', key: 'codDiscount', render: (v) => `${Number(v).toLocaleString()} ${CURRENCY.symbol}` },
                      { title: 'Partner Commission', dataIndex: 'partnerCommission', key: 'partnerCommission', render: (v) => `${Number(v).toLocaleString()} ${CURRENCY.symbol}` },
                      { title: 'Cashback', dataIndex: 'cashback', key: 'cashback', render: (v) => `${Number(v).toLocaleString()} ${CURRENCY.symbol}` },
                      { title: 'Total Disc.', dataIndex: 'totalDiscount', key: 'totalDiscount', render: (v) => `${Number(v).toLocaleString()} ${CURRENCY.symbol}` },
                      { title: 'FOC Qty', dataIndex: 'focQty', key: 'focQty', render: (v) => Number(v).toLocaleString() },
                      { title: 'Sample Qty', dataIndex: 'sampleQty', key: 'sampleQty', render: (v) => Number(v).toLocaleString() },
                      { title: 'Net Sales', dataIndex: 'netSales', key: 'netSales', sorter: (a, b) => a.netSales - b.netSales, render: (v) => <Text strong style={{ color: '#3B82F6' }}>{Number(v).toLocaleString()} {CURRENCY.symbol}</Text> }
                    ]}
                  />
                </Card>
              </Spin>
            )
          },

          // ================= ITEM SALES TAB =================
          {
            key: 'item',
            label: (
              <span>
                <BarChartOutlined />
                Item Sales (Products)
              </span>
            ),
            children: (
              <Spin spinning={loading}>
                {/* KPI Cards */}
                <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                  <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="Total Items Volume Sold"
                        value={itemKPIs.totalQty}
                        prefix={<ShoppingCartOutlined style={{ color: '#8B5CF6' }} />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="Items Revenue Generated"
                        value={itemKPIs.totalRev}
                        precision={2}
                        suffix={CURRENCY.symbol}
                        prefix={<DollarOutlined style={{ color: '#10B981' }} />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="Distinct Product SKUs"
                        value={itemKPIs.distinctItems}
                        prefix={<FileTextOutlined style={{ color: '#3B82F6' }} />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="Top Seller Item"
                        value={itemKPIs.topItem ? itemKPIs.topItem.productName : '—'}
                        styles={{ content: { fontSize: '15px', fontWeight: 700 } }}
                        prefix={<StarOutlined style={{ color: '#F59E0B' }} />}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* Top Selling Products Chart */}
                <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                  <Col span={24}>
                    <Card title="Top 10 Selling Products by Volume (Qty)" className="glass-card" variant="borderless">
                      <div style={{ height: 300 }}>
                        {itemSales.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={itemSales.slice(0, 10)} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                              <XAxis dataKey="productName" tick={{ fontSize: 10, fill: '#6b7280' }} />
                              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                              <Tooltip formatter={(value: any) => [value, 'Quantity Sold']} />
                              <Bar dataKey="salesQuantity" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={40}>
                                {itemSales.slice(0, 10).map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={index === 0 ? '#6366F1' : '#8B5CF6'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <Text type="secondary">No product sales records available</Text>
                          </div>
                        )}
                      </div>
                    </Card>
                  </Col>
                </Row>

                <Card
                  className="glass-card"
                  variant="borderless"
                  title={<span style={{ fontWeight: 700 }}>Product Sales Performance</span>}
                  extra={
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={handleExportItemSales}
                      style={{ background: 'linear-gradient(135deg,#8B5CF6,#6366F1)', border: 'none', borderRadius: 10 }}
                    >
                      Export Excel
                    </Button>
                  }
                  styles={{ body: { padding: 0 } }}
                >
                  <Table
                    dataSource={itemSales.map((item, idx) => ({ ...item, key: idx }))}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    scroll={{ x: 'max-content' }}
                    columns={[
                      { title: 'B.Unit', dataIndex: 'businessUnit', key: 'businessUnit' },
                      { title: 'Supplier Name', dataIndex: 'supplierName', key: 'supplierName' },
                      { title: 'Product Code', dataIndex: 'productCode', key: 'productCode', render: (v) => <Text code>{v}</Text> },
                      { title: 'Product Name', dataIndex: 'productName', key: 'productName' },
                      { title: 'Customer ID', dataIndex: 'customerId', key: 'customerId' },
                      { title: 'Company Name', dataIndex: 'companyName', key: 'companyName' },
                      { title: 'Region', dataIndex: 'region', key: 'region' },
                      { title: 'District', dataIndex: 'district', key: 'district' },
                      { title: 'City', dataIndex: 'city', key: 'city' },
                      { title: 'Township', dataIndex: 'township', key: 'township' },
                      { title: 'Main Channel', dataIndex: 'mainChannel', key: 'mainChannel' },
                      { title: 'Sub-channel', dataIndex: 'subChannel', key: 'subChannel' },
                      { title: 'Invoice ID', dataIndex: 'invoiceId', key: 'invoiceId' },
                      { title: 'Inv Date', dataIndex: 'invoiceDate', key: 'invoiceDate' },
                      { title: 'Year', dataIndex: 'year', key: 'year' },
                      { title: 'Quarter', dataIndex: 'quarter', key: 'quarter' },
                      { title: 'Month', dataIndex: 'month', key: 'month' },
                      { title: 'Unit Price', dataIndex: 'unitPrice', key: 'unitPrice', render: (v) => Number(v).toLocaleString() },
                      { title: 'UOM', dataIndex: 'sellingUom', key: 'sellingUom' },
                      { title: 'Sales Qty', dataIndex: 'salesQuantity', key: 'salesQuantity', render: (v) => <Text strong>{v}</Text> },
                      { title: 'FOC Qty', dataIndex: 'focQuantity', key: 'focQuantity' },
                      { title: 'Sample Qty', dataIndex: 'sampleQuantity', key: 'sampleQuantity' },
                      { title: 'Total Qty', dataIndex: 'totalQuantity', key: 'totalQuantity', render: (v) => <Text strong type="success">{v}</Text> },
                      { title: 'Sales Rep', dataIndex: 'salesRepName', key: 'salesRepName' },
                      { title: 'Sales Team', dataIndex: 'salesTeam', key: 'salesTeam' },
                      { title: 'Remark', dataIndex: 'remark', key: 'remark' }
                    ]}
                  />
                </Card>
              </Spin>
            )
          }
          // ================= SALE DETAIL TAB =================
          /*, {
            key: 'sale-detail',
            label: (
              <span>
                <FileTextOutlined />
                Sale Detail Report
              </span>
            ),
            children: (
              <Spin spinning={loading}>
                <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
                  <Col xs={24} sm={12} md={6}>
                    <Card className="glass-card" variant="borderless">
                      <Statistic
                        title="Total Line Items"
                        value={saleDetail.length}
                        prefix={<FileTextOutlined style={{ color: '#8B5CF6' }} />}
                        styles={{ content: { color: '#8B5CF6', fontWeight: 700 } }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card className="glass-card" variant="borderless">
                      <Statistic
                        title="Unique Invoices"
                        value={new Set(saleDetail.map((r: any) => r.invoiceId)).size}
                        prefix={<ShoppingCartOutlined style={{ color: '#06B6D4' }} />}
                        styles={{ content: { color: '#06B6D4', fontWeight: 700 } }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card className="glass-card" variant="borderless">
                      <Statistic
                        title="Total Revenue (MMK)"
                        value={saleDetail.reduce((s: number, r: any) => s + r.amount, 0)}
                        formatter={(v: any) => Number(v).toLocaleString()}
                        prefix={<DollarOutlined style={{ color: '#10B981' }} />}
                        styles={{ content: { color: '#10B981', fontWeight: 700 } }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card className="glass-card" variant="borderless">
                      <Statistic
                        title="Total Discount (MMK)"
                        value={saleDetail.reduce((s: number, r: any) => s + r.discount, 0)}
                        formatter={(v: any) => Number(v).toLocaleString()}
                        prefix={<PercentageOutlined style={{ color: '#F59E0B' }} />}
                        styles={{ content: { color: '#F59E0B', fontWeight: 700 } }}
                      />
                    </Card>
                  </Col>
                </Row>

                <Card
                  className="glass-card"
                  variant="borderless"
                  title={<span style={{ fontWeight: 700 }}>Sale Details — By Invoice Date & Invoice ID</span>}
                  extra={
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={handleExportSaleDetail}
                      style={{ background: 'linear-gradient(135deg,#8B5CF6,#6366F1)', border: 'none', borderRadius: 10 }}
                    >
                      Export Excel
                    </Button>
                  }
                  styles={{ body: { padding: 0 } }}
                >
                  <Table
                    dataSource={saleDetail.map((r: any, i: number) => ({ ...r, key: i }))}
                    scroll={{ x: 2000 }}
                    size="small"
                    pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (t) => `${t} line items` }}
                    columns={[
                      { title: 'No', dataIndex: 'no', key: 'no', width: 55, fixed: 'left' },
                      {
                        title: 'Invoice ID', dataIndex: 'invoiceId', key: 'invoiceId', width: 130, fixed: 'left',
                        render: (v: string) => <Typography.Text code style={{ fontWeight: 600 }}>{v}</Typography.Text>
                      },
                      {
                        title: 'Invoice Date', dataIndex: 'invoiceDate', key: 'invoiceDate', width: 110,
                        render: (v: string) => <Tag color="blue">{v}</Tag>
                      },
                      { title: 'Customer ID', dataIndex: 'customerId', key: 'customerId', width: 110 },
                      {
                        title: 'Customer Name', dataIndex: 'customerName', key: 'customerName', width: 200,
                        render: (v: string) => <Typography.Text ellipsis={{ tooltip: v }} style={{ maxWidth: 190 }}>{v}</Typography.Text>
                      },
                      {
                        title: 'Stock ID', dataIndex: 'stockId', key: 'stockId', width: 150,
                        render: (v: string) => <Typography.Text code>{v}</Typography.Text>
                      },
                      {
                        title: 'Stock Name', dataIndex: 'stockName', key: 'stockName', width: 200,
                        render: (v: string) => <Typography.Text ellipsis={{ tooltip: v }} style={{ maxWidth: 190 }}>{v}</Typography.Text>
                      },
                      { title: 'Cur', dataIndex: 'curId', key: 'curId', width: 60 },
                      {
                        title: 'Qty', dataIndex: 'quantity', key: 'quantity', width: 70,
                        render: (v: number) => <Typography.Text strong>{v}</Typography.Text>
                      },
                      { title: 'UOM', dataIndex: 'umId', key: 'umId', width: 70 },
                      {
                        title: 'Price', dataIndex: 'price', key: 'price', width: 110,
                        render: (v: number) => v.toLocaleString()
                      },
                      {
                        title: 'Total Amt', dataIndex: 'totalAmount', key: 'totalAmount', width: 120,
                        render: (v: number) => v.toLocaleString()
                      },
                      {
                        title: 'Disc%', dataIndex: 'discountPct', key: 'discountPct', width: 75,
                        render: (v: number) => `${v}%`
                      },
                      {
                        title: 'Discount', dataIndex: 'discount', key: 'discount', width: 100,
                        render: (v: number) => v.toLocaleString()
                      },
                      {
                        title: 'Net Price', dataIndex: 'netPrice', key: 'netPrice', width: 110,
                        render: (v: number) => v.toLocaleString()
                      },
                      {
                        title: 'Amount', dataIndex: 'amount', key: 'amount', width: 120,
                        render: (v: number) => <Typography.Text strong style={{ color: '#8B5CF6' }}>{v.toLocaleString()}</Typography.Text>
                      },
                      {
                        title: 'Tax', dataIndex: 'tax', key: 'tax', width: 90,
                        render: (v: number) => v.toLocaleString()
                      },
                      {
                        title: 'Net Amount', dataIndex: 'netAmount', key: 'netAmount', width: 120,
                        render: (v: number) => <Typography.Text strong style={{ color: '#10B981' }}>{v.toLocaleString()}</Typography.Text>
                      },
                      {
                        title: 'Paid Amt', dataIndex: 'paidAmount', key: 'paidAmount', width: 110,
                        render: (v: number) => v > 0 ? <Tag color="green">{v.toLocaleString()}</Tag> : <Tag color="orange">Unpaid</Tag>
                      },
                      { title: 'Staff', dataIndex: 'staff', key: 'staff', width: 160 },
                      { title: 'Remark', dataIndex: 'remark', key: 'remark', width: 120 },
                      {
                        title: 'Category', dataIndex: 'category', key: 'category', width: 120,
                        render: (v: string) => v ? <Tag color="purple">{v}</Tag> : null
                      },
                      {
                        title: 'Business Unit', dataIndex: 'businessUnit', key: 'businessUnit', width: 140,
                        render: (v: string) => v ? <Tag color="cyan">{v}</Tag> : null
                      },
                    ]}
                    summary={(pageData) => {
                      const sumQty = pageData.reduce((s, r) => s + r.quantity, 0);
                      const sumAmt = pageData.reduce((s, r) => s + r.amount, 0);
                      const sumDisc = pageData.reduce((s, r) => s + r.discount, 0);
                      const sumNet = pageData.reduce((s, r) => s + r.netAmount, 0);
                      return (
                        <Table.Summary.Row style={{ background: '#f3f0ff', fontWeight: 700 }}>
                          <Table.Summary.Cell index={0} colSpan={9}>Page Total</Table.Summary.Cell>
                          <Table.Summary.Cell index={9}>{sumQty}</Table.Summary.Cell>
                          <Table.Summary.Cell index={10} />
                          <Table.Summary.Cell index={11} />
                          <Table.Summary.Cell index={12} />
                          <Table.Summary.Cell index={13} />
                          <Table.Summary.Cell index={14}>{sumDisc.toLocaleString()}</Table.Summary.Cell>
                          <Table.Summary.Cell index={15} />
                          <Table.Summary.Cell index={16}><span style={{ color: '#8B5CF6' }}>{sumAmt.toLocaleString()}</span></Table.Summary.Cell>
                          <Table.Summary.Cell index={17} />
                          <Table.Summary.Cell index={18}><span style={{ color: '#10B981' }}>{sumNet.toLocaleString()}</span></Table.Summary.Cell>
                          <Table.Summary.Cell index={19} colSpan={6} />
                        </Table.Summary.Row>
                      );
                    }}
                  />
                </Card>
              </Spin>
            )
          }*/
          // ================= SALES REP KPI TAB =================
          , {
            key: 'kpi',
            label: (
              <span>
                <StarOutlined />
                Sales Rep KPI
              </span>
            ),
            children: (
              <Spin spinning={loading}>
                {/* KPI Cards */}
                <Row gutter={[16, 16]} style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap' }}>
                  <Col xs={24} sm={8} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="Active Sales Reps"
                        value={kpiData.length}
                        prefix={<StarOutlined style={{ color: '#6366F1' }} />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="Top Performer"
                        value={kpiData[0]?.salesRepName || 'N/A'}
                        styles={{ content: { fontSize: '18px', fontWeight: 700 } }}
                        prefix={<DollarOutlined style={{ color: '#10B981' }} />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="Avg Sales / Rep"
                        value={kpiData.length > 0 ? Math.round(kpiData.reduce((s, r) => s + r.totalSales, 0) / kpiData.length) : 0}
                        suffix={CURRENCY.symbol}
                        prefix={<PercentageOutlined style={{ color: '#8B5CF6' }} />}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* Chart & Table */}
                <Row gutter={[16, 24]}>
                  <Col xs={24}>
                    <Card title="Sales Revenue by Representative" className="glass-card" variant="borderless">
                      <div style={{ height: 350 }}>
                        {kpiData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={kpiData.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                              <XAxis dataKey="salesRepName" tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                              <YAxis tickLine={false} tickFormatter={(v) => formatValue(v)} tick={{ fontSize: 11, fill: '#6b7280' }} />
                              <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString()} ${CURRENCY.symbol}`, 'Sales']} />
                              <Bar dataKey="totalSales" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={40}>
                                {kpiData.slice(0, 10).map((_, index) => {
                                  const colors = ['#6366F1', '#4F46E5', '#4338CA', '#3730A3', '#312E81'];
                                  return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                })}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <Text type="secondary">No data available</Text>
                          </div>
                        )}
                      </div>
                    </Card>
                  </Col>

                  <Col xs={24}>
                    <Card
                      title="Representative Rankings"
                      className="glass-card"
                      variant="borderless"
                      styles={{ body: { padding: 0 } }}
                    >
                      <Table
                        dataSource={kpiData.map((item, idx) => ({ ...item, key: idx, rank: idx + 1 }))}
                        pagination={{ pageSize: 10 }}
                        size="middle"
                        expandable={{
                          expandedRowRender: (record: any) => (
                            <div style={{ padding: '16px', background: '#fafafa', borderRadius: '8px', margin: '0 16px' }}>
                              <Row gutter={[16, 16]}>
                                {/* Sales Summary */}
                                <Col xs={24} md={12} lg={6}>
                                  <Card size="small" title={<span style={{ color: '#10B981' }}><DollarOutlined /> Sales Summary</span>} bordered={true}>
                                    <p><strong>Gross Sales:</strong> {record.grossSales?.toLocaleString()} {CURRENCY.symbol}</p>
                                    <p><strong>Net Sales:</strong> <span style={{ color: '#10B981', fontWeight: 'bold' }}>{record.netSales?.toLocaleString()} {CURRENCY.symbol}</span></p>
                                    <p><strong>Avg Order:</strong> {record.averageOrderValue?.toLocaleString()} {CURRENCY.symbol}</p>
                                    <p><strong>Avg/Customer:</strong> {record.averageSalesPerCustomer?.toLocaleString()} {CURRENCY.symbol}</p>
                                  </Card>
                                </Col>
                                {/* Discount Breakdown */}
                                <Col xs={24} md={12} lg={6}>
                                  <Card size="small" title={<span style={{ color: '#F59E0B' }}><PercentageOutlined /> Discount Breakdown</span>} bordered={true}>
                                    <p><strong>Promo Disc:</strong> {record.promoDiscount?.toLocaleString()} {CURRENCY.symbol}</p>
                                    <p><strong>Manual Disc:</strong> {record.manualDiscount?.toLocaleString()} {CURRENCY.symbol}</p>
                                    <p><strong>COD Disc:</strong> {record.codDiscount?.toLocaleString()} {CURRENCY.symbol}</p>
                                    <p><strong>Total Disc:</strong> <span style={{ color: '#F59E0B', fontWeight: 'bold' }}>{record.totalDiscount?.toLocaleString()} {CURRENCY.symbol}</span></p>
                                  </Card>
                                </Col>
                                {/* Product Movement */}
                                <Col xs={24} md={12} lg={6}>
                                  <Card size="small" title={<span style={{ color: '#8B5CF6' }}><ShoppingCartOutlined /> Product Movement</span>} bordered={true}>
                                    <p><strong>Charge Qty:</strong> {record.chargeQty?.toLocaleString()}</p>
                                    <p><strong>FOC Qty:</strong> {record.focQty?.toLocaleString()}</p>
                                    <p><strong>Sample Qty:</strong> {record.sampleQty?.toLocaleString()}</p>
                                    <p><strong>Total Items:</strong> {(record.chargeQty + record.focQty + record.sampleQty)?.toLocaleString()}</p>
                                  </Card>
                                </Col>
                                {/* Collection Status */}
                                <Col xs={24} md={12} lg={6}>
                                  <Card size="small" title={<span style={{ color: '#3B82F6' }}><CheckCircleOutlined /> Collection & Customers</span>} bordered={true}>
                                    <p><strong>Paid Amount:</strong> <span style={{ color: '#3B82F6' }}>{record.paidAmount?.toLocaleString()} {CURRENCY.symbol}</span></p>
                                    <p><strong>Outstanding:</strong> <span style={{ color: '#EF4444', fontWeight: 'bold' }}>{record.outstandingAmount?.toLocaleString()} {CURRENCY.symbol}</span></p>
                                    <p><strong>Collection Rate:</strong> {record.netSales > 0 ? ((record.paidAmount / record.netSales) * 100).toFixed(1) : 0}%</p>
                                    <p><strong>New Customers:</strong> {record.newCustomers}</p>
                                  </Card>
                                </Col>
                              </Row>
                            </div>
                          ),
                        }}
                        columns={[
                          { title: 'Rank', dataIndex: 'rank', key: 'rank', width: 60, render: (v) => <Text strong>{v}</Text> },
                          { title: 'Name', dataIndex: 'salesRepName', key: 'salesRepName', render: (v, r: any) => <div><Text strong>{v}</Text><br /><Text type="secondary" style={{ fontSize: '11px' }}>{r.salesRepCode}</Text></div> },
                          { title: 'Branch', dataIndex: 'branchName', key: 'branchName' },
                          { title: 'Net Sales', dataIndex: 'netSales', key: 'netSales', render: (v) => <Text strong style={{ color: '#10B981' }}>{v?.toLocaleString()} {CURRENCY.symbol}</Text>, sorter: (a: any, b: any) => a.netSales - b.netSales },
                          { title: 'Orders', dataIndex: 'orderCount', key: 'orderCount', sorter: (a: any, b: any) => a.orderCount - b.orderCount },
                          { title: 'Customers', dataIndex: 'activeCustomers', key: 'activeCustomers' },
                          { title: 'Outstanding', dataIndex: 'outstandingAmount', key: 'outstandingAmount', render: (v) => v > 0 ? <Text strong style={{ color: '#EF4444' }}>{v?.toLocaleString()} {CURRENCY.symbol}</Text> : <Text type="secondary">0</Text>, sorter: (a: any, b: any) => a.outstandingAmount - b.outstandingAmount },
                        ]}
                      />
                    </Card>
                  </Col>
                </Row>
              </Spin>
            )
          }
          /*
          // ================= MARKETING & PROMO TAB =================
          ,{
            key: 'marketing',
            label: (
              <span>
                <PercentageOutlined />
                Marketing & Promotions
              </span>
            ),
            children: (
              <Spin spinning={loading}>
                // Marketing Comment & Insight Card
                <Card className="glass-card" variant="borderless" style={{ marginBottom: '24px' }}>
                  <div style={{ padding: '4px' }}>
                    <Text strong style={{ fontSize: '15px', color: '#4F46E5', display: 'block', marginBottom: '8px' }}>
                      📢 Marketing & Promotions Performance Insights
                    </Text>
                    <Text type="secondary" style={{ display: 'block', marginBottom: '4px' }}>
                      This report compiles and analyzes the financial efficacy of promotional activities. It automatically breaks down the total promotional investment into:
                    </Text>
                    <ul>
                      <li><Text strong>Order Discounts Value:</Text> Cash/threshold discounts applied directly to overall order amounts.</li>
                      <li><Text strong>Free Products Value:</Text> The estimated base value of products gifted to customers through "Buy X Get Y" promotions (calculated as <em>Promo Free Quantity × Product Unit Price</em>).</li>
                      <li><Text strong>Total Promo Investment:</Text> Combined cost of both threshold discounts and gifted products, showing the exact investment made into driving sales.</li>
                    </ul>
                    <Text type="secondary" style={{ display: 'block', marginTop: '8px' }}>
                      Use the segment distribution charts below to measure promotional performance across customer categories and sales channels.
                    </Text>
                  </div>
                </Card>

                // Marketing Spend Summary
                <Row gutter={[16, 16]} style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap' }}>
                  <Col xs={24} sm={8} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="Order Discounts Value"
                        value={marketingData?.promoSummary?.totalOrderPromoDiscounts || 0}
                        suffix={CURRENCY.symbol}
                        styles={{ content: { color: '#8B5CF6', fontWeight: 700 } }}
                        prefix={<PercentageOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="Free Products Value"
                        value={marketingData?.promoSummary?.totalFreeGiftsValue || 0}
                        suffix={CURRENCY.symbol}
                        styles={{ content: { color: '#F59E0B', fontWeight: 700 } }}
                        prefix={<ShoppingCartOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="Total Promo Investment"
                        value={marketingData?.promoSummary?.totalPromoValue || 0}
                        suffix={CURRENCY.symbol}
                        styles={{ content: { color: '#10B981', fontWeight: 900 } }}
                        prefix={<DollarOutlined />}
                      />
                    </Card>
                  </Col>
                </Row>

                // Pie Charts
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Card title="Sales by Customer Category" className="glass-card" variant="borderless">
                      <div style={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {marketingData?.categorySales && marketingData.categorySales.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={marketingData.categorySales}
                                dataKey="sales"
                                nameKey="category"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                              >
                                {marketingData.categorySales.map((_: any, index: number) => {
                                  const colors = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];
                                  return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                })}
                              </Pie>
                              <Tooltip formatter={(v: any) => `${Number(v).toLocaleString()} ${CURRENCY.symbol}`} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <Text type="secondary">No data available</Text>
                        )}
                      </div>
                    </Card>
                  </Col>

                  <Col xs={24} md={12}>
                    <Card title="Sales by Customer Channel" className="glass-card" variant="borderless">
                      <div style={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {marketingData?.channelSales && marketingData.channelSales.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={marketingData.channelSales}
                                dataKey="sales"
                                nameKey="channel"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#82ca9d"
                                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                              >
                                {marketingData.channelSales.map((_: any, index: number) => {
                                  const colors = ['#3B82F6', '#EC4899', '#8B5CF6', '#10B981', '#F59E0B'];
                                  return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                })}
                              </Pie>
                              <Tooltip formatter={(v: any) => `${Number(v).toLocaleString()} ${CURRENCY.symbol}`} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <Text type="secondary">No data available</Text>
                        )}
                      </div>
                    </Card>
                  </Col>
                </Row>
              </Spin>
            )
          }
          */
        ]}
      />
    </div>
  );
};
export default Reports;
