import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { VARIANT_IMAGE_MODULE } from "../../../../../modules/variant-images"
import VariantImageModuleService from "../../../../../modules/variant-images/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { variantId } = req.params as { variantId?: string }

  if (!variantId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "variantId path parameter is required"
    )
  }

  const variantImageModuleService = req.scope.resolve(
    VARIANT_IMAGE_MODULE
  ) as VariantImageModuleService

  const images =
    await variantImageModuleService.listVariantImagesForVariant(
      variantId
    )

  res.json({
    variant_id: variantId,
    variant_images: images,
  })
}

