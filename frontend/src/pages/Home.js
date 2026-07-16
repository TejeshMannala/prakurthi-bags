import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiGlobe, FiHeart, FiShield, FiTruck, FiCheckCircle,
  FiAward, FiZap, FiStar, FiInstagram, FiArrowRight, FiShoppingBag,
  FiBook, FiBriefcase, FiGift, FiCloud, FiEye,
  FiShoppingCart, FiSmile, FiGrid, FiRefreshCw, FiLock, FiThumbsUp, FiSend,
} from 'react-icons/fi';
// Feather (fi) lacks leaf/tree/recycle/quote/laptop icons — alias from FontAwesome.
import {
  FaLeaf as FiLeaf, FaTree as FiTree, FaRecycle as FiRecycle,
  FaQuoteLeft as FiQuote, FaLaptop as FiLaptop,
} from 'react-icons/fa';
import api from '../utils/axios';
import { onProductsChanged } from '../utils/productSync';
import { onContentChanged } from '../utils/contentSync';
import HeroSlider from '../components/HeroSlider';
import ProductCard from '../components/ProductCard';
import CountUp from '../components/CountUp';
import { getRecentlyViewed } from '../utils/recentlyViewed';

const CATALOG = [
  { name: 'School Bags', icon: FiBook },
  { name: 'College Bags', icon: FiBook },
  { name: 'Office Bags', icon: FiBriefcase },
  { name: 'Laptop Bags', icon: FiLaptop },
  { name: 'Hand Bags', icon: FiShoppingBag },
  { name: 'Jute Bags', icon: FiShoppingCart },
  { name: 'Gift Jute Bags', icon: FiGift },
  { name: 'Shopping Bags', icon: FiShoppingBag },
  { name: 'Tote Bags', icon: FiShoppingBag },
  { name: 'Backpack Bags', icon: FiBriefcase },
  { name: 'Sling Bags', icon: FiShoppingBag },
  { name: 'Duffel Bags', icon: FiCloud },
];

const WHY_CHOOSE = [
  { icon: FiLeaf, title: 'Eco Friendly', desc: 'Crafted from jute, cotton & natural fibres that biodegrade and return to the earth.' },
  { icon: FiRefreshCw, title: 'Reusable', desc: 'Built to last for years — one bag replaces hundreds of single-use plastics.' },
  { icon: FiAward, title: 'Premium Materials', desc: 'Handpicked natural textiles, tightly stitched by skilled artisans for lasting quality.' },
  { icon: FiTruck, title: 'Fast Delivery', desc: 'Free shipping above ₹999 with quick, plastic-free packaging across India.' },
  { icon: FiLock, title: 'Secure Payment', desc: 'Encrypted, trusted gateways so every checkout is safe and worry-free.' },
  { icon: FiHeart, title: 'Made With Love', desc: 'Every bag carries the care of the hands that weave it and the planet we protect.' },
];

const TIMELINE = [
  { t: 'Day 1', icon: FiShoppingCart, h: 'A plastic bag is used', p: 'The average plastic carry bag is used for just 12 minutes before being discarded.' },
  { t: '500+ years', icon: FiRecycle, h: 'Plastic never truly goes', p: 'A single plastic bag can linger in landfills and oceans for over five centuries.' },
  { t: 'Months', icon: FiLeaf, h: 'Jute returns to earth', p: 'Our jute & cotton bags decompose naturally in months, leaving no toxic trace.' },
  { t: '1000×', icon: FiTree, h: 'One bag, countless saves', p: 'Each reusable Prakruthi bag offsets the need for roughly a thousand plastic bags.' },
  { t: 'Today', icon: FiSmile, h: 'You become the change', p: 'Choosing reusable is a small habit with a massive, measurable impact on nature.' },
];

const INSTA = ['ig1', 'ig2', 'ig3', 'ig4', 'ig5', 'ig6', 'ig7', 'ig8', 'ig9', 'ig10', 'ig11', 'ig12'];

const Reveal = ({ children, delay = 0, y = 36, className = '' }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.15 }}
    transition={{ duration: 0.7, delay, ease: 'easeOut' }}
  >
    {children}
  </motion.div>
);

const ScrollProgress = () => {
  const ref = useRef(null);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h > 0 ? (window.scrollY / h) * 100 : 0;
      if (ref.current) ref.current.style.width = `${p}%`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return <div className="scroll-progress" ref={ref} style={{ width: '0%' }} aria-hidden="true" />;
};

