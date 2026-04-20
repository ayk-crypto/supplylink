import { useEffect, useState } from "react";
import { listAttachmentsForEntity } from "../../services/attachmentApi.js";

function readCount(response) {
  const data = response?.data;
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data?.items)) return data.items.length;
  if (Array.isArray(response?.items)) return response.items.length;
  return 0;
}

function useAttachmentCounts(entityType, ids) {
  const [counts, setCounts] = useState({});
  const idKey = Array.isArray(ids) ? ids.join(",") : "";

  useEffect(() => {
    if (!entityType || !idKey) {
      setCounts({});
      return undefined;
    }

    const idList = idKey.split(",").filter(Boolean);
    if (!idList.length) {
      setCounts({});
      return undefined;
    }

    const controller = new AbortController();
    let cancelled = false;
    const next = {};

    Promise.all(
      idList.map((id) =>
        listAttachmentsForEntity(entityType, id, { signal: controller.signal })
          .then((response) => {
            next[id] = readCount(response);
          })
          .catch(() => {
            // Silent: never block table rendering on attachment count failures
          })
      )
    ).then(() => {
      if (!cancelled) {
        setCounts(next);
      }
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [entityType, idKey]);

  return counts;
}

export { useAttachmentCounts };
