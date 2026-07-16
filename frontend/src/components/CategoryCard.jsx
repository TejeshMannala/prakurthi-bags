import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const CategoryCard = ({ category }) => {
  const gradientColors = [
    'from-purple-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-blue-500 to-cyan-600',
    'from-violet-500 to-purple-600',
    'from-lime-500 to-green-600',
    'from-fuchsia-500 to-pink-600',
  ];

  const colorIndex = (category.name || '').length % gradientColors.length;
  const gradient = gradientColors[colorIndex];

  const iconMap = {
    'Laptop Bags': '💻',
    'Travel Bags': '✈️',
    'Office Bags': '💼',
    'Shopping Bags': '🛍️',
    'Tote Bags': '👜',
    'Backpacks': '🎒',
    'Messenger Bags': '📨',
    'Crossbody Bags': '🔗',
    'Duffel Bags': '🧳',
    'Sling Bags': '👝',
  };

  const emoji = iconMap[category.name] || '👜';

  return (
    <Link
      to={`/products?category=${category.slug}`}
      className="group flex flex-col items-center gap-4 p-6 transition-all duration-300"
    >
      <motion.div
        whileHover={{ scale: 1.1, y: -8 }}
        className={`relative w-28 h-28 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:shadow-2xl transition-shadow duration-500`}
      >
        <span className="text-4xl transition-transform duration-500 group-hover:scale-110">{emoji}</span>
        <div className="absolute inset-0 rounded-full border-4 border-white/20 scale-100 group-hover:scale-110 transition-transform duration-500" />
        <div className="absolute inset-0 rounded-full border-2 border-white/10 scale-100 group-hover:scale-125 transition-transform duration-700" />
      </motion.div>

      <div className="text-center">
        <h3 className="font-bold text-gray-800 text-base group-hover:text-purple-600 transition-colors duration-300">
          {category.name}
        </h3>
      </div>
    </Link>
  );
};

export default CategoryCard;
