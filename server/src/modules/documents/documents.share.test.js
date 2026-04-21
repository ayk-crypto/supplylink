import assert from "node:assert/strict";
import test from "node:test";
import { getShareStatus, mapShareSummary } from "./documents.share.service.js";

test("mapShareSummary returns active share metadata when share is valid", () => {
  const summary = mapShareSummary({
    id: "share-1",
    document_type: "invoice",
    public_token: "secure-token-123456",
    sent_at: "2026-04-22T08:00:00.000Z",
    first_viewed_at: null,
    last_viewed_at: null,
    view_count: "2",
    expires_at: "2099-04-22T08:00:00.000Z",
    revoked_at: null,
    created_at: "2026-04-22T07:00:00.000Z",
    updated_at: "2026-04-22T08:00:00.000Z"
  });

  assert.equal(summary.status, "active");
  assert.equal(summary.isActive, true);
  assert.equal(summary.viewCount, 2);
  assert.match(summary.publicUrl, /\/share\/secure-token-123456$/);
});

test("getShareStatus marks revoked shares ahead of expiry", () => {
  const status = getShareStatus({
    revoked_at: "2026-04-22T08:00:00.000Z",
    expires_at: "2099-04-22T08:00:00.000Z"
  });

  assert.equal(status, "revoked");
});

test("getShareStatus marks expired shares when expiry is in the past", () => {
  const status = getShareStatus({
    revoked_at: null,
    expires_at: "2020-01-01T00:00:00.000Z"
  });

  assert.equal(status, "expired");
});

test("mapShareSummary returns null for missing share rows", () => {
  assert.equal(mapShareSummary(null), null);
});
