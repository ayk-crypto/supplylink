import { getApiErrorMessage, toMoney } from "../master-data/resourceUtils.js";
import { formatCustomer } from "../transactions/transactionUtils.js";

const orderStatuses = ["draft", "confirmed", "packed", "dispatched", "delivered", "cancelled"];
const invoiceStatuses = ["draft", "issued", "partially_paid", "paid", "void"];

function toNumber(value) {
  return Number(value || 0);
}

function getPaidFromInvoice(invoice) {
  return Math.max(toNumber(invoice.grandTotal) - toNumber(invoice.balanceDue), 0);
}

function cleanReportParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

function formatReportError(error, fallback) {
  return getApiErrorMessage(error, fallback);
}

export {
  cleanReportParams,
  formatCustomer,
  formatReportError,
  getPaidFromInvoice,
  invoiceStatuses,
  orderStatuses,
  toMoney,
  toNumber
};
