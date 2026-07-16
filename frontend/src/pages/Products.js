import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiHeart, FiShoppingBag, FiSearch, FiX, FiFilter, FiGrid, FiList, FiStar, FiChevronDown, FiImage, FiEye, FiShare2 } from 'react-icons/fi';
import api from '../utils/axios';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';
import FilterSidebar from '../components/FilterSidebar';
import ProductCard from '../components/ProductCard';
import { onProductsChanged } from '../utils/productSync';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'name_asc', label: 'Name: A-Z' },
  { value: 'name_desc', label: 'Name: Z-A' },
  { value: 'best_selling', label: 'Best Selling' },
  { value: 'discount', label: 'Biggest Discount' },
];

const defaultFilters = () => ({
  category: 'All',
  priceMin: '',
  priceMax: '',
  rating: 0,
  discount: 0,
  inStock: false,
  featured: false,
  brands: [],
  colors: [],
  sizes: [],
  materials: [],
  genders: [],
  weightCapacities: [],
});

const PAGE_SIZE = 24;

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ ...defaultFilters(), category: searchParams.get('category') || 'All' });
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [viewMode, setViewMode] = useState('grid');
  const [totalProducts, setTotalProducts] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sort, setSort] = useState('newest');
  const [suggestions, setSuggestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filterOptions, setFilterOptions] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const searchRef = useRef(null);
  const loadMoreRef = useRef(null);
  const { addToCart, toggleWishlist, wishlist } = useCart();
  const { showNotification } = useNotification();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    api.get('/api/categories').then(({ data }) => {
      if (Array.isArray(data)) setCategories(data);
    }).catch(() => setCategories([]));
    api.get('/api/products/filters').then(({ data }) => {
      setFilterOptions(data || {});
    }).catch(() => setFilterOptions({}));
  }, []);

  const fetchProducts = useCallback(async (pageNum = 1, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.category !== 'All') params.set('category', filters.category);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filters.priceMin) params.set('minPrice', filters.priceMin);
      if (filters.priceMax) params.set('maxPrice', filters.priceMax);
      if (filters.rating > 0) params.set('rating', String(filters.rating));
      if (filters.discount > 0) params.set('discount', String(filters.discount));
      if (filters.featured) params.set('featured', 'true');
      if (filters.inStock) params.set('inStock', 'true');
      if (filters.brands.length) params.set('brand', filters.brands.join(','));
      if (filters.colors.length) params.set('color', filters.colors.join(','));
      if (filters.sizes.length) params.set('size', filters.sizes.join(','));
      if (filters.materials.length) params.set('material', filters.materials.join(','));
      if (filters.genders.length) params.set('gender', filters.genders.join(','));
      if (filters.weightCapacities.length) params.set('weightCapacity', filters.weightCapacities.join(','));
      params.set('sort', sort);
      params.set('limit', String(PAGE_SIZE));
      params.set('skip', String((pageNum - 1) * PAGE_SIZE));

      const { data } = await api.get(`/api/products?${params.toString()}`);
      const raw = Array.isArray(data?.products) ? data.products : (Array.isArray(data) ? data : []);
      const seen = new Set();
      const unique = raw.filter((p) => {
        if (!p || seen.has(p._id)) return false;
        seen.add(p._id);
        return true;
      });
      setProducts((prev) => append ? [...prev, ...unique] : unique);
      setTotalProducts(data?.total || unique.length || 0);
      setHasMore(unique.length >= PAGE_SIZE);
    } catch {
      if (!append) {
        setError('Failed to load products. Please try again.');
        setProducts([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, debouncedSearch, sort]);

  useEffect(() => {
    setPage(1);
    fetchProducts(1, false);
  }, [fetchProducts]);

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loading || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          setPage((prev) => {
            const next = prev + 1;
            fetchProducts(next, true);
            return next;
          });
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, fetchProducts]);

  useEffect(() => {
    return onProductsChanged(() => {
      setPage(1);
      fetchProducts(1, false);
    });
  }, [fetchProducts]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.category !== 'All') params.set('category', filters.category);
    if (debouncedSearch) params.set('search', debouncedSearch);
    setSearchParams(params, { replace: true });
  }, [filters.category, debouncedSearch, setSearchParams]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/api/products/search/suggestions?q=${encodeURIComponent(searchQuery.trim())}`);
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') setLightboxImg(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleCategoryClick = (cat) => {
    setFilters((f) => ({ ...f, category: cat }));
    setSearchQuery('');
    setDebouncedSearch('');
  };

  const handleAddToCart = (product) => {
    addToCart(product);
    showNotification('addToCart');
  };

  const handleToggleWishlist = (product) => {
    const wasWishlisted = wishlist.some((item) => item._id === product._id);
    toggleWishlist(product);
    showNotification(wasWishlisted ? 'remove' : 'wishlist');
  };

  const isWishlisted = (id) => wishlist.some((item) => item._id === id);

  const clearFilters = () => {
    setFilters(defaultFilters());
    setSearchQuery('');
    setDebouncedSearch('');
  };

  const activeChips = [];
  if (filters.category !== 'All') activeChips.push({ id: 'category', label: `Category: ${filters.category}`, clear: () => setFilters((f) => ({ ...f, category: 'All' })) });
  if (filters.priceMin || filters.priceMax) activeChips.push({ id: 'price', label: `₹${filters.priceMin || 0} – ₹${filters.priceMax || '∞'}`, clear: () => setFilters((f) => ({ ...f, priceMin: '', priceMax: '' })) });
  if (filters.rating) activeChips.push({ id: 'rating', label: `${filters.rating}★ & up`, clear: () => setFilters((f) => ({ ...f, rating: 0 })) });
  if (filters.discount) activeChips.push({ id: 'discount', label: `${filters.discount}% off & up`, clear: () => setFilters((f) => ({ ...f, discount: 0 })) });
  if (filters.inStock) activeChips.push({ id: 'inStock', label: 'In Stock', clear: () => setFilters((f) => ({ ...f, inStock: false })) });
  if (filters.featured) activeChips.push({ id: 'featured', label: 'Featured', clear: () => setFilters((f) => ({ ...f, featured: false })) });
  filters.brands.forEach((b) => activeChips.push({ id: `brand-${b}`, label: b, clear: () => setFilters((f) => ({ ...f, brands: f.brands.filter((x) => x !== b) })) }));
  filters.colors.forEach((c) => activeChips.push({ id: `color-${c}`, label: c, clear: () => setFilters((f) => ({ ...f, colors: f.colors.filter((x) => x !== c) })) }));
  filters.sizes.forEach((s) => activeChips.push({ id: `size-${s}`, label: `Size: ${s}`, clear: () => setFilters((f) => ({ ...f, sizes: f.sizes.filter((x) => x !== s) })) }));
  filters.materials.forEach((m) => activeChips.push({ id: `material-${m}`, label: m, clear: () => setFilters((f) => ({ ...f, materials: f.materials.filter((x) => x !== m) })) }));
  filters.genders.forEach((g) => activeChips.push({ id: `gender-${g}`, label: g, clear: () => setFilters((f) => ({ ...f, genders: f.genders.filter((x) => x !== g) })) }));
  filters.weightCapacities.forEach((w) => activeChips.push({ id: `wc-${w}`, label: w, clear: () => setFilters((f) => ({ ...f, weightCapacities: f.weightCapacities.filter((x) => x !== w) })) }));

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="container" style={{ padding: '40px 24px' }}>
      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.9)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', padding: 40,
            }}
            onClick={() => setLightboxImg(null)}
          >
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              src={lightboxImg}
              alt=""
              style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12 }}
            />
            <button
              onClick={() => setLightboxImg(null)}
              style={{
                position: 'absolute', top: 24, right: 24,
                background: 'rgba(255,255,255,0.2)', color: '#fff',
                border: 'none', width: 48, height: 48, borderRadius: '50%',
                fontSize: 24, cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <FiX />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Bar */}
      <div className="search-bar-container">
        <div className="search-bar">
          <FiSearch className="search-icon" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search by name, category, brand, material..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => { setSearchQuery(''); setDebouncedSearch(''); }} aria-label="Clear search">
              <FiX />
            </button>
          )}
        </div>
        {suggestions.length > 0 && (
          <div className="search-suggestions">
            {suggestions.map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => {
                  setSearchQuery(item.name);
                  setDebouncedSearch(item.name);
                  setSuggestions([]);
                }}
              >
                <span>{item.name}</span>
                <small>{item.category} - ₹{item.price}</small>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter Sidebar + Top Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="btn btn-outline"
            onClick={() => setShowFilters(true)}
            style={{ padding: '8px 16px', fontSize: 13, gap: 6 }}
          >
            <FiFilter size={14} /> Filters {activeChips.length > 0 && <span style={{
              background: '#2E5A44', color: '#fff', borderRadius: '50%',
              width: 18, height: 18, display: 'inline-flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 10, marginLeft: 4,
            }}>{activeChips.length}</span>}
          </button>
          {activeChips.length > 0 && (
            <button onClick={clearFilters} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Clear all
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{
              padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 6,
              fontSize: 13, background: '#fff', fontFamily: "'Inter', sans-serif", cursor: 'pointer',
            }}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className="view-toggle" style={{ marginBottom: 0 }}>
            <button
              className={`view-toggle-btn${viewMode === 'grid' ? ' active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >
              <FiGrid />
            </button>
            <button
              className={`view-toggle-btn${viewMode === 'list' ? ' active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              <FiList />
            </button>
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeChips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {activeChips.map((chip) => (
            <button
              key={chip.id}
              onClick={chip.clear}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                borderRadius: 100, border: '1.5px solid #2E5A44', background: '#f0f7f1',
                color: '#2E5A44', fontSize: 12, fontWeight: 600, fontFamily: "'Inter', sans-serif", cursor: 'pointer',
              }}
            >
              {chip.label}
              <FiX size={12} />
            </button>
          ))}
        </div>
      )}

      {/* Filter Sidebar */}
      <FilterSidebar
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        categories={categories}
        filterOptions={filterOptions}
        value={filters}
        onApply={(f) => setFilters(f)}
        onReset={clearFilters}
        totalProducts={totalProducts}
      />

      {/* Loading State */}
      {loading && (
        <div className={`product-grid ${viewMode}`}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="product-card skeleton">
              <div className="skeleton-image" />
              <div className="product-card-body">
                <div className="skeleton-line" style={{ width: '40%' }} />
                <div className="skeleton-line" style={{ width: '80%' }} />
                <div className="skeleton-line" style={{ width: '30%' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="error-state">
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => fetchProducts(1, false)} style={{ marginTop: 16 }}>Try Again</button>
        </motion.div>
      )}

      {/* Empty State */}
      {!loading && !error && products.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="empty-state"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <FiSearch size={64} style={{ color: '#A3C9A8', marginBottom: 16 }} />
          </motion.div>
          <h3 style={{ color: '#2E5A44', marginBottom: 8 }}>No Products Found</h3>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>
            {filters.category !== 'All'
              ? `No products found in ${filters.category}.`
              : activeChips.length > 0
                ? 'No products match your selected filters. Try adjusting or clearing them.'
                : 'Try a different search, category, or price range.'}
          </p>
          {activeChips.length > 0 ? (
            <button className="btn btn-primary" onClick={clearFilters}>Clear Filters</button>
          ) : (
            <button className="btn btn-primary" onClick={() => { setFilters(defaultFilters()); setSearchQuery(''); setDebouncedSearch(''); }}>
              View All Products
            </button>
          )}
        </motion.div>
      )}

      {/* Product Grid */}
      {!loading && !error && products.length > 0 && (
        <AnimatePresence mode="wait">
          <motion.div
            key={JSON.stringify(filters) + debouncedSearch + viewMode + sort}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className={`product-grid ${viewMode}`}
          >
            {products.map((product, i) => (
              <motion.div
                key={product._id}
                variants={itemVariants}
                layout
                className={viewMode === 'list' ? 'product-card-list' : ''}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Loading More Indicator */}
      {loadingMore && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <div style={{
            width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#2E5A44',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* Infinite Scroll Sentinel */}
      {hasMore && !loading && !loadingMore && <div ref={loadMoreRef} style={{ height: 1 }} />}

      {/* Product Count */}
      {!loading && !error && products.length > 0 && (
        <p style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: '#9ca3af' }}>
          Showing {products.length} of {totalProducts} products
        </p>
      )}
    </div>
  );
};

export default Products;
