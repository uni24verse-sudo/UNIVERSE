/**
 * UniVerse PostgreSQL-to-API Adapter
 * Ensures 100% backward compatibility with React frontend, Mobile App, and Vendor Dashboards
 * Automatically provides `_id` alongside `id`, maps relational foreign keys (`admin` <-> `adminId`, `store` <-> `storeId`).
 */

function normalizeStore(store) {
  if (!store) return null;
  return {
    ...store,
    _id: store.id,
    admin: store.admin ? normalizeAdmin(store.admin) : store.adminId,
    adminId: store.adminId,
    location: store.location || null,
    locationId: store.locationId || null,
    products: Array.isArray(store.products) ? store.products : [],
    categoryImages: Array.isArray(store.categoryImages) ? store.categoryImages : []
  };
}

function normalizeAdmin(admin) {
  if (!admin) return null;
  return {
    ...admin,
    _id: admin.id
  };
}

function normalizeOrder(order) {
  if (!order) return null;

  // Calculate dynamic acceptance deadline for Pending orders
  let acceptDeadline = order.acceptDeadline || null;
  if (!acceptDeadline && order.status === 'Pending' && order.createdAt) {
    const isRestaurantDining = (order.store?.storeType === 'Restaurant' || order.storeType === 'Restaurant') && order.orderType === 'Dine In';
    if (!isRestaurantDining) {
      const deadlineMinutes = order.isPreOrder ? 15 : 5;
      acceptDeadline = new Date(new Date(order.createdAt).getTime() + deadlineMinutes * 60 * 1000).toISOString();
    }
  }

  return {
    ...order,
    _id: order.id,
    store: order.store ? normalizeStore(order.store) : order.storeId,
    storeId: order.storeId,
    items: Array.isArray(order.items) ? order.items : [],
    cancelledBy: order.cancelledBy || {},
    acceptDeadline
  };
}

function normalizeCustomer(customer) {
  if (!customer) return null;
  return {
    ...customer,
    _id: customer.id,
    metrics: customer.metrics || {},
    riskSignals: Array.isArray(customer.riskSignals) ? customer.riskSignals : []
  };
}

function normalizeSettlement(settlement) {
  if (!settlement) return null;
  return {
    ...settlement,
    _id: settlement.id,
    store: settlement.store ? normalizeStore(settlement.store) : settlement.storeId,
    storeId: settlement.storeId,
    admin: settlement.admin ? normalizeAdmin(settlement.admin) : settlement.adminId,
    adminId: settlement.adminId,
    feesBreakdown: settlement.feesBreakdown || {}
  };
}

function normalizeRefund(refund) {
  if (!refund) return null;
  return {
    ...refund,
    _id: refund.id,
    order: refund.order ? normalizeOrder(refund.order) : refund.orderId,
    orderId: refund.orderId,
    rawResponse: refund.rawResponse || {}
  };
}

module.exports = {
  normalizeStore,
  normalizeAdmin,
  normalizeOrder,
  normalizeCustomer,
  normalizeSettlement,
  normalizeRefund
};
