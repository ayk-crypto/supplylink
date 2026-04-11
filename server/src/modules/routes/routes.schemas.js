import { z } from "zod";

const uuidParam = z.string().uuid();
const jsonRecordSchema = z.record(z.string(), z.unknown());
const routeStatusEnum = z.enum(["draft", "planned", "in_progress", "completed", "cancelled"]);
const stopStatusEnum = z.enum(["pending", "completed", "skipped"]);

const routeIdParamsSchema = z.object({
  routeId: uuidParam
});

const routeStopParamsSchema = z.object({
  routeId: uuidParam,
  stopId: uuidParam
});

const routeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  status: routeStatusEnum.optional(),
  routeDate: z.string().trim().date().optional(),
  driverName: z.string().trim().min(1).max(150).optional(),
  vehicleLabel: z.string().trim().min(1).max(100).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  vendorId: uuidParam.optional()
});

const routeCreateBodySchema = z.object({
  name: z.string().trim().min(2).max(150),
  routeDate: z.string().trim().date().nullable().optional(),
  status: routeStatusEnum.optional(),
  driverUserId: uuidParam.nullable().optional(),
  vehicleLabel: z.string().trim().min(1).max(100).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  metadata: jsonRecordSchema.optional()
});

const routeUpdateBodySchema = z
  .object({
    name: z.string().trim().min(2).max(150).optional(),
    routeDate: z.string().trim().date().nullable().optional(),
    status: routeStatusEnum.optional(),
    driverUserId: uuidParam.nullable().optional(),
    vehicleLabel: z.string().trim().min(1).max(100).nullable().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    metadata: jsonRecordSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one editable field must be provided"
  });

const routeStopCreateBodySchema = z.object({
  sequenceNumber: z.coerce.number().int().min(1),
  customerId: uuidParam,
  orderId: uuidParam.nullable().optional(),
  stopType: z.string().trim().min(1).max(30).nullable().optional(),
  status: stopStatusEnum.optional(),
  plannedArrivalAt: z.string().trim().datetime({ offset: true }).nullable().optional(),
  actualArrivalAt: z.string().trim().datetime({ offset: true }).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  metadata: jsonRecordSchema.optional()
});

const routeStopUpdateBodySchema = z
  .object({
    sequenceNumber: z.coerce.number().int().min(1).optional(),
    customerId: uuidParam.optional(),
    orderId: uuidParam.nullable().optional(),
    stopType: z.string().trim().min(1).max(30).nullable().optional(),
    status: stopStatusEnum.optional(),
    plannedArrivalAt: z.string().trim().datetime({ offset: true }).nullable().optional(),
    actualArrivalAt: z.string().trim().datetime({ offset: true }).nullable().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    metadata: jsonRecordSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one editable field must be provided"
  });

export {
  routeCreateBodySchema,
  routeIdParamsSchema,
  routeQuerySchema,
  routeStatusEnum,
  routeStopCreateBodySchema,
  routeStopParamsSchema,
  routeStopUpdateBodySchema,
  routeUpdateBodySchema,
  stopStatusEnum
};
