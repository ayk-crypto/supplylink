import createPlaceholderModule from "../createPlaceholderModule.js";

const customersRoutes = createPlaceholderModule({
  key: "customers",
  label: "Customers",
  scope: "vendor",
  description: "Vendor-isolated customer views backed by shared customer master records and vendor relationships."
});

export default customersRoutes;
