import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Card, Typography, Table, Tag, Input, Select, Space, Row, Col, Tooltip, Button, Modal, Form, Switch, message, Popconfirm, Upload } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, DownloadOutlined, UploadOutlined, FileExcelOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx-js-style';
import { api } from '../../services/api';
import { CURRENCY } from '../../types/index';
import { useAuthStore } from '../../store/auth.store';

const { Title, Text } = Typography;

interface CategoryInfo {
  id: string;
  name: string;
}

interface ProductItem {
  id: string;
  code: string;
  name: string;
  sku: string;
  uom: string;
  basePrice: number;
  sellingPrice: number;
  dealerPrice: number;
  genericName: string | null;
  brandName: string | null;
  dosageForm: string | null;
  mustSale: boolean;
  category: CategoryInfo;
  businessUnitId?: string | null;
  businessUnit?: { id: string; name: string } | null;
  supplierId?: string | null;
  supplier?: { id: string; name: string } | null;
  expiryAlertThreshold: number;
  activeBatch?: {
    id: string;
    batchNumber: string;
    expiryDate: string;
    costPrice: number;
    sellingPrice: number;
    availableQty: number;
  } | null;
}

export const Products: React.FC = () => {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role?.name === 'SUPER_ADMIN';
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const handleExportProducts = async () => {
    try {
      message.loading({ content: 'Exporting products...', key: 'exportProducts' });
      const res = await api.get('/products', {
        params: {
          page: 1,
          limit: 5000,
          search: search || undefined,
          categoryId: selectedCategory === 'all' ? undefined : selectedCategory,
          businessUnitId: selectedBusinessUnit === 'all' ? undefined : selectedBusinessUnit,
        },
      });
      if (!res.data.success || res.data.data.length === 0) {
        message.warning({ content: 'No products to export', key: 'exportProducts' });
        return;
      }
      
      const list = res.data.data;
      const data = list.map((p: any) => ({
        'Product Code': p.code,
        'SKU': p.sku,
        'Product Name': p.name,
        'Brand Name': p.brandName || '—',
        'Generic Name': p.genericName || '—',
        'Category': p.category.name,
        'Business Unit': p.businessUnit?.name || '—',
        'Dosage Form': p.dosageForm || '—',
        'Active Batch': p.activeBatch?.batchNumber || '—',
        'Selling Price (MMK)': Number(p.sellingPrice),
        'Dealer Price (MMK)': Number(p.dealerPrice),
        'Base Price (MMK)': Number(p.basePrice),
        'Unit (UOM)': p.uom,
        'Must Sale': p.mustSale ? 'Yes' : 'No',
      }));
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Products');
      XLSX.writeFile(wb, 'Product_List.xlsx');
      message.success({ content: 'Products exported successfully!', key: 'exportProducts' });
    } catch (err) {
      console.error('Export failed:', err);
      message.error({ content: 'Failed to export products', key: 'exportProducts' });
    }
  };

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState<string>('all');
  const [businessUnits, setBusinessUnits] = useState<any[]>([]);
  const [newBUName, setNewBUName] = useState('');
  const [creatingBU, setCreatingBU] = useState(false);
  const [editingBUId, setEditingBUId] = useState<string | null>(null);
  
  const [suppliers, setSuppliers] = useState<any[]>([]);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchCategories();
    fetchBusinessUnits();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [search, selectedCategory, selectedBusinessUnit, currentPage, pageSize]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/products/categories');
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchBusinessUnits = async () => {
    try {
      const res = await api.get('/products/business-units');
      if (res.data.success) {
        setBusinessUnits(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch business units:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers');
      if (res.data.success) {
        setSuppliers(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const handleSaveBU = async () => {
    if (!newBUName.trim()) return;
    try {
      setCreatingBU(true);
      if (editingBUId) {
        const res = await api.put(`/products/business-units/${editingBUId}`, { name: newBUName.trim() });
        if (res.data.success) {
          message.success('Business Unit updated');
          setBusinessUnits(prev => prev.map(b => b.id === editingBUId ? { ...b, name: res.data.data.name } : b));
          setEditingBUId(null);
          setNewBUName('');
        }
      } else {
        const res = await api.post('/products/business-units', { name: newBUName.trim() });
        if (res.data.success) {
          message.success('Business Unit created');
          const newUnit = res.data.data;
          setBusinessUnits((prev) => [...prev, newUnit]);
          form.setFieldsValue({ businessUnitId: newUnit.id });
          setNewBUName('');
        }
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to save business unit');
    } finally {
      setCreatingBU(false);
    }
  };

  const handleDeleteBU = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await api.delete(`/products/business-units/${id}`);
      if (res.data.success) {
        message.success('Business Unit deleted');
        setBusinessUnits(prev => prev.filter(b => b.id !== id));
        if (form.getFieldValue('businessUnitId') === id) {
          form.setFieldsValue({ businessUnitId: null });
        }
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to delete business unit');
    }
  };

  const handleSaveCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      setCreatingCategory(true);
      if (editingCategoryId) {
        const res = await api.put(`/products/categories/${editingCategoryId}`, { name: newCategoryName.trim() });
        if (res.data.success) {
          message.success('Category updated');
          setCategories(prev => prev.map(c => c.id === editingCategoryId ? { ...c, name: res.data.data.name } : c));
          setEditingCategoryId(null);
          setNewCategoryName('');
        }
      } else {
        const res = await api.post('/products/categories', { name: newCategoryName.trim() });
        if (res.data.success) {
          message.success('Category created');
          const newCat = res.data.data;
          setCategories((prev) => [...prev, newCat]);
          form.setFieldsValue({ categoryId: newCat.id });
          setNewCategoryName('');
        }
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to save category');
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await api.delete(`/products/categories/${id}`);
      if (res.data.success) {
        message.success('Category deleted');
        setCategories(prev => prev.filter(c => c.id !== id));
        if (form.getFieldValue('categoryId') === id) {
          form.setFieldsValue({ categoryId: null });
        }
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to delete category');
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products', {
        params: {
          page: currentPage,
          limit: pageSize,
          search: search || undefined,
          categoryId: selectedCategory === 'all' ? undefined : selectedCategory,
          businessUnitId: selectedBusinessUnit === 'all' ? undefined : selectedBusinessUnit,
        },
      });
      if (res.data.success) {
        setProducts(res.data.data);
        setTotalItems(res.data.meta.total);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      message.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (values: any) => {
    try {
      setSubmitting(true);
      const postData = { ...values };

      let res;
      if (editingProduct) {
        res = await api.put(`/products/${editingProduct.id}`, postData);
        message.success('Product updated successfully');
      } else {
        res = await api.post('/products', postData);
        message.success('Product created successfully');
      }

      if (res.data.success) {
        setIsModalOpen(false);
        setEditingProduct(null);
        form.resetFields();
        fetchProducts();
      }
    } catch (error: any) {
      console.error('Failed to save product:', error);
      message.error(error.response?.data?.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (record: ProductItem) => {
    setEditingProduct(record);
    form.setFieldsValue({
      name: record.name,
      sku: record.sku,
      brandName: record.brandName,
      genericName: record.genericName,
      categoryId: record.category.id,
      businessUnitId: record.businessUnitId || null,
      supplierId: record.supplierId || null,
      dosageForm: record.dosageForm,
      basePrice: record.basePrice,
      sellingPrice: record.sellingPrice,
      dealerPrice: record.dealerPrice,
      uom: record.uom,
      mustSale: record.mustSale || false,
      expiryAlertThreshold: record.expiryAlertThreshold,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/products/${id}`);
      message.success('Product deleted');
      fetchProducts();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to delete');
    }
  };

  const columns = [
    {
      title: 'Code & SKU',
      key: 'code_sku',
      render: (_: any, record: ProductItem) => (
        <Space orientation="vertical" size={2}>
          <Text code style={{ fontWeight: 600 }}>{record.code}</Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>SKU: {record.sku}</Text>
        </Space>
      ),
    },
    {
      title: 'Product Name',
      key: 'name',
      render: (_: any, record: ProductItem) => (
        <div>
          <div style={{ fontWeight: 600, color: '#111827' }}>
            {record.name}
            {record.mustSale && (
              <Tag color="orange" style={{ border: 'none', borderRadius: '8px', marginLeft: '6px', fontWeight: 600 }}>
                🔥 Must Sale
              </Tag>
            )}
            {record.brandName && <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: '6px' }}>({record.brandName})</span>}
          </div>
          {record.genericName && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Generic: {record.genericName}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Category',
      key: 'category',
      render: (_: any, record: ProductItem) => (
        <Tag color="blue" style={{ border: 'none', borderRadius: '8px' }}>
          {record.category.name}
        </Tag>
      ),
    },
    {
      title: 'Business Unit',
      key: 'businessUnit',
      render: (_: any, record: ProductItem) => (
        record.businessUnit ? (
          <Tag color="purple" style={{ border: 'none', borderRadius: '8px', margin: 0 }}>
            {record.businessUnit.name}
          </Tag>
        ) : <Text type="secondary">—</Text>
      ),
    },
    ...(isSuperAdmin ? [{
      title: 'Base Price',
      dataIndex: 'basePrice',
      key: 'basePrice',
      render: (price: number, record: ProductItem) => (
        <div>
          <strong style={{ color: 'var(--primary-color)', display: 'block' }}>
            {price.toLocaleString()} {CURRENCY.symbol}
          </strong>
          {record.activeBatch && (
            <Text type="secondary" style={{ fontSize: '10px' }}>
              Batch Cost
            </Text>
          )}
        </div>
      ),
    }] : []),
    {
      title: 'Selling Price',
      dataIndex: 'sellingPrice',
      key: 'sellingPrice',
      render: (price: number, record: ProductItem) => (
        <div>
          <strong style={{ color: '#10B981', display: 'block' }}>
            {price ? price.toLocaleString() : '0'} {CURRENCY.symbol}
          </strong>
          {record.activeBatch ? (
            <Tooltip title={`FIFO Active Batch: ${record.activeBatch.batchNumber} (Expires: ${dayjs(record.activeBatch.expiryDate).format('DD/MM/YYYY')}, Available: ${record.activeBatch.availableQty} ${record.uom})`}>
              <Tag color="cyan" style={{ border: 'none', borderRadius: '6px', fontSize: '10px', marginTop: '2px', cursor: 'help' }}>
                Batch: {record.activeBatch.batchNumber}
              </Tag>
            </Tooltip>
          ) : (
            <Text type="secondary" style={{ fontSize: '10px' }}>Master Price</Text>
          )}
        </div>
      ),
    },
    /*
    {
      title: 'Dealer Price',
      dataIndex: 'dealerPrice',
      key: 'dealerPrice',
      render: (price: number) => (
        <strong style={{ color: '#D97706' }}>
          {price ? price.toLocaleString() : '0'} {CURRENCY.symbol}
        </strong>
      ),
    },
    */
    {
      title: 'Unit (UOM)',
      dataIndex: 'uom',
      key: 'uom',
      render: (uom: string) => <Tag style={{ borderRadius: '8px' }}>{uom}</Tag>,
    },

    {
      title: 'Actions',
      key: 'actions',
      width: 130,
      render: (_: any, record: ProductItem) => (
        <Space size="small">
          <Tooltip title="Edit Product">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm title="Delete this product?" onConfirm={() => handleDelete(record.id)} okText="Yes" okButtonProps={{ danger: true }}>
            <Tooltip title="Delete">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleImportProducts = (file: any) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        message.loading({ content: 'Importing products...', key: 'importProducts' });
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonRows = XLSX.utils.sheet_to_json(worksheet) as any[];
        const arrayRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];
        
        if (jsonRows.length === 0 && arrayRows.length <= 1) {
          message.error({ content: 'No data found in the Excel file', key: 'importProducts' });
          return;
        }

        const products = [];

        // 1. Try Object-based header matching first
        if (jsonRows.length > 0 && typeof jsonRows[0] === 'object' && !Array.isArray(jsonRows[0])) {
          for (const row of jsonRows) {
            const getVal = (possibleKeys: string[]) => {
              for (const key of Object.keys(row)) {
                const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (possibleKeys.some(pk => pk.replace(/[^a-z0-9]/g, '') === cleanKey)) {
                  return row[key];
                }
              }
              return undefined;
            };

            const sku = getVal(['sku', 'product code', 'item sku', 'code']);
            const name = getVal(['name', 'product name', 'item name']);

            if (!name) continue;

            products.push({
              code: getVal(['code', 'product code']),
              sku: sku ? String(sku) : '',
              name: String(name),
              category: getVal(['category', 'category name']),
              uom: getVal(['uom', 'unit']),
              basePrice: getVal(['base price', 'baseprice', 'cost price', 'cost']),
              sellingPrice: getVal(['selling price', 'sellingprice', 'price']),
              dealerPrice: getVal(['dealer price', 'dealerprice']),
              supplier: getVal(['supplier', 'supplier name']),
              businessUnit: getVal(['business unit', 'businessunit', 'bu']),
              description: getVal(['description', 'desc']),
              genericName: getVal(['generic name', 'generic']),
              brandName: getVal(['brand name', 'brand']),
              dosageForm: getVal(['dosage form', 'dosage']),
              mustSale: ['yes', 'true', '1'].includes(String(getVal(['must sale', 'mustsale', 'must_sale']) || '').toLowerCase().trim())
            });
          }
        }

        // 2. Fallback to Positional Array matching if Object matching yielded 0 products
        if (products.length === 0 && arrayRows.length > 1) {
          for (let i = 1; i < arrayRows.length; i++) {
            const r = arrayRows[i];
            if (!r || !r.length || (!r[1] && !r[2] && !r[0])) continue;
            
            products.push({
              code: r[0],
              sku: String(r[1] || ''),
              name: r[2] || r[1] || r[0] || '',
              category: r[3],
              uom: r[4],
              basePrice: r[5],
              sellingPrice: r[6],
              dealerPrice: r[7],
              supplier: r[8],
              businessUnit: r[9],
              description: r[10],
              genericName: r[11],
              brandName: r[12],
              dosageForm: r[13]
            });
          }
        }

        if (products.length === 0) {
          message.error({ content: 'No valid products with Name found in file', key: 'importProducts' });
          return;
        }

        const res = await api.post('/products/import', { products });
        message.success({ content: res.data.message || 'Import successful', key: 'importProducts' });
        fetchProducts();
      } catch (err: any) {
        console.error('Import failed:', err);
        message.error({ content: err.response?.data?.message || 'Failed to import products', key: 'importProducts' });
      }
    };
    reader.readAsArrayBuffer(file);
    return false; 
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Product Catalog</Title>
        <Space>
          <Button 
            href="/templates/Product_Import_Template.xlsx" 
            target="_blank" 
            icon={<FileExcelOutlined />} 
            style={{ borderRadius: '12px' }}
          >
            Template
          </Button>
          <Upload 
            beforeUpload={handleImportProducts}
            showUploadList={false}
            accept=".xlsx, .xls"
          >
            <Button icon={<UploadOutlined />} style={{ borderRadius: '12px' }}>
              Import Excel
            </Button>
          </Upload>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportProducts}
            style={{ borderRadius: '12px' }}
          >
            Export Excel
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => { setEditingProduct(null); form.resetFields(); setIsModalOpen(true); }}
            style={{ borderRadius: '12px' }}
          >
            Add Product
          </Button>
        </Space>
      </div>

      {/* Filters */}
      <Card className="glass-card" variant="borderless">
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} md={12}>
            <Input
              placeholder="Search by code, SKU, name, brand or generic..."
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
          <Col xs={12} sm={6} md={6}>
            <Select
              style={{ width: '100%', borderRadius: '12px' }}
              value={selectedCategory}
              onChange={(val) => {
                setSelectedCategory(val);
                setCurrentPage(1);
              }}
            >
              <Select.Option value="all">All Categories</Select.Option>
              {categories.map((cat) => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={6}>
            <Select
              style={{ width: '100%', borderRadius: '12px' }}
              value={selectedBusinessUnit}
              onChange={(val) => {
                setSelectedBusinessUnit(val);
                setCurrentPage(1);
              }}
            >
              <Select.Option value="all">All Business Units</Select.Option>
              {businessUnits.map((bu) => (
                <Select.Option key={bu.id} value={bu.id}>
                  {bu.name}
                </Select.Option>
              ))}
              <Select.Option value="none">No Business Unit</Select.Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card className="glass-card" variant="borderless" styles={{ body: { padding: '0px' } }}>
        <Table
          columns={columns}
          dataSource={products.map((item, idx) => ({ ...item, key: item.id || idx }))}
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: totalItems,
            showSizeChanger: true,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
            style: { padding: '16px' },
          }}
        />
      </Card>

      {/* Add Product Modal */}
      <Modal
        title={<span style={{ fontWeight: 700, fontSize: '18px' }}>{editingProduct ? 'Edit Medicine Product' : 'Create New Medicine Product'}</span>}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateProduct}
          initialValues={{
            isScheduled: false,
            isControlled: false,
            uom: 'Box',
            expiryAlertThreshold: 30,
            basePrice: 0,
            sellingPrice: 0,
            dealerPrice: 0
          }}
          style={{ marginTop: '20px' }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Product Name"
                rules={[{ required: true, message: 'Please input product name!' }]}
              >
                <Input placeholder="e.g. Paracetamol 500mg" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="code" label="Product Code (Optional)">
                <Input placeholder="Auto-generated if left blank" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sku"
                label="SKU Code (Optional)"
              >
                <Input placeholder="Auto-generated if left blank" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="brandName" label="Brand Name">
                <Input placeholder="e.g. Biogesic" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="genericName" label="Generic Name (Active Ingredient)">
                <Input placeholder="e.g. Paracetamol" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="categoryId"
                label="Product Category"
                rules={[{ required: true, message: 'Please select a category!' }]}
              >
                <Select
                  placeholder="Select category"
                  style={{ borderRadius: '8px' }}
                  allowClear
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <div style={{ display: 'flex', flexWrap: 'nowrap', padding: '8px', borderTop: '1px solid #f0f0f0', gap: '8px' }}>
                        <Input
                          placeholder={editingCategoryId ? "Edit category name..." : "Add new category..."}
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          style={{ flex: 'auto' }}
                        />
                        <Button
                          type="primary"
                          onClick={handleSaveCategory}
                          loading={creatingCategory}
                          style={{ flex: 'none' }}
                        >
                          {editingCategoryId ? 'Save' : 'Add'}
                        </Button>
                        {editingCategoryId && (
                          <Button
                            onClick={() => {
                              setEditingCategoryId(null);
                              setNewCategoryName('');
                            }}
                            style={{ flex: 'none' }}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                >
                  {categories.map(cat => (
                    <Select.Option key={cat.id} value={cat.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span>{cat.name}</span>
                        <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '4px' }}>
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined style={{ color: '#0284c7', fontSize: '12px' }} />}
                            onClick={() => {
                              setEditingCategoryId(cat.id);
                              setNewCategoryName(cat.name);
                            }}
                            style={{ height: '22px', width: '22px', padding: 0 }}
                          />
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined style={{ fontSize: '12px' }} />}
                            onClick={() => handleDeleteCategory(cat.id)}
                            style={{ height: '22px', width: '22px', padding: 0 }}
                          />
                        </div>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="businessUnitId"
                label="Business Unit"
                rules={[{ required: true, message: 'Please select a Business Unit!' }]}
              >
                <Select
                  placeholder="Select Business Unit"
                  style={{ borderRadius: '8px' }}
                  allowClear
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <div style={{ display: 'flex', flexWrap: 'nowrap', padding: '8px', borderTop: '1px solid #f0f0f0', gap: '8px' }}>
                        <Input
                          placeholder={editingBUId ? "Edit unit name..." : "Add new unit..."}
                          value={newBUName}
                          onChange={(e) => setNewBUName(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          style={{ flex: 'auto' }}
                        />
                        <Button
                          type="primary"
                          onClick={handleSaveBU}
                          loading={creatingBU}
                          style={{ flex: 'none' }}
                        >
                          {editingBUId ? 'Save' : 'Add'}
                        </Button>
                        {editingBUId && (
                          <Button
                            onClick={() => {
                              setEditingBUId(null);
                              setNewBUName('');
                            }}
                            style={{ flex: 'none' }}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                >
                  {businessUnits.map(bu => (
                    <Select.Option key={bu.id} value={bu.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span>{bu.name}</span>
                        <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '4px' }}>
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined style={{ color: '#0284c7', fontSize: '12px' }} />}
                            onClick={() => {
                              setEditingBUId(bu.id);
                              setNewBUName(bu.name);
                            }}
                            style={{ height: '22px', width: '22px', padding: 0 }}
                          />
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined style={{ fontSize: '12px' }} />}
                            onClick={() => handleDeleteBU(bu.id)}
                            style={{ height: '22px', width: '22px', padding: 0 }}
                          />
                        </div>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="dosageForm"
                label="Dosage Form (Optional)"
              >
                <Input placeholder="e.g. Tablet, Capsule, Gel" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="supplierId"
                label="Supplier (Optional)"
              >
                <Select
                  placeholder="Select Supplier"
                  style={{ borderRadius: '8px' }}
                  allowClear
                  showSearch
                  optionFilterProp="children"
                >
                  {suppliers.map(sup => (
                    <Select.Option key={sup.id} value={sup.id}>
                      {sup.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Pricing is managed batch-by-batch in Inventory Control */}
          {/* 
          <Form.Item name="dealerPrice" label="Dealer Price (MMK)">
            <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} placeholder="Dealer price" />
          </Form.Item>
          */}

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="uom"
                label="Unit of Measure (UOM)"
                rules={[{ required: true, message: 'Please input UOM!' }]}
              >
                <Input placeholder="e.g. Box, Bottle, Ampoule" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="mustSale" label="Must Sale Feature" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="expiryAlertThreshold"
                label="Expiry Alert Threshold (Default for Batches)"
                rules={[{ required: true, message: 'Please select expiry alert threshold!' }]}
              >
                <Select placeholder="Select alert threshold" style={{ borderRadius: '8px' }}>
                  <Select.Option value={30}>1 Month (30 Days)</Select.Option>
                  <Select.Option value={60}>2 Months (60 Days)</Select.Option>
                  <Select.Option value={90}>3 Months (90 Days)</Select.Option>
                  <Select.Option value={180}>6 Months (180 Days)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Additional product notes..." style={{ borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => { setIsModalOpen(false); setEditingProduct(null); form.resetFields(); }}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>{editingProduct ? 'Update' : 'Create'}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
