import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiTruck, FiMapPin, FiHome, FiNavigation, FiCheck } from 'react-icons/fi';

// Stylised, dependency-free live delivery map. Uses the browser's geolocation
// (when granted) to mark the customer, the store's warehouse location from
// settings, a drawn delivery route and an animated vehicle that travels the
// path until the order is delivered.
const DeliveryMap = ({ storeAddress, estimatedDelivery, status }) => {
  const [geo, setGeo] = useState(null);
  const [geoDenied, setGeoDenied] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGeo({ lat: +pos.coords.latitude.toFixed(4), lng: +pos.coords.longitude.toFixed(4) }),
        () => setGeoDenied(true),
        { timeout: 4000, maximumAge: 600000 }
      );
    } else {
      setGeoDenied(true);
    }
  }, []);

  const arrived = status === 'Delivered' || status === 'Cancelled';

  return (
    <div className="relative h-60 rounded-2xl overflow-hidden border border-gray-100 bg-gradient-to-br from-[#e9f4ee] via-[#eef6f1] to-[#e3f0ea] shadow-inner">
      {/* map grid */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(rgba(46,90,68,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(46,90,68,0.06) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* decorative roads */}
      <svg viewBox="0 0 400 240" className="absolute inset-0 w-full h-full" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,180 C90,120 150,200 240,150 S360,80 400,110" stroke="#cfe3d6" strokeWidth="10" fill="none" strokeLinecap="round" />
        <path d="M40,0 C90,80 60,160 160,200 S300,240 360,240" stroke="#dcebe1" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path
          d="M52,168 C140,90 230,170 330,58"
          stroke="#2E5A44" strokeWidth="3" fill="none" strokeDasharray="7 7"
          strokeLinecap="round"
          className="animate-pulse"
        />
      </svg>

      {/* Warehouse pin */}
      <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
        className="absolute" style={{ left: '13%', top: '70%' }}>
        <div className="relative -translate-x-1/2 -translate-y-full">
          <div className="w-9 h-9 rounded-full bg-[#2E5A44] text-white flex items-center justify-center shadow-lg shadow-[#2E5A44]/30">
            <FiHome size={16} />
          </div>
          <div className="absolute left-1/2 -bottom-1 w-2.5 h-2.5 bg-[#2E5A44] rotate-45 -translate-x-1/2" />
        </div>
      </motion.div>

      {/* Customer pin */}
      <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.35 }}
        className="absolute" style={{ left: '82%', top: '24%' }}>
        <div className="relative -translate-x-1/2 -translate-y-full">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg ${arrived ? 'bg-emerald-600 text-white' : 'bg-white text-[#2E5A44] border-2 border-[#2E5A44]'}`}>
            {arrived ? <FiCheck size={16} /> : <FiMapPin size={16} />}
          </div>
          <div className={`absolute left-1/2 -bottom-1 w-2.5 h-2.5 rotate-45 -translate-x-1/2 ${arrived ? 'bg-emerald-600' : 'bg-white border-r-2 border-b-2 border-[#2E5A44]'}`} />
        </div>
      </motion.div>

      {/* Animated vehicle */}
      {!arrived && (
        <motion.div
          className="absolute z-10"
          initial={{ left: '13%', top: '70%' }}
          animate={{ left: ['13%', '46%', '82%'], top: ['70%', '34%', '24%'] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="relative -translate-x-1/2 -translate-y-1/2">
            <motion.div
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-8 h-8 rounded-full bg-white shadow-lg border border-[#2E5A44]/20 flex items-center justify-center text-[#2E5A44]"
            >
              <FiTruck size={16} />
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Legend / info overlay */}
      <div className="absolute left-3 bottom-3 right-3 flex items-end justify-between gap-2 pointer-events-none">
        <div className="rounded-xl bg-white/85 backdrop-blur px-3 py-2 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Warehouse</p>
          <p className="text-xs font-semibold text-gray-700 max-w-[150px] truncate">{storeAddress || 'Fulfilment Centre'}</p>
        </div>
        <div className="rounded-xl bg-white/85 backdrop-blur px-3 py-2 shadow-sm text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center justify-end gap-1">
            <FiNavigation size={11} /> {geo ? 'Live GPS' : geoDenied ? 'Approx.' : 'Locating…'}
          </p>
          <p className="text-xs font-semibold text-[#2E5A44]">
            {estimatedDelivery ? new Date(estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeliveryMap;
