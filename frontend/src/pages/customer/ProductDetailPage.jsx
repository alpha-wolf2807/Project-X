/**
 * PROJECT-X — Product Detail Page
 * Image gallery, description, reviews, add to cart, related products
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Heart, Star, Shield, Truck, RotateCcw, ChevronLeft, ChevronRight, Plus, Minus, Share2, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@services/api';
import { useCart, useAuth, useWishlist } from '@hooks/index';
import ProductCard from '@components/common/ProductCard';
import { Button, Badge, Skeleton, PriceDisplay, Divider } from '@components/common/GlobalLoader';
import { cn } from '@components/common/GlobalLoader';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { items: wishlistItems, addToWishlist, removeFromWishlist } = useWishlist();

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [addedToCart, setAddedToCart] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productsApi.getBySlug(slug),
    select: (d) => d.data.product,
    enabled: !!slug,
  });

  const { data: reviews } = useQuery({
    queryKey: ['product-reviews', product?._id],
    queryFn: () => productsApi.getReviews(product._id),
    select: (d) => d.data.reviews,
    enabled: !!product?._id,
  });

  const isWishlisted = wishlistItems.some((item) => item.product?._id === product?._id);

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, quantity);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    if (!product) return;
    addToCart(product, quantity);
    if (!isAuthenticated) { navigate('/auth/login'); return; }
    navigate('/checkout');
  };

  if (isLoading) return <ProductDetailSkeleton />;
  if (!product) return (
    <div className="page-container py-20 text-center">
      <div className="text-6xl mb-4">😕</div>
      <h2 className="text-xl font-bold text-white mb-4">Product not found</h2>
      <Button onClick={() => navigate('/products')}>Browse Products</Button>
    </div>
  );

  const effectivePrice = product.flashSale?.isActive ? product.flashSale.salePrice : product.price;
  const discountPct = Math.round(((product.mrp - effectivePrice) / product.mrp) * 100);
  const images = product.images?.length ? product.images : [{ url: `https://via.placeholder.com/800x800/1a1a1a/f97316?text=${encodeURIComponent(product.name)}` }];

  return (
    <div className="page-container py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-white/40 mb-6">
        <button onClick={() => navigate('/')} className="hover:text-white transition-colors">Home</button>
        <span>/</span>
        <button onClick={() => navigate('/products')} className="hover:text-white transition-colors">Products</button>
        <span>/</span>
        <span className="text-white/70 truncate max-w-xs">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* ── Left: Image Gallery ─────────────────────────────── */}
        <div className="space-y-4">
          {/* Main image */}
          <motion.div
            layoutId={`product-image-${product._id}`}
            className="relative aspect-square rounded-2xl overflow-hidden bg-surface-2 border border-white/10"
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={selectedImage}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                src={images[selectedImage]?.url}
                alt={product.name}
                className={cn('w-full h-full object-cover', product.isOutOfStock && 'opacity-50 grayscale')}
              />
            </AnimatePresence>

            {/* Flash sale badge */}
            {product.flashSale?.isActive && (
              <div className="absolute top-4 left-4">
                <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="badge-flash flex items-center gap-1 px-3 py-1.5 text-sm">
                  <Zap className="w-4 h-4" /> FLASH DEAL
                </motion.div>
              </div>
            )}

            {/* Discount badge */}
            {discountPct > 0 && (
              <div className="absolute top-4 right-4 bg-accent-green text-white font-black text-sm px-3 py-1 rounded-xl">
                {discountPct}% OFF
              </div>
            )}

            {/* Out of stock overlay */}
            {product.isOutOfStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <span className="bg-surface-2 text-white font-bold px-6 py-3 rounded-xl text-lg">Out of Stock</span>
              </div>
            )}

            {/* Image nav arrows */}
            {images.length > 1 && (
              <>
                <button onClick={() => setSelectedImage((selectedImage - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={() => setSelectedImage((selectedImage + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </motion.div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {images.map((img, i) => (
                <button key={i} onClick={() => setSelectedImage(i)} className={cn('w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all', selectedImage === i ? 'border-brand-500' : 'border-white/10 hover:border-white/30')}>
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Product Info ─────────────────────────────── */}
        <div className="space-y-6">
          {/* Brand + Name */}
          {product.brand && <p className="text-brand-400 text-sm font-semibold uppercase tracking-wide">{product.brand}</p>}
          <h1 className="text-3xl font-black text-white leading-tight">{product.name}</h1>

          {/* Rating summary */}
          {product.ratings?.count > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-yellow-500/15 border border-yellow-500/30 px-3 py-1 rounded-lg">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-yellow-400 font-bold">{product.ratings.average.toFixed(1)}</span>
              </div>
              <span className="text-white/50 text-sm">{product.ratings.count} reviews</span>
            </div>
          )}

          {/* Price block */}
          <div className="p-4 bg-surface-2 rounded-2xl border border-white/5">
            <PriceDisplay price={effectivePrice} mrp={product.mrp} size="xl" />
            {product.mrp > effectivePrice && (
              <div className="mt-2 flex items-center gap-2">
                <div className="bg-accent-green/15 border border-accent-green/30 text-accent-green px-3 py-1 rounded-lg text-sm font-semibold">
                  💰 You save ₹{(product.mrp - effectivePrice).toFixed(0)} vs MRP
                </div>
              </div>
            )}
            {product.flashSale?.isActive && (
              <p className="text-white/50 text-xs mt-2">⚡ Flash sale price — limited time!</p>
            )}
          </div>

          {/* Stock status */}
          <div className="flex items-center gap-2">
            <div className={cn('w-2.5 h-2.5 rounded-full', product.isOutOfStock ? 'bg-accent-red' : product.stock <= 10 ? 'bg-yellow-400' : 'bg-accent-green')} />
            <span className={cn('text-sm font-medium', product.isOutOfStock ? 'text-accent-red' : product.stock <= 10 ? 'text-yellow-400' : 'text-accent-green')}>
              {product.isOutOfStock ? 'Out of Stock' : product.stock <= 10 ? `Only ${product.stock} left!` : 'In Stock'}
            </span>
          </div>

          {/* Quantity selector */}
          {!product.isOutOfStock && (
            <div className="space-y-2">
              <p className="text-white/50 text-sm font-medium">Quantity</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-surface-2 rounded-xl p-1 border border-white/10">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-9 h-9 rounded-lg bg-surface-3 text-white hover:bg-brand-500 transition-colors flex items-center justify-center">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-white font-bold w-8 text-center text-lg">{quantity}</span>
                  <button onClick={() => setQuantity(Math.min(product.stock || 50, quantity + 1))} className="w-9 h-9 rounded-lg bg-surface-3 text-white hover:bg-brand-500 transition-colors flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-white/40 text-sm">Total: ₹{(effectivePrice * quantity).toFixed(0)}</span>
              </div>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={handleAddToCart}
              disabled={product.isOutOfStock}
              variant={addedToCart ? 'success' : 'primary'}
              leftIcon={<ShoppingCart className="w-4 h-4" />}
            >
              {addedToCart ? 'Added! ✓' : 'Add to Cart'}
            </Button>
            <Button
              className="flex-1"
              variant="secondary"
              onClick={handleBuyNow}
              disabled={product.isOutOfStock}
            >
              Buy Now
            </Button>
            <Button
              variant={isWishlisted ? 'danger' : 'secondary'}
              size="md"
              className="px-3"
              onClick={() => {
                if (!isAuthenticated) {
                  navigate('/auth/login');
                  return;
                }
                if (isWishlisted) removeFromWishlist(product._id);
                else addToWishlist(product._id);
              }}
            >
              <Heart className={cn('w-5 h-5 transition-colors', isWishlisted ? 'text-white' : 'text-white/80')} />
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Shield, label: 'Secure Payment', sub: 'Razorpay' },
              { icon: Truck, label: 'Fast Delivery', sub: 'To your room' },
              { icon: RotateCcw, label: 'Easy Returns', sub: 'Within 24h' },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 p-3 bg-surface-2 rounded-xl text-center border border-white/5">
                <Icon className="w-4 h-4 text-brand-400" />
                <p className="text-white text-xs font-semibold">{label}</p>
                <p className="text-white/40 text-xs">{sub}</p>
              </div>
            ))}
          </div>

          {/* Share */}
          <button onClick={() => navigator.share?.({ title: product.name, url: window.location.href })} className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors">
            <Share2 className="w-4 h-4" /> Share this product
          </button>
        </div>
      </div>

      {/* ── Tabs: Description / Reviews ─────────────────────── */}
      <div className="mt-16">
        <div className="flex gap-1 bg-surface-2 p-1 rounded-xl w-fit mb-6">
          {['description', 'reviews'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={cn('px-6 py-2.5 rounded-lg text-sm font-semibold capitalize transition-all', activeTab === tab ? 'bg-brand-500 text-white' : 'text-white/50 hover:text-white')}>
              {tab} {tab === 'reviews' && reviews?.length ? `(${reviews.length})` : ''}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card p-6">
            {activeTab === 'description' ? (
              <div className="prose prose-invert max-w-none">
                <p className="text-white/70 leading-relaxed">{product.description}</p>
                {product.ingredients && (
                  <div className="mt-4">
                    <h3 className="text-white font-semibold mb-2">Ingredients</h3>
                    <p className="text-white/60 text-sm">{product.ingredients}</p>
                  </div>
                )}
                {product.weight && (
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-white/50 text-sm">Weight:</span>
                    <Badge variant="default">{product.weight}</Badge>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {!reviews?.length ? (
                  <div className="text-center py-10">
                    <div className="text-4xl mb-3">⭐</div>
                    <p className="text-white/50">No reviews yet. Be the first!</p>
                  </div>
                ) : (
                  reviews.map((review) => (
                    <div key={review._id} className="p-4 bg-surface-2 rounded-xl border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-red-500 flex items-center justify-center text-white text-sm font-bold">
                            {review.customer?.name?.[0]?.toUpperCase()}
                          </div>
                          <span className="text-white font-semibold text-sm">{review.customer?.name}</span>
                          {review.isVerifiedPurchase && <Badge variant="success" className="text-xs">Verified Purchase</Badge>}
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={cn('w-3.5 h-3.5', i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/20')} />
                          ))}
                        </div>
                      </div>
                      {review.title && <p className="text-white font-medium text-sm mb-1">{review.title}</p>}
                      {review.body && <p className="text-white/60 text-sm">{review.body}</p>}
                      <p className="text-white/30 text-xs mt-2">{new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Related products */}
      {product.related?.length > 0 && (
        <div className="mt-16">
          <h2 className="text-xl font-black text-white mb-6">You may also like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {product.related.slice(0, 6).map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}

const ProductDetailSkeleton = () => (
  <div className="page-container py-8">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      <div className="space-y-4">
        <Skeleton className="aspect-square rounded-2xl w-full" />
        <div className="flex gap-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="w-16 h-16 rounded-xl" />)}</div>
      </div>
      <div className="space-y-5">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="flex gap-3">
          <Skeleton className="h-12 flex-1 rounded-xl" />
          <Skeleton className="h-12 flex-1 rounded-xl" />
        </div>
      </div>
    </div>
  </div>
);
