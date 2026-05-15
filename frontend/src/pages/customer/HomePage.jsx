/**
 * CARTEX — Customer Home Page
 *
 * Premium landing experience:
 * - Animated hero section with GSAP
 * - Auto-scrolling banner carousel
 * - Category grid
 * - Flash deals countdown
 * - Trending products
 * - Personalized recommendations
 */

import { useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, Star, Shield, Clock, Truck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { productsApi, categoriesApi } from '@services/api';
import { useAuth } from '@hooks/index';
import ProductCard from '@components/common/ProductCard';
import { Skeleton, Button, SectionHeader } from '@components/common/GlobalLoader';

// ── Hero Section ───────────────────────────────────────────────
const Hero = () => {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, -150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-brand-500/15 blur-3xl"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut' }}
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 6 }}
          className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-red-500/8 blur-3xl"
        />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'linear-gradient(rgba(249,115,22,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }}
      />

      <motion.div style={{ y, opacity }} className="page-container relative z-10 py-20">
        <div className="max-w-3xl">
          {/* Tag line */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 bg-brand-500/15 border border-brand-500/30 rounded-full px-4 py-2 mb-8"
          >
            <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
            <span className="text-brand-400 text-sm font-semibold">Now delivering to 50+ hostels</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] mb-6"
          >
            <span className="text-white">Everything your</span>
            <br />
            <span className="gradient-text">hostel needs,</span>
            <br />
            <span className="text-white">delivered.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="text-white/60 text-xl mb-10 max-w-xl leading-relaxed"
          >
            Snacks, groceries, personal care — at prices cheaper than MRP, right to your room.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap gap-4"
          >
            <Button size="lg" onClick={() => navigate('/products')} rightIcon={<ArrowRight className="w-5 h-5" />}>
              Shop Now
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate('/products?flashSale=true')} leftIcon={<Zap className="w-5 h-5 text-yellow-400" />}>
              Flash Deals
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex flex-wrap gap-8 mt-14"
          >
            {[
              { label: 'Students served', value: '10,000+' },
              { label: 'Products available', value: '500+' },
              { label: 'Avg delivery time', value: '45 min' },
              { label: 'Saved vs MRP', value: '₹2L+' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-2xl font-black text-white">{value}</p>
                <p className="text-white/40 text-sm">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

// ── Trust Badges ──────────────────────────────────────────────
const TrustBadges = () => (
  <section className="py-8 border-y border-white/5">
    <div className="page-container">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Truck, title: 'Fast Delivery', desc: 'To your hostel room' },
          { icon: Shield, title: 'Secure Payments', desc: 'Razorpay powered' },
          { icon: Star, title: 'Below MRP Prices', desc: 'Always cheaper' },
          { icon: Clock, title: '24/7 Support', desc: 'We\'ve got your back' },
        ].map(({ icon: Icon, title, desc }) => (
          <motion.div
            key={title}
            whileHover={{ y: -4 }}
            className="flex items-center gap-3 p-4 glass rounded-2xl"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{title}</p>
              <p className="text-white/40 text-xs">{desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

// ── Categories ─────────────────────────────────────────────────
const Categories = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
    select: (d) => d.data.categories,
    staleTime: 30 * 60 * 1000,
  });

  const defaultCategories = [
    { _id: '1', name: 'Snacks', icon: '🍿', slug: 'snacks' },
    { _id: '2', name: 'Beverages', icon: '🥤', slug: 'beverages' },
    { _id: '3', name: 'Instant Food', icon: '🍜', slug: 'instant-food' },
    { _id: '4', name: 'Personal Care', icon: '🧴', slug: 'personal-care' },
    { _id: '5', name: 'Stationery', icon: '✏️', slug: 'stationery' },
    { _id: '6', name: 'Groceries', icon: '🛒', slug: 'groceries' },
    { _id: '7', name: 'Electronics', icon: '🔌', slug: 'electronics' },
    { _id: '8', name: 'Medicine', icon: '💊', slug: 'medicine' },
  ];

  const categories = data || defaultCategories;

  return (
    <section className="py-12">
      <div className="page-container">
        <SectionHeader title="Shop by Category" emoji="🗂️" action={
          <Button variant="ghost" size="sm" onClick={() => navigate('/products')}>View All</Button>
        } />

        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
          {categories.slice(0, 8).map((cat, i) => (
            <motion.button
              key={cat._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.08, y: -4 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/products?category=${cat._id}`)}
              className="flex flex-col items-center gap-2 p-3 glass rounded-2xl border border-white/5 hover:border-brand-500/30 transition-all duration-200 shadow-sm hover:shadow-xl"
            >
              <span className="text-3xl leading-none">{cat.icon || '📦'}</span>
              <span className="text-white/70 text-xs font-medium text-center leading-tight">{cat.name}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
};

// ── Flash Deals Section ────────────────────────────────────────
const FlashDeals = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['products', 'flash-deals'],
    queryFn: () => productsApi.getAll({ flashSale: 'true', limit: 8 }),
    select: (d) => d.data.products,
  });

  if (!isLoading && (!data || data.length === 0)) return null;

  return (
    <section className="py-12">
      <div className="page-container">
        <div className="bg-gradient-to-r from-brand-500/10 via-red-500/10 to-purple-500/10 border border-brand-500/20 rounded-3xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-3xl"
              >
                ⚡
              </motion.div>
              <div>
                <h2 className="text-xl font-black text-white">Flash Deals</h2>
                <p className="text-white/50 text-sm">Limited time offers</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/products?flashSale=true')}>
              View All
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="card p-4 space-y-3">
                    <Skeleton className="aspect-square rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-5 w-1/2" />
                  </div>
                ))
              : data?.slice(0, 4).map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))
            }
          </div>
        </div>
      </div>
    </section>
  );
};

// ── CTA Banner ─────────────────────────────────────────────────
const CTABanner = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) return null;

  return (
    <section className="py-16">
      <div className="page-container">
        <motion.div
          whileInView={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 30 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-500 to-red-500 p-10 text-center"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, white 0%, transparent 50%), radial-gradient(circle at 70% 50%, white 0%, transparent 50%)' }}
          />
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-white mb-4">Ready to shop smarter?</h2>
            <p className="text-white/80 text-lg mb-8 max-w-lg mx-auto">
              Join 10,000+ hostellers saving money on daily essentials. Sign up free today.
            </p>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/auth/register')}
              className="bg-white text-brand-600 hover:bg-white/90 border-0"
            >
              Create Free Account <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// ── Home Page ──────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div>
      <Hero />
      <TrustBadges />
      <Categories />
      <FlashDeals />
      <CTABanner />
    </div>
  );
}

