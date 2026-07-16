const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

const getDailySales = async (req, res) => {
  const { days = 30 } = req.query;
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - Number(days));

  const dailySales = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: sinceDate },
        orderStatus: { $ne: 'Cancelled' },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        totalItems: { $sum: { $size: '$items' } },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        totalOrders: 1,
        totalRevenue: { $round: ['$totalRevenue', 2] },
        totalItems: 1,
      },
    },
  ]);

  res.json({ success: true, data: dailySales });
};

const getOverview = async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [
    totalRevenueResult,
    monthlyRevenueResult,
    totalOrdersResult,
    pendingOrdersResult,
    totalProducts,
    totalUsers,
    topProducts,
    revenueByStatus,
  ] = await Promise.all([
    Order.aggregate([
      { $match: { orderStatus: { $ne: 'Cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, orderStatus: { $ne: 'Cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    Order.countDocuments({ orderStatus: { $ne: 'Cancelled' } }),
    Order.countDocuments({ orderStatus: 'Pending' }),
    Product.countDocuments(),
    User.countDocuments({ role: 'user' }),
    Product.find().sort({ soldQuantity: -1 }).limit(5).select('name soldQuantity price'),
    Order.aggregate([
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
        },
      },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      totalRevenue: totalRevenueResult[0]?.total || 0,
      monthlyRevenue: monthlyRevenueResult[0]?.total || 0,
      totalOrders,
      pendingOrders,
      totalProducts,
      totalUsers,
      topProducts,
      orderStatusBreakdown: revenueByStatus,
    },
  });
};

module.exports = { getDailySales, getOverview };
