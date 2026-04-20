import { sendSuccess } from "../../core/http/apiResponse.js";
import { getCustomerLedger, getLedgerDirectory } from "./ledger.service.js";

async function list(request, response) {
  const result = await getLedgerDirectory(request.access.vendorId, request.query);

  sendSuccess(response, {
    message: "Ledger entries loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function getCustomerStatement(request, response) {
  const result = await getCustomerLedger(request.access.vendorId, request.params.customerId);

  sendSuccess(response, {
    message: "Customer ledger loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId,
      customerId: request.params.customerId
    }
  });
}

export { getCustomerStatement, list };
