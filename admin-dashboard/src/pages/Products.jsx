import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiAlertTriangle, FiPackage } from 'react-icons/fi';
import api from '../utils/axios';

const initialForm = {
  name: '', price: '', stock: '', category: '', brand: '', sku: '',
  description: '', shortDescription: '', material: '',
  colors: '', sizes: '', weight: '', weightCapacity: '', bagWeight: '',
  dimHeight: '', dimWidth: '', dimDepth: '', dimHandle: '',
  pattern: '', closureType: '', features: '', care: '',
  manufacturer: '', countryOfOrigin: 'India', warranty: '',
  image: '', images: '',
  handmade: true, freeDelivery: true, washable: true, reusable: true, waterResistant: false, ecoFriendly: true,
};

const splitList = (v) =>
  String(v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
const splitLines = (v) =>
  String(v || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(t);
  }, [success]);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/admin/products');
      setProducts(Array.isArray(data) ? data : data.products || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    const d = product.dimensions || {};
    setForm({
      name: product.name || '',
      price: product.price?.toString() || '',
      stock: product.stock?.toString() || '',
      category: product.category || '',
      brand: product.brand || '',
      sku: product.sku || '',
      description: product.description || '',
      shortDescription: product.shortDescription || '',
      material: product.material || '',
      colors: (product.colors || []).join(', '),
      sizes: (product.sizes || []).join(', '),
      weight: product.weight || '',
      weightCapacity: product.weightCapacity || '',
      bagWeight: product.bagWeight || '',
      dimHeight: d.height || '',
      dimWidth: d.width || '',
      dimDepth: d.depth || '',
      dimHandle: d.handleLength || '',
      pattern: product.pattern || '',
      closureType: product.closureType || '',
      features: (product.features || []).join('\n'),
      care: (product.careInstructions || []).join('\n'),
      manufacturer: product.manufacturer || '',
      countryOfOrigin: product.countryOfOrigin || 'India',
      warranty: product.warranty || '',
      image: product.image || '',
      images: (product.images || []).map((i) => i.url || i).join(', '),
      handmade: product.handmade !== false,
      freeDelivery: product.freeDelivery !== false,
      washable: product.washable !== false,
      reusable: product.reusable !== false,
      waterResistant: !!product.waterResistant,
      ecoFriendly: product.ecoFriendly !== false,
    });
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    // Keep the single "Image URL" field and the "Gallery Images" field in
    // sync: the Image URL is always the FIRST gallery entry. This prevents a
    // scenario where the admin edits one field but the storefront (which
    // renders images[0]) keeps showing the other, stale value.
    if (name === 'image') {
      const newImage = value.trim();
      const rest = splitList(form.images).filter((u) => u !== newImage);
      const images = newImage ? [newImage, ...rest].join(', ') : rest.join(', ');
      setForm({ ...form, image: value, images });
      return;
    }
    if (name === 'images') {
      const urls = splitList(value);
      setForm({ ...form, images: value, image: urls.length ? urls[0] : form.image });
      return;
    }
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        price: parseFloat(form.price) || 0,
        stock: parseInt(form.stock) || 0,
        category: form.category,
        brand: form.brand,
        sku: form.sku,
        description: form.description,
        shortDescription: form.shortDescription,
        material: form.material,
        colors: splitList(form.colors),
        sizes: splitList(form.sizes),
        weight: form.weight,
        weightCapacity: form.weightCapacity,
        bagWeight: form.bagWeight,
        dimensions: {
          height: form.dimHeight,
          width: form.dimWidth,
          depth: form.dimDepth,
          handleLength: form.dimHandle,
        },
        pattern: form.pattern,
        closureType: form.closureType,
        features: splitLines(form.features),
        careInstructions: splitLines(form.care),
        manufacturer: form.manufacturer,
        countryOfOrigin: form.countryOfOrigin,
        warranty: form.warranty,
        image: form.image,
        handmade: form.handmade,
        freeDelivery: form.freeDelivery,
        washable: form.washable,
        reusable: form.reusable,
        waterResistant: form.waterResistant,
        ecoFriendly: form.ecoFriendly,
      };
      if (form.images) payload.images = splitList(form.images).map((url) => ({ url }));

      if (editing) {
        await api.put(`/api/admin/products/${editing._id || editing.id}`, payload);
        setSuccess('Product updated. The new image is now live on the storefront.');
      } else {
        await api.post('/api/admin/products', payload);
        setSuccess('Product created successfully.');
      }
      setModalOpen(false);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/admin/products/${id}`);
      setDeleteConfirm(null);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete product');
    }
  };

  const filtered = products.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" /><p>Loading products...</p>
      </div>
    );
  }

  if (error && products.length === 0) {
    return (
      <div className="error-container">
        <FiAlertTriangle size={48} /><h3>Error</h3><p>{error}</p>
        <button className="btn btn-primary" onClick={fetchProducts}>Retry</button>
      </div>
    );
  }

  return (
    <motion.div className="page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <div><h1>Products</h1><p>Manage your product catalog</p></div>
        <motion.button className="btn btn-primary" onClick={openCreate} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <FiPlus /> Add Product
        </motion.button>
      </div>

      {error && <div className="toast toast-error">{error}</div>}
      {success && (
        <div className="toast toast-success">
          {success}
          <button className="toast-close" onClick={() => setSuccess('')} aria-label="Dismiss">×</button>
        </div>
      )}

      <div className="search-bar">
        <FiSearch />
        <input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length > 0 ? (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <motion.tr key={p._id || p.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td>
                    <img src={p.image || p.thumbnail || (p.images && p.images[0]?.url) || 'https://via.placeholder.com/40'} alt={p.name} className="product-thumb" />
                  </td>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>₹{Number(p.price || 0).toFixed(2)}</td>
                  <td><span className={`stock-badge ${p.stock < 10 ? 'low' : p.stock < 50 ? 'medium' : 'high'}`}>{p.stock}</span></td>
                  <td className="actions-cell">
                    <button className="btn-icon" onClick={() => openEdit(p)}><FiEdit2 /></button>
                    <button className="btn-icon danger" onClick={() => setDeleteConfirm(p)}><FiTrash2 /></button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <FiPackage size={48} />
          <h3>{search ? 'No products found' : 'No products yet'}</h3>
          <p>{search ? 'Try a different search term' : 'Add your first product to get started'}</p>
        </div>
      )}

      <AnimatePresence>
        {modalOpen && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen(false)}>
            <motion.div className="modal modal-lg" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
              <h2>{editing ? 'Edit Product' : 'Add Product'}</h2>
              <form onSubmit={handleSubmit} className="admin-product-form">
                <div className="form-group">
                  <label>Name</label>
                  <input name="name" value={form.name} onChange={handleChange} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Price (₹)</label>
                    <input name="price" type="number" step="0.01" value={form.price} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label>Stock</label>
                    <input name="stock" type="number" value={form.stock} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <input name="category" value={form.category} onChange={handleChange} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Brand</label>
                    <input name="brand" value={form.brand} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>SKU</label>
                    <input name="sku" value={form.sku} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Material</label>
                    <input name="material" value={form.material} onChange={handleChange} placeholder="Jute, Cotton..." />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Colors (comma separated)</label>
                    <input name="colors" value={form.colors} onChange={handleChange} placeholder="Beige, Brown, Green" />
                  </div>
                  <div className="form-group">
                    <label>Sizes (comma separated)</label>
                    <input name="sizes" value={form.sizes} onChange={handleChange} placeholder="Small, Medium, Large" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Weight</label>
                    <input name="weight" value={form.weight} onChange={handleChange} placeholder="350 g" />
                  </div>
                  <div className="form-group">
                    <label>Weight Capacity</label>
                    <input name="weightCapacity" value={form.weightCapacity} onChange={handleChange} placeholder="5 KG" />
                  </div>
                  <div className="form-group">
                    <label>Bag Weight</label>
                    <input name="bagWeight" value={form.bagWeight} onChange={handleChange} placeholder="450 g" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Dimensions - Height</label>
                    <input name="dimHeight" value={form.dimHeight} onChange={handleChange} placeholder="30 cm" />
                  </div>
                  <div className="form-group">
                    <label>Dimensions - Width</label>
                    <input name="dimWidth" value={form.dimWidth} onChange={handleChange} placeholder="25 cm" />
                  </div>
                  <div className="form-group">
                    <label>Dimensions - Depth</label>
                    <input name="dimDepth" value={form.dimDepth} onChange={handleChange} placeholder="12 cm" />
                  </div>
                  <div className="form-group">
                    <label>Handle Length</label>
                    <input name="dimHandle" value={form.dimHandle} onChange={handleChange} placeholder="28 cm" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Pattern</label>
                    <input name="pattern" value={form.pattern} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Closure Type</label>
                    <input name="closureType" value={form.closureType} onChange={handleChange} placeholder="Zipper, Drawstring" />
                  </div>
                  <div className="form-group">
                    <label>Manufacturer</label>
                    <input name="manufacturer" value={form.manufacturer} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Country of Origin</label>
                    <input name="countryOfOrigin" value={form.countryOfOrigin} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Warranty</label>
                    <input name="warranty" value={form.warranty} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Short Description</label>
                    <input name="shortDescription" value={form.shortDescription} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea name="description" rows="3" value={form.description} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Features (one per line)</label>
                  <textarea name="features" rows="3" value={form.features} onChange={handleChange} placeholder={'100% Eco Friendly\nHandmade\nReusable'} />
                </div>
                <div className="form-group">
                  <label>Care Instructions (one per line)</label>
                  <textarea name="care" rows="3" value={form.care} onChange={handleChange} placeholder={'Hand Wash Only\nDo Not Bleach'} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Image URL</label>
                    <input name="image" value={form.image} onChange={handleChange} placeholder="https://..." />
                  </div>
                  <div className="form-group">
                    <label>Gallery Images (comma separated URLs)</label>
                    <input name="images" value={form.images} onChange={handleChange} placeholder="https://img1.jpg, https://img2.jpg" />
                  </div>
                </div>
                <div className="form-checkbox-grid">
                  {[
                    ['handmade', 'Handmade'],
                    ['freeDelivery', 'Free Delivery'],
                    ['washable', 'Washable'],
                    ['reusable', 'Reusable'],
                    ['waterResistant', 'Water Resistant'],
                    ['ecoFriendly', 'Eco Friendly'],
                  ].map(([key, label]) => (
                    <label key={key} className="checkbox-inline">
                      <input type="checkbox" name={key} checked={!!form[key]} onChange={handleChange} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Saving...' : editing ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal confirm-modal" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <h3>Delete Product</h3>
              <p>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?</p>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm._id || deleteConfirm.id)}>Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default Products;
