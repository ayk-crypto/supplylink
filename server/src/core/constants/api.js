import env from "../../config/env.js";

const API_INFO = {
  prefix: env.API_PREFIX,
  version: env.API_VERSION,
  basePath: `${env.API_PREFIX}/${env.API_VERSION}`
};

export default API_INFO;
