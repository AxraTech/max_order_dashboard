import React, { useEffect, useState } from 'react';
import { Card, Typography, Table, Tag, Input, Select, Space, Row, Col, Button, Modal, Form, InputNumber, DatePicker, Checkbox, Tabs, message, Popconfirm, Upload, Collapse, Switch } from 'antd';
import { SearchOutlined, CalendarOutlined, PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, FileExcelOutlined, FilePdfOutlined, SwapRightOutlined } from '@ant-design/icons';
import { api } from '../../services/api';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const { Title, Text } = Typography;

interface BatchInfo {
  id: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  reservedQty: number;
  returnedQty: number;
  sampleQty: number;
  focQty: number;
  costPrice: number;
  sellingPrice: number;
  categoryDescription?: string | null;
  damageStock: number;
  manufacturingDate?: string | null;
  notes?: string | null;
  expiryAlertThreshold: number;
}

interface StockItem {
  id: string;
  warehouseId: string;
  productId: string;
  quantity: number;
  reservedQty: number;
  damagedQty: number;
  returnedQty: number;
  sampleQty: number;
  focQty: number;
  reorderLevel: number;
  safetyStock: number;
  minStockLevel: number;
  product: {
    id: string;
    code: string;
    name: string;
    sku: string;
    uom: string;
    genericName: string | null;
    brandName: string | null;
    basePrice: number;
    dealerPrice?: number;
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
    branch: {
      id: string;
      name: string;
    };
  };
  batches: BatchInfo[];
}

interface WarehouseSummary {
  id: string;
  code: string;
  name: string;
  branch: {
    name: string;
  };
}

