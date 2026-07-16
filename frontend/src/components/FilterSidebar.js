import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiStar, FiShoppingBag, FiGrid, FiDollarSign, FiPercent, FiCheck, FiRotateCcw, FiTag, FiSun, FiMaximize2, FiPackage, FiUsers } from 'react-icons/fi';

const RATING_OPTIONS = [
  { value: 0, label: 'Any Rating' },
  { value: 4, label: '4★ & above' },
  { value: 3, label: '3★ & above' },
  { value: 2, label: '2★ & above' },
];

const DISCOUNT_OPTIONS = [
  { value: 0, label: 'Any Discount' },
  { value: 10, label: '10% or more' },
  { value: 20, label: '20% or more' },
  { value: 30, label: '30% or more' },
  { value: 50, label: '50% or more' },
];

const sidebarVariants = {
  hidden: { x: '-100%' },
  visible: { x: 0, transition: { type: 'spring', damping: 28, stiffness: 260 } },
  exit: { x: '-100%', transition: { type: 'spring', damping: 28, stiffness: 260 } },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const emptyFilters = () => ({
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

const SectionTitle = ({ icon: Icon, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
    <Icon size={14} color="#2E5A44" />
    <h4 style={{ fontSize: 13, fontWeight: 700, color: '#2E5A44', textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>
      {children}
    </h4>
  </div>
);

const FilterSidebar = ({
  isOpen,
  onClose,
  categories = [],
  filterOptions = {},
  value,
  onApply,
  onReset,
  totalProducts,
}) => {
  const [draft, setDraft] = useState(emptyFilters());

  useEffect(() => {
    if (isOpen) {
      setDraft({ ...emptyFilters(), ...(value || {}) });
    }
  }, [isOpen, value]);

  const toggleInArray = (key, val) => {
    setDraft((d) => {
      const arr = d[key];
      const next = arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
      return { ...d, [key]: next };
    });
  };

  const activeChips = [];
  if (draft.category && draft.category !== 'All') {
    activeChips.push({ id: 'category', label: `Category: ${draft.category}`, clear: () => setDraft((d) => ({ ...d, category: 'All' })) });
  }
  if (draft.priceMin || draft.priceMax) {
    activeChips.push({
      id: 'price',
      label: `₹${draft.priceMin || 0} – ₹${draft.priceMax || '∞'}`,
      clear: () => setDraft((d) => ({ ...d, priceMin: '', priceMax: '' })),
    });
  }
  if (draft.rating) activeChips.push({ id: 'rating', label: `${draft.rating}★ & up`, clear: () => setDraft((d) => ({ ...d, rating: 0 })) });
  if (draft.discount) activeChips.push({ id: 'discount', label: `${draft.discount}% off & up`, clear: () => setDraft((d) => ({ ...d, discount: 0 })) });
  if (draft.inStock) activeChips.push({ id: 'inStock', label: 'In Stock', clear: () => setDraft((d) => ({ ...d, inStock: false })) });
  if (draft.featured) activeChips.push({ id: 'featured', label: 'Featured', clear: () => setDraft((d) => ({ ...d, featured: false })) });
  draft.brands.forEach((b) => activeChips.push({ id: `brand-${b}`, label: b, clear: () => toggleInArray('brands', b) }));
  draft.colors.forEach((c) => activeChips.push({ id: `color-${c}`, label: c, clear: () => toggleInArray('colors', c) }));
  draft.sizes.forEach((s) => activeChips.push({ id: `size-${s}`, label: `Size: ${s}`, clear: () => toggleInArray('sizes', s) }));
  draft.materials.forEach((m) => activeChips.push({ id: `material-${m}`, label: m, clear: () => toggleInArray('materials', m) }));
  draft.genders.forEach((g) => activeChips.push({ id: `gender-${g}`, label: g, clear: () => toggleInArray('genders', g) }));
  draft.weightCapacities.forEach((w) => activeChips.push({ id: `wc-${w}`, label: w, clear: () => toggleInArray('weightCapacities', w) }));

  const chipStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px',
    borderRadius: 100, border: '1.5px solid #2E5A44', background: '#f0f7f1',
    color: '#2E5A44', fontSize: 12, fontWeight: 600, fontFamily: "'Inter', sans-serif",
  };

  const renderChips = (items, key, selected) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((item) => {
        const isSel = selected.includes(item);
        return (
          <button
            key={item}
            onClick={() => toggleInArray(key, item)}
            style={{
              padding: '6px 14px', borderRadius: 100, border: '1.5px solid',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              background: isSel ? '#2E5A44' : 'transparent',
              color: isSel ? '#fff' : '#374151',
              borderColor: isSel ? '#2E5A44' : '#d1d5db',
              transition: 'all 0.2s ease',
            }}
          >
            {item}
          </button>
        );
      })}
    </div>
  );

  const toggleRow = (label, checked, onToggle, color = '#2E5A44') => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#374151' }}>
      <span
        onClick={onToggle}
        style={{
          width: 20, height: 20, borderRadius: 4, border: '2px solid',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          borderColor: checked ? color : '#d1d5db',
          background: checked ? color : 'transparent',
          transition: 'all 0.2s ease',
        }}
      >
        {checked && <FiCheck size={12} color="#fff" />}
      </span>
      {label}
    </label>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 5000,
              background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          />
          <motion.aside
            key="sidebar"
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 5001,
              width: 360, maxWidth: '90vw',
              background: '#f9f9f6',
              boxShadow: '4px 0 40px rgba(0,0,0,0.12)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 24px', borderBottom: '1px solid #e5e7eb', background: '#fff',
            }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#2E5A44', margin: 0 }}>Filters</h3>
                <span style={{ fontSize: 13, color: '#6b7280' }}>
                  {totalProducts} product{totalProducts !== 1 ? 's' : ''} found
                </span>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 36, height: 36, borderRadius: '50%', border: '1.5px solid #e5e7eb',
                  background: '#fff', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: '#6b7280', transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2E5A44'; e.currentTarget.style.color = '#2E5A44'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280'; }}
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {/* Active Chips */}
              {activeChips.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {activeChips.map((chip) => (
                      <button key={chip.id} style={chipStyle} onClick={chip.clear}>
                        {chip.label}
                        <FiX size={12} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category */}
              {categories.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <SectionTitle icon={FiGrid}>Category</SectionTitle>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <button
                      onClick={() => setDraft((d) => ({ ...d, category: 'All' }))}
                      style={{
                        padding: '6px 14px', borderRadius: 100, border: '1.5px solid',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                        background: draft.category === 'All' ? '#2E5A44' : 'transparent',
                        color: draft.category === 'All' ? '#fff' : '#374151',
                        borderColor: draft.category === 'All' ? '#2E5A44' : '#d1d5db',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      All
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.name}
                        onClick={() => setDraft((d) => ({ ...d, category: cat.name }))}
                        style={{
                          padding: '6px 14px', borderRadius: 100, border: '1.5px solid',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                          background: draft.category === cat.name ? '#2E5A44' : 'transparent',
                          color: draft.category === cat.name ? '#fff' : '#374151',
                          borderColor: draft.category === cat.name ? '#2E5A44' : '#d1d5db',
                          transition: 'all 0.2s ease',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Brand */}
              {filterOptions.brands && filterOptions.brands.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <SectionTitle icon={FiTag}>Brand</SectionTitle>
                  {renderChips(filterOptions.brands, 'brands', draft.brands)}
                </div>
              )}

              {/* Price Range */}
              <div style={{ marginBottom: 28 }}>
                <SectionTitle icon={FiDollarSign}>Price Range</SectionTitle>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 13, fontWeight: 600 }}>&#8377;</span>
                    <input
                      type="number"
                      min="0"
                      placeholder={filterOptions.priceBounds ? `Min (${filterOptions.priceBounds.min})` : 'Min'}
                      value={draft.priceMin}
                      onChange={(e) => setDraft((d) => ({ ...d, priceMin: e.target.value }))}
                      style={{
                        width: '100%', padding: '10px 10px 10px 24px', border: '1.5px solid #e5e7eb',
                        borderRadius: 8, fontSize: 13, fontFamily: "'Inter', sans-serif",
                        background: '#fff', outline: 'none',
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#2E5A44'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>
                  <span style={{ color: '#9ca3af', fontSize: 14 }}>–</span>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 13, fontWeight: 600 }}>&#8377;</span>
                    <input
                      type="number"
                      min="0"
                      placeholder={filterOptions.priceBounds ? `Max (${filterOptions.priceBounds.max})` : 'Max'}
                      value={draft.priceMax}
                      onChange={(e) => setDraft((d) => ({ ...d, priceMax: e.target.value }))}
                      style={{
                        width: '100%', padding: '10px 10px 10px 24px', border: '1.5px solid #e5e7eb',
                        borderRadius: 8, fontSize: 13, fontFamily: "'Inter', sans-serif",
                        background: '#fff', outline: 'none',
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#2E5A44'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>
                </div>
              </div>

              {/* Rating */}
              <div style={{ marginBottom: 28 }}>
                <SectionTitle icon={FiStar}>Minimum Rating</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {RATING_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDraft((d) => ({ ...d, rating: opt.value }))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 14px', borderRadius: 8, border: '1.5px solid',
                        cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 13,
                        background: draft.rating === opt.value ? '#f0f7f1' : 'transparent',
                        color: draft.rating === opt.value ? '#2E5A44' : '#374151',
                        borderColor: draft.rating === opt.value ? '#2E5A44' : '#e5e7eb',
                        transition: 'all 0.2s ease', fontWeight: draft.rating === opt.value ? 600 : 400,
                      }}
                    >
                      <span style={{
                        width: 18, height: 18, borderRadius: '50%', border: '2px solid',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderColor: draft.rating === opt.value ? '#2E5A44' : '#d1d5db', flexShrink: 0,
                      }}>
                        {draft.rating === opt.value && <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#2E5A44' }} />}
                      </span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discount */}
              <div style={{ marginBottom: 28 }}>
                <SectionTitle icon={FiPercent}>Discount</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {DISCOUNT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDraft((d) => ({ ...d, discount: opt.value }))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 14px', borderRadius: 8, border: '1.5px solid',
                        cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 13,
                        background: draft.discount === opt.value ? '#fef2f2' : 'transparent',
                        color: draft.discount === opt.value ? '#dc2626' : '#374151',
                        borderColor: draft.discount === opt.value ? '#dc2626' : '#e5e7eb',
                        transition: 'all 0.2s ease', fontWeight: draft.discount === opt.value ? 600 : 400,
                      }}
                    >
                      <span style={{
                        width: 18, height: 18, borderRadius: 4, border: '2px solid',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderColor: draft.discount === opt.value ? '#dc2626' : '#d1d5db', flexShrink: 0,
                      }}>
                        {draft.discount === opt.value && <FiCheck size={12} color="#dc2626" />}
                      </span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Availability */}
              <div style={{ marginBottom: 28 }}>
                <SectionTitle icon={FiShoppingBag}>Availability</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {toggleRow('In Stock Only', draft.inStock, () => setDraft((d) => ({ ...d, inStock: !d.inStock })))}
                  {toggleRow('Featured Only', draft.featured, () => setDraft((d) => ({ ...d, featured: !d.featured })), '#b45309')}
                </div>
              </div>

              {/* Color */}
              {filterOptions.colors && filterOptions.colors.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <SectionTitle icon={FiSun}>Color</SectionTitle>
                  {renderChips(filterOptions.colors, 'colors', draft.colors)}
                </div>
              )}

              {/* Size */}
              {filterOptions.sizes && filterOptions.sizes.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <SectionTitle icon={FiMaximize2}>Size</SectionTitle>
                  {renderChips(filterOptions.sizes, 'sizes', draft.sizes)}
                </div>
              )}

              {/* Material */}
              {filterOptions.materials && filterOptions.materials.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <SectionTitle icon={FiPackage}>Material</SectionTitle>
                  {renderChips(filterOptions.materials, 'materials', draft.materials)}
                </div>
              )}

              {/* Weight Capacity */}
              {filterOptions.weightCapacities && filterOptions.weightCapacities.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <SectionTitle icon={FiPackage}>Weight Capacity</SectionTitle>
                  {renderChips(filterOptions.weightCapacities, 'weightCapacities', draft.weightCapacities)}
                </div>
              )}

              {/* Gender */}
              {filterOptions.genders && filterOptions.genders.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <SectionTitle icon={FiUsers}>Gender</SectionTitle>
                  {renderChips(filterOptions.genders, 'genders', draft.genders)}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px', borderTop: '1px solid #e5e7eb',
              background: '#fff', display: 'flex', gap: 10,
            }}>
              <button
                onClick={() => { onReset(); onClose(); }}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8, border: '1.5px solid #d1d5db',
                  background: '#fff', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                  fontSize: 14, fontWeight: 600, color: '#374151',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.color = '#dc2626'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#374151'; }}
              >
                <FiRotateCcw size={14} /> Reset
              </button>
              <button
                onClick={() => { onApply(draft); onClose(); }}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8, border: 'none',
                  background: '#2E5A44', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                  fontSize: 14, fontWeight: 600, color: '#fff',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#1f3f30'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#2E5A44'; }}
              >
                Apply Filters
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default FilterSidebar;
