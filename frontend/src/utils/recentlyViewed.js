const STORAGE_KEY = 'prakruthi_recently_viewed';
const MAX_ITEMS = 20;

export const getRecentlyViewed = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
};

export const trackProductView = (product) => {
  if (!product || !product._id) return;
  try {
    const existing = getRecentlyViewed().filter((p) => p._id !== product._id);
    const entry = {
      _id: product._id,
      name: product.name,
      price: product.price,
      discountPrice: product.discountPrice,
      originalPrice: product.originalPrice,
      category: product.category,
      brand: product.brand,
      material: product.material,
      images: product.images,
      thumbnail: product.thumbnail,
      image: product.image,
      averageRating: product.averageRating,
      totalReviews: product.totalReviews,
      stock: product.stock,
      freeDelivery: product.freeDelivery,
      handmade: product.handmade,
      shortDescription: product.shortDescription,
      slug: product.slug,
      viewedAt: Date.now(),
    };
    const updated = [entry, ...existing].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    /* ignore quota errors */
  }
};

export const clearRecentlyViewed = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
};
