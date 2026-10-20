import { z } from "zod";

export const ItemSchema = z.object({
  name: z.string(),
  qty: z.number(),
  unit_price: z.number().nullable(),
});

export const ExtractionSchema = z.object({
  customer_name: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  area: z.string().nullable(),
  items: z.array(ItemSchema),
  advance: z.number().nullable(),
  confidence: z.object({
    customer_name: z.number().min(0).max(1),
    phone: z.number().min(0).max(1),
    address: z.number().min(0).max(1),
    items: z.number().min(0).max(1),
    advance: z.number().min(0).max(1),
  }),
});

export type Extraction = z.infer<typeof ExtractionSchema>;
