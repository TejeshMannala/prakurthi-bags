require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Category = require('./models/Category');
const Coupon = require('./models/Coupon');
const User = require('./models/User');
const Product = require('./models/Product');
const Banner = require('./models/Banner');

const seed = async () => {
  await connectDB();

  console.log('Clearing existing data...');
  await Promise.all([
    Banner.deleteMany({}),
    Category.deleteMany({}),
    Coupon.deleteMany({}),
    User.deleteMany({}),
    Product.deleteMany({}),
  ]);

  console.log('Seeding banners...');
  await Banner.deleteMany({});
  await Banner.insertMany([
    {
      title: 'Handcrafted with Love',
      subtitle: 'Summer Collection 2026',
      description: 'Discover our latest collection of handwoven bags, crafted by master artisans using sustainable materials.',
      link: '/shop',
      btnText: 'Explore Collection',
      isActive: true,
      order: 0,
      bgColor: '#1F3A2E',
      textColor: '#FAF7F2',
    },
    {
      title: 'Eco-Luxury Redefined',
      subtitle: 'Sustainable Style',
      description: 'Premium bags made from organic cotton, jute, and recycled materials — without compromising on elegance.',
      link: '/category/eco-bags',
      btnText: 'Shop Eco Range',
      isActive: true,
      order: 1,
      bgColor: '#2A4F3E',
      textColor: '#FAF7F2',
    },
    {
      title: 'Artisan Heritage',
      subtitle: 'Traditional Craftsmanship',
      description: 'Each bag tells a story — hand-embroidered, block-printed, and woven using techniques passed down through generations.',
      link: '/category/traditional-bags',
      btnText: 'Discover Heritage',
      isActive: true,
      order: 2,
      bgColor: '#3D2C1A',
      textColor: '#FAF7F2',
    },
  ]);
  console.log('Seeded 3 banners');

  console.log('Seeding categories...');
  const categoryData = [
    { name: 'Cotton Bags', slug: 'cotton-bags', image: '', description: 'Soft, breathable, and naturally elegant cotton bags for everyday luxury.' },
    { name: 'Jute Bags', slug: 'jute-bags', image: '', description: 'Rustic charm meets modern design in our handwoven jute collection.' },
    { name: 'Fabric Bags', slug: 'fabric-bags', image: '', description: 'Vibrant fabric bags that celebrate traditional textile artistry.' },
    { name: 'Canvas Bags', slug: 'canvas-bags', image: '', description: 'Durable canvas companions for your daily adventures.' },
    { name: 'Leather Bags', slug: 'leather-bags', image: '', description: 'Premium full-grain leather bags crafted for timeless sophistication.' },
    { name: 'Tote Bags', slug: 'tote-bags', image: '', description: 'Spacious totes designed for the modern woman on the go.' },
    { name: 'Handbags', slug: 'handbags', image: '', description: 'Timeless handbags that elevate every outfit.' },
    { name: 'Sling Bags', slug: 'sling-bags', image: '', description: 'Compact and chic sling bags for effortless style.' },
    { name: 'Laptop Bags', slug: 'laptop-bags', image: '', description: 'Protect your tech with handcrafted laptop bags.' },
    { name: 'Travel Bags', slug: 'travel-bags', image: '', description: 'Journey in style with our handcrafted travel essentials.' },
    { name: 'Office Bags', slug: 'office-bags', image: '', description: 'Professional elegance for the workplace and beyond.' },
    { name: 'Backpacks', slug: 'backpacks', image: '', description: 'Handmade backpacks combining comfort with artisan craftsmanship.' },
    { name: 'Designer Bags', slug: 'designer-bags', image: '', description: 'Exclusive designer pieces that make a bold statement.' },
    { name: 'Premium Bags', slug: 'premium-bags', image: '', description: 'The finest materials and craftsmanship for discerning tastes.' },
    { name: 'Eco Bags', slug: 'eco-bags', image: '', description: 'Sustainable style with zero compromise on quality or aesthetics.' },
    { name: 'Traditional Bags', slug: 'traditional-bags', image: '', description: 'Celebrate heritage with our intricately designed traditional collection.' },
  ];
  const categories = await Category.insertMany(categoryData);
  console.log(`Seeded ${categories.length} categories`);

  console.log('Seeding coupons...');
  const farFuture = new Date('2030-12-31');
  await Coupon.insertMany([
    { 
      code: 'SAVE100', 
      title: 'Flat ₹100 OFF',
      description: 'You unlocked a coupon!',
      discountType: 'flat',
      discountAmount: 100,
      minOrderAmount: 1000, 
      isActive: true, 
      expiresAt: farFuture 
    },
    { 
      code: 'SAVE250', 
      title: 'Flat ₹250 OFF',
      description: 'You unlocked a limited coupon!',
      discountType: 'flat',
      discountAmount: 250,
      minOrderAmount: 2000, 
      usageLimit: 100, // Some limit
      isActive: true, 
      expiresAt: farFuture 
    },
    { 
      code: 'SAVE400', 
      title: 'Flat ₹400 OFF',
      description: 'You unlocked the ultimate coupon!',
      discountType: 'flat',
      discountAmount: 400,
      minOrderAmount: 3000, 
      usageLimit: 1, // Has one coupon limit
      isActive: true, 
      expiresAt: farFuture 
    },
  ]);

  console.log('Seeding admin user...');
  const admin = await User.create({
    name: 'Admin',
    email: 'admin@prakruthi.com',
    password: 'admin123',
    role: 'admin',
  });
  console.log(`Admin created: admin@prakruthi.com / admin123`);

  console.log('Seeding demo user...');
  await User.create({
    name: 'Demo User',
    email: 'user@prakruthi.com',
    password: 'user123',
    role: 'user',
  });
  console.log(`Demo user created: user@prakruthi.com / user123`);

  console.log('Seeding products...');
  const catMap = {};
  categories.forEach(c => { catMap[c.slug] = c._id; });

  const productsData = [
    { name: 'Organic Cotton Tote Classic', description: 'Handcrafted from 100% organic cotton with reinforced handles and inner zip pocket. Perfect for everyday use.', price: 2499, discountPrice: 1999, category: 'cotton-bags', stock: 25, ratings: 4.5, reviewsCount: 18, material: 'Organic Cotton', isNewArrival: true, isTrending: true },
    { name: 'Cotton Canvas Shopper Premium', description: 'Lightweight canvas shopper with extra-long shoulder straps. Naturally dyed and machine washable.', price: 1899, discountPrice: 1499, category: 'cotton-bags', stock: 30, ratings: 4.3, reviewsCount: 12, material: 'Cotton Canvas', isNewArrival: true },
    { name: 'Handwoven Jute Tote Heritage', description: 'Premium golden jute fiber tote with leather accents and silk-lined interior. A timeless eco-luxury piece.', price: 3999, discountPrice: 3499, category: 'jute-bags', stock: 15, ratings: 4.8, reviewsCount: 24, material: 'Golden Jute', isTrending: true, isBestSeller: true },
    { name: 'Jute Crossbody Sling Artisan', description: 'Eco-chic crossbody crafted from spun jute with adjustable cotton strap and handcrafted wooden toggle closure.', price: 2199, discountPrice: null, category: 'jute-bags', stock: 20, ratings: 4.1, reviewsCount: 8, material: 'Spun Jute' },
    { name: 'Patchwork Fabric Bag Artisan', description: 'Vibrant patchwork fabric bag showcasing traditional Indian textile artistry. Each piece is unique.', price: 1799, discountPrice: 1499, category: 'fabric-bags', stock: 22, ratings: 4.4, reviewsCount: 9, material: 'Cotton Fabric', isNewArrival: true },
    { name: 'Block Print Fabric Tote Signature', description: 'Hand-block-printed cotton tote featuring traditional motifs. Lightweight and foldable for easy travel.', price: 1499, discountPrice: null, category: 'fabric-bags', stock: 18, ratings: 4.2, reviewsCount: 6, material: 'Block Print Cotton' },
    { name: 'Full Grain Leather Satchel Premium', description: 'Full-grain buffalo leather satchel with brass hardware, multiple compartments, and adjustable strap.', price: 8499, discountPrice: 6999, category: 'leather-bags', stock: 10, ratings: 4.9, reviewsCount: 31, material: 'Full Grain Leather', isTrending: true, isBestSeller: true },
    { name: 'Italian Leather Handbag Luxury', description: 'Smooth Italian leather handbag with magnetic closure, inner zip pocket, and detachable shoulder strap.', price: 12999, discountPrice: null, category: 'leather-bags', stock: 8, ratings: 4.7, reviewsCount: 20, material: 'Italian Leather', isBestSeller: true },
    { name: 'Canvas Backpack Adventure', description: 'Heavy-duty canvas backpack with padded laptop sleeve, multiple pockets, and ergonomic straps.', price: 3299, discountPrice: 2799, category: 'canvas-bags', stock: 28, ratings: 4.5, reviewsCount: 16, material: 'Waxed Canvas', isTrending: true },
    { name: 'Canvas Messenger Bag Urban', description: 'Classic canvas messenger bag with leather trim, perfect for work or travel. Fits up to 15" laptop.', price: 2799, discountPrice: null, category: 'canvas-bags', stock: 14, ratings: 4.6, reviewsCount: 13, material: 'Canvas + Leather', isNewArrival: true },
    { name: 'Classic Leather Tote Elegance', description: 'Structured leather tote with top zip closure, interior pockets, and reinforced base. Perfect for office.', price: 5499, discountPrice: 4499, category: 'tote-bags', stock: 12, ratings: 4.8, reviewsCount: 22, material: 'Premium Leather', isBestSeller: true },
    { name: 'Canvas Tote Bag Everyday', description: 'Lightweight canvas tote with contrast stitching and inner pocket. Available in natural and dyed finishes.', price: 1599, discountPrice: null, category: 'tote-bags', stock: 35, ratings: 4.3, reviewsCount: 11, material: 'Cotton Canvas' },
    { name: 'Structured Leather Handbag Classic', description: 'Timeless structured handbag in premium leather with gold-toned hardware and detachable shoulder strap.', price: 7499, discountPrice: 5999, category: 'handbags', stock: 10, ratings: 4.7, reviewsCount: 19, material: 'Premium Leather', isTrending: true },
    { name: 'Leather Crossbody Sling Modern', description: 'Sleek leather crossbody bag with adjustable strap and multiple card slots. Minimalist design.', price: 3499, discountPrice: 2999, category: 'sling-bags', stock: 20, ratings: 4.4, reviewsCount: 14, material: 'Smooth Leather', isNewArrival: true },
    { name: 'Laptop Briefcase Professional', description: 'Professional laptop briefcase with padded 15.6" compartment, organizer panel, and TSA-friendly design.', price: 4499, discountPrice: 3799, category: 'laptop-bags', stock: 15, ratings: 4.5, reviewsCount: 17, material: 'Nylon + Leather', isBestSeller: true },
    { name: 'Weekender Travel Duffle', description: 'Spacious weekender duffle with shoe compartment, wet pocket, and detachable shoulder strap. Carry-on friendly.', price: 3999, discountPrice: 3499, category: 'travel-bags', stock: 12, ratings: 4.6, reviewsCount: 15, material: 'Polyester Canvas', isTrending: true },
    { name: 'Executive Office Bag Premium', description: 'Sophisticated office bag with padded laptop compartment, document organizer, and premium hardware.', price: 5999, discountPrice: null, category: 'office-bags', stock: 10, ratings: 4.7, reviewsCount: 21, material: 'Vegan Leather', isBestSeller: true },
    { name: 'Travel Backpack Explorer', description: 'Versatile travel backpack with hidden security pocket, USB charging port, and breathable back panel.', price: 3599, discountPrice: 2999, category: 'backpacks', stock: 18, ratings: 4.4, reviewsCount: 12, material: 'Water Resistant Fabric', isNewArrival: true },
    { name: 'Designer Clutch Evening', description: 'Exquisite designer clutch embellished with hand-embroidery and semi-precious stones. Limited edition.', price: 8999, discountPrice: 7499, category: 'designer-bags', stock: 5, ratings: 4.9, reviewsCount: 28, material: 'Silk + Embroidery', isTrending: true },
    { name: 'Designer Crossbody Statement', description: 'Statement crossbody bag with hand-painted artwork, gold chain strap, and magnetic flap closure.', price: 6499, discountPrice: null, category: 'designer-bags', stock: 7, ratings: 4.6, reviewsCount: 16, material: 'Artisan Canvas' },
    { name: 'Recycled PET Tote Eco', description: 'Eco-friendly tote made from recycled PET bottles. Lightweight, water-resistant, and machine washable.', price: 1299, discountPrice: 999, category: 'eco-bags', stock: 40, ratings: 4.2, reviewsCount: 10, material: 'Recycled PET', isNewArrival: true },
    { name: 'Embroidered Potli Bag Traditional', description: 'Traditional potli bag with intricate zardozi embroidery and drawstring closure. Perfect for festive occasions.', price: 2499, discountPrice: 1999, category: 'traditional-bags', stock: 15, ratings: 4.6, reviewsCount: 18, material: 'Silk + Zardozi', isTrending: true, isBestSeller: true },
    { name: 'Handloom Tote Ethnic', description: 'Handwoven on traditional looms, this tote celebrates India\'s rich textile heritage. Features inner zip pocket.', price: 2199, discountPrice: null, category: 'traditional-bags', stock: 20, ratings: 4.4, reviewsCount: 13, material: 'Handloom Cotton' },
    { name: 'Premium Bamboo Fiber Bag', description: 'Innovative bag woven from sustainable bamboo fiber. Naturally antibacterial and biodegradable.', price: 3199, discountPrice: 2799, category: 'premium-bags', stock: 12, ratings: 4.7, reviewsCount: 20, material: 'Bamboo Fiber', isNewArrival: true },
    { name: 'Luxury Satin Evening Clutch', description: 'Opulent satin clutch with Swarovski crystal clasp and detachable chain strap. Red carpet ready.', price: 9999, discountPrice: 8499, category: 'premium-bags', stock: 6, ratings: 4.9, reviewsCount: 25, material: 'Satin + Crystals', isBestSeller: true },
  ];

  const products = [];
  for (const data of productsData) {
    const { category: catSlug, ...rest } = data;
    products.push({
      ...rest,
      category: catMap[catSlug],
      images: [],
    });
  }

  const created = await Product.insertMany(products);
  console.log(`Seeded ${created.length} products`);

  console.log('\n✓ Seed complete!');
  console.log('Admin Login: admin@prakruthi.com / admin123');
  console.log('User Login:  user@prakruthi.com / user123\n');

  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
