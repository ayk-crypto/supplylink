const SUBSCRIPTION_PLANS = {
  free: {
    code: "free",
    label: "Free",
    maxCustomers: 30,
    maxInvoicesPerMonth: 50
  },
  basic: {
    code: "basic",
    label: "Basic",
    maxCustomers: 500,
    maxInvoicesPerMonth: null
  },
  pro: {
    code: "pro",
    label: "Pro",
    maxCustomers: null,
    maxInvoicesPerMonth: null
  }
};

const SUBSCRIPTION_PLAN_CODES = Object.keys(SUBSCRIPTION_PLANS);
const SUBSCRIPTION_STATUSES = ["trial", "active", "expired", "cancelled"];
const TRIAL_LENGTH_DAYS = 30;
const UPGRADE_LENGTH_DAYS = 30;

function getPlanConfig(planCode) {
  return SUBSCRIPTION_PLANS[planCode] || SUBSCRIPTION_PLANS.free;
}

export {
  getPlanConfig,
  SUBSCRIPTION_PLAN_CODES,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_STATUSES,
  TRIAL_LENGTH_DAYS,
  UPGRADE_LENGTH_DAYS
};
