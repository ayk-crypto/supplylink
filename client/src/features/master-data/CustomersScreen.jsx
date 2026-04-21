import { useCallback, useMemo, useState } from "react";
import {
  createCustomer,
  listCustomers,
  updateCustomer
} from "../../services/masterDataApi.js";
import AttachmentBadge from "../attachments/AttachmentBadge.jsx";
import { useAttachmentCounts } from "../attachments/useAttachmentCounts.js";
import { useToast } from "../feedback/toastContext.js";
import { useAppSettings } from "../system/settingsContext.js";
import { getDefaultPageSize } from "../system/settingsFormat.js";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  Pagination,
  TableScroll,
  Toolbar
} from "../../components/ui/ResourceScreens.jsx";
import StatusPill from "../../components/ui/StatusPill.jsx";
import CustomerForm from "./CustomerForm.jsx";
import { getApiErrorMessage } from "./resourceUtils.js";
import { useResourceDirectory } from "./useResourceDirectory.js";

function CustomersScreen({ navigate }) {
  const { showToast } = useToast();
  const { settings } = useAppSettings();
  const pageSize = getDefaultPageSize(settings, 10);
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [editingRecord, setEditingRecord] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const query = useMemo(
    () => ({
      page,
      pageSize,
      search,
      status
    }),
    [page, pageSize, search, status]
  );
  const loadCustomers = useCallback((params, options) => listCustomers(params, options), []);
  const handleListError = useCallback(
    (requestError) => {
      showToast({
        message: getApiErrorMessage(requestError, "Customers could not be loaded."),
        title: "Customers unavailable",
        tone: "error"
      });
    },
    [showToast]
  );
  const { data, error, isLoading, reload } = useResourceDirectory(loadCustomers, query, {
    onError: handleListError
  });
  const items = useMemo(() => data?.items || [], [data]);
  const customerIds = useMemo(() => items.map((record) => record.customer.id), [items]);
  const attachmentCounts = useAttachmentCounts("customers", customerIds);
  const hasFilters = Boolean(search || status);

  function submitSearch(event) {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
  }

  async function saveCustomer(payload) {
    if (editingRecord) {
      await updateCustomer(editingRecord.customer.id, payload);
      showToast({
        message: "Customer changes were saved.",
        title: "Customer updated"
      });
    } else {
      await createCustomer(payload);
      showToast({
        message: "The customer is ready to use.",
        title: "Customer created"
      });
    }

    setEditingRecord(null);
    setIsCreating(false);
    reload();
  }

  return (
    <div className="resource-page">
      <PageHeader
        action={
          <button className="primary-button" onClick={() => setIsCreating(true)} type="button">
            New customer
          </button>
        }
        description="Your customer book — search contacts, check status, and jump into any account."
        eyebrow="Customers"
        title="Customer directory"
      />

      <Toolbar onSubmit={submitSearch}>
        <input
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Search name, company, email, phone"
          type="search"
          value={searchDraft}
        />
        <select
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          value={status}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blocked">Blocked</option>
        </select>
        <button className="secondary-button" type="submit">
          Search
        </button>
      </Toolbar>

      <ErrorState message={error} onRetry={reload} />
      {isLoading && !items.length ? <LoadingSkeleton label="Loading customers" rows={5} /> : null}
      {!isLoading && !items.length ? (
        <EmptyState>
          {hasFilters ? "No customers match the current filters." : "No customers found."}
        </EmptyState>
      ) : null}

      {items.length ? (
        <TableScroll>
        <div className="resource-table">
          <div className="resource-table-head customer-grid">
            <span>Name</span>
            <span>Email</span>
            <span>Phone</span>
            <span>Status</span>
            <span />
          </div>
          {items.map((record) => (
            <article className="resource-row customer-grid" key={record.customer.id}>
              <div>
                <strong>
                  <button
                    className="link-button"
                    onClick={() => navigate(`/customers/${record.customer.id}`)}
                    type="button"
                  >
                    {record.customer.fullName}
                  </button>
                  <AttachmentBadge
                    count={attachmentCounts[record.customer.id]}
                    onClick={() => navigate(`/customers/${record.customer.id}`)}
                  />
                </strong>
                <span>{record.customer.companyName || record.relationship?.accountCode || "No company"}</span>
              </div>
              <span>{record.customer.email || "No email"}</span>
              <span>{record.customer.phone || "No phone"}</span>
              <StatusPill kind="relationship" status={record.relationship?.status || "active"} />
              <div className="button-row">
                <button
                  className="secondary-button compact"
                  onClick={() => navigate(`/customers/${record.customer.id}`)}
                  type="button"
                >
                  View
                </button>
                <button
                  className="secondary-button compact"
                  onClick={() => setEditingRecord(record)}
                  type="button"
                >
                  Edit
                </button>
              </div>
            </article>
          ))}
        </div>
        </TableScroll>
      ) : null}

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      {isCreating || editingRecord ? (
        <CustomerForm
          mode={editingRecord ? "edit" : "create"}
          onCancel={() => {
            setEditingRecord(null);
            setIsCreating(false);
          }}
          onSave={saveCustomer}
          record={editingRecord}
        />
      ) : null}
    </div>
  );
}

export default CustomersScreen;