export const Inventory: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseSummary[]>([]);
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [productSearchText, setProductSearchText] = useState('');
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [form] = Form.useForm();

  // Creatable options for categoryDescription
  const DEFAULT_CAT_DESCS = ['CPD', 'G1', 'G2', 'G3', 'PC', 'HOVID'];
  const [catDescOptions, setCatDescOptions] = useState<string[]>(DEFAULT_CAT_DESCS);
  const [catDescSearch, setCatDescSearch] = useState('');

  // Tracks existing selling price when re-stocking a known product
  const [existingSellingPrice, setExistingSellingPrice] = useState<number | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [businessUnits, setBusinessUnits] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showNewProductDetails, setShowNewProductDetails] = useState(false);
  const [isCustomProduct, setIsCustomProduct] = useState(false);

  // Edit Batch State
  const [editingBatch, setEditingBatch] = useState<BatchInfo | null>(null);
  const [isEditBatchOpen, setIsEditBatchOpen] = useState(false);
  const [batchForm] = Form.useForm();

  // Tabs & Filters state
  const [activeTab, setActiveTab] = useState<string>('all'); // 'all' or 'expired'
  const [search, setSearch] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [importing, setImporting] = useState(false);


  const handleImportExcel = async (file: any) => {
    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await api.post('/inventory/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (res.data.success) {
        const { successCount, total, errors } = res.data.data;
        message.success(`Successfully imported ${successCount}/${total} inventory items!`);
        if (errors && errors.length > 0) {
          console.warn('Import warnings:', errors);
          message.warning(`${errors.length} products could not be matched. See console logs.`);
        }
        fetchStocks();
      }
    } catch (err: any) {
      console.error('Import failed:', err);
      message.error(err.response?.data?.message || 'Failed to import inventory');
    } finally {
      setImporting(false);
    }
    return false; // prevent automatic upload by antd
  };

  const fetchAllStocksForExport = async () => {
    let whParam = selectedWarehouse === 'all' ? undefined : selectedWarehouse;
    if (activeTab === 'hq') {
      const hqWarehouse = warehouses.find(
        (w) => w.code === 'WH-HQ' || w.name?.toLowerCase().includes('hq') || w.name?.toLowerCase().includes('main')
      );
      if (hqWarehouse) {
        whParam = hqWarehouse.id;
      }
    }

    const res = await api.get('/inventory', {
      params: {
        limit: 10000, // Fetch all records to bypass pagination limit
        search: search || undefined,
        warehouseId: whParam,
      },
    });
    
    if (res.data.success) {
      return res.data.data;
    }
    throw new Error('Failed to fetch data');
  };

  const handleExportExcel = async () => {
    const msgKey = 'export-excel';
    try {
      message.loading({ content: 'Generating Excel export (including all batches)...', key: msgKey });
      const allStocks = await fetchAllStocksForExport();
      
      const exportData: any[] = [];
      let index = 1;

      allStocks.forEach((item: any) => {
        if (item.batches && item.batches.length > 0) {
          item.batches.forEach((batch: any) => {
            const available = batch.quantity - batch.reservedQty;
            const expiry = new Date(batch.expiryDate);
            const isExpired = expiry < new Date();
            const thirtyDays = new Date();
            thirtyDays.setDate(thirtyDays.getDate() + 30);
            const status = isExpired ? 'EXPIRED' : (expiry <= thirtyDays ? 'NEAR EXPIRY' : 'ACTIVE');

            const cogs = Number(batch.costPrice || 0);
            const sp = Number(batch.sellingPrice || 0);
            const gp = sp - cogs;
            const gpPct = sp > 0 ? ((gp / sp) * 100).toFixed(1) : '0.0';

            exportData.push({
              'No': index++,
              'Product Code': item.product.code,
              'SKU': item.product.sku,
              'Product Name': item.product.name,
              'UOM': item.product.uom,
              'Batch Number': batch.batchNumber,
              'Expiry Date': expiry.toLocaleDateString(),
              'Team': batch.categoryDescription || '—',
              'Physical Qty': batch.quantity,
              'Block Qty': batch.reservedQty,
              'Returned Qty': batch.returnedQty || 0,
              'Sample Qty': batch.sampleQty || 0,
              'FOC Qty': batch.focQty || 0,
              'Available Qty': available,
              'COGS (MMK)': cogs,
              'Selling Price (MMK)': sp,
              'GP (MMK)': gp,
              'GP %': `${gpPct}%`,
              'Warehouse': item.warehouse.name,
              'Branch': item.warehouse.branch.name,
              'Batch Status': status
            });
          });
        } else {
          const available = item.quantity - item.reservedQty;
          exportData.push({
            'No': index++,
            'Product Code': item.product.code,
            'SKU': item.product.sku,
            'Product Name': item.product.name,
            'UOM': item.product.uom,
            'Batch Number': '-',
            'Expiry Date': '-',
            'Team': '—',
            'Physical Qty': item.quantity,
            'Block Qty': item.reservedQty,
            'Returned Qty': item.returnedQty || 0,
            'Sample Qty': item.sampleQty || 0,
            'FOC Qty': item.focQty || 0,
            'Available Qty': available,
            'Warehouse': item.warehouse.name,
            'Branch': item.warehouse.branch.name,
            'Batch Status': available <= item.minStockLevel ? 'CRITICAL STOCK' : (available <= item.safetyStock ? 'LOW STOCK' : 'HEALTHY')
          });
        }
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory Batches');
      
      // Auto-fit column widths
      const maxColWidth = exportData.reduce((acc: any, row: any) => {
        Object.keys(row).forEach((key, idx) => {
          const valLen = String(row[key] || '').length;
          acc[idx] = Math.max(acc[idx] || 0, key.length, valLen);
        });
        return acc;
      }, []);
      worksheet['!cols'] = maxColWidth.map((w: number) => ({ w: w + 2 }));

      XLSX.writeFile(workbook, `Inventory_Batch_Report_${dayjs().format('YYYY-MM-DD')}.xlsx`);
      message.success({ content: 'Excel report exported successfully', key: msgKey });
    } catch (err: any) {
      console.error('Failed to export Excel:', err);
      message.error({ content: 'Failed to generate Excel export', key: msgKey });
    }
  };

  const handleExportPDF = async () => {
    const msgKey = 'export-pdf';
    try {
      message.loading({ content: 'Generating PDF export (including all batches)...', key: msgKey });
      const allStocks = await fetchAllStocksForExport();

      const doc = new jsPDF('landscape');
      
      doc.setFontSize(16);
      doc.text('MaxOrder Inventory Stock Control Report (Batch Level)', 14, 15);
      
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()} | Total Items: ${allStocks.length}`, 14, 22);
      
      const tableColumn = [
        'No', 'Code', 'SKU', 'Product Name', 'UOM', 'Batch No', 'Expiry Date', 'Team', 'Physical Qty', 'Block Qty', 'Returned Qty', 'Sample Qty', 'FOC Qty', 'Available Qty', 'Warehouse', 'Status'
      ];
      
      const tableRows: any[] = [];
      let index = 1;

      allStocks.forEach((item: any) => {
        if (item.batches && item.batches.length > 0) {
          item.batches.forEach((batch: any) => {
            const available = batch.quantity - batch.reservedQty;
            const expiry = new Date(batch.expiryDate);
            const isExpired = expiry < new Date();
            const thirtyDays = new Date();
            thirtyDays.setDate(thirtyDays.getDate() + 30);
            const status = isExpired ? 'EXPIRED' : (expiry <= thirtyDays ? 'NEAR EXPIRY' : 'ACTIVE');

            tableRows.push([
              index++,
              item.product.code,
              item.product.sku,
              item.product.name,
              item.product.uom,
              batch.batchNumber,
              expiry.toLocaleDateString(),
              batch.categoryDescription || '—',
              batch.quantity,
              batch.reservedQty,
              batch.returnedQty || 0,
              batch.sampleQty || 0,
              batch.focQty || 0,
              available,
              `${item.warehouse.name} (${item.warehouse.branch.name.replace(' Branch', '')})`,
              status
            ]);
          });
        } else {
          const available = item.quantity - item.reservedQty;
          const status = available <= item.minStockLevel ? 'CRITICAL' : (available <= item.safetyStock ? 'LOW' : 'HEALTHY');
          tableRows.push([
            index++,
            item.product.code,
            item.product.sku,
            item.product.name,
            item.product.uom,
            '-',
            '-',
            '—',
            item.quantity,
            item.reservedQty,
            item.returnedQty || 0,
            item.sampleQty || 0,
            item.focQty || 0,
            available,
            `${item.warehouse.name} (${item.warehouse.branch.name.replace(' Branch', '')})`,
            status
          ]);
        }
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 26,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 15 },
          2: { cellWidth: 15 },
          3: { cellWidth: 30 },
          4: { cellWidth: 10 },
          5: { cellWidth: 20 },
          6: { cellWidth: 15 },
          7: { cellWidth: 12 },
          8: { cellWidth: 12 },
          9: { cellWidth: 12 },
          10: { cellWidth: 12 },
          11: { cellWidth: 12 },
          12: { cellWidth: 12 },
          13: { cellWidth: 12 },
          14: { cellWidth: 25 },
          15: { cellWidth: 15 }
        }
      });
      
      doc.save(`Inventory_Batch_Report_${dayjs().format('YYYY-MM-DD')}.pdf`);
      message.success({ content: 'PDF report exported successfully', key: msgKey });
    } catch (err: any) {
      console.error('Failed to export PDF:', err);
      message.error({ content: 'Failed to generate PDF export', key: msgKey });
    }
  };
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchWarehouses();
    fetchProductsList();
    fetchBranchesList();
    fetchCategories();
    fetchBusinessUnits();
    fetchSuppliers();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/products/categories');
      if (res.data.success) setCategories(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBusinessUnits = async () => {
    try {
      const res = await api.get('/products/business-units');
      if (res.data.success) setBusinessUnits(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers');
      if (res.data.success) setSuppliers(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, [search, selectedWarehouse, currentPage, pageSize, activeTab, warehouses]);

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/inventory/warehouses');
      if (res.data.success) {
        setWarehouses(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
    }
  };

  const fetchProductsList = async () => {
    try {
      const res = await api.get('/products', { params: { limit: 1000 } });
      if (res.data.success) {
        setProductsList(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const fetchBranchesList = async () => {
    try {
      const res = await api.get('/branches');
      if (res.data.success) {
        // Only assign active branches
        setBranchesList(res.data.data.filter((b: any) => b.isActive));
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  };

  const handleEditBatch = (batch: BatchInfo) => {
    setEditingBatch(batch);
    const qty  = Number(batch.quantity);
    const cogs = Number(batch.costPrice);
    batchForm.setFieldsValue({
      quantity: qty,
      costPrice: cogs,
      sellingPrice: Number(batch.sellingPrice || 0),
      totalAmount: qty * cogs,
      expiryDate: dayjs(batch.expiryDate),
      manufacturingDate: batch.manufacturingDate ? dayjs(batch.manufacturingDate) : null,
      categoryDescription: batch.categoryDescription,
      damageStock: batch.damageStock ?? 0,
      sampleQty: batch.sampleQty ?? 0,
      focQty: batch.focQty ?? 0,
      notes: batch.notes,
      expiryAlertThreshold: batch.expiryAlertThreshold || 30,
    });
    setIsEditBatchOpen(true);
  };

  const handleUpdateBatchSubmit = async (values: any) => {
    if (!editingBatch) return;
    try {
      setSubmitting(true);
      const payload = {
        ...values,
        expiryDate: dayjs(values.expiryDate).toISOString(),
        manufacturingDate: values.manufacturingDate ? dayjs(values.manufacturingDate).toISOString() : null,
      };
      
      const res = await api.put(`/inventory/batches/${editingBatch.id}`, payload);
      if (res.data.success) {
        message.success('Stock batch updated successfully');
        setIsEditBatchOpen(false);
        setEditingBatch(null);
        batchForm.resetFields();
        fetchStocks();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update stock batch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    try {
      const res = await api.delete(`/inventory/batches/${batchId}`);
      if (res.data.success) {
        message.success('Stock batch deleted successfully');
        fetchStocks();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to delete stock batch');
    }
  };

  const fetchStocks = async () => {
    try {
      setLoading(true);
      let whParam = selectedWarehouse === 'all' ? undefined : selectedWarehouse;

      if (activeTab === 'hq') {
        const hqWarehouse = warehouses.find(
          (w) => w.code === 'WH-HQ' || w.name?.toLowerCase().includes('hq') || w.name?.toLowerCase().includes('main')
        );
        if (hqWarehouse) {
          whParam = hqWarehouse.id;
        }
      }

      const res = await api.get('/inventory', {
        params: {
          page: currentPage,
          limit: pageSize,
          search: search || undefined,
          warehouseId: whParam,
        },
      });
      if (res.data.success) {
        setStocks(res.data.data);
        setTotalItems(res.data.meta?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch stock levels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInventory = async (values: any) => {
    try {
      setSubmitting(true);
      const { manufacturingDate, expiryDate, ...rest } = values;
      
      const payload = {
        ...rest,
        manufacturingDate: manufacturingDate ? dayjs(manufacturingDate).toISOString() : null,
        expiryDate: dayjs(expiryDate).toISOString(),
      };

      const res = await api.post('/inventory', payload);
      if (res.data.success) {
        message.success('Inventory batches created successfully');
        setIsModalOpen(false);
        form.resetFields();
        fetchStocks();
      }
    } catch (err: any) {
      console.error('Failed to add inventory:', err);
      message.error(err.response?.data?.message || 'Failed to create inventory records');
    } finally {
      setSubmitting(false);
    }
  };

  const getStockStatusTag = (stock: StockItem) => {
    const available = stock.quantity - stock.reservedQty;
    if (available <= stock.minStockLevel) {
      return <Tag color="red" style={{ fontWeight: 600, border: 'none', borderRadius: '12px' }}>CRITICAL STOCK</Tag>;
    }
    if (available <= stock.safetyStock) {
      return <Tag color="orange" style={{ fontWeight: 600, border: 'none', borderRadius: '12px' }}>LOW STOCK</Tag>;
    }
    return <Tag color="green" style={{ fontWeight: 600, border: 'none', borderRadius: '12px' }}>HEALTHY</Tag>;
  };

  const getBatchStatusTag = (expiryStr: string, qty: number, reserved: number) => {
    const expiry = new Date(expiryStr);
    const now = new Date();
    const available = qty - reserved;

    if (expiry < now) {
      return <Tag color="red" style={{ border: 'none', borderRadius: '12px', fontWeight: 500 }}>EXPIRED (DO NOT USE)</Tag>;
    }

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    if (expiry <= thirtyDaysFromNow) {
      return <Tag color="orange" style={{ border: 'none', borderRadius: '12px', fontWeight: 500 }}>NEAR EXPIRY</Tag>;
    }

    if (available <= 0) {
      return <Tag color="default" style={{ border: 'none', borderRadius: '12px', fontWeight: 500 }}>BLOCKED</Tag>;
    }

    return <Tag color="green" style={{ border: 'none', borderRadius: '12px', fontWeight: 500 }}>ACTIVE</Tag>;
  };

  // Expanded row render for Batch detailed list
  const expandedRowRender = (record: StockItem) => {
    // Filter batches if activeTab is 'expired'
    const batchesToShow = activeTab === 'expired' 
      ? record.batches.filter(b => new Date(b.expiryDate) < new Date())
      : record.batches;

    const columns = [
      {
        title: 'Batch Number',
        dataIndex: 'batchNumber',
        key: 'batchNumber',
        width: 140,
        render: (text: string) => <Text code style={{ fontWeight: 500 }}>{text}</Text>,
      },
      {
        title: 'Expiry Date',
        dataIndex: 'expiryDate',
        key: 'expiryDate',
        width: 120,
        render: (dateStr: string) => {
          const isExpired = new Date(dateStr) < new Date();
          return (
            <Space style={{ color: isExpired ? '#EF4444' : 'inherit' }}>
              <CalendarOutlined />
              <span>{new Date(dateStr).toLocaleDateString()}</span>
            </Space>
          );
        },
      },
      {
        title: 'Mfg Date',
        dataIndex: 'manufacturingDate',
        key: 'manufacturingDate',
        width: 110,
        render: (dateStr: string | null) => dateStr ? new Date(dateStr).toLocaleDateString() : <Text type="secondary">-</Text>,
      },
      {
        title: 'Team',
        dataIndex: 'categoryDescription',
        key: 'categoryDescription',
        width: 80,
        render: (val: string | null) => val ? <Tag color="blue" style={{ border: 'none', borderRadius: '8px' }}>{val}</Tag> : <Text type="secondary">-</Text>,
      },
      {
        title: 'Physical Qty',
        dataIndex: 'quantity',
        key: 'quantity',
        width: 100,
        render: (val: number) => <strong>{val}</strong>,
      },
      {
        title: 'Block Qty',
        dataIndex: 'reservedQty',
        key: 'reservedQty',
        width: 90,
        render: (val: number) => <span style={{ color: val > 0 ? 'var(--warning-color)' : 'inherit' }}>{val}</span>,
      },
      {
        title: 'Returned Qty',
        dataIndex: 'returnedQty',
        key: 'returnedQty',
        width: 100,
        render: (val: number) => <span style={{ color: val > 0 ? '#10B981' : 'inherit' }}>{val || 0}</span>,
      },
      {
        title: 'Sample Qty',
        dataIndex: 'sampleQty',
        key: 'sampleQty',
        width: 90,
        render: (val: number) => <span style={{ color: val > 0 ? '#8B5CF6' : 'inherit' }}>{val || 0}</span>,
      },
      {
        title: 'FOC Qty',
        dataIndex: 'focQty',
        key: 'focQty',
        width: 85,
        render: (val: number) => <span style={{ color: val > 0 ? '#EC4899' : 'inherit' }}>{val || 0}</span>,
      },
      {
        title: 'Damage Qty',
        dataIndex: 'damageStock',
        key: 'damageStock',
        width: 95,
        render: (val: number) => <span style={{ color: val > 0 ? '#EF4444' : 'inherit', fontWeight: val > 0 ? 600 : 'normal' }}>{val || 0}</span>,
      },
      {
        title: 'Available Qty',
        key: 'available',
        width: 100,
        render: (_: any, batch: BatchInfo) => (
          <strong style={{ color: (batch.quantity - batch.reservedQty) > 0 ? '#10B981' : '#9CA3AF' }}>
            {batch.quantity - batch.reservedQty}
          </strong>
        ),
      },
      {
        title: 'Total Value',
        key: 'totalValue',
        width: 140,
        render: (_: any, batch: BatchInfo) => {
          const totalVal = batch.quantity * Number(batch.costPrice || 0);
          return (
            <span style={{
              fontWeight: 600,
              color: '#4F46E5',
              background: 'rgba(79,70,229,0.07)',
              borderRadius: '6px',
              padding: '2px 7px',
              whiteSpace: 'nowrap',
            }}>
              {totalVal.toLocaleString()} MMK
            </span>
          );
        },
      },
      {
        title: 'COGS',
        dataIndex: 'costPrice',
        key: 'costPrice',
        width: 120,
        render: (val: number) => <span>{val ? Number(val).toLocaleString() : '0'} MMK</span>,
      },
      {
        title: 'Selling Price',
        dataIndex: 'sellingPrice',
        key: 'sellingPrice',
        width: 130,
        render: (val: number) => <span>{val ? Number(val).toLocaleString() : '0'} MMK</span>,
      },
      {
        title: 'GP',
        key: 'gp',
        width: 180,
        render: (_: any, batch: BatchInfo) => {
          const cogs = Number(batch.costPrice || 0);
          const sp = Number(batch.sellingPrice || 0);
          const gp = sp - cogs;
          const pct = sp > 0 ? ((gp / sp) * 100).toFixed(1) : '0.0';
          return (
            <Tag color={gp >= 0 ? 'green' : 'red'} style={{ border: 'none', borderRadius: '6px', fontWeight: 600 }}>
              {gp >= 0 ? `+${gp.toLocaleString()}` : gp.toLocaleString()} MMK ({pct}%)
            </Tag>
          );
        },
      },
      {
        title: 'Regulatory Status',
        key: 'status',
        width: 140,
        render: (_: any, batch: BatchInfo) => getBatchStatusTag(batch.expiryDate, batch.quantity, batch.reservedQty),
      },
      {
        title: 'Notes',
        dataIndex: 'notes',
        key: 'notes',
        width: 120,
        render: (text: string | null) => text || '-',
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 80,
        fixed: 'right' as const,
        render: (_: any, batch: BatchInfo) => (
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditBatch(batch)}
            />
            <Popconfirm
              title="Delete this batch?"
              description="This will decrement parent stock quantity accordingly."
              onConfirm={() => handleDeleteBatch(batch.id)}
              okButtonProps={{ danger: true }}
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ),
      }
    ];

    return (
      <Card 
        styles={{ body: { padding: '16px' } }}
        style={{ margin: '8px 0', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', background: 'rgba(249, 250, 251, 0.5)' }}
      >
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-secondary)' }}>
            FIFO Batch Queue Allocation:
          </span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11px',
            color: '#6366F1',
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: '20px',
            padding: '2px 10px',
            fontWeight: 500,
            animation: 'scrollHintPulse 2s ease-in-out infinite',
          }}>
            <SwapRightOutlined style={{ fontSize: '13px' }} />
            Scroll to see more
          </span>
        </div>
        <Table
          columns={columns}
          dataSource={batchesToShow.map((b, idx) => ({ ...b, key: b.id || idx }))}
          pagination={false}
          size="small"
          scroll={{ x: 'max-content' }}
        />
      </Card>
    );
  };

  const columns = [
    {
      title: 'Product (Medicine)',
      key: 'product',
      width: 200,
      fixed: 'left' as const,
      render: (_: any, record: StockItem) => (
        <div>
          <div style={{ fontWeight: 600, color: '#111827' }}>{record.product.name}</div>
          {record.product.genericName && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Generic: {record.product.genericName}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'SKU',
      dataIndex: ['product', 'sku'],
      key: 'sku',
      width: 110,
      fixed: 'left' as const,
      render: (sku: string) => <Text code>{sku}</Text>,
    },
    {
      title: 'Warehouse',
      key: 'warehouse',
      width: 180,
      render: (_: any, record: StockItem) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.warehouse.name}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.warehouse.branch.name}
          </Text>
        </div>
      ),
    },

    {
      title: 'Physical Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 110,
      render: (qty: number, record: StockItem) => (
        <span>{qty} {record.product.uom}</span>
      ),
    },
    {
      title: 'Block Qty',
      dataIndex: 'reservedQty',
      key: 'reservedQty',
      width: 100,
      render: (val: number, record: StockItem) => (
        <span style={{ color: val > 0 ? '#F59E0B' : 'inherit' }}>{val} {record.product.uom}</span>
      ),
    },
    {
      title: 'Returned Qty',
      dataIndex: 'returnedQty',
      key: 'returnedQty',
      width: 110,
      render: (val: number, record: StockItem) => (
        <span style={{ color: val > 0 ? '#10B981' : 'inherit' }}>{val || 0} {record.product.uom}</span>
      ),
    },
    {
      title: 'Sample Qty',
      dataIndex: 'sampleQty',
      key: 'sampleQty',
      width: 100,
      render: (val: number, record: StockItem) => (
        <span style={{ color: val > 0 ? '#8B5CF6' : 'inherit' }}>{val || 0} {record.product.uom}</span>
      ),
    },
    {
      title: 'FOC Qty',
      dataIndex: 'focQty',
      key: 'focQty',
      width: 95,
      render: (val: number, record: StockItem) => (
        <span style={{ color: val > 0 ? '#EC4899' : 'inherit' }}>{val || 0} {record.product.uom}</span>
      ),
    },
    {
      title: 'Available Qty',
      key: 'available',
      width: 110,
      render: (_: any, record: StockItem) => {
        const available = record.quantity - record.reservedQty;
        return (
          <strong style={{ color: available > record.safetyStock ? '#10B981' : '#EF4444' }}>
            {available} {record.product.uom}
          </strong>
        );
      },
    },
    {
      title: 'Total Value',
      key: 'totalValue',
      width: 150,
      render: (_: any, record: StockItem) => {
        // Sum across all batches: each batch qty × its COGS
        const total = record.batches.reduce((sum, b) => {
          return sum + (b.quantity * Number((b as any).costPrice || 0));
        }, 0);
        return (
          <span style={{
            fontWeight: 700,
            color: '#4F46E5',
            background: 'rgba(79,70,229,0.08)',
            borderRadius: '8px',
            padding: '3px 8px',
            whiteSpace: 'nowrap',
            fontSize: '12px',
          }}>
            {total.toLocaleString()} MMK
          </span>
        );
      },
    },
    {
      title: 'Stock Status',
      key: 'status',
      width: 130,
      fixed: 'right' as const,
      render: (_: any, record: StockItem) => getStockStatusTag(record),
    },
  ];

  // Filter stocks depending on tab selection (Expired vs All)
  const filteredStocks = activeTab === 'expired'
    ? stocks.filter(stock => 
        stock.batches && stock.batches.some(batch => new Date(batch.expiryDate) < new Date())
      )
    : stocks;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Inventory Control & FIFO Batches</Title>
        <Space>
          <Button
            icon={<FileExcelOutlined />}
            onClick={handleExportExcel}
            style={{ borderRadius: '12px' }}
          >
            Export Excel
          </Button>
          <Button
            icon={<FilePdfOutlined />}
            onClick={handleExportPDF}
            style={{ borderRadius: '12px' }}
          >
            Export PDF
          </Button>
          <Button
            href="/templates/Inventory_Import_Template.xlsx"
            target="_blank"
            icon={<FileExcelOutlined />}
            style={{ borderRadius: '12px' }}
          >
            Template
          </Button>
          <Upload
            accept=".xlsx"
            showUploadList={false}
            beforeUpload={handleImportExcel}
          >
            <Button
              icon={<UploadOutlined />}
              style={{ borderRadius: '12px' }}
              loading={importing}
            >
              Import Excel
            </Button>
          </Upload>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
            style={{ borderRadius: '12px' }}
          >
            Add Inventory
          </Button>
        </Space>
      </div>

      {/* Tabs for All Stock vs Expired */}
      <Tabs 
        activeKey={activeTab} 
        onChange={(key) => {
          setActiveTab(key);
          setCurrentPage(1);
        }}
        style={{ marginBottom: '20px' }}
        items={[
          { key: 'all', label: 'All Inventory Stock' },
          { key: 'expired', label: 'Expired Inventory Only' },
          { key: 'hq', label: 'HeadQuarter / Main Inventory' }
        ]}
      />

      {/* Filter controls */}
      <Card className="glass-card" variant="borderless" style={{ marginBottom: '20px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search strictly by product (Name, SKU, Code, Generic...)"
              prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              style={{ borderRadius: '12px' }}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              style={{ width: '100%', borderRadius: '12px' }}
              value={activeTab === 'hq' ? (warehouses.find(w => w.code === 'WH-HQ' || w.name?.toLowerCase().includes('hq') || w.name?.toLowerCase().includes('main'))?.id || 'all') : selectedWarehouse}
              onChange={(val) => {
                setSelectedWarehouse(val);
                setCurrentPage(1);
              }}
              disabled={activeTab === 'hq'}
            >
              <Select.Option value="all">All Warehouses</Select.Option>
              {warehouses.map((wh) => (
                <Select.Option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.branch.name})
                </Select.Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Table listing */}
      {/* Horizontal scroll indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: '8px',
        gap: '8px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: '24px',
          padding: '5px 14px',
          fontSize: '12px',
          color: '#6366F1',
          fontWeight: 600,
          letterSpacing: '0.01em',
        }}>
          {/* Animated arrow track */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <span style={{ animation: 'scrollArrow 1.4s ease-in-out infinite', display: 'inline-block', opacity: 0.4 }}>›</span>
            <span style={{ animation: 'scrollArrow 1.4s ease-in-out 0.2s infinite', display: 'inline-block', opacity: 0.65 }}>›</span>
            <span style={{ animation: 'scrollArrow 1.4s ease-in-out 0.4s infinite', display: 'inline-block', opacity: 0.9 }}>›</span>
          </div>
          Scroll horizontally to view all columns
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <span style={{ animation: 'scrollArrow 1.4s ease-in-out infinite', display: 'inline-block', opacity: 0.4 }}>›</span>
            <span style={{ animation: 'scrollArrow 1.4s ease-in-out 0.2s infinite', display: 'inline-block', opacity: 0.65 }}>›</span>
            <span style={{ animation: 'scrollArrow 1.4s ease-in-out 0.4s infinite', display: 'inline-block', opacity: 0.9 }}>›</span>
          </div>
        </div>
      </div>

      <Card className="glass-card" variant="borderless" styles={{ body: { padding: '0px' } }}>
        <Table
          columns={columns}
          dataSource={filteredStocks.map((item, idx) => ({ ...item, key: item.id || idx }))}
          expandable={{
            expandedRowRender,
            rowExpandable: (record) => record.batches && record.batches.length > 0,
          }}
          loading={loading}
          size="small"
          scroll={{ x: 'max-content' }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: activeTab === 'expired' ? filteredStocks.length : totalItems,
            showSizeChanger: true,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
            style: { padding: '16px' },
          }}
        />
      </Card>

      {/* Add Inventory Modal */}
      <Modal
        title={<span style={{ fontWeight: 700, fontSize: '18px' }}>Add Inventory Stock Batch</span>}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setExistingSellingPrice(null);
        }}
        footer={null}
        width={760}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddInventory}
          initialValues={{
            expiryAlertThreshold: 30,
            quantity: 100,
            costPrice: 0,
            totalAmount: 0,
            sampleQty: 0,
            focQty: 0
          }}
          style={{ marginTop: '20px' }}
        >
          <Form.Item
            name="productId"
            label="Product Selection"
            rules={[{ required: true, message: 'Please select or enter a product!' }]}
          >
            <Select
              showSearch
              placeholder="Type product name, SKU, or enter custom product (e.g. BB)..."
              searchValue={productSearchText}
              onSearch={(val) => setProductSearchText(val)}
              onChange={(val) => {
                form.setFieldValue('productId', val);
                setProductSearchText('');

                const prod = productsList.find((p) => p.id === val);
                const isCustom = prod?.isCustom || !prod;
                setIsCustomProduct(isCustom);
                if (isCustom) {
                  setShowNewProductDetails(true);
                  form.setFieldsValue({ uom: 'Box', mustSale: false });
                } else {
                  form.setFieldsValue({
                    categoryId: prod.categoryId || prod.category?.id,
                    businessUnitId: prod.businessUnitId || prod.businessUnit?.id,
                    supplierId: prod.supplierId || prod.supplier?.id,
                    uom: prod.uom || 'Box',
                    mustSale: prod.mustSale || false,
                    genericName: prod.genericName,
                    brandName: prod.brandName,
                    dosageForm: prod.dosageForm,
                  });
                }

                // ── Auto-fill selling price from existing batches ──────────
                let foundSp: number | null = null;
                for (const s of stocks) {
                  if (s.productId === val || s.product?.id === val) {
                    for (const b of s.batches) {
                      const sp = Number((b as any).sellingPrice);
                      if (sp > 0) { foundSp = sp; break; }
                    }
                    if (foundSp) break;
                  }
                }
                if (!foundSp && prod && Number(prod.sellingPrice) > 0) {
                  foundSp = Number(prod.sellingPrice);
                }

                setExistingSellingPrice(foundSp);
                if (foundSp !== null) {
                  form.setFieldValue('sellingPrice', foundSp);
                } else {
                  form.setFieldValue('sellingPrice', undefined);
                }
                // ──────────────────────────────────────────────────────────
              }}
              filterOption={(input, option) => {
                const label = String(option?.label ?? '').toLowerCase();
                const query = input.toLowerCase().trim();
                return label.includes(query);
              }}
              dropdownRender={(menu) => {
                const query = productSearchText.trim();
                const hasMatch = productsList.some(
                  (p) =>
                    p.id === query ||
                    p.name?.toLowerCase() === query.toLowerCase() ||
                    p.sku?.toLowerCase() === query.toLowerCase() ||
                    p.code?.toLowerCase() === query.toLowerCase()
                );
                return (
                  <>
                    {menu}
                    {query && !hasMatch && (
                      <div
                        style={{
                          padding: '10px 12px',
                          cursor: 'pointer',
                          color: '#0284c7',
                          fontWeight: 600,
                          borderTop: '1px solid #e0f2fe',
                          background: '#f0f9ff',
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          const customVal = query;
                          if (!productsList.some((p) => p.id === customVal)) {
                            setProductsList((prev) => [{ id: customVal, name: customVal, isCustom: true }, ...prev]);
                          }
                          form.setFieldValue('productId', customVal);
                          setIsCustomProduct(true);
                          setShowNewProductDetails(true);
                          form.setFieldsValue({ uom: 'Box', mustSale: false });
                          setExistingSellingPrice(null);
                          setProductSearchText('');
                        }}
                      >
                        + Create & Ingest New Product "{query}"
                      </div>
                    )}
                  </>
                );
              }}
              options={productsList.map((p) => ({
                value: p.id,
                label: p.isCustom
                  ? `✨ New Product: ${p.name}`
                  : `${p.name} ${p.sku ? `(${p.sku})` : p.code ? `(${p.code})` : ''} ${p.genericName ? `[${p.genericName}]` : ''}`.trim(),
              }))}
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>

          {/* Collapsible Product Master Attributes Section */}
          <Collapse
            ghost
            activeKey={showNewProductDetails ? ['productMasterDetails'] : []}
            onChange={(keys) => setShowNewProductDetails(keys.includes('productMasterDetails'))}
            style={{ marginBottom: '16px' }}
            items={[
              {
                key: 'productMasterDetails',
                label: (
                  <span style={{ fontWeight: 600, color: '#4F46E5', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    🏷️ Product Master Attributes {isCustomProduct ? '(Auto-Created for New Product)' : '(View/Edit Master Details)'}
                  </span>
                ),
                children: (
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <Row gutter={12}>
                      <Col span={8}>
                        <Form.Item name="productSku" label="SKU (Optional)">
                          <Input placeholder="Auto-generated if empty" style={{ borderRadius: '8px' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="categoryId" label="Category">
                          <Select
                            placeholder="Select Category"
                            allowClear
                            showSearch
                            optionFilterProp="children"
                            style={{ borderRadius: '8px' }}
                          >
                            {categories.map(c => (
                              <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="businessUnitId" label="Business Unit">
                          <Select
                            placeholder="Select Business Unit"
                            allowClear
                            showSearch
                            optionFilterProp="children"
                            style={{ borderRadius: '8px' }}
                          >
                            {businessUnits.map(b => (
                              <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={12}>
                      <Col span={8}>
                        <Form.Item name="supplierId" label="Supplier">
                          <Select
                            placeholder="Select Supplier"
                            allowClear
                            showSearch
                            optionFilterProp="children"
                            style={{ borderRadius: '8px' }}
                          >
                            {suppliers.map(s => (
                              <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="uom" label="Unit of Measure (UOM)">
                          <Input placeholder="e.g. Box, Bottle, Strip" style={{ borderRadius: '8px' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="mustSale" label="Must Sale Feature" valuePropName="checked">
                          <Switch checkedChildren="🔥 Must Sale" unCheckedChildren="Normal" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={12}>
                      <Col span={8}>
                        <Form.Item name="brandName" label="Brand Name (Optional)">
                          <Input placeholder="e.g. Amoxil" style={{ borderRadius: '8px' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="genericName" label="Generic Name (Optional)">
                          <Input placeholder="e.g. Amoxicillin" style={{ borderRadius: '8px' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="dosageForm" label="Dosage Form (Optional)">
                          <Input placeholder="e.g. Tablet, Capsule" style={{ borderRadius: '8px' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ),
              },
            ]}
          />

          <Row gutter={12}>
            {/* Col 1: Physical Stock Qty */}
            <Col span={6}>
              <Form.Item
                name="quantity"
                label="Physical Qty"
                rules={[
                  { required: true, message: 'Please input quantity!' },
                  { type: 'number', min: 1, message: 'Qty must be at least 1' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%', borderRadius: '8px' }}
                  placeholder="Total units"
                  onChange={(val) => {
                    const qty = Number(val || 0);
                    const cogs = Number(form.getFieldValue('costPrice') || 0);
                    if (qty > 0 && cogs > 0) {
                      form.setFieldValue('totalAmount', qty * cogs);
                    }
                  }}
                />
              </Form.Item>
            </Col>

            {/* Col 2: COGS */}
            <Col span={6}>
              <Form.Item
                name="costPrice"
                label="COGS / Unit (MMK)"
                rules={[
                  { required: true, message: 'Please input COGS!' },
                  { type: 'number', min: 0, message: 'COGS must be ≥ 0' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%', borderRadius: '8px' }}
                  placeholder="Cost per unit"
                  onChange={(val) => {
                    const cogs = Number(val || 0);
                    const qty = Number(form.getFieldValue('quantity') || 0);
                    if (qty > 0 && cogs >= 0) {
                      form.setFieldValue('totalAmount', qty * cogs);
                    }
                  }}
                />
              </Form.Item>
            </Col>

            {/* Col 3: Selling Price */}
            <Col span={6}>
              <Form.Item
                name="sellingPrice"
                label={
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                    Selling Price (MMK)
                    {existingSellingPrice !== null && (
                      <span style={{
                        fontSize: '10px',
                        color: '#6366F1',
                        fontWeight: 600,
                        background: 'rgba(99,102,241,0.1)',
                        border: '1px solid rgba(99,102,241,0.25)',
                        borderRadius: '10px',
                        padding: '1px 6px',
                        letterSpacing: '0.02em',
                      }}>
                        optional
                      </span>
                    )}
                  </span>
                }
                rules={[
                  {
                    required: existingSellingPrice === null,
                    message: 'Please input selling price!',
                  },
                  { type: 'number', min: 0, message: 'Must be ≥ 0' },
                ]}
                extra={
                  existingSellingPrice !== null ? (
                    <span style={{ fontSize: '11px', color: '#6366F1', display: 'flex', alignItems: 'center', gap: 4 }}>
                      ↩ Using existing: {existingSellingPrice.toLocaleString()} MMK
                    </span>
                  ) : null
                }
              >
                <InputNumber
                  style={{ width: '100%', borderRadius: '8px' }}
                  placeholder={existingSellingPrice !== null ? `${existingSellingPrice.toLocaleString()} (existing)` : 'Selling price'}
                />
              </Form.Item>
            </Col>

            {/* Col 4: Total Amount — right next to Selling Price */}
            <Col span={6}>
              <Form.Item
                noStyle
                shouldUpdate={(prev, curr) =>
                  prev.quantity !== curr.quantity ||
                  prev.costPrice !== curr.costPrice ||
                  prev.totalAmount !== curr.totalAmount
                }
              >
                {({ getFieldValue }) => {
                  const qty  = Number(getFieldValue('quantity') || 0);
                  const cogs = Number(getFieldValue('costPrice') || 0);
                  const autoTotal = qty * cogs;
                  return (
                    <Form.Item
                      name="totalAmount"
                      label="Total Amount (MMK)"
                      extra={
                        autoTotal > 0 ? (
                          <span style={{ fontSize: '11px', color: '#4F46E5', fontWeight: 500 }}>
                            {qty.toLocaleString()} × {cogs.toLocaleString()} = {autoTotal.toLocaleString()}
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Auto: qty × COGS</span>
                        )
                      }
                    >
                      <InputNumber
                        style={{ width: '100%', borderRadius: '8px', color: '#4F46E5', fontWeight: 700 }}
                        placeholder="Auto-calculated"
                        precision={7}
                        formatter={v => v ? Number(v).toLocaleString(undefined, { maximumFractionDigits: 7 }) : ''}
                        parser={v => v ? Number(String(v).replace(/,/g, '')) : 0}
                      />
                    </Form.Item>
                  );
                }}
              </Form.Item>
            </Col>
          </Row>

          {/* GP summary card */}
          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) =>
              prev.costPrice !== curr.costPrice || prev.sellingPrice !== curr.sellingPrice
            }
          >
            {({ getFieldValue }) => {
              const cogs = Number(getFieldValue('costPrice') || 0);
              const sp   = Number(getFieldValue('sellingPrice') || 0);
              const gp   = sp - cogs;
              const gpPercent = sp > 0 ? ((gp / sp) * 100).toFixed(1) : '0.0';
              return (
                <Card
                  size="small"
                  style={{ background: '#f8fafc', borderRadius: '10px', marginBottom: '16px', border: '1px solid #e2e8f0' }}
                  styles={{ body: { padding: '8px 14px' } }}
                >
                  <Row align="middle" justify="space-between">
                    <Col>
                      <Text type="secondary" style={{ fontSize: '13px', fontWeight: 600 }}>GP (Gross Profit / Unit):</Text>
                    </Col>
                    <Col>
                      <Tag color={gp >= 0 ? 'green' : 'red'} style={{ fontSize: '14px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px' }}>
                        {gp >= 0 ? `+${gp.toLocaleString()}` : gp.toLocaleString()} MMK ({gpPercent}%)
                      </Tag>
                    </Col>
                  </Row>
                </Card>
              );
            }}
          </Form.Item>


          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="batchNumber"
                label="Batch Number (Optional)"
              >
                <Input placeholder="e.g. BATCH-A99 (autogenerated if blank)" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="expiryAlertThreshold"
                label="Expiry Alert Configuration"
                rules={[{ required: true, message: 'Please select alert setting!' }]}
              >
                <Select placeholder="Alert threshold" style={{ borderRadius: '8px' }}>
                  <Select.Option value={30}>30 Days before expiry</Select.Option>
                  <Select.Option value={60}>60 Days before expiry</Select.Option>
                  <Select.Option value={90}>90 Days before expiry</Select.Option>
                  <Select.Option value={180}>180 Days before expiry</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="manufacturingDate"
                label="Manufacturing Date (Optional)"
              >
                <DatePicker style={{ width: '100%', borderRadius: '8px' }} placeholder="Select Mfg date" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="expiryDate"
                label="Expiry Date"
                rules={[{ required: true, message: 'Please select expiry date!' }]}
              >
                <DatePicker style={{ width: '100%', borderRadius: '8px' }} placeholder="Select expiry date" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="categoryDescription" label="Team">
                <Select
                  showSearch
                  allowClear
                  placeholder="e.g. CPD, G1, G2..."
                  style={{ borderRadius: '8px' }}
                  onSearch={(val) => setCatDescSearch(val)}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      {catDescSearch && !catDescOptions.includes(catDescSearch) && (
                        <div
                          style={{ padding: '8px 12px', cursor: 'pointer', color: 'var(--primary-color)', borderTop: '1px solid #f0f0f0' }}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setCatDescOptions((prev) => [...prev, catDescSearch]);
                            form.setFieldValue('categoryDescription', catDescSearch);
                            setCatDescSearch('');
                          }}
                        >
                          + Create "{catDescSearch}"
                        </div>
                      )}
                    </>
                  )}
                  options={catDescOptions.map((o) => ({ label: o, value: o }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="damageStock" label="Damage Stock (Qty)">
                <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>



          <Form.Item
            name="branchIds"
            label="Branch Assignment (Inventory belongs to one or multiple branches)"
            rules={[{ required: true, message: 'Please select at least one branch!' }]}
          >
            <Checkbox.Group style={{ width: '100%' }}>
              <Row gutter={[8, 12]}>
                {branchesList.map(b => (
                  <Col span={12} key={b.id}>
                    <Checkbox value={b.id}>{b.name} ({b.code})</Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item name="notes" label="Cost Notes / Details">
            <Input.TextArea rows={3} placeholder="Write inventory batch details..." style={{ borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>Submit</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Batch Modal */}
      <Modal
        title={<span style={{ fontWeight: 700, fontSize: '18px' }}>Edit Stock Batch: {editingBatch?.batchNumber || ''}</span>}
        open={isEditBatchOpen}
        onCancel={() => { setIsEditBatchOpen(false); setEditingBatch(null); batchForm.resetFields(); }}
        footer={null}
        width={760}
        destroyOnHidden
      >
        <Form
          form={batchForm}
          layout="vertical"
          onFinish={handleUpdateBatchSubmit}
          style={{ marginTop: '20px' }}
        >
          {/* Row 1: Qty | COGS | Selling Price | Total Amount */}
          <Row gutter={12}>
            <Col span={6}>
              <Form.Item
                name="quantity"
                label="Physical Qty"
                rules={[
                  { required: true, message: 'Please input quantity!' },
                  { type: 'number', min: 0, message: 'Qty must be ≥ 0' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%', borderRadius: '8px' }}
                  placeholder="Total units"
                  onChange={(val) => {
                    const qty = Number(val || 0);
                    const cogs = Number(batchForm.getFieldValue('costPrice') || 0);
                    if (qty >= 0 && cogs > 0) {
                      batchForm.setFieldValue('totalAmount', qty * cogs);
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="costPrice"
                label="COGS / Unit (MMK)"
                rules={[
                  { required: true, message: 'Please input COGS!' },
                  { type: 'number', min: 0, message: 'COGS must be ≥ 0' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%', borderRadius: '8px' }}
                  placeholder="Cost per unit"
                  onChange={(val) => {
                    const cogs = Number(val || 0);
                    const qty = Number(batchForm.getFieldValue('quantity') || 0);
                    if (qty > 0 && cogs >= 0) {
                      batchForm.setFieldValue('totalAmount', qty * cogs);
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="sellingPrice"
                label="Selling Price (MMK)"
                rules={[
                  { required: true, message: 'Please input selling price!' },
                  { type: 'number', min: 0, message: 'Must be ≥ 0' }
                ]}
              >
                <InputNumber style={{ width: '100%', borderRadius: '8px' }} placeholder="Selling price" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                noStyle
                shouldUpdate={(prev, curr) =>
                  prev.quantity !== curr.quantity ||
                  prev.costPrice !== curr.costPrice ||
                  prev.totalAmount !== curr.totalAmount
                }
              >
                {({ getFieldValue }) => {
                  const qty  = Number(getFieldValue('quantity') || 0);
                  const cogs = Number(getFieldValue('costPrice') || 0);
                  const autoTotal = qty * cogs;
                  return (
                    <Form.Item
                      name="totalAmount"
                      label="Total Amount (MMK)"
                      extra={
                        autoTotal > 0 ? (
                          <span style={{ fontSize: '11px', color: '#4F46E5', fontWeight: 500 }}>
                            {qty.toLocaleString()} × {cogs.toLocaleString()} = {autoTotal.toLocaleString()}
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Auto: qty × COGS</span>
                        )
                      }
                    >
                      <InputNumber
                        style={{ width: '100%', borderRadius: '8px', color: '#4F46E5', fontWeight: 700 }}
                        placeholder="Auto-calculated"
                        precision={7}
                        formatter={v => v ? Number(v).toLocaleString(undefined, { maximumFractionDigits: 7 }) : ''}
                        parser={v => v ? Number(String(v).replace(/,/g, '')) : 0}
                      />
                    </Form.Item>
                  );
                }}
              </Form.Item>
            </Col>
          </Row>

          {/* GP card */}
          <Form.Item noStyle shouldUpdate={(p, c) => p.costPrice !== c.costPrice || p.sellingPrice !== c.sellingPrice}>
            {({ getFieldValue }) => {
              const cogs = Number(getFieldValue('costPrice') || 0);
              const sp = Number(getFieldValue('sellingPrice') || 0);
              const gp = sp - cogs;
              const gpPercent = sp > 0 ? ((gp / sp) * 100).toFixed(1) : '0.0';
              return (
                <Card size="small" style={{ background: '#f8fafc', borderRadius: '8px', marginBottom: '16px', border: '1px solid #e2e8f0' }}
                  styles={{ body: { padding: '8px 14px' } }}>
                  <Row align="middle" justify="space-between">
                    <Col><Text type="secondary" style={{ fontSize: '13px', fontWeight: 600 }}>GP (Gross Profit / Unit):</Text></Col>
                    <Col>
                      <Tag color={gp >= 0 ? 'green' : 'red'} style={{ fontSize: '14px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px' }}>
                        {gp >= 0 ? `+${gp.toLocaleString()}` : gp.toLocaleString()} MMK ({gpPercent}%)
                      </Tag>
                    </Col>
                  </Row>
                </Card>
              );
            }}
          </Form.Item>

          {/* Row 2: Mfg Date | Expiry Date */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="manufacturingDate" label="Manufacturing Date (Optional)">
                <DatePicker style={{ width: '100%', borderRadius: '8px' }} placeholder="Select Mfg date" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="expiryDate"
                label="Expiry Date"
                rules={[{ required: true, message: 'Please select expiry date!' }]}
              >
                <DatePicker style={{ width: '100%', borderRadius: '8px' }} placeholder="Select expiry date" />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 3: Team | Damage Stock */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="categoryDescription" label="Team">
                <Select
                  showSearch
                  allowClear
                  placeholder="e.g. CPD, G1, G2..."
                  style={{ borderRadius: '8px' }}
                  onSearch={(val) => setCatDescSearch(val)}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      {catDescSearch && !catDescOptions.includes(catDescSearch) && (
                        <div
                          style={{ padding: '8px 12px', cursor: 'pointer', color: 'var(--primary-color)', borderTop: '1px solid #f0f0f0' }}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setCatDescOptions((prev) => [...prev, catDescSearch]);
                            batchForm.setFieldValue('categoryDescription', catDescSearch);
                            setCatDescSearch('');
                          }}
                        >
                          + Create "{catDescSearch}"
                        </div>
                      )}
                    </>
                  )}
                  options={catDescOptions.map((o) => ({ label: o, value: o }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="damageStock" label="Damage Stock (Qty)">
                <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 4: Sample Qty | FOC Qty */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sampleQty" label="Sample Qty">
                <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="focQty" label="FOC Qty">
                <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>

          {/* Expiry Alert */}
          <Form.Item
            name="expiryAlertThreshold"
            label="Expiry Alert Configuration"
            rules={[{ required: true, message: 'Please select alert setting!' }]}
          >
            <Select placeholder="Alert threshold" style={{ borderRadius: '8px' }}>
              <Select.Option value={30}>30 Days before expiry</Select.Option>
              <Select.Option value={60}>60 Days before expiry</Select.Option>
              <Select.Option value={90}>90 Days before expiry</Select.Option>
              <Select.Option value={180}>180 Days before expiry</Select.Option>
            </Select>
          </Form.Item>

          {/* Notes */}
          <Form.Item name="notes" label="Cost Notes / Details">
            <Input.TextArea rows={3} placeholder="Write inventory batch details..." style={{ borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => { setIsEditBatchOpen(false); setEditingBatch(null); batchForm.resetFields(); }}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>Save Changes</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

    </div>
  );
};
