import { findVendorById } from "../vendors/vendors.repository.js";
import { getInvoiceReport, getOrderReport, getVendorSummaryReport } from "../reports/reports.service.js";
import {
  getNotificationDirectory,
  getUnreadNotificationCount
} from "../notifications/notifications.service.js";
import {
  getCategoryLookup,
  getCustomerLookup,
  getLookupOptions,
  getProductLookup
} from "../lookups/lookups.service.js";

function mapVendorSummary(vendor) {
  if (!vendor) {
    return null;
  }

  return {
    id: vendor.id,
    label: vendor.display_name,
    legalName: vendor.legal_name,
    status: vendor.status,
    currencyCode: vendor.currency_code,
    timezone: vendor.timezone,
    contactEmail: vendor.contact_email,
    contactPhone: vendor.contact_phone
  };
}

function mapDashboardOrder(order) {
  return {
    id: order.id,
    label: order.orderNumber,
    status: order.status,
    date: order.orderDate,
    deliveryDate: order.deliveryDate,
    grandTotal: Number(order.grandTotal || 0),
    customer: order.customer
      ? {
          id: order.customer.id,
          label: order.customer.companyName || order.customer.fullName,
          secondaryText: order.customer.email || null
        }
      : null
  };
}

function mapDashboardInvoice(invoice) {
  return {
    id: invoice.id,
    label: invoice.invoiceNumber,
    status: invoice.status,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    grandTotal: Number(invoice.grandTotal || 0),
    balanceDue: Number(invoice.balanceDue || 0),
    customer: invoice.customer
      ? {
          id: invoice.customer.id,
          label: invoice.customer.companyName || invoice.customer.fullName,
          secondaryText: invoice.customer.email || null
        }
      : null
  };
}

async function getVendorUiDashboard(vendorId, userId) {
  const [vendor, summary, recentOrders, recentInvoices, notifications, unreadNotifications] =
    await Promise.all([
      findVendorById(vendorId),
      getVendorSummaryReport(vendorId, {}),
      getOrderReport(vendorId, { page: 1, pageSize: 5 }),
      getInvoiceReport(vendorId, { page: 1, pageSize: 5 }),
      getNotificationDirectory(userId, { page: 1, pageSize: 5 }),
      getUnreadNotificationCount(userId)
    ]);

  return {
    vendor: mapVendorSummary(vendor),
    metrics: summary.metrics,
    receivables: {
      outstanding: Number(summary.metrics.outstandingReceivables || 0),
      invoiceTotal: Number(summary.metrics.invoiceTotal || 0),
      paymentTotal: Number(summary.metrics.paymentTotal || 0)
    },
    recent: {
      orders: recentOrders.items.map(mapDashboardOrder),
      invoices: recentInvoices.items.map(mapDashboardInvoice)
    },
    notifications: {
      unreadCount: unreadNotifications.unreadCount,
      latest: notifications.items
    }
  };
}

async function getCreateContext(vendorId, query) {
  const limit = query.limit || 10;
  const options = getLookupOptions();
  const [vendor, customers, products, categories] = await Promise.all([
    findVendorById(vendorId),
    getCustomerLookup(vendorId, { limit }),
    getProductLookup(vendorId, { limit, status: "active" }),
    getCategoryLookup(vendorId, { limit })
  ]);

  return {
    vendor: mapVendorSummary(vendor),
    lookups: {
      recentCustomers: customers.items,
      activeProducts: products.items,
      categories: categories.items
    },
    options: {
      quotationStatuses: options.quotationStatuses,
      orderStatuses: options.orderStatuses,
      invoiceStatuses: options.invoiceStatuses,
      paymentMethods: options.paymentMethods
    },
    limits: {
      lookupLimit: limit
    }
  };
}

async function getNotificationPanel(userId, query) {
  const limit = query.limit || 10;
  const [notifications, unreadNotifications] = await Promise.all([
    getNotificationDirectory(userId, { page: 1, pageSize: limit }),
    getUnreadNotificationCount(userId)
  ]);

  return {
    unreadCount: unreadNotifications.unreadCount,
    latest: notifications.items,
    limit
  };
}

export { getCreateContext, getNotificationPanel, getVendorUiDashboard };
