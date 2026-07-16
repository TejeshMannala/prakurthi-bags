import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiShare2, FiTruck, FiFeather, FiAward, FiArrowRight, FiShoppingBag, FiZap, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import StarRating from './StarRating';
import WishlistButton from './WishlistButton';
import AddToCartButton from './AddToCartButton';
import { getProductImages } from '../utils/productImage';
import { useNotification } from '../context/NotificationContext';
import { useCart } from '../context/CartContext';

const ECO = ['jute', 'cotton', 'canvas', 'fabric', 'bamboo', 'hemp', 'recycled', 'silk', 'linen', 'organic'];
const ecoMaterial = (m = '') => ECO.some((e) => m.toLowerCase().includes(e));

const Badge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${className}`}>
    {children}
  </span>
);

const ZoomImage = ({ src, alt }) => {
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [zoom, setZoom] = useState(false);
  return (
    <div
      className="relative h-full w-full cursor-zoom-in overflow-hidden rounded-2xl"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
      }}
      onMouseEnter={() => setZoom(true)}
      onMouseLeave={() => setZoom(false)}
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

/**
 * Premium quick-view modal — image gallery with zoom, colors/sizes,
 * price, rating, stock, and full action row (Add to Cart / Buy Now /
 * Wishlist / Share / View Details).
 */
const QuickViewModal = ({ product, open, onClose }) => {
  const { showNotification } = useNotification();
  const { addToCart, user } = useCart();
  const navigate = useNavigate();
  const [activeImg, setActiveImg] = useState(0);
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');

  if (!product) return null;

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

  const share = async (e) => {
    e.preventDefault();
    e.stopPropagation();
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

  const buyNow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    addToCart({ ...product, selectedColor: color, selectedSize: size, _qty: 1 });
    onClose();
    if (user) navigate('/checkout');
    else navigate('/login');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[1000] flex items-end justify-center bg-neutral-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Quick view: ${product.name}`}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            onClick={(e) => e.stopPropagation()}
            className="relative grid max-h-[94vh] w-full max-w-4xl overflow-hidden rounded-t-3xl bg-cream shadow-2xl sm:rounded-3xl md:grid-cols-2"
          >
            <button
              onClick={onClose}
              aria-label="Close quick view"
              className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/80 text-neutral-600 shadow backdrop-blur transition-colors hover:text-neutral-900"
            >
              <FiX size={18} />
            </button>

            {/* Gallery */}
            <div className="relative flex flex-col gap-3 bg-beige p-5">
              <div className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-leaf/20 blur-2xl" />
              <div className="relative h-[300px] w-full sm:h-[360px]">
                {current ? (
                  <ZoomImage src={current} alt={product.name} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-2xl bg-white/60 text-neutral-300">
                    <FiShoppingBag size={56} />
                  </div>
                )}
                <div className="absolute left-3 top-3 flex flex-col gap-2">
                  {discountPct > 0 && <Badge className="bg-rose-500 text-white shadow">-{discountPct}%</Badge>}
                  {product.freeDelivery && <Badge className="bg-leaf text-white shadow"><FiTruck size={11} /> Free Delivery</Badge>}
                </div>
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImg((i) => (i - 1 + images.length) % images.length)}
                      aria-label="Previous image"
                      className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-neutral-700 shadow backdrop-blur"
                    >
                      <FiChevronLeft size={18} />
                    </button>
                    <button
                      onClick={() => setActiveImg((i) => (i + 1) % images.length)}
                      aria-label="Next image"
                      className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-neutral-700 shadow backdrop-blur"
                    >
                      <FiChevronRight size={18} />
                    </button>
                  </>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      aria-label={`View image ${i + 1}`}
                      className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-colors ${
                        i === activeImg ? 'border-primary' : 'border-transparent opacity-70'
                      }`}
                    >
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex flex-col overflow-y-auto p-6">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge className="bg-earth/10 text-earth">{product.category}</Badge>
                {product.brand && <Badge className="bg-white text-neutral-500 shadow-sm">{product.brand}</Badge>}
                {ecoMaterial(product.material) && <Badge className="bg-leaf/10 text-leaf"><FiFeather size={11} /> Eco Friendly</Badge>}
                {product.handmade !== false && <Badge className="bg-gold/15 text-earth"><FiAward size={11} /> Handmade</Badge>}
              </div>

              <h3 className="text-2xl font-bold text-neutral-900">{product.name}</h3>

              <button
                type="button"
                onClick={onClose}
                className="mt-1 flex w-fit items-center gap-1 text-sm text-neutral-500 hover:text-primary"
                aria-label="Open reviews"
              >
                <StarRating value={rating} readOnly size={16} count={count} />
              </button>

              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-neutral-600">
                {product.shortDescription || product.description}
              </p>

              <div className="mt-4 flex items-end gap-3">
                <span className="text-2xl font-black text-neutral-900">₹{Number(price).toLocaleString()}</span>
                {oldPrice && <span className="text-sm text-neutral-400 line-through">₹{Number(oldPrice).toLocaleString()}</span>}
              </div>

              <div className="mt-2">
                {outOfStock ? (
                  <span className="text-sm font-semibold text-rose-500">Out of Stock</span>
                ) : product.stock < 10 ? (
                  <span className="text-sm font-semibold text-gold">Only {product.stock} left</span>
                ) : (
                  <span className="text-sm font-semibold text-leaf">In Stock ({product.stock})</span>
                )}
              </div>

              {product.material && (
                <p className="mt-3 text-xs uppercase tracking-wide text-neutral-400">Material · {product.material}</p>
              )}

              {product.colors?.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Color</p>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
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
                <div className="mt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Size</p>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSize(s)}
                        className={`min-w-[40px] rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          size === s ? 'border-primary bg-primary/10 text-primary' : 'border-neutral-200 bg-white text-neutral-600 hover:border-primary'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 flex items-center gap-3">
                <div className="flex-1">
                  <AddToCartButton product={{ ...product, selectedColor: color, selectedSize: size }} />
                </div>
                <WishlistButton product={product} className="h-12 w-12" size={18} />
                <button
                  onClick={share}
                  aria-label="Share product"
                  className="grid h-12 w-12 place-items-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-sm transition-colors hover:text-primary"
                >
                  <FiShare2 size={18} />
                </button>
              </div>

              <div className="mt-3 flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={buyNow}
                  disabled={outOfStock}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-earth px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-earth/20 transition-colors hover:bg-[#74583c] disabled:cursor-not-allowed disabled:bg-neutral-300"
                >
                  <FiZap size={16} /> Buy Now
                </motion.button>
                <Link
                  to={`/products/${product._id}`}
                  onClick={onClose}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-primary/30 bg-white px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                >
                  View Details <FiArrowRight size={15} />
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QuickViewModal;