const Home = () => {
  const [featured, setFeatured] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [cats, setCats] = useState([]);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [subError, setSubError] = useState('');
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  const fetchAll = useCallback(async () => {
    api.get('/api/products?limit=8&sort=rating').then((res) => {
      const raw = res.data.products || res.data || [];
      const p = Array.isArray(raw) ? raw : [];
      setFeatured(p);
    }).catch(() => setFeatured([]));

    api.get('/api/products?limit=10&sort=best_selling').then((res) => {
      const raw = res.data.products || res.data || [];
      const p = Array.isArray(raw) ? raw : [];
      setBestSellers(p);
    }).catch(() => setBestSellers([]));

    api.get('/api/reviews').then((res) => {
      const data = Array.isArray(res.data) ? res.data : (res.data?.reviews || []);
      setReviews(data.slice(0, 8));
    }).catch(() => setReviews([]));

    api.get('/api/categories').then(({ data }) => {
      if (Array.isArray(data)) setCats(data);
    }).catch(() => setCats([]));

    setRecentlyViewed(getRecentlyViewed().slice(0, 8));
  }, []);

  useEffect(() => {
    fetchAll();
    const offProduct = onProductsChanged(() => fetchAll());
    const offCat = onContentChanged('category:updated', fetchAll);
    return () => { offProduct(); offCat(); };
  }, [fetchAll]);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    setSubError('');
    try {
      await api.post('/api/newsletter', { email });
      setSubscribed(true);
      setEmail('');
    } catch (err) {
      setSubError(err.response?.data?.message || 'Failed to subscribe. Please try again.');
    }
  };

  const catCountMap = {};
  cats.forEach((c) => { catCountMap[(c.name || '').toLowerCase()] = c.count ?? c.productCount ?? 0; });
  const categories = CATALOG.map((c) => ({ ...c, count: catCountMap[c.name.toLowerCase()] ?? 0 }));

  return (
    <div className="bg-beige text-ink font-body antialiased">
      <ScrollProgress />

      {/* 3. HERO */}
      <div className="home-hero">
        <HeroSlider />
      </div>

      {/* 4. ECO IMPACT */}
      {/* <section className="section">
        <div className="container">
          <Reveal>
            <div className="eco-impact shine">
              {[
                { icon: FiTree, end: 48200, suffix: '+', label: 'Trees Protected' },
                { icon: FiRecycle, end: 125000, suffix: '+', label: 'Plastic Bags Replaced' },
                { icon: FiGlobe, end: 32500, suffix: '+', label: 'Happy Customers' },
                { icon: FiHeart, end: 89000, suffix: '+', label: 'Eco Products Sold' },
              ].map((s, i) => (
                <div className="eco-stat" key={i}>
                  <div className="eco-stat-ico"><s.icon /></div>
                  <div className="eco-stat-num"><CountUp end={s.end} suffix={s.suffix} /></div>
                  <div className="eco-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section> */}

      {/* 5. WHY PLASTIC FREE — TIMELINE */}
      <section className="section section-bg-alt">
        <div className="container">
          <Reveal className="text-center">
            <span className="eyebrow center-x" style={{ display: 'inline-flex' }}><FiRecycle /> Why Go Plastic Free</span>
            <h2 className="eco-title">The Life of a Bag Tells a Story</h2>
            <p className="eco-lead center-x">Plastic promises convenience but costs the earth for centuries. Here is the real timeline — and why your choice matters.</p>
          </Reveal>
          <div className="timeline">
            {TIMELINE.map((it, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <div className="tl-item">
                  <div className="tl-dot"><it.icon /></div>
                  <div className="tl-card">
                    <div className="tl-time">{it.t}</div>
                    <h4>{it.h}</h4>
                    <p>{it.p}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 6. SHOP BY CATEGORY */}
      <section className="section">
        <div className="container">
          <Reveal className="text-center">
            <span className="eyebrow center-x" style={{ display: 'inline-flex' }}><FiGrid /> Shop by Category</span>
            <h2 className="eco-title">Find Your Perfect Eco Companion</h2>
            <p className="eco-lead center-x">From classrooms to boardrooms to weekend getaways — there is a reusable Prakruthi bag for every moment of life.</p>
          </Reveal>
          <Reveal>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 mt-10">
              {categories.map((c, i) => {
                const Icon = c.icon;
                return (
                  <motion.div key={c.name} whileHover={{ y: -8 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
                    <Link
                      to={`/products?category=${encodeURIComponent(c.name)}`}
                      className="cat-glass shine flex flex-col items-center text-center p-7"
                    >
                      <div className="cat-ico-wrap">
                        <span className="glow" />
                        <Icon size={32} />
                      </div>
                      <div className="font-semibold text-ink">{c.name}</div>
                      <div className="text-xs text-leaf font-semibold mt-1">
                        Explore
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </section>

      {/* 7. FEATURED PRODUCTS */}
      <section className="section section-bg-alt">
        <div className="container">
          <Reveal className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <span className="eyebrow"><FiStar /> Featured Collection</span>
              <h2 className="eco-title">Bags Loved By Nature Lovers</h2>
            </div>
            <Link to="/products" className="btn btn-outline" style={{ borderColor: '#1B5E20', color: '#1B5E20' }}>View All <FiArrowRight /></Link>
          </Reveal>
          <Reveal>
            <div className="grid grid-cols-2 gap-4 mt-10 md:grid-cols-3 md:gap-6 lg:grid-cols-4 2xl:grid-cols-5">
              {featured.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          </Reveal>
        </div>
      </section>

      {/* 8. WHY CHOOSE PRAKRUTHI */}
      <section className="section">
        <div className="container">
          <Reveal className="text-center">
            <span className="eyebrow center-x" style={{ display: 'inline-flex' }}><FiThumbsUp /> Why Choose Prakruthi</span>
            <h2 className="eco-title">More Than a Bag. A Movement.</h2>
            <p className="eco-lead center-x">Six promises we keep with every stitch, every order, and every tree we help protect.</p>
          </Reveal>
          <Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
              {WHY_CHOOSE.map((w, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -8 }}
                  transition={{ type: 'spring', stiffness: 240, damping: 18 }}
                  className="glass-card-premium shine text-center p-9"
                >
                  <div className="why-ico"><w.icon /></div>
                  <h4 className="text-lg font-bold text-primary mb-2">{w.title}</h4>
                  <p className="text-sm text-neutral-600 leading-relaxed">{w.desc}</p>
                </motion.div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* 9. BEST SELLERS — AUTO SCROLL */}
      <section className="section section-bg-alt overflow-hidden">
        <div className="container">
          <Reveal className="text-center">
            <span className="eyebrow center-x" style={{ display: 'inline-flex' }}><FiShoppingBag /> Best Sellers</span>
            <h2 className="eco-title">Crowd Favourites, Always in Demand</h2>
          </Reveal>
        </div>
        <Reveal delay={0.1}>
          <div className="bestsellers-track mt-10 pl-6">
            {[...bestSellers, ...bestSellers].map((p, i) => (
              <div key={`${p._id}-${i}`} style={{ width: 280, flexShrink: 0 }}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* 10. LIMITED OFFER BANNER */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="offer-banner shine">
              <Leaves />
              <span className="hero-eyebrow" style={{ marginBottom: 18 }}><FiZap /> Limited Time</span>
              <h2>Switch To Sustainable Living Today</h2>
              <p>Join thousands who have already replaced plastic with purpose. Every reusable bag is a quiet promise to the planet.</p>
              <Link to="/products" className="hero-cta-primary ripple-btn"><FiShoppingBag size={17} /> Shop Now</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 11. OUR MISSION */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="mission">
              <Leaves />
              <div className="grid lg:grid-cols-2 gap-10 items-center relative" style={{ zIndex: 2 }}>
                <div>
                  <span className="hero-eyebrow"><FiGlobe /> Our Mission</span>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,3.4vw,42px)', fontWeight: 800, marginBottom: 16, lineHeight: 1.15 }}>
                    Every Reusable Bag Reduces Plastic Waste
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 17, lineHeight: 1.7, marginBottom: 20 }}>
                    We believe small, daily choices shape the future of our planet. Prakruthi exists to make the sustainable choice the beautiful, effortless one — replacing single-use plastic with bags people are proud to carry.
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 17, lineHeight: 1.7, marginBottom: 26 }}>
                    Together, our community has already kept <strong style={{ color: '#81C784' }}>125,000+ plastic bags</strong> out of nature. Imagine what we can do next — together.
                  </p>
                  <Link to="/about" className="hero-cta-ghost">Read Our Story <FiArrowRight size={16} /></Link>
                </div>
                <div className="flex justify-center">
                  <div className="mission-earth" aria-hidden="true" />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 12. CUSTOMER REVIEWS */}
      {reviews.length > 0 && (
        <section className="section section-bg-alt">
          <div className="container">
            <Reveal className="text-center">
              <span className="eyebrow center-x" style={{ display: 'inline-flex' }}><FiStar /> Loved By Customers</span>
              <h2 className="eco-title">Real Words From Real Eco-Warriors</h2>
            </Reveal>
            <ReviewsCarousel reviews={reviews} />
          </div>
        </section>
      )}

      {/* 12.5. RECENTLY VIEWED */}
      {recentlyViewed.length > 0 && (
        <section className="section">
          <div className="container">
            <Reveal className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <span className="eyebrow"><FiEye /> Recently Viewed</span>
                <h2 className="eco-title">Continue Where You Left Off</h2>
              </div>
            </Reveal>
            <Reveal>
              <div className="grid grid-cols-2 gap-4 mt-10 md:grid-cols-3 md:gap-6 lg:grid-cols-4 2xl:grid-cols-5">
                {recentlyViewed.map((p) => <ProductCard key={p._id} product={p} />)}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* 13. INSTAGRAM GALLERY */}
      <section className="section">
        <div className="container">
          <Reveal className="text-center">
            <span className="eyebrow center-x" style={{ display: 'inline-flex' }}><FiInstagram /> #PrakruthiLife</span>
            <h2 className="eco-title">Join the Green Community</h2>
            <p className="eco-lead center-x">Tag us in your sustainable moments. Every photo is a small victory for the planet.</p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="insta-grid mt-10">
              {INSTA.map((s, i) => (
                <motion.a
                  key={s}
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="insta-cell shine"
                  whileHover={{ y: -4 }}
                >
                  <img src={`https://picsum.photos/seed/${s}/500/600`} alt="Prakruthi community" loading="lazy" />
                  <div className="insta-overlay"><span><FiInstagram size={18} /> @prakruthibags</span></div>
                </motion.a>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* 14. NEWSLETTER */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="newsletter-card premium shine" style={{ position: 'relative', overflow: 'hidden' }}>
              <FiLeaf className="news-leaf" style={{ top: 20, left: 24 }} />
              <FiLeaf className="news-leaf" style={{ bottom: 10, right: 40, animationDelay: '4s' }} />
              <FiLeaf className="news-leaf" style={{ top: 60, right: 120, animationDelay: '8s' }} />
              <h2>Join The Green Community</h2>
              <p>Be first to know about new eco drops, sustainability tips, and members-only offers.</p>
              {subscribed ? (
                <p className="newsletter-success"><FiCheckCircle style={{ verticalAlign: 'middle' }} /> Thanks for joining the movement!</p>
              ) : (
                <form className="newsletter-form" onSubmit={handleSubscribe}>
                  <input type="email" placeholder="Enter your email" value={email} onChange={(e) => { setEmail(e.target.value); setSubError(''); }} required />
                  <button type="submit"><FiSend size={18} /> Subscribe</button>
                </form>
              )}
              {subError && !subscribed && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{subError}</p>}
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
};

const Leaves = () => (
  <div className="leaf-layer" aria-hidden="true" style={{ borderRadius: 'inherit' }}>
    {[...Array(8)].map((_, i) => (
      <FiLeaf
        key={i}
        className="f-leaf"
        style={{
          left: `${(i * 13 + 6) % 94}%`,
          animationDuration: `${11 + (i % 5) * 2}s`,
          animationDelay: `${i * 1.4}s`,
          fontSize: `${16 + (i % 3) * 6}px`,
        }}
      />
    ))}
  </div>
);

const ReviewsCarousel = ({ reviews }) => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % reviews.length), 4000);
    return () => clearInterval(t);
  }, [reviews.length]);

  const page = Math.floor(index / 3);
  const visible = reviews.slice(page * 3, page * 3 + 3);

  return (
    <div className="relative mt-10">
      <div className="grid gap-6 md:grid-cols-3">
        {visible.map((r, i) => (
          <motion.div
            key={r._id || i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="glass-card-premium p-7"
          >
            <div className="flex items-center gap-1 text-gold mb-3" style={{ color: '#D4A853' }}>
              {[...Array(5)].map((_, s) => (
                <FiStar key={s} fill={s < (r.rating || 5) ? '#D4A853' : 'none'} />
              ))}
            </div>
            <p className="text-neutral-600 text-sm italic leading-relaxed mb-5">"{r.review || r.comment}"</p>
            <div className="flex items-center gap-3">
              <img
                src={r.user?.avatar || `https://ui-avatars.com/api/?name=${(r.user?.name || 'U')}&background=1B5E20&color=fff`}
                alt={r.user?.name || 'Customer'}
                className="w-11 h-11 rounded-full object-cover border-2"
                style={{ borderColor: '#81C784' }}
              />
              <div>
                <div className="font-semibold text-primary text-sm">{r.user?.name || 'Verified Buyer'}</div>
                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-leaf mt-0.5">
                  <FiCheckCircle size={12} /> Verified Purchase
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="flex justify-center gap-2 mt-6">
        {Array.from({ length: Math.ceil(reviews.length / 3) }).map((_, p) => (
          <button
            key={p}
            aria-label={`Go to reviews page ${p + 1}`}
            onClick={() => setIndex(p * 3)}
            className="w-2.5 h-2.5 rounded-full transition-all"
            style={{ background: p === page ? '#1B5E20' : 'rgba(27,94,32,0.25)' }}
          />
        ))}
      </div>
    </div>
  );
};

export default Home;
