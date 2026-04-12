const LOOKUP_OPTION_GROUPS = {
  quotationStatuses: ["draft", "sent", "accepted", "rejected", "expired"],
  orderStatuses: ["draft", "confirmed", "packed", "dispatched", "delivered", "cancelled"],
  invoiceStatuses: ["draft", "issued", "partially_paid", "paid", "void"],
  routeStatuses: ["draft", "planned", "in_progress", "completed", "cancelled"],
  routeStopStatuses: ["pending", "completed", "skipped"],
  paymentMethods: ["cash", "bank_transfer", "card", "check", "mobile_money", "other"],
  subscriptionStatuses: ["trialing", "active", "past_due", "cancelled", "expired"],
  billingCycles: ["monthly", "quarterly", "yearly"],
  vendorStatuses: ["draft", "active", "suspended", "archived"]
};

export { LOOKUP_OPTION_GROUPS };
