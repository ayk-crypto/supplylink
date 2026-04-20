import { request } from "./httpClient.js";

async function getSystemOverview() {
  return request("/system/overview");
}

export { getSystemOverview };
