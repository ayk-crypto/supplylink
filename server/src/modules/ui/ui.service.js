import { findVendorById } from "../vendors/vendors.repository.js";
import { getVendorSummaryReport } from "../reports/reports.service.js";
import { getNotificationPanelSummary } from "../notifications/notifications.service.js";
import {
  getCategoryLookup,
  getCustomerLookup,
  getLookupOptions,
  getProductLookup
} from "../lookups/lookups.service.js";
import {
  listRecentDashboardInvoices,
  listRecentDashboardOrders
} from "./ui.repository.js";

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
  const customer = order.customer || {
    id: order.customer_id,
    fullName: order.customer_full_name,
    companyName: order.customer_company_name,
    email: order.customer_email
  };

  return {
    id: order.id,
    label: order.orderNumber || order.order_number,
    status: order.status,
    date: order.orderDate || order.order_date,
    deliveryDate: order.deliveryDate || order.delivery_date,
    grandTotal: Number(order.grandTotal || order.grand_total || 0),
    customer: customer.id
      ? {
          id: customer.id,
          label: customer.companyName || customer.fullName,
          secondaryText: customer.email || null
        }
      : null
  };
}

function mapDashboardInvoice(invoice) {
  const customer = invoice.customer || {
    id: invoice.customer_id,
    fullName: invoice.customer_full_name,
    companyName: invoice.customer_company_name,
    email: invoice.customer_email
  };

  return {
    id: invoice.id,
    label: invoice.invoiceNumber || invoice.invoice_number,
    status: invoice.status,
    issueDate: invoice.issueDate || invoice.issue_date,
    dueDate: invoice.dueDate || invoice.due_date,
    grandTotal: Number(invoice.grandTotal || invoice.grand_total || 0),
    balanceDue: Number(invoice.balanceDue || invoice.balance_due || 0),
    customer: customer.id
      ? {
          id: customer.id,
          label: customer.companyName || customer.fullName,
          secondaryText: customer.email || null
        }
      : null
  };
}

async function getVendorUiDashboard(vendorId, userId, options = {}) {
  const includeNotifications = options.includeNotifications !== false;
  const dashboardQueries = [
    findVendorById(vendorId),
    getVendorSummaryReport(vendorId, {}),
    listRecentDashboardOrders(vendorId, 5),
    listRecentDashboardInvoices(vendorId, 5)
  ];

  if (includeNotifications) {
    dashboardQueries.push(getNotificationPanelSummary(userId, { limit: 5 }));
  }

  const [vendor, summary, recentOrders, recentInvoices, notifications] =
    await Promise.all(dashboardQueries);

  const result = {
    vendor: mapVendorSummary(vendor),
    metrics: summary.metrics,
    receivables: {
      outstanding: Number(summary.metrics.outstandingReceivables || 0),
      invoiceTotal: Number(summary.metrics.invoiceTotal || 0),
      paymentTotal: Number(summary.metrics.paymentTotal || 0)
    },
    recent: {
      orders: recentOrders.map(mapDashboardOrder),
      invoices: recentInvoices.map(mapDashboardInvoice)
    }
  };

  if (includeNotifications) {
    result.notifications = notifications;
  }

  return result;
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
  return getNotificationPanelSummary(userId, { limit });
}

export { getCreateContext, getNotificationPanel, getVendorUiDashboard };
