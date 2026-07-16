const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },
    shortDescription: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      required: true,
    },
    subCategory: {
      type: String,
      default: '',
      trim: true,
    },
    brand: {
      type: String,
      default: 'Parkuthi',
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    images: [
      {
        url: { type: String, default: '' },
        publicId: { type: String, default: '' },
      },
    ],
    thumbnail: {
      type: String,
      default: '',
    },
    image: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      required: true,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    sold: {
      type: Number,
      default: 0,
      min: 0,
    },
    tags: [String],
    featured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    specifications: {
      material: String,
      weight: String,
      dimensions: String,
      care: String,
      capacity: String,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    ratingDistribution: {
      type: [Number],
      default: [0, 0, 0, 0, 0],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    bestSeller: {
      type: Boolean,
      default: false,
    },
    material: {
      type: String,
      default: 'Jute',
    },
    gender: {
      type: String,
      enum: ['Unisex', 'Men', 'Women', 'Kids'],
      default: 'Unisex',
    },
    handmade: {
      type: Boolean,
      default: true,
    },
    freeDelivery: {
      type: Boolean,
      default: true,
    },
    discountPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    colors: [String],
    sizes: [String],
    weight: String,
    sku: { type: String, default: '', index: true },
    weightCapacity: { type: String, default: '' },
    bagWeight: { type: String, default: '' },
    dimensions: {
      height: { type: String, default: '' },
      width: { type: String, default: '' },
      depth: { type: String, default: '' },
      handleLength: { type: String, default: '' },
    },
    pattern: { type: String, default: '' },
    closureType: { type: String, default: '' },
    features: { type: [String], default: [] },
    careInstructions: { type: [String], default: [] },
    manufacturer: { type: String, default: '' },
    countryOfOrigin: { type: String, default: 'India' },
    warranty: { type: String, default: '' },
    washable: { type: Boolean, default: true },
    reusable: { type: Boolean, default: true },
    waterResistant: { type: Boolean, default: false },
    ecoFriendly: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', category: 'text', brand: 'text', tags: 'text' });
productSchema.index({ category: 1, isActive: 1, price: 1 });
productSchema.index({ averageRating: -1, totalReviews: -1 });

productSchema.pre('validate', function (next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  if (!this.shortDescription && this.description) {
    this.shortDescription = this.description.slice(0, 150);
  }

  if (!this.thumbnail) {
    this.thumbnail = this.images?.find((image) => image.url)?.url || this.image || '';
  }

  if (!this.originalPrice && this.discount > 0 && this.price > 0) {
    this.originalPrice = Math.round(this.price / (1 - this.discount / 100));
  }

  this.averageRating = this.rating || this.averageRating || 0;
  this.totalReviews = this.numReviews || this.totalReviews || 0;

  next();
});

module.exports = mongoose.model('Product', productSchema);
