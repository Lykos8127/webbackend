import { Module } from "@medusajs/framework/utils"
import VariantImageModuleService from "./service"

export const VARIANT_IMAGE_MODULE = "variantImage"

export default Module(VARIANT_IMAGE_MODULE, {
  service: VariantImageModuleService,
})

