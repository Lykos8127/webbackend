"use strict"

import { model } from "@medusajs/framework/utils"

/**
 * Stores image metadata that belongs to a specific product variant.
 * This lives in its own module so we can manage it without touching the core product module.
 */
const VariantImage = model.define(
  { name: "VariantImage", tableName: "variant_image" },
  {
    id: model.id({ prefix: "varimg" }).primaryKey(),
    variant_id: model.text(),
    url: model.text(),
    rank: model.number().default(0),
    metadata: model.json().nullable(),
  }
).indexes([
  {
    name: "IDX_variant_image_variant_rank",
    on: ["variant_id", "rank"],
    unique: false,
    where: "deleted_at IS NULL",
  },
  {
    name: "IDX_variant_image_variant_url_unique",
    on: ["variant_id", "url"],
    unique: false,
    where: "deleted_at IS NULL",
  },
])

export default VariantImage

