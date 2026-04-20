import { request } from "./httpClient.js";
import { toQueryString } from "./queryString.js";

async function listLedgerEntries(params = {}, options = {}) {
  return request(`/ledger${toQueryString(params)}`, options);
}

async function getCustomerLedger(customerId, options = {}) {
  return request(`/ledger/customer/${customerId}`, options);
}

export { getCustomerLedger, listLedgerEntries };
