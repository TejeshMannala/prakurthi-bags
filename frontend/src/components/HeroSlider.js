import React from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation, EffectFade, Parallax } from 'swiper/modules';
import { motion } from 'framer-motion';
import { FiArrowRight, FiShoppingBag } from 'react-icons/fi';
import { FaLeaf as FiLeaf } from 'react-icons/fa';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import 'swiper/css/effect-fade';

const SLIDES = [
  {
    eyebrow: '🌿 Reusable · Biodegradable · Handcrafted',
    title: (
      <>
        Carry the Future, <br /> Not <span className="accent">Plastic.</span>
      </>
    ),
    sub: 'Every reusable bag protects our environment and reduces plastic pollution. Choose nature, choose Prakruthi.',
    ctas: [
      { label: 'Shop Eco Bags', to: '/products', primary: true, icon: FiShoppingBag },
      { label: 'Explore Collection', to: '/products', primary: false, icon: FiArrowRight },
    ],
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1920&q=80',
    bg: '#14421A',
  },
  {
    eyebrow: '♻️ From Pollution to Purity',
    title: (
      <>
        One Bag Can <br /> Change the <span className="accent">World.</span>
      </>
    ),
    sub: 'Picture oceans suffocated by plastic turning into clean, green landscapes. Your choice rewrites the story of our planet.',
    ctas: [{ label: 'Join the Green Movement', to: '/products', primary: true, icon: FiLeaf }],
    image: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1920&q=80',
    bg: '#0f3a2a',
  },
  {
    eyebrow: '🧵 Made By Artisan Hands',
    title: (
      <>
        Crafted By Nature. <br />
        <span className="accent">Made For Life.</span>
      </>
    ),
    sub: '100% natural jute & cotton, handwoven by skilled artisans. Premium quality that honours the earth and the hands that make it.',
    highlights: ['100% Natural', 'Handmade', 'Premium Quality', 'Biodegradable'],
    ctas: [{ label: 'Explore Handmade', to: '/products', primary: true, icon: FiArrowRight }],
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1920&q=80',
    bg: '#1c4a2e',
  },
  {
    eyebrow: '👨‍👩‍👧 Greener Together',
    title: (
      <>
        Choose Green. <br />
        <span className="accent">Live Better.</span>
      </>
    ),
    sub: 'Small choices create a cleaner tomorrow. Shop reusable bags with the people you love and build a habit that heals the planet.',
    ctas: [{ label: 'Start Shopping', to: '/products', primary: true, icon: FiShoppingBag }],
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1920&q=80',
    bg: '#15401f',
  },
];

const Leaves = () => (
  <div className="leaf-layer" aria-hidden="true">
    {[...Array(10)].map((_, i) => (
      <FiLeaf
        key={i}
        className="f-leaf"
        style={{
          left: `${(i * 11 + 4) % 96}%`,
          animationDuration: `${10 + (i % 6) * 2.5}s`,
          animationDelay: `${i * 1.1}s`,
          fontSize: `${16 + (i % 4) * 6}px`,
          opacity: 0,
        }}
      />
    ))}
  </div>
);

const Birds = () => (
  <div className="bird-layer" aria-hidden="true">
    {[...Array(4)].map((_, i) => (
      <div
        key={i}
        className="bird"
        style={{
          top: `${12 + i * 9}%`,
          animationDuration: `${16 + i * 5}s`,
          animationDelay: `${i * 3}s`,
          transform: `scale(${0.7 + (i % 3) * 0.25})`,
        }}
      >
        <span />
        <span />
      </div>
    ))}
  </div>
);

const HeroSlider = () => {
  return (
    <section className="hero-slider-wrapper" aria-label="Featured stories">
      <Swiper
        modules={[Autoplay, Pagination, Navigation, EffectFade, Parallax]}
        slidesPerView={1}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        speed={1100}
        loop
        parallax
        autoplay={{ delay: 6000, disableOnInteraction: false }}
        pagination={{ clickable: true, dynamicBullets: true }}
        navigation
        className="hero-swiper"
      >
        {SLIDES.map((s, idx) => (
          <SwiperSlide key={idx}>
            <div className="hero-slide" style={{ backgroundColor: s.bg }}>
              <div
                className="hero-bg"
                data-swiper-parallax="-22%"
                style={{ backgroundImage: `url(${s.image})` }}
              />
              <div className="hero-overlay" />
              <div className="sun-rays" aria-hidden="true" />
              <Birds />
              <Leaves />

              <motion.div
                key={idx}
                className="hero-content"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              >
                <span className="hero-eyebrow">{s.eyebrow}</span>
                <h1 className="hero-title">{s.title}</h1>
                <p className="hero-sub">{s.sub}</p>

                {s.highlights && (
                  <div className="flex flex-wrap gap-2.5 mb-7">
                    {s.highlights.map((h) => (
                      <span
                        key={h}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-[13px] font-semibold text-white backdrop-blur border border-white/25"
                      >
                        <FiLeaf size={13} className="text-leaf" /> {h}
                      </span>
                    ))}
                  </div>
                )}

                <div className="hero-cta-row">
                  {s.ctas.map((c) => {
                    const Icon = c.icon;
                    return c.primary ? (
                      <Link key={c.label} to={c.to} className="hero-cta-primary ripple-btn">
                        <Icon size={17} /> {c.label}
                      </Link>
                    ) : (
                      <Link key={c.label} to={c.to} className="hero-cta-ghost">
                        {c.label} <Icon size={16} />
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <div className="hero-scroll" aria-hidden="true">
        <span className="mouse" />
        Scroll
      </div>
    </section>
  );
};

export default HeroSlider;
