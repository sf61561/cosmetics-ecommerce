/**
 * Centralized Notification Templates for RupKotha
 * Defines metadata, channels, requirement constraints, and copy for all events.
 */

const TEMPLATES = {
  // ── Customer Order Events ──
  'order.placed': {
    category: 'order_updates',
    required: true,
    channels: ['in_app', 'email', 'sms'],
    title: (data) => `Order Placed Successfully!`,
    body: (data) => `Your order #${data.orderNumber || ''} has been received and is being processed. Total: ৳${Number(data.total || 0).toLocaleString('en-BD')}.`,
    link: (data) => `/orders/${data.orderId || ''}`,
    actionText: 'View Order',
    icon: 'bag-check',
  },
  'order.confirmed': {
    category: 'order_updates',
    required: true,
    channels: ['in_app', 'email'],
    title: (data) => `Order Confirmed`,
    body: (data) => `Your order #${data.orderNumber || ''} has been confirmed by our team and is being prepared.`,
    link: (data) => `/orders/${data.orderId || ''}`,
    actionText: 'Track Order',
    icon: 'check-circle',
  },
  'order.shipped': {
    category: 'order_updates',
    required: true,
    channels: ['in_app', 'email', 'sms'],
    title: (data) => `Order Shipped`,
    body: (data) => {
      const courierInfo = data.courierName ? ` via ${data.courierName}` : '';
      const trackingInfo = data.trackingNumber ? ` (Tracking: ${data.trackingNumber})` : '';
      return `Your order #${data.orderNumber || ''} is on its way${courierInfo}${trackingInfo}.`;
    },
    link: (data) => `/orders/${data.orderId || ''}`,
    actionText: 'Track Shipment',
    icon: 'truck',
  },
  'order.delivered': {
    category: 'order_updates',
    required: true,
    channels: ['in_app', 'email'],
    title: (data) => `Order Delivered`,
    body: (data) => `Your order #${data.orderNumber || ''} has been delivered. Thank you for choosing RupKotha!`,
    link: (data) => `/orders/${data.orderId || ''}`,
    actionText: 'View Details',
    icon: 'package-check',
  },
  'order.cancelled': {
    category: 'order_updates',
    required: true,
    channels: ['in_app', 'email', 'sms'],
    title: (data) => `Order Cancelled`,
    body: (data) => `Order #${data.orderNumber || ''} has been cancelled.${data.reason ? ` Reason: ${data.reason}` : ''}`,
    link: (data) => `/orders/${data.orderId || ''}`,
    actionText: 'View Order',
    icon: 'x-circle',
  },

  // ── Customer Security Events ──
  'security.password_changed': {
    category: 'security_alerts',
    required: true,
    channels: ['in_app', 'email'],
    title: (data) => `Security Alert: Password Changed`,
    body: (data) => `Your account password was recently changed. If you did not make this change, please contact support or reset your password immediately.`,
    link: () => `/profile/security`,
    actionText: 'Review Security',
    icon: 'shield-alert',
  },

  // ── Customer Wishlist & Marketing Events (Opt-In) ──
  'wishlist.back_in_stock': {
    category: 'wishlist_alerts',
    required: false,
    channels: ['in_app', 'email'],
    title: (data) => `Back in Stock: ${data.productName || 'Favorite Product'}`,
    body: (data) => `"${data.productName || 'An item'}" from your wishlist is now back in stock. Grab it before it sells out!`,
    link: (data) => `/products/${data.slug || ''}`,
    actionText: 'Shop Now',
    icon: 'sparkles',
  },
  'wishlist.price_drop': {
    category: 'wishlist_alerts',
    required: false,
    channels: ['in_app', 'email'],
    title: (data) => `Price Drop Alert!`,
    body: (data) => `"${data.productName || 'An item'}" in your wishlist dropped to ৳${Number(data.newPrice || 0).toLocaleString('en-BD')} (was ৳${Number(data.oldPrice || 0).toLocaleString('en-BD')}).`,
    link: (data) => `/products/${data.slug || ''}`,
    actionText: 'View Deal',
    icon: 'tag',
  },
  'promotions.sale': {
    category: 'promotions',
    required: false,
    channels: ['in_app', 'email'],
    title: (data) => data.title || 'Special Offer at RupKotha',
    body: (data) => data.body || 'Exclusive skincare & beauty deals are now live. Discover our latest collections.',
    link: (data) => data.link || '/collections',
    actionText: 'Explore Offers',
    icon: 'gift',
  },

  // ── Admin Alerts ──
  'admin.order_placed': {
    category: 'admin_alerts',
    required: true,
    channels: ['in_app'],
    title: (data) => `New Order Received: #${data.orderNumber || ''}`,
    body: (data) => `Order #${data.orderNumber || ''} placed by ${data.customerName || 'Customer'} for ৳${Number(data.total || 0).toLocaleString('en-BD')} (${data.paymentMethod || 'COD'}).`,
    link: (data) => `/admin/orders/${data.orderId || ''}`,
    actionText: 'Manage Order',
    icon: 'shopping-bag',
  },
  'admin.low_stock': {
    category: 'admin_alerts',
    required: true,
    channels: ['in_app'],
    title: (data) => `Low Stock: ${data.productName || 'Product'}`,
    body: (data) => `Inventory for "${data.productName || ''}" is low with only ${data.stockQuantity || 0} units left in stock.`,
    link: (data) => `/admin/products/${data.productId || ''}`,
    actionText: 'Restock Product',
    icon: 'alert-triangle',
  },
  'admin.order_cancelled': {
    category: 'admin_alerts',
    required: true,
    channels: ['in_app'],
    title: (data) => `Order Cancelled: #${data.orderNumber || ''}`,
    body: (data) => `Order #${data.orderNumber || ''} was cancelled by ${data.customerName || 'Customer'}.`,
    link: (data) => `/admin/orders/${data.orderId || ''}`,
    actionText: 'Review Cancellation',
    icon: 'x-circle',
  },
};

module.exports = {
  TEMPLATES,
  getTemplate: (type) => TEMPLATES[type] || null,
};

