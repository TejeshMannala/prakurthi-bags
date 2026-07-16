import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiFeather, FiAward } from 'react-icons/fi';
import StarRating from './StarRating';
import WishlistButton from './WishlistButton';
import AddToCartButton from './AddToCartButton';
import { getProductImage } from '../utils/productImage';

const ECO = ['jute', 'cotton', 'canvas', 'fabric', 'bamboo', 'hemp', 'recycled', 'silk', 'linen', 'organic'];
const ecoMaterial = (m = '') => ECO.some((e) => m.toLowerCase().includes(e));

const Badge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm ${className}`}>
    {children}
  </span>
);

const ProductCard = ({ product, className = '' }) => {
  const [imgLoaded, setImgLoaded] = useState(false);

  const image = getProductImage(product);
  const rating = product.averageRating ?? product.rating ?? 0;
  const count = product.totalReviews ?? product.numReviews ?? 0;
  const current = product.discountPrice && product.discountPrice > 0 ? product.discountPrice : product.price;
  const oldPrice =
    product.originalPrice && product.originalPrice > product.price
      ? product.originalPrice
      : product.discount
      ? Math.round(product.price / (1 - product.discount / 100))
      : null;
  const discountPct = product.discount || (oldPrice && current ? Math.round((1 - current / oldPrice) * 100) : 0);

  const isEco = product.ecoFriendly !== false && (ecoMaterial(product.material) || product.ecoFriendly);
  const isHandmade = product.handmade !== false;

  return (
    <motion.article
      whileHover={{ y: -8 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className={`group relative flex h-[320px] flex-col overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-b from-[#fbfaf5] to-[#f1ece0] shadow-[0_10px_28px_-14px_rgba(46,94,78,0.28)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_26px_50px_-18px_rgba(27,94,32,0.42)] md:h-[390px] lg:h-[460px] ${className}`}
    >
      {/* soft organic glow behind card on hover */}
      <div className="pointer-events-none absolute -inset-6 -z-10 hidden rounded-[40px] bg-[radial-gradient(closest-side,rgba(129,199,132,0.30),transparent)] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100 md:block" />

      {/* ============ IMAGE (~60% of card) ============ */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-beige">
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-28 w-28 rounded-full bg-leaf/20 blur-2xl" />
        <div className="pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full bg-gold/15 blur-2xl" />

        {!imgLoaded && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-beige to-[#efe9dc]" />
        )}
        <img
          src={image}
          alt={product.name}
          loading="lazy"
          decoding="async"
          onLoad={() => setImgLoaded(true)}
          className={`h-full w-full object-cover transition-[transform,opacity,filter] duration-700 ease-out group-hover:scale-[1.08] ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* clickable overlay -> product page */}
        <Link
          to={`/products/${product._id}`}
          aria-label={product.name}
          className="absolute inset-0 z-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-inset"
        />

        {/* badges top-left */}
        <div className="absolute left-2.5 top-2.5 z-20 flex flex-col items-start gap-1.5">
          {isEco && (
            <Badge className="bg-white/85 text-leaf backdrop-blur">
              <FiFeather size={11} /> Eco
            </Badge>
          )}
          {isHandmade && (
            <Badge className="hidden bg-white/85 text-earth backdrop-blur md:inline-flex">
              <FiAward size={11} /> Handmade
            </Badge>
          )}
          {discountPct > 0 && (
            <Badge className="hidden bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-rose-500/30 lg:inline-flex">
              -{discountPct}%
            </Badge>
          )}
        </div>

        {/* wishlist: mobile + desktop (hidden on tablet) */}
        <div className="absolute right-2.5 top-2.5 z-20 block md:hidden lg:block">
          <WishlistButton product={product} className="h-9 w-9" size={16} />
        </div>
      </div>

      {/* ============ INFO ============ */}
      <div className="relative flex shrink-0 flex-col gap-1.5 p-3 sm:p-4">
        <Link to={`/products/${product._id}`} className="outline-none focus-visible:underline" aria-label={product.name}>
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-neutral-800 transition-colors group-hover:text-primary sm:text-base">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-center gap-1">
          <StarRating value={rating} readOnly size={13} />
          {count > 0 && <span className="text-[11px] text-neutral-400">({count})</span>}
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="flex flex-col">
            <span className="text-base font-black text-neutral-900 sm:text-lg">₹{Number(current).toLocaleString()}</span>
            {oldPrice && (
              <span className="hidden text-xs text-neutral-400 line-through lg:block">
                ₹{Number(oldPrice).toLocaleString()}
              </span>
            )}
          </div>
          <div className="shrink-0">
            <AddToCartButton
              product={product}
              className="!px-3 !py-2 !text-xs sm:!px-4 sm:!py-2.5 sm:!text-sm"
            />
          </div>
        </div>
      </div>
    </motion.article>
  );
};

export const ProductCardSkeleton = ({ className = '' }) => (
  <div className={`flex h-[320px] flex-col overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-b from-[#fbfaf5] to-[#f1ece0] shadow-[0_10px_28px_-14px_rgba(46,94,78,0.28)] backdrop-blur-xl md:h-[390px] lg:h-[460px] ${className}`}>
    <div className="relative min-h-0 flex-1 overflow-hidden bg-beige">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-beige to-[#efe9dc]" />
    </div>
    <div className="space-y-2 p-4">
      <div className="h-3 w-3/4 animate-pulse rounded bg-neutral-200/70" />
      <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-200/70" />
      <div className="h-9 w-full animate-pulse rounded-full bg-neutral-200/70" />
    </div>
  </div>
);

export default React.memo(ProductCard);
