/**
 * CARTEX — Product Card Component
 *
 * Premium card with:
 * - Hover animations (GSAP + Framer Motion)
 * - MRP strikethrough pricing
 * - Flash sale countdown
 * - Quick add-to-cart
 * - Stock indicators
 * - Lazy image loading
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Heart, Star, Zap, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart, useWishlist } from '@hooks/index';
import { PriceDisplay } from '@components/common/GlobalLoader';
import { cn } from '@components/common/GlobalLoader';

// Flash sale countdown hook
const useCountdown = (endTime) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!endTime) return;
    const update = () => {
      const diff = new Date(endTime) - new Date();
      if (diff <= 0) { setTimeLeft('Ended'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  return timeLeft;
};

export default function ProductCard({ product, variant = 'default' }) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { items: wishlistItems, addToWishlist, removeFromWishlist, isAuthenticated } = useWishlist();
  const [addedToCart, setAddedToCart] = useState(false);
  const [imgError, setImgError] = useState(false);
  const countdown = useCountdown(product.flashSale?.isActive ? product.flashSale.endTime : null);

  const isFlashSale = product.flashSale?.isActive;
  const effectivePrice = isFlashSale ? product.flashSale.salePrice : product.price;
  const discountPct = Math.round(((product.mrp - effectivePrice) / product.mrp) * 100);
  const isOutOfStock = product.isOutOfStock;
  const isWishlisted = wishlistItems.some((item) => item.product?._id === product._id);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart({ ...product, effectivePrice }, 1);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 1500);
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/auth/login');
      return;
    }
    if (isWishlisted) {
      removeFromWishlist(product._id);
    } else {
      addToWishlist(product._id);
    }
  };

  const imageSrc = imgError || !product.images?.[0]?.url
    ? `https://via.placeholder.com/400x400/1a1a1a/f97316?text=${encodeURIComponent(product.name[0])}`
    : product.images[0].url;

  if (variant === 'horizontal') {
    return (
      <Link to={`/products/${product.slug}`}>
        <motion.div whileHover={{ x: 4 }} className="card flex gap-4 p-3">
          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-surface-2">
            <img src={imageSrc} alt={product.name} className="w-full h-full object-cover" onError={() => setImgError(true)} loading="lazy" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm line-clamp-1">{product.name}</p>
            <PriceDisplay price={effectivePrice} mrp={product.mrp} size="sm" />
          </div>
        </motion.div>
      </Link>
    );
  }

  return (
    <Link to={`/products/${product.slug}`}>
      <motion.div
        whileHover={{ y: -6 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="card-product group relative"
      >
        {/* ── Badges ─────────────────────────────────────── */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
          {isFlashSale && (
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="badge-flash flex items-center gap-1"
            >
              <Zap className="w-3 h-3" />
              FLASH SALE
            </motion.div>
          )}
          {discountPct > 0 && !isFlashSale && (
            <span className="badge-discount">{discountPct}% off</span>
          )}
          {isOutOfStock && (
            <span className="badge-out">Out of Stock</span>
          )}
          {product.isNewArrival && !isFlashSale && (
            <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-medium px-2 py-0.5 rounded-lg">New</span>
          )}
        </div>

        {/* ── Wishlist Button ─────────────────────────────── */}
        <button
          onClick={handleWishlist}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-xl bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
        >
          <Heart className={cn('w-4 h-4 transition-colors', isWishlisted ? 'text-red-500 fill-red-500' : 'text-white')} />
        </button>

        {/* ── Product Image ───────────────────────────────── */}
        <div className="relative overflow-hidden bg-surface-2" style={{ paddingBottom: '100%' }}>
          <img
            src={imageSrc}
            alt={product.name}
            onError={() => setImgError(true)}
            loading="lazy"
            className={cn(
              'absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110',
              isOutOfStock && 'opacity-40 grayscale'
            )}
          />

          {/* Flash sale countdown overlay */}
          {isFlashSale && countdown && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <div className="flex items-center gap-1.5 text-white">
                <Clock className="w-3.5 h-3.5 text-brand-400" />
                <span className="text-sm font-bold font-mono text-brand-400">{countdown}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Product Info ────────────────────────────────── */}
        <div className="p-3.5 space-y-2">
          {/* Brand */}
          {product.brand && (
            <p className="text-white/40 text-xs font-medium uppercase tracking-wide">{product.brand}</p>
          )}

          {/* Name */}
          <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2 group-hover:text-brand-400 transition-colors">
            {product.name}
          </h3>

          {/* Rating */}
          {product.ratings?.count > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-white/70 text-xs font-medium">{product.ratings.average.toFixed(1)}</span>
              </div>
              <span className="text-white/30 text-xs">({product.ratings.count})</span>
            </div>
          )}

          {/* Price + Add to Cart */}
          <div className="flex items-center justify-between pt-1">
            <PriceDisplay price={effectivePrice} mrp={product.mrp} size="sm" />

            <motion.button
              onClick={handleAddToCart}
              whileTap={{ scale: 0.85 }}
              disabled={isOutOfStock}
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200',
                isOutOfStock
                  ? 'bg-surface-3 text-white/20 cursor-not-allowed'
                  : addedToCart
                  ? 'bg-accent-green text-white shadow-glow-green'
                  : 'bg-brand-500 text-white hover:bg-brand-600 shadow-glow-orange hover:scale-110'
              )}
            >
              {addedToCart ? (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-sm">✓</motion.span>
              ) : (
                <ShoppingCart className="w-4 h-4" />
              )}
            </motion.button>
          </div>

          {/* Savings display */}
          {product.mrp > effectivePrice && (
            <p className="text-accent-green text-xs font-medium">
              💰 You save ₹{(product.mrp - effectivePrice).toFixed(0)} vs MRP
            </p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

// ── Product Grid ──────────────────────────────────────────────
export const ProductGrid = ({ products, loading, skeletonCount = 8 }) => {
  const { ProductCardSkeleton } = require('@components/common/GlobalLoader');

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {loading
        ? Array.from({ length: skeletonCount }).map((_, i) => <ProductCardSkeleton key={i} />)
        : products?.map((product) => <ProductCard key={product._id} product={product} />)
      }
    </div>
  );
};

