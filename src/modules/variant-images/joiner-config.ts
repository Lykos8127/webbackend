import { defineJoinerConfig } from "@medusajs/framework/utils"
import VariantImage from "./models/variant-image"

export const joinerConfig = defineJoinerConfig("variantImage", {
  models: [VariantImage],
  primaryKeys: ["id"],
  alias: [
    {
      name: ["variant_image", "variant_images"],
      entity: "VariantImage",
      args: {
        methodSuffix: "VariantImages",
      },
    },
  ],
})

