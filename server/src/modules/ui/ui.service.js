import { getNotificationPanelSummary } from "../notifications/notifications.service.js";
import {
  getCategoryLookup,
  getCustomerLookup,
  getLookupOptions,
  getProductLookup
} from "../lookups/lookups.service.js";
import { getVendorSummaryReport } from "../reports/reports.service.js";
import { findVendorById } from "../vendors/vendors.repository.js";
import {
  getDashboardAggregates,
  listDashboardOverdueInvoices,
  listDashboardTopCustomers,
  listRecentDashboardInvoices,
  listRecentDashboardOrders,
  listRecentDashboardPayments,
  listRecentDashboardQuotations
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

function mapDashboardCustomer(row) {
  if (!row?.id) {
    return null;
  }

  return {
    id: row.id,
    label: row.companyName || row.fullName || "Customer",
    secondaryText: row.email || null
  };
}

function mapDashboardOrder(order) {
  return {
    id: order.id,
    label: order.orderNumber || order.order_number,
    status: order.status,
    date: order.orderDate || order.order_date,
    deliveryDate: order.deliveryDate || order.delivery_date,
    grandTotal: Number(order.grandTotal || order.grand_total || 0),
    customer: mapDashboardCustomer({
      id: order.customer?.id || order.customer_id,
      fullName: order.customer?.fullName || order.customer_full_name,
      companyName: order.customer?.companyName || order.customer_company_name,
      email: order.customer?.email || order.customer_email
    })
  };
}

function mapDashboardQuotation(quotation) {
  return {
    id: quotation.id,
    label: quotation.quoteNumber || quotation.quote_number,
    status: quotation.status,
    issueDate: quotation.issueDate || quotation.issue_date,
    expiryDate: quotation.expiryDate || quotation.expiry_date,
    grandTotal: Number(quotation.grandTotal || quotation.grand_total || 0),
    customer: mapDashboardCustomer({
      id: quotation.customer?.id || quotation.customer_id,
      fullName: quotation.customer?.fullName || quotation.customer_full_name,
      companyName: quotation.customer?.companyName || quotation.customer_company_name,
      email: quotation.customer?.email || quotation.customer_email
    })
  };
}

function mapDashboardInvoice(invoice) {
  return {
    id: invoice.id,
    label: invoice.invoiceNumber || invoice.invoice_number,
    status: invoice.status,
    issueDate: invoice.issueDate || invoice.issue_date,
    dueDate: invoice.dueDate || invoice.due_date,
    grandTotal: Number(invoice.grandTotal || invoice.grand_total || 0),
    balanceDue: Number(invoice.balanceDue || invoice.balance_due || 0),
    customer: mapDashboardCustomer({
      id: invoice.customer?.id || invoice.customer_id,
      fullName: invoice.customer?.fullName || invoice.customer_full_name,
      companyName: invoice.customer?.companyName || invoice.customer_company_name,
      email: invoice.customer?.email || invoice.customer_email
    })
  };
}

function mapDashboardPayment(payment) {
  return {
    id: payment.id,
    label: payment.paymentReference || payment.payment_reference || "Payment",
    status: "recorded",
    paymentMethod: payment.paymentMethod || payment.method || null,
    paymentDate: payment.paymentDate || payment.payment_date || payment.created_at,
    amount: Number(payment.amount || 0),
    invoice: payment.invoice_id
      ? {
          id: payment.invoice_id,
          invoiceNumber: payment.invoice_number || null
        }
      : null,
    customer: mapDashboardCustomer({
      id: payment.customer?.id || payment.customer_id,
      fullName: payment.customer?.fullName || payment.customer_full_name,
      companyName: payment.customer?.companyName || payment.customer_company_name,
      email: payment.customer?.email || payment.customer_email
    })
  };
}

function mapRecentActivityItem(type, item) {
  switch (type) {
    case "quotation":
      return {
        id: item.id,
        type,
        label: item.label,
        status: item.status,
        amount: item.grandTotal,
        date: item.issueDate || null,
        customer: item.customer
      };
    case "order":
      return {
        id: item.id,
        type,
        label: item.label,
        status: item.status,
        amount: item.grandTotal,
        date: item.date || null,
        customer: item.customer
      };
    case "invoice":
      return {
        id: item.id,
        type,
        label: item.label,
        status: item.status,
        amount: item.grandTotal,
        secondaryAmount: item.balanceDue,
        date: item.issueDate || null,
        customer: item.customer
      };
    default:
      return {
        id: item.id,
        type,
        label: item.label,
        status: item.status,
        amount: item.amount,
        date: item.paymentDate || null,
        customer: item.customer
      };
  }
}

function mapTopCustomer(customer) {
  return {
    id: customer.id,
    label: customer.company_name || customer.full_name || "Customer",
    secondaryText: customer.email || null,
    billedTotal: Number(customer.billed_total || 0),
    collectedTotal: Number(customer.collected_total || 0),
    outstandingTotal: Number(customer.outstanding_total || 0),
    invoiceCount: Number(customer.invoice_count || 0),
    paymentCount: Number(customer.payment_count || 0),
    lastPaymentDate: customer.last_payment_date || null
  };
}

function mapOverdueInvoice(invoice) {
  const mapped = mapDashboardInvoice(invoice);
  const dueDate = mapped.dueDate ? new Date(mapped.dueDate) : null;
  const today = new Date();
  let daysOverdue = 0;

  if (dueDate instanceof Date && !Number.isNaN(dueDate.getTime())) {
    const startOfDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    daysOverdue = Math.max(
      0,
      Math.round((startOfToday.getTime() - startOfDueDate.getTime()) / (1000 * 60 * 60 * 24))
    );
  }

  return {
    ...mapped,
    daysOverdue
  };
}

function numberMap(value = {}) {
  return Object.fromEntries(
    Object.entries(value || {}).map(([key, count]) => [key, Number(count || 0)])
  );
}

function mapDashboardAggregates(row) {
  return {
    inventory: {
      productCount: Number(row?.inventory_product_count || 0),
      totalStockQuantity: Number(row?.inventory_total_stock_quantity || 0),
      lowStockProductCount: Number(row?.inventory_low_stock_count || 0),
      negativeStockProductCount: Number(row?.inventory_negative_stock_count || 0)
    },
    orders: {
      total: Number(row?.orders_total_count || 0),
      byStatus: numberMap(row?.orders_by_status)
    },
    invoices: {
      total: Number(row?.invoices_total_count || 0),
      byStatus: numberMap(row?.invoices_by_status)
    },
    receivables: {
      openInvoiceCount: Number(row?.receivables_open_invoice_count || 0),
      outstandingTotal: Number(row?.receivables_outstanding_total || 0),
      overdueInvoiceCount: Number(row?.receivables_overdue_invoice_count || 0),
      overdueTotal: Number(row?.receivables_overdue_total || 0)
    }
  };
}

function buildSummaryCards(summary) {
  const metrics = summary.metrics;

  return {
    revenueCollected: Number(metrics.paymentTotal || 0),
    outstandingReceivables: Number(metrics.outstandingReceivables || 0),
    totalCustomers: Number(metrics.totalCustomers || 0),
    totalQuotations: Number(metrics.totalQuotations || 0),
    totalOrders: Number(metrics.totalOrders || 0),
    totalInvoices: Number(metrics.totalInvoices || 0)
  };
}

function sortRecentActivity(items) {
  return [...items].sort((left, right) => {
    const leftTime = left.date ? new Date(left.date).getTime() : 0;
    const rightTime = right.date ? new Date(right.date).getTime() : 0;
    return rightTime - leftTime;
  });
}

async function getVendorUiDashboard(vendorId, userId, options = {}) {
  const includeNotifications = options.includeNotifications !== false;
  const dashboardQueries = [
    findVendorById(vendorId),
    getVendorSummaryReport(vendorId, {}),
    getDashboardAggregates(vendorId),
    listRecentDashboardQuotations(vendorId, 5),
    listRecentDashboardOrders(vendorId, 5),
    listRecentDashboardInvoices(vendorId, 5),
    listRecentDashboardPayments(vendorId, 5),
    listDashboardOverdueInvoices(vendorId, 5),
    listDashboardTopCustomers(vendorId, 5)
  ];

  if (includeNotifications) {
    dashboardQueries.push(getNotificationPanelSummary(userId, { limit: 5 }));
  }

  const [
    vendor,
    summary,
    aggregates,
    recentQuotations,
    recentOrders,
    recentInvoices,
    recentPayments,
    overdueInvoices,
    topCustomers,
    notifications
  ] = await Promise.all(dashboardQueries);

  const mappedQuotations = recentQuotations.map(mapDashboardQuotation);
  const mappedOrders = recentOrders.map(mapDashboardOrder);
  const mappedInvoices = recentInvoices.map(mapDashboardInvoice);
  const mappedPayments = recentPayments.map(mapDashboardPayment);
  const recentActivity = sortRecentActivity([
    ...mappedQuotations.map((item) => mapRecentActivityItem("quotation", item)),
    ...mappedOrders.map((item) => mapRecentActivityItem("order", item)),
    ...mappedInvoices.map((item) => mapRecentActivityItem("invoice", item)),
    ...mappedPayments.map((item) => mapRecentActivityItem("payment", item))
  ]).slice(0, 10);

  const result = {
    vendor: mapVendorSummary(vendor),
    metrics: summary.metrics,
    summaryCards: buildSummaryCards(summary),
    receivables: {
      outstanding: Number(summary.metrics.outstandingReceivables || 0),
      invoiceTotal: Number(summary.metrics.invoiceTotal || 0),
      paymentTotal: Number(summary.metrics.paymentTotal || 0)
    },
    aggregates: mapDashboardAggregates(aggregates),
    recent: {
      quotations: mappedQuotations,
      orders: mappedOrders,
      invoices: mappedInvoices,
      payments: mappedPayments,
      activity: recentActivity
    },
    insights: {
      overdueInvoices: overdueInvoices.map(mapOverdueInvoice),
      topCustomers: topCustomers.map(mapTopCustomer),
      recentPayments: mappedPayments
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
