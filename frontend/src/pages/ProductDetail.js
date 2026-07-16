import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiShoppingBag, FiHeart, FiShare2, FiMinus, FiPlus, FiX, FiCheck,
  FiChevronLeft, FiChevronRight, FiFeather, FiAward, FiTruck, FiArrowRight,
  FiBox, FiGrid, FiShield, FiZap, FiStar,
} from 'react-icons/fi';
import api from '../utils/axios';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';
import BackButton from '../components/BackButton';
import StarRating from '../components/StarRating';
import WishlistButton from '../components/WishlistButton';
import AddToCartButton from '../components/AddToCartButton';
import ProductCard from '../components/ProductCard';
import ReviewSection from '../components/ReviewSection';
import ReviewModal from '../components/ReviewModal';
import { getProductImages } from '../utils/productImage';
import { onProductsChanged } from '../utils/productSync';
import { onRealtime } from '../utils/realtime';
import { useSocket } from '../context/SocketContext';
import { getReviewEligibility, eligibilityReasonText } from '../utils/reviewEligibility';
import { trackProductView, getRecentlyViewed } from '../utils/recentlyViewed';

const ECO = ['jute', 'cotton', 'canvas', 'fabric', 'bamboo', 'hemp', 'recycled', 'silk', 'linen', 'organic'];
const ecoMaterial = (m = '') => ECO.some((e) => m.toLowerCase().includes(e));

