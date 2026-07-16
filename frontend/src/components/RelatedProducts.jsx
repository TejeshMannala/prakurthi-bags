import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../utils/axios';
import ProductCard from './ProductCard';

const RelatedProducts = ({ productId }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelated = async () => {
      try {
        const res = await api.get(`/api/products/${productId}/related`);
        setProducts(res.data.data || []);
      } catch (err) {
        // Related products failed to load — non-critical, page works fine without them
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchRelated();
    }
  }, [productId]);

  if (loading) {
    return (
      <div className="mt-16">
        <h3 className="text-2xl font-extrabold mb-6 text-gray-900">You Might Also Like</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6 lg:grid-cols-4 2xl:grid-cols-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
              <div className="aspect-[4/5] bg-gray-200 skeleton-shimmer" />
              <div className="p-5 space-y-3">
                <div className="h-3 bg-gray-200 rounded w-1/3" />
                <div className="h-5 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-16 border-t border-gray-100 pt-16"
    >
      <h3 className="text-2xl font-extrabold mb-8 text-gray-900">You Might Also Like</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6 lg:grid-cols-4 2xl:grid-cols-5">
        {products.map((product, index) => (
          <motion.div
            key={product._id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
          >
            <ProductCard product={product} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default RelatedProducts;
