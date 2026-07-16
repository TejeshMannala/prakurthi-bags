const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [120, 'Name cannot exceed 120 characters'],
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price must be positive'],
  },
  discountPrice: {
    type: Number,
    default: null,
    min: [0, 'Discount price must be positive'],
    validate: {
      validator: function (v) {
        return v === null || v < this.price;
      },
      message: 'Discount price must be less than regular price',
    },
  },
  images: {
    type: [String],
    default: [],
    validate: {
      validator: function (v) { return v.length <= 10; },
      message: 'Maximum 10 images allowed',
    },
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required'],
    index: true,
  },
  stock: {
    type: Number,
    required: [true, 'Stock count is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0,
  },
  soldQuantity: {
    type: Number,
    default: 0,
  },
  ratings: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviewsCount: {
    type: Number,
    default: 0,
  },
  material: {
    type: String,
    default: '',
  },
  deliveryInfo: {
    type: String,
    default: 'Free shipping on orders above ₹999. Delivery within 5-7 business days.',
  },
  isNewArrival: {
    type: Boolean,
    default: false,
  },
  isTrending: {
    type: Boolean,
    default: false,
  },
  isBestSeller: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ discountPrice: 1 });
productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);
