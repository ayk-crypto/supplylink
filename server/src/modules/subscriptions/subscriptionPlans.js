const SUBSCRIPTION_PLANS = {
  free: {
    code: "free",
    displayName: "Free",
    label: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    annualFreeMonths: 3,
    maxCustomers: 30,
    maxInvoicesPerMonth: 50,
    isActive: true
  },
  basic: {
    code: "basic",
    displayName: "Basic",
    label: "Basic",
    monthlyPrice: 0,
    annualPrice: 0,
    annualFreeMonths: 3,
    maxCustomers: 500,
    maxInvoicesPerMonth: null,
    isActive: true
  },
  pro: {
    code: "pro",
    displayName: "Pro",
    label: "Pro",
    monthlyPrice: 0,
    annualPrice: 0,
    annualFreeMonths: 3,
    maxCustomers: null,
    maxInvoicesPerMonth: null,
    isActive: true
  }
};

const SUBSCRIPTION_PLAN_CODES = Object.keys(SUBSCRIPTION_PLANS);
const SUBSCRIPTION_STATUSES = ["trial", "active", "expired", "cancelled"];
const BILLING_CYCLES = ["monthly", "annual"];
const TRIAL_LENGTH_DAYS = 30;
const UPGRADE_LENGTH_DAYS = 30;

function normalizeNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

function mapPlanConfig(row) {
  if (!row) {
    return null;
  }

  const fallback = SUBSCRIPTION_PLANS[row.plan_code] || {};

  return {
    code: row.plan_code,
    displayName: row.display_name || fallback.displayName || row.plan_code,
    label: row.display_name || fallback.label || row.plan_code,
    monthlyPrice: normalizeNumber(row.monthly_price) ?? fallback.monthlyPrice ?? 0,
    annualPrice: normalizeNumber(row.annual_price) ?? fallback.annualPrice ?? 0,
    annualFreeMonths: normalizeNumber(row.annual_free_months) ?? fallback.annualFreeMonths ?? 3,
    maxCustomers: normalizeNumber(row.max_customers),
    maxInvoicesPerMonth: normalizeNumber(row.max_invoices_per_month),
    isActive: row.is_active ?? fallback.isActive ?? true,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

function getFallbackPlanConfig(planCode) {
  return SUBSCRIPTION_PLANS[planCode] || SUBSCRIPTION_PLANS.free;
}

function getPlanConfig(planCode, dbPlan = null) {
  return mapPlanConfig(dbPlan) || getFallbackPlanConfig(planCode);
}

export {
  BILLING_CYCLES,
  getPlanConfig,
  getFallbackPlanConfig,
  mapPlanConfig,
  SUBSCRIPTION_PLAN_CODES,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_STATUSES,
  TRIAL_LENGTH_DAYS,
  UPGRADE_LENGTH_DAYS
};
