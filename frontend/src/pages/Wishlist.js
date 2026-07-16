import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHeart, FiShoppingBag } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';
import BackButton from '../components/BackButton';

const Wishlist = () => {
  const { wishlist, addToCart, toggleWishlist } = useCart();
  const { showNotification } = useNotification();

  const handleAddToCart = (product) => {
    addToCart(product);
    showNotification('addToCart');
  };

  const handleToggleWishlist = (product) => {
    toggleWishlist(product);
    if (wishlist.some((item) => item._id === product._id)) {
      showNotification('remove');
    } else {
      showNotification('wishlist');
    }
  };

  return (
    <div className="cart-page">
      <div className="container">
        <BackButton to="/products" label="Continue Shopping" />
        <h1 style={{ fontFamily: "'Playfair Display', serif", color: '#2E5A44', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <FiHeart style={{ color: '#dc2626' }} /> My Wishlist
        </h1>
        <p style={{ color: '#6b7280', marginBottom: 32 }}>
          {wishlist.length} item{wishlist.length !== 1 ? 's' : ''} saved
        </p>

        {wishlist.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', padding: '80px 0' }}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <FiHeart size={80} style={{ color: '#A3C9A8', marginBottom: 20 }} />
            </motion.div>
            <h3 style={{ marginBottom: 8 }}>Your wishlist is empty</h3>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>Save your favorite bags for later!</p>
            <Link to="/products" className="btn btn-primary">Explore Products</Link>
          </motion.div>
        ) : (
          <div className="product-grid">
            {wishlist.map((product, i) => (
              <motion.div
                key={product._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="product-card"
              >
                <div className="product-card-image" style={{ position: 'relative' }}>
                  {product.images && product.images.length > 0 && product.images[0]?.url ? (
                    <img src={product.images[0].url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : product.image ? (
                    <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <FiShoppingBag size={48} />
                  )}
                  {product.discount > 0 && (
                    <span className="discount-badge">-{product.discount}%</span>
                  )}
                </div>
                <div className="product-card-body">
                  <span className="product-category">{product.category}</span>
                  <h4>{product.name}</h4>
                  <p className="product-description">{product.description?.slice(0, 80)}{product.description?.length > 80 ? '...' : ''}</p>
                  <div className="product-price-row">
                    <span className="price">&#8377;{product.price}</span>
                    {product.discount > 0 && (
                      <span className="original-price">
                        &#8377;{Math.round(product.price / (1 - product.discount / 100))}
                      </span>
                    )}
                  </div>
                  <div className="product-actions">
                    <button className="btn btn-primary" onClick={() => handleAddToCart(product)}>
                      Add to Cart
                    </button>
                    <button
                      className="btn btn-outline wishlist-btn active"
                      onClick={() => handleToggleWishlist(product)}
                    >
                      <FiHeart />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
