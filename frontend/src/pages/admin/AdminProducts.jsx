/**
 * CARTEX — Admin Products Page
 * Full product management with CRUD, bulk upload, flash sales, image management
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit, Trash2, Zap, Package, Upload, X, Eye, ToggleLeft, ToggleRight, ImagePlus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { productsApi, categoriesApi } from '@services/api';
import { useDebounce } from '@hooks/index';
import { Button, Input, Badge, Modal, Skeleton, PriceDisplay, Divider } from '@components/common/GlobalLoader';
import { cn } from '@components/common/GlobalLoader';

// ── Product Form (Add/Edit) ────────────────────────────────────
const ProductForm = ({ product, onClose }) => {
  const queryClient = useQueryClient();
  const [images, setImages] = useState(product?.images || []);
  const [imageFiles, setImageFiles] = useState([]);
  const fileRef = useRef(null);
  const isEdit = !!product;

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
    select: (d) => d.data.categories,
  });

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: product ? {
      name: product.name, description: product.description, shortDescription: product.shortDescription,
      brand: product.brand, mrp: product.mrp, price: product.price, costPrice: product.costPrice,
      stock: product.stock, category: product.category?._id || product.category,
      tags: product.tags?.join(', '), weight: product.weight,
      isActive: product.isActive, isFeatured: product.isFeatured,
      lowStockThreshold: product.lowStockThreshold,
    } : { isActive: true, isFeatured: false, lowStockThreshold: 10 },
  });

  const mrp = parseFloat(watch('mrp') || 0);
  const price = parseFloat(watch('price') || 0);
  const discount = mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;

  const mutation = useMutation({
    mutationFn: (data) => {
      const form = new FormData();
      Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== '') form.append(k, v); });
      imageFiles.forEach((f) => form.append('images', f));
      return isEdit ? productsApi.update(product._id, form) : productsApi.create(form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      toast.success(`Product ${isEdit ? 'updated' : 'created'}!`);
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles((prev) => [...prev, ...files].slice(0, 8));
    const previews = files.map((f) => ({ url: URL.createObjectURL(f), isPrimary: images.length === 0 }));
    setImages((prev) => [...prev, ...previews].slice(0, 8));
  };

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
      {/* Images */}
      <div>
        <p className="text-sm font-medium text-white/70 mb-3">Product Images (max 8)</p>
        <div className="flex gap-3 flex-wrap">
          {images.map((img, i) => (
            <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10 group">
              <img src={img.url} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => { setImages(prev => prev.filter((_, j) => j !== i)); setImageFiles(prev => prev.filter((_, j) => j !== i)); }}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <X className="w-5 h-5 text-white" />
              </button>
              {img.isPrimary && <span className="absolute bottom-1 left-1 text-xs bg-brand-500 text-white px-1 rounded">Main</span>}
            </div>
          ))}
          {images.length < 8 && (
            <button type="button" onClick={() => fileRef.current?.click()} className="w-20 h-20 rounded-xl border-2 border-dashed border-white/20 hover:border-brand-500 flex items-center justify-center text-white/30 hover:text-brand-400 transition-all">
              <ImagePlus className="w-6 h-6" />
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input label="Product Name *" placeholder="e.g. Lay's Classic Salted 26g" error={errors.name?.message} {...register('name', { required: 'Required' })} />
        </div>
        <Input label="Brand" placeholder="e.g. Lay's, Maggi" {...register('brand')} />
        <Input label="Weight/Size" placeholder="e.g. 500g, 1L, Pack of 3" {...register('weight')} />
      </div>

      <div>
        <label className="text-sm font-medium text-white/70 block mb-1.5">Category *</label>
        <select className="input" {...register('category', { required: 'Required' })}>
          <option value="">Select category</option>
          {categories?.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        {errors.category && <p className="text-accent-red text-xs mt-1">{errors.category.message}</p>}
      </div>

      <div>
        <label className="text-sm font-medium text-white/70 block mb-1.5">Short Description</label>
        <textarea className="input resize-none" rows={2} placeholder="One-line description for product cards" {...register('shortDescription')} />
      </div>

      <div>
        <label className="text-sm font-medium text-white/70 block mb-1.5">Full Description *</label>
        <textarea className="input resize-none" rows={4} placeholder="Detailed product description..." {...register('description', { required: 'Required' })} />
        {errors.description && <p className="text-accent-red text-xs mt-1">{errors.description.message}</p>}
      </div>

      {/* Pricing */}
      <div className="p-4 bg-surface-2 rounded-xl border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">Pricing</h3>
          {discount > 0 && <span className="badge-discount">{discount}% discount</span>}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Input label="MRP (₹) *" type="number" step="0.01" placeholder="30.00" error={errors.mrp?.message} {...register('mrp', { required: 'Required', min: { value: 0.01, message: 'Must be > 0' } })} />
          <Input label="Sell Price (₹) *" type="number" step="0.01" placeholder="28.00" error={errors.price?.message} {...register('price', { required: 'Required', min: { value: 0.01, message: 'Must be > 0' } })} />
          <Input label="Cost Price (₹)" type="number" step="0.01" placeholder="25.00" hint="Internal — not shown to customers" {...register('costPrice')} />
        </div>
        {mrp > 0 && price > 0 && (
          <div className="flex gap-4 text-sm">
            <span className="text-white/50">MRP: <span className="line-through text-white/30">₹{mrp}</span></span>
            <span className="text-brand-400">Platform: ₹{price}</span>
            {discount > 0 && <span className="text-accent-green">Customer saves: ₹{(mrp - price).toFixed(2)}</span>}
          </div>
        )}
      </div>

      {/* Inventory */}
      <div className="grid grid-cols-2 gap-4">
        <Input label="Stock Quantity *" type="number" min="0" error={errors.stock?.message} {...register('stock', { required: 'Required', min: 0 })} />
        <Input label="Low Stock Alert at" type="number" min="1" hint="Send alert when stock reaches this number" {...register('lowStockThreshold')} />
      </div>

      <Input label="Tags (comma-separated)" placeholder="snacks, chips, salty, crispy" hint="Helps with search and recommendations" {...register('tags')} />

      {/* Flags */}
      <div className="grid grid-cols-2 gap-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-brand-500" {...register('isActive')} />
          <span className="text-white/70 text-sm">Product Active (visible to customers)</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-brand-500" {...register('isFeatured')} />
          <span className="text-white/70 text-sm">Featured Product</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-brand-500" {...register('isNewArrival')} />
          <span className="text-white/70 text-sm">New Arrival Badge</span>
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={mutation.isPending} className="flex-1">{isEdit ? 'Update Product' : 'Create Product'}</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
};

// ── Flash Sale Form ────────────────────────────────────────────
const FlashSaleForm = ({ product, onClose }) => {
  const queryClient = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: product.flashSale?.isActive ? {
      salePrice: product.flashSale.salePrice,
      totalSlots: product.flashSale.totalSlots,
      startTime: new Date(product.flashSale.startTime).toISOString().slice(0, 16),
      endTime: new Date(product.flashSale.endTime).toISOString().slice(0, 16),
    } : {},
  });

  const mutation = useMutation({
    mutationFn: (data) => productsApi.toggleFlashSale(product._id, data),
    onSuccess: () => { queryClient.invalidateQueries(['products']); toast.success('Flash sale updated!'); onClose(); },
    onError: (err) => toast.error(err.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => productsApi.toggleFlashSale(product._id, {}),
    onSuccess: () => { queryClient.invalidateQueries(['products']); toast.success('Flash sale deactivated.'); onClose(); },
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="banner-warning text-sm">
        <strong>Product:</strong> {product.name} (Current price: ₹{product.price}, MRP: ₹{product.mrp})
      </div>
      <Input label="Flash Sale Price (₹)" type="number" step="0.01" placeholder={`Max ${product.price - 1}`} {...register('salePrice', { required: true })} />
      <Input label="Total Slots (units available)" type="number" min="1" {...register('totalSlots', { required: true })} />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Start Time" type="datetime-local" {...register('startTime', { required: true })} />
        <Input label="End Time" type="datetime-local" {...register('endTime', { required: true })} />
      </div>
      <div className="flex gap-3">
        <Button type="submit" loading={mutation.isPending} leftIcon={<Zap className="w-4 h-4" />} className="flex-1">Activate Flash Sale</Button>
        {product.flashSale?.isActive && (
          <Button type="button" variant="danger" loading={deactivateMutation.isPending} onClick={() => deactivateMutation.mutate()}>Deactivate</Button>
        )}
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
};

// ── Bulk Upload ────────────────────────────────────────────────
const BulkUploadModal = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (products) => productsApi.bulkUpload({ products }),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['products']);
      toast.success(`Bulk upload: ${data.data.created} created, ${data.data.failed.length} failed`);
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleUpload = () => {
    try {
      const products = JSON.parse(jsonText);
      if (!Array.isArray(products)) throw new Error('Must be an array');
      setError('');
      mutation.mutate(products);
    } catch (e) {
      setError('Invalid JSON: ' + e.message);
    }
  };

  const sampleJSON = JSON.stringify([
    { name: "Lay's Classic 26g", brand: "Lay's", mrp: 20, price: 18, costPrice: 15, stock: 50, category: "CATEGORY_ID_HERE", description: "Crispy salted potato chips" }
  ], null, 2);

  return (
    <div className="space-y-4">
      <div className="banner-info text-sm">Paste a JSON array of product objects. Maximum 500 products per upload.</div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-white/70">Products JSON Array</label>
          <button type="button" onClick={() => setJsonText(sampleJSON)} className="text-brand-400 text-xs hover:text-brand-300">Load Sample</button>
        </div>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          className="input resize-none font-mono text-xs"
          rows={12}
          placeholder={sampleJSON}
        />
        {error && <p className="text-accent-red text-xs mt-1">{error}</p>}
      </div>
      <div className="flex gap-3">
        <Button onClick={handleUpload} loading={mutation.isPending} leftIcon={<Upload className="w-4 h-4" />} className="flex-1">Upload Products</Button>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
};

// ── Admin Products Page ────────────────────────────────────────
export default function AdminProducts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [modalState, setModalState] = useState({ type: null, product: null });
  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search: debouncedSearch, category: selectedCategory, page, limit: 15 }],
    queryFn: () => productsApi.getAll({ search: debouncedSearch, category: selectedCategory, page, limit: 15 }),
    select: (d) => d.data,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
    select: (d) => d.data.categories,
  });

  const deleteMutation = useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => { queryClient.invalidateQueries(['products']); toast.success('Product deleted.'); },
    onError: (err) => toast.error(err.message),
  });

  const toggleStockMutation = useMutation({
    mutationFn: productsApi.toggleOutOfStock,
    onSuccess: () => queryClient.invalidateQueries(['products']),
    onError: (err) => toast.error(err.message),
  });

  const closeModal = () => setModalState({ type: null, product: null });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Products</h1>
          <p className="text-white/50 text-sm mt-1">{data?.pagination?.total || 0} total products</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={() => setModalState({ type: 'bulk' })} leftIcon={<Upload className="w-4 h-4" />}>Bulk Upload</Button>
          <Button size="sm" onClick={() => setModalState({ type: 'create' })} leftIcon={<Plus className="w-4 h-4" />}>Add Product</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="input pl-9 py-2.5 text-sm" />
        </div>
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="input py-2.5 text-sm w-48">
          <option value="">All Categories</option>
          {categories?.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>

      {/* Products Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>MRP</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j}><div className="h-4 bg-surface-3 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                : data?.products?.map((product) => (
                    <tr key={product._id} className="group">
                      {/* Product info */}
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-2 flex-shrink-0">
                            <img src={product.images?.[0]?.url} alt={product.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm line-clamp-1 max-w-48">{product.name}</p>
                            {product.brand && <p className="text-white/40 text-xs">{product.brand}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="text-white/60 text-sm">{product.category?.name}</td>
                      <td><span className="line-through text-white/30 text-sm">₹{product.mrp}</span></td>
                      <td>
                        <div>
                          <span className="text-brand-400 font-bold text-sm">₹{product.price}</span>
                          {product.discountPercent > 0 && <span className="ml-1 text-accent-green text-xs">({product.discountPercent}% off)</span>}
                          {product.flashSale?.isActive && <div className="mt-0.5"><Badge variant="brand" className="text-xs">⚡ Flash: ₹{product.flashSale.salePrice}</Badge></div>}
                        </div>
                      </td>
                      <td>
                        <span className={cn('font-semibold text-sm', product.isOutOfStock ? 'text-accent-red' : product.stock <= 10 ? 'text-yellow-400' : 'text-accent-green')}>
                          {product.stock} units
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          {product.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="error">Inactive</Badge>}
                          {product.isFeatured && <Badge variant="brand">Featured</Badge>}
                          {product.isOutOfStock && <Badge variant="error">Out of Stock</Badge>}
                          {product.isLowStock && <Badge variant="warning">Low Stock</Badge>}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => window.open(`/products/${product.slug}`, '_blank')} className="w-8 h-8 rounded-lg bg-surface-3 hover:bg-surface-4 flex items-center justify-center text-white/60 hover:text-white transition-colors" title="Preview">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => setModalState({ type: 'flash', product })} className="w-8 h-8 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 flex items-center justify-center text-yellow-400 transition-colors" title="Flash Sale">
                            <Zap className="w-4 h-4" />
                          </button>
                          <button onClick={() => toggleStockMutation.mutate(product._id)} className="w-8 h-8 rounded-lg bg-surface-3 hover:bg-surface-4 flex items-center justify-center text-white/60 hover:text-white transition-colors" title="Toggle Stock">
                            {product.isOutOfStock ? <ToggleLeft className="w-4 h-4 text-accent-red" /> : <ToggleRight className="w-4 h-4 text-accent-green" />}
                          </button>
                          <button onClick={() => setModalState({ type: 'edit', product })} className="w-8 h-8 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center text-blue-400 transition-colors" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => { if (confirm('Delete this product?')) deleteMutation.mutate(product._id); }} className="w-8 h-8 rounded-lg bg-accent-red/20 hover:bg-accent-red/30 flex items-center justify-center text-accent-red transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.pagination && data.pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <p className="text-white/40 text-sm">Page {page} of {data.pagination.pages}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button size="sm" variant="secondary" disabled={page >= data.pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal isOpen={modalState.type === 'create'} onClose={closeModal} title="Add New Product" size="xl">
        <ProductForm onClose={closeModal} />
      </Modal>
      <Modal isOpen={modalState.type === 'edit'} onClose={closeModal} title="Edit Product" size="xl">
        {modalState.product && <ProductForm product={modalState.product} onClose={closeModal} />}
      </Modal>
      <Modal isOpen={modalState.type === 'flash'} onClose={closeModal} title="⚡ Flash Sale">
        {modalState.product && <FlashSaleForm product={modalState.product} onClose={closeModal} />}
      </Modal>
      <Modal isOpen={modalState.type === 'bulk'} onClose={closeModal} title="Bulk Upload Products" size="lg">
        <BulkUploadModal onClose={closeModal} />
      </Modal>
    </div>
  );
}

