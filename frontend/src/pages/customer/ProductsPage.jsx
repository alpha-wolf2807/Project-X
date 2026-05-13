/**
 * PROJECT-X — Products Listing Page
 * Full-featured shop with filters, search, sort, pagination
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X, ChevronDown, Grid3X3, List } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { productsApi, categoriesApi } from '@services/api';
import { useDebounce } from '@hooks/index';
import ProductCard from '@components/common/ProductCard';
import { Button, Skeleton, Input, Badge } from '@components/common/GlobalLoader';
import { cn } from '@components/common/GlobalLoader';

const SORT_OPTIONS = [
  { label: 'Newest First', value: '-createdAt' },
  { label: 'Price: Low to High', value: 'price' },
  { label: 'Price: High to Low', value: '-price' },
  { label: 'Best Rated', value: '-ratings.average' },
  { label: 'Most Popular', value: '-analytics.orderCount' },
  { label: 'Biggest Discount', value: '-discountPercent' },
];

const ProductSkeleton = () => (
  <div className="card p-4 space-y-3">
    <Skeleton className="aspect-square rounded-xl w-full" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-3 w-1/2" />
    <div className="flex justify-between items-center">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="w-9 h-9 rounded-xl" />
    </div>
  </div>
);

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [priceRange, setPriceRange] = useState([0, 1000]);

  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || '-createdAt';
  const flashSale = searchParams.get('flashSale') || '';
  const inStock = searchParams.get('inStock') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const minPrice = parseInt(searchParams.get('minPrice') || '0');
  const maxPrice = parseInt(searchParams.get('maxPrice') || '0');

  const debouncedSearch = useDebounce(search, 400);

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.delete('page');
    setSearchParams(params);
  };

  // Products query
  useEffect(() => {
    setPriceRange([minPrice, maxPrice || 1000]);
  }, [minPrice, maxPrice]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['products', { category, search: debouncedSearch, sort, flashSale, inStock, page, minPrice, maxPrice }],
    queryFn: () => productsApi.getAll({
      category,
      search: debouncedSearch,
      sort,
      flashSale,
      inStock,
      page,
      limit: 20,
      minPrice: minPrice > 0 ? minPrice : undefined,
      maxPrice: maxPrice > 0 && maxPrice < 1000 ? maxPrice : undefined,
    }),
    select: (d) => d.data,
    keepPreviousData: true,
  });

  // Categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
    select: (d) => d.data.categories,
    staleTime: 30 * 60 * 1000,
  });

  const products = data?.products || [];
  const pagination = data?.pagination;

const activeFiltersCount = [category, flashSale, inStock, minPrice > 0 || maxPrice > 0].filter(Boolean).length;

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('category');
    params.delete('flashSale');
    params.delete('inStock');
    params.delete('sort');
    params.delete('search');
    params.delete('page');
    params.delete('minPrice');
    params.delete('maxPrice');
    setSearchParams(params);
    setPriceRange([0, 1000]);
  };

  const FilterPanel = () => (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="text-white font-semibold mb-3 text-sm">Category</h3>
        <div className="space-y-1.5">
          <button onClick={() => updateParam('category', '')} className={cn('w-full text-left px-3 py-2 rounded-lg text-sm transition-colors', !category ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30' : 'text-white/60 hover:text-white hover:bg-white/5')}>
            All Products
          </button>
          {categories?.map((cat) => (
            <button key={cat._id} onClick={() => updateParam('category', cat._id)} className={cn('w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2', category === cat._id ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30' : 'text-white/60 hover:text-white hover:bg-white/5')}>
              <span>{cat.icon || '📦'}</span>
              {cat.name}
              <span className="ml-auto text-white/30 text-xs">{cat.productCount}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick filters */}
      <div>
        <h3 className="text-white font-semibold mb-3 text-sm">Quick Filters</h3>
        <div className="space-y-2">
          {[
            { label: '⚡ Flash Sale', key: 'flashSale', value: 'true' },
            { label: '✅ In Stock Only', key: 'inStock', value: 'true' },
          ].map(({ label, key, value }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => updateParam(key, searchParams.get(key) === value ? '' : value)}
                className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all', searchParams.get(key) === value ? 'bg-brand-500 border-brand-500' : 'border-white/20 group-hover:border-white/40')}
              >
                {searchParams.get(key) === value && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              <span className="text-white/70 text-sm group-hover:text-white transition-colors">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div>
        <h3 className="text-white font-semibold mb-3 text-sm">Price Range</h3>
        <div className="flex gap-3">
          <Input
            type="number" placeholder="Min" value={priceRange[0] || ''}
            onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
            className="text-sm py-2"
          />
          <Input
            type="number" placeholder="Max" value={priceRange[1] < 1000 ? priceRange[1] : ''}
            onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 1000])}
            className="text-sm py-2"
          />
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="w-full mt-2"
          onClick={() => {
            updateParam('minPrice', priceRange[0] > 0 ? priceRange[0] : '');
            updateParam('maxPrice', priceRange[1] < 1000 ? priceRange[1] : '');
            setFiltersOpen(false);
          }}
        >
          Apply Price
        </Button>
      </div>

      {activeFiltersCount > 0 && (
        <Button variant="danger" size="sm" className="w-full" onClick={clearFilters}>
          <X className="w-4 h-4" /> Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="page-container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">
            {flashSale === 'true' ? '⚡ Flash Deals' : category ? categories?.find(c => c._id === category)?.name || 'Products' : 'All Products'}
          </h1>
          {pagination && <p className="text-white/50 text-sm mt-1">{pagination.total} products found</p>}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Sort */}
          <div className="relative hidden sm:block">
            <select
              value={sort}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="input py-2 pr-8 text-sm appearance-none cursor-pointer bg-surface-2"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          </div>

          {/* View mode */}
          <div className="flex gap-1 bg-surface-2 p-1 rounded-xl">
            <button onClick={() => setViewMode('grid')} className={cn('p-1.5 rounded-lg transition-colors', viewMode === 'grid' ? 'bg-brand-500 text-white' : 'text-white/50')}>
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')} className={cn('p-1.5 rounded-lg transition-colors', viewMode === 'list' ? 'bg-brand-500 text-white' : 'text-white/50')}>
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Filter toggle (mobile) */}
          <Button variant="secondary" size="sm" onClick={() => setFiltersOpen(!filtersOpen)} className="lg:hidden" leftIcon={<SlidersHorizontal className="w-4 h-4" />}>
            Filters {activeFiltersCount > 0 && <Badge variant="brand">{activeFiltersCount}</Badge>}
          </Button>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {category && categories?.find(c => c._id === category) && (
            <button onClick={() => updateParam('category', '')} className="flex items-center gap-1.5 bg-brand-500/15 border border-brand-500/30 text-brand-400 rounded-full px-3 py-1 text-xs font-medium hover:bg-brand-500/25 transition-colors">
              {categories.find(c => c._id === category)?.name} <X className="w-3 h-3" />
            </button>
          )}
          {flashSale && (
            <button onClick={() => updateParam('flashSale', '')} className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/30 text-red-400 rounded-full px-3 py-1 text-xs font-medium">
              ⚡ Flash Sale <X className="w-3 h-3" />
            </button>
          )}
          {inStock && (
            <button onClick={() => updateParam('inStock', '')} className="flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 text-green-400 rounded-full px-3 py-1 text-xs font-medium">
              In Stock <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      <div className="flex gap-6">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block w-60 flex-shrink-0">
          <div className="card p-5 sticky top-24">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-white flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> Filters</h2>
              {activeFiltersCount > 0 && <span className="bg-brand-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{activeFiltersCount}</span>}
            </div>
            <FilterPanel />
          </div>
        </aside>

        {/* Mobile filters drawer */}
        <AnimatePresence>
          {filtersOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setFiltersOpen(false)} className="fixed inset-0 bg-black/60 z-40 lg:hidden" />
              <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 30 }} className="fixed left-0 top-0 h-full w-72 bg-surface-1 border-r border-white/10 z-50 p-5 overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-bold text-white">Filters</h2>
                  <button onClick={() => setFiltersOpen(false)}><X className="w-5 h-5 text-white/50" /></button>
                </div>
                <FilterPanel />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Product Grid */}
        <div className="flex-1">
          {isLoading || isFetching ? (
            <div className={cn('grid gap-4', viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1')}>
              {Array.from({ length: 12 }).map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-bold text-white mb-2">No products found</h3>
              <p className="text-white/50 text-sm mb-6">Try adjusting your filters or search terms</p>
              <Button onClick={clearFilters} variant="secondary">Clear Filters</Button>
            </div>
          ) : (
            <>
              <div className={cn('grid gap-4', viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2')}>
                {products.map((product, i) => (
                  <motion.div key={product._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.4) }}>
                    <ProductCard product={product} variant={viewMode === 'list' ? 'horizontal' : 'default'} />
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => updateParam('page', String(page - 1))}>Previous</Button>
                  {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => {
                    const p = i + 1;
                    return (
                      <button key={p} onClick={() => updateParam('page', String(p))} className={cn('w-9 h-9 rounded-xl text-sm font-semibold transition-colors', p === page ? 'bg-brand-500 text-white' : 'bg-surface-2 text-white/60 hover:text-white hover:bg-surface-3')}>
                        {p}
                      </button>
                    );
                  })}
                  <Button variant="secondary" size="sm" disabled={page >= pagination.pages} onClick={() => updateParam('page', String(page + 1))}>Next</Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
