import { toMoney } from "../master-data/resourceUtils.js";
import { formatCustomer } from "../transactions/transactionUtils.js";

function toNumber(value) {
  return Number(value || 0);
}

function getEntryDebit(entry) {
  return entry.entryType === "debit" ? toNumber(entry.amount) : 0;
}

function getEntryCredit(entry) {
  return entry.entryType === "credit" ? toNumber(entry.amount) : 0;
}

function getLedgerReference(entry) {
  if (entry.invoice?.invoiceNumber) {
    return entry.invoice.invoiceNumber;
  }

  if (entry.payment?.referenceNumber) {
    return entry.payment.referenceNumber;
  }

  if (entry.payment?.paymentMethod) {
    return entry.payment.paymentMethod;
  }

  return entry.notes || entry.id;
}

function getCustomerLabel(record) {
  if (record?.customer) {
    return formatCustomer(record.customer);
  }

  return formatCustomer(record);
}

export {
  getCustomerLabel,
  getEntryCredit,
  getEntryDebit,
  getLedgerReference,
  toMoney,
  toNumber
};