const Badge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${className}`}>
    {children}
  </span>
);

const ZoomImage = ({ src, alt, onOpen }) => {
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [zoom, setZoom] = useState(false);
  return (
    <div
      className="relative h-full w-full cursor-zoom-in overflow-hidden rounded-3xl"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
      }}
      onMouseEnter={() => setZoom(true)}
      onMouseLeave={() => setZoom(false)}
      onClick={onOpen}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-200"
        style={{ transform: zoom ? 'scale(1.6)' : 'scale(1)', transformOrigin: `${pos.x}% ${pos.y}%` }}
      />
    </div>
  );
};

const DetailSkeleton = () => (
  <div className="container mx-auto max-w-6xl px-4 py-10">
    <div className="grid gap-10 md:grid-cols-2">
      <div className="space-y-4">
        <div className="aspect-square w-full animate-pulse rounded-3xl bg-beige" />
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 w-20 animate-pulse rounded-2xl bg-beige" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-4 w-24 animate-pulse rounded bg-beige" />
        <div className="h-8 w-3/4 animate-pulse rounded bg-beige" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-beige" />
        <div className="h-10 w-1/3 animate-pulse rounded bg-beige" />
        <div className="h-24 w-full animate-pulse rounded-2xl bg-beige" />
        <div className="h-12 w-full animate-pulse rounded-full bg-beige" />
      </div>
    </div>
  </div>
);

const buildSpecs = (p) => {
  const d = p.dimensions || {};
  const dims = [d.height && `H ${d.height}`, d.width && `W ${d.width}`, d.depth && `D ${d.depth}`, d.handleLength && `Handle ${d.handleLength}`]
    .filter(Boolean)
    .join(' × ');
  const rows = [
    ['Material', p.material],
    ['Weight Capacity', p.weightCapacity],
    ['Bag Weight', p.bagWeight],
    ['Dimensions', dims],
    ['Color', Array.isArray(p.colors) && p.colors.length ? p.colors.join(', ') : ''],
    ['Pattern', p.pattern],
    ['Closure Type', p.closureType],
    ['Washable', typeof p.washable === 'boolean' ? (p.washable ? 'Yes' : 'No') : ''],
    ['Reusable', typeof p.reusable === 'boolean' ? (p.reusable ? 'Yes' : 'No') : ''],
    ['Eco Friendly', typeof p.ecoFriendly === 'boolean' ? (p.ecoFriendly ? 'Yes' : 'No') : ''],
    ['Handmade', typeof p.handmade === 'boolean' ? (p.handmade ? 'Yes' : 'No') : ''],
    ['Water Resistant', typeof p.waterResistant === 'boolean' ? (p.waterResistant ? 'Yes' : 'No') : ''],
    ['SKU', p.sku],
    ['Brand', p.brand],
    ['Country of Origin', p.countryOfOrigin],
    ['Manufacturer', p.manufacturer],
    ['Warranty', p.warranty],
    ['Category', p.category],
  ];
  return rows.filter(([, v]) => v !== '' && v !== undefined && v !== null);
};

const deriveFeatures = (p) => {
  const list = Array.isArray(p.features) ? [...p.features] : [];
  const map = {
    ecoFriendly: '100% Eco Friendly',
    handmade: 'Handmade',
    reusable: 'Reusable',
    waterResistant: 'Water Resistant',
    washable: 'Washable',
  };
  Object.entries(map).forEach(([k, label]) => {
    if (p[k] && !list.includes(label)) list.push(label);
  });
  if (ecoMaterial(p.material) && !list.some((f) => f.toLowerCase().includes('eco'))) list.push('Sustainable Material');
  return list;
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, user } = useCart();
  const { showNotification } = useNotification();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImg, setActiveImg] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [qty, setQty] = useState(1);
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [related, setRelated] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [existingReview, setExistingReview] = useState(null);
  const [elig, setElig] = useState(null);
  const [viewers, setViewers] = useState(0);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  const { socket, connected } = useSocket();
  const reviewsRef = useRef(null);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/api/products/${id}`);
      setProduct(data);
      setActiveImg(0);
      setQty(1);
      setColor(Array.isArray(data.colors) && data.colors[0] ? data.colors[0] : '');
      setSize(Array.isArray(data.sizes) && data.sizes[0] ? data.sizes[0] : '');
      trackProductView(data);
      setRecentlyViewed(getRecentlyViewed().filter((p) => p._id !== data._id).slice(0, 8));
      if (data.category) {
        const params = new URLSearchParams({ category: data.category, limit: '12' });
        const { data: rel } = await api.get(`/api/products?${params.toString()}`);
        const all = rel.products || rel;
        setRelated(all.filter((p) => p._id !== data._id).slice(0, 8));
      }
    } catch {
      setError('Product not found.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
    window.scrollTo(0, 0);
  }, [fetchProduct]);

  const refreshEligibility = useCallback(async () => {
    if (!id) return;
    const data = await getReviewEligibility(id);
    setElig(data);
  }, [id]);

  useEffect(() => {
    refreshEligibility();
  }, [refreshEligibility, user]);

  useEffect(() => {
    return onProductsChanged((detail) => {
      if (detail && detail.reason === 'socket' && detail.productId && detail.productId !== id) {
        return;
      }
      fetchProduct();
    });
  }, [fetchProduct, id]);

  // Live "X people are viewing this" + notify the server we're viewing.
  useEffect(() => {
    if (!socket || !connected) return;
    socket.emit('product:view', { productId: id });
    const off = onRealtime('product:viewers', (data) => {
      if (data && data.productId === id) setViewers(data.count || 0);
    });
    return () => {
      socket.emit('product:view:leave', { productId: id });
      off();
    };
  }, [socket, connected, id]);

  if (loading) return <DetailSkeleton />;
  if (error || !product) {
    return (
      <div className="container mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
        <FiShoppingBag size={64} className="mb-4 text-leaf/60" />
        <h2 className="mb-2 text-2xl font-bold text-neutral-800">Product Not Found</h2>
        <p className="mb-6 text-neutral-500">{error || 'This product does not exist.'}</p>
        <Link to="/products" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20">
          Browse Products
        </Link>
      </div>
    );
  }

  const images = getProductImages(product);
  const current = images[activeImg] || images[0] || '';
  const rating = product.averageRating ?? product.rating ?? 0;
  const count = product.totalReviews ?? product.numReviews ?? 0;
  const price = product.discountPrice && product.discountPrice > 0 ? product.discountPrice : product.price;
  const oldPrice =
    product.originalPrice && product.originalPrice > product.price
      ? product.originalPrice
      : product.discount
      ? Math.round(product.price / (1 - product.discount / 100))
      : null;
  const discountPct = product.discount || (oldPrice && price ? Math.round((1 - price / oldPrice) * 100) : 0);
  const outOfStock = !product.stock || product.stock <= 0;
  const specs = buildSpecs(product);
  const features = deriveFeatures(product);
  const care = Array.isArray(product.careInstructions) ? product.careInstructions : [];

  const share = async () => {
    const url = `${window.location.origin}/products/${product._id}`;
    try {
      if (navigator.share) await navigator.share({ title: product.name, url });
      else {
        await navigator.clipboard.writeText(url);
        showNotification('coupon', 'Link copied to clipboard');
      }
    } catch {
      /* ignored */
    }
  };

  const buyNow = () => {
    if (outOfStock) return;
    addToCart({ ...product, selectedColor: color, selectedSize: size, _qty: qty });
    if (user) navigate('/checkout');
    else navigate('/login');
  };

  const scrollToReviews = () => reviewsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="relative min-h-screen overflow-hidden bg-cream">
      {/* Organic background shapes */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-leaf/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-40 h-80 w-80 rounded-full bg-gold/10 blur-3xl" />

      <div className="container relative mx-auto max-w-6xl px-4 py-8">
        <BackButton to="/products" label="Back to Products" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4 grid gap-10 md:grid-cols-2">
          {/* Gallery */}
          <div className="md:sticky md:top-24 md:self-start">
            <div className="relative h-[360px] w-full sm:h-[460px]">
              {current ? (
                <ZoomImage src={current} alt={product.name} onOpen={() => images.length > 0 && setLightbox(true)} />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-3xl bg-beige text-neutral-300">
                  <FiShoppingBag size={72} />
                </div>
              )}
              <div className="absolute left-4 top-4 flex flex-col gap-2">
                {discountPct > 0 && <Badge className="bg-rose-500 text-white shadow">-{discountPct}%</Badge>}
                {product.freeDelivery && <Badge className="bg-leaf text-white shadow"><FiTruck size={11} /> Free Delivery</Badge>}
                {product.featured && <Badge className="bg-earth text-white shadow">Featured</Badge>}
              </div>
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImg((i) => (i - 1 + images.length) % images.length)}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-neutral-700 shadow backdrop-blur"
                  >
                    <FiChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setActiveImg((i) => (i + 1) % images.length)}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-neutral-700 shadow backdrop-blur"
                  >
                    <FiChevronRight size={20} />
                  </button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    aria-label={`View image ${i + 1}`}
                    className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border-2 transition-colors ${
                      i === activeImg ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className="bg-earth/10 text-earth">{product.category}</Badge>
              {product.brand && <Badge className="bg-white text-neutral-500 shadow-sm">{product.brand}</Badge>}
              {ecoMaterial(product.material) && <Badge className="bg-leaf/10 text-leaf"><FiFeather size={11} /> Eco Friendly</Badge>}
              {product.handmade !== false && <Badge className="bg-gold/15 text-earth"><FiAward size={11} /> Handmade</Badge>}
            </div>

            <h1 className="text-3xl font-bold leading-tight text-neutral-900 sm:text-4xl">{product.name}</h1>

            <button onClick={scrollToReviews} className="mt-3 flex w-fit items-center gap-1 text-sm text-neutral-500 hover:text-primary">
              <StarRating value={rating} readOnly size={18} count={count} />
            </button>

            <div className="mt-4 flex items-end gap-3">
              <span className="text-3xl font-black text-neutral-900">₹{Number(price).toLocaleString()}</span>
              {oldPrice && <span className="text-base text-neutral-400 line-through">₹{Number(oldPrice).toLocaleString()}</span>}
              {discountPct > 0 && (
                <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-600">Save {discountPct}%</span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              {outOfStock ? (
                <span className="font-semibold text-rose-500">Out of Stock</span>
              ) : product.stock < 10 ? (
                <span className="font-semibold text-gold">Only {product.stock} left</span>
              ) : (
                <span className="font-semibold text-leaf">In Stock ({product.stock})</span>
              )}
              {product.sku && <span className="text-neutral-400">SKU: {product.sku}</span>}
              {viewers > 0 && (
                <span className="flex items-center gap-1.5 font-semibold text-leaf">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-leaf" />
                  </span>
                  {viewers} {viewers === 1 ? 'person' : 'people'} viewing now
                </span>
              )}
            </div>

            <p className="mt-4 text-sm leading-relaxed text-neutral-600">{product.shortDescription || product.description}</p>

            {product.colors?.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Available Colors</p>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                        color === c ? 'border-primary bg-primary/10 text-primary' : 'border-neutral-200 bg-white text-neutral-600 hover:border-primary'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.sizes?.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Available Sizes</p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`min-w-[44px] rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                        size === s ? 'border-primary bg-primary/10 text-primary' : 'border-neutral-200 bg-white text-neutral-600 hover:border-primary'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.stock > 0 && (
              <div className="mt-5 flex items-center gap-4">
                <span className="text-sm font-semibold text-neutral-600">Quantity</span>
                <div className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-1">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="grid h-8 w-8 place-items-center rounded-full text-neutral-600 transition-colors hover:bg-beige" aria-label="Decrease quantity">
                    <FiMinus size={14} />
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-neutral-800">{qty}</span>
                  <button onClick={() => setQty(Math.min(product.stock, qty + 1))} className="grid h-8 w-8 place-items-center rounded-full text-neutral-600 transition-colors hover:bg-beige" aria-label="Increase quantity">
                    <FiPlus size={14} />
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex-1">
                <AddToCartButton product={{ ...product, selectedColor: color, selectedSize: size }} quantity={qty} />
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={buyNow}
                disabled={outOfStock}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-earth px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-earth/20 transition-colors hover:bg-[#74583c] disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                <FiZap size={16} /> Buy Now
              </motion.button>
              <WishlistButton product={product} className="h-12 w-12" size={18} />
              <button onClick={share} aria-label="Share product" className="grid h-12 w-12 place-items-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-sm transition-colors hover:text-primary">
                <FiShare2 size={18} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Description + Specs + Features + Care */}
        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-3xl border border-earth/10 bg-white/70 p-6 shadow-sm backdrop-blur-md sm:p-8">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-neutral-900">
                <FiBox className="text-primary" /> Description
              </h2>
              <p className="whitespace-pre-line text-sm leading-7 text-neutral-600">{product.description}</p>
            </motion.section>

            {/* Features */}
            {features.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-3xl border border-earth/10 bg-white/70 p-6 shadow-sm backdrop-blur-md sm:p-8">
                <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-neutral-900">
                  <FiCheck className="text-leaf" /> Features
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {features.map((f) => (
                    <div key={f} className="flex items-center gap-3 rounded-2xl bg-beige/60 px-4 py-3">
                      <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-leaf/15 text-leaf">
                        <FiCheck size={15} />
                      </span>
                      <span className="text-sm font-medium text-neutral-700">{f}</span>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Care Instructions */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-3xl border border-earth/10 bg-white/70 p-6 shadow-sm backdrop-blur-md sm:p-8">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-neutral-900">
                <FiShield className="text-primary" /> Care Instructions
              </h2>
              {care.length > 0 ? (
                <ul className="space-y-2">
                  {care.map((c, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-neutral-600">
                      <FiFeather size={16} className="mt-0.5 flex-shrink-0 text-leaf" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-500">No specific care instructions provided. Handle with care to preserve its natural finish.</p>
              )}
            </motion.section>
          </div>

          {/* Specifications */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="h-fit rounded-3xl border border-earth/10 bg-white/70 p-6 shadow-sm backdrop-blur-md sm:p-8">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-neutral-900">
              <FiGrid className="text-primary" /> Specifications
            </h2>
            {specs.length > 0 ? (
              <dl className="divide-y divide-earth/10">
                {specs.map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4 py-2.5">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</dt>
                    <dd className="text-right text-sm font-medium text-neutral-700">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-neutral-500">Specifications will be available soon.</p>
            )}
          </motion.section>
        </div>

        {/* Reviews */}
        <div ref={reviewsRef} className="mt-12 scroll-mt-24">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-neutral-900">Customer Reviews</h2>
            {elig?.loggedIn === false ? (
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-leaf to-primary px-5 py-3 text-sm font-bold text-white shadow-lg"
              >
                <FiStar className="fill-white" /> Login to Review
              </button>
            ) : elig?.canReview ? (
              <Link
                to={`/orders/${elig.orderId}`}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-leaf to-primary px-5 py-3 text-sm font-bold text-white shadow-lg"
              >
                <FiStar className="fill-white" /> Write a Review
              </Link>
            ) : elig?.alreadyReviewed ? (
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-leaf px-5 py-3 text-sm font-bold text-leaf">
                <FiCheck /> Already Reviewed
              </span>
            ) : (
              <button
                disabled
                title={elig ? eligibilityReasonText(elig.reason) : 'Write a Review'}
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-neutral-200 px-5 py-3 text-sm font-bold text-neutral-400"
              >
                <FiStar /> Write a Review
              </button>
            )}
          </div>

          {elig && elig.loggedIn !== false && !elig.canReview && elig.reason === 'delivery' && (
            <p className="mb-4 -mt-2 text-sm font-medium text-amber-600">Review available after delivery.</p>
          )}
          {elig && elig.loggedIn !== false && !elig.canReview && elig.reason === 'purchase' && (
            <p className="mb-4 -mt-2 text-sm font-medium text-amber-600">Purchase this product to write a review.</p>
          )}
          {elig?.alreadyReviewed && (
            <p className="mb-4 -mt-2 text-sm font-medium text-green-600">You have already reviewed this product.</p>
          )}

          <ReviewSection productId={id} user={user} onReviewChange={() => { fetchProduct(); refreshEligibility(); }} />
        </div>

        <ReviewModal
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          product={{ _id: id, name: product.name, price: product.price, image: current }}
          existingReview={existingReview}
          canWrite={elig?.canReview}
          blockReason={elig && !elig.canReview && elig.reason !== 'already' ? eligibilityReasonText(elig.reason) : ''}
          onSuccess={() => { setReviewOpen(false); setExistingReview(null); fetchProduct(); refreshEligibility(); }}
        />

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-6 text-2xl font-bold text-neutral-900">Related Products</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {related.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Recently Viewed */}
        {recentlyViewed.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-6 text-2xl font-bold text-neutral-900">Recently Viewed</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {recentlyViewed.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && current && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(false)}
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-neutral-900/95 p-6"
          >
            <button onClick={() => setLightbox(false)} aria-label="Close" className="absolute right-6 top-6 grid h-12 w-12 place-items-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25">
              <FiX size={22} />
            </button>
            <motion.img initial={{ scale: 0.85 }} animate={{ scale: 1 }} src={current} alt={product.name} className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain" />
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveImg((i) => (i - 1 + images.length) % images.length); }}
                  aria-label="Previous"
                  className="absolute left-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
                >
                  <FiChevronLeft size={24} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveImg((i) => (i + 1) % images.length); }}
                  aria-label="Next"
                  className="absolute right-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
                >
                  <FiChevronRight size={24} />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductDetail;
