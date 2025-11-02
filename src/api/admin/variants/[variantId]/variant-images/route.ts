import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { VARIANT_IMAGE_MODULE } from "../../../../../modules/variant-images"
import VariantImageModuleService from "../../../../../modules/variant-images/service"
import type { VariantImageUpsertInput } from "../../../../../modules/variant-images/types"

type VariantImagePayload = VariantImageUpsertInput

type PostVariantImagesBody = {
  images?: VariantImagePayload[]
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { variantId } = req.params as { variantId: string }

  const variantImageModuleService = req.scope.resolve(
    VARIANT_IMAGE_MODULE
  ) as VariantImageModuleService

  const images =
    await variantImageModuleService.listVariantImagesForVariant(
      variantId
    )

  res.json({
    variant_images: images,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { variantId } = req.params as { variantId: string }
  const body = (req.body || {}) as PostVariantImagesBody

  if (!variantId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "variantId path parameter is required"
    )
  }

  if (!Array.isArray(body.images)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "images must be an array"
    )
  }

  const sanitized = body.images
    .map((image) => sanitizeVariantImagePayload(image))
    .filter((image): image is VariantImagePayload => !!image)

  const variantImageModuleService = req.scope.resolve(
    VARIANT_IMAGE_MODULE
  ) as VariantImageModuleService

  const updated =
    await variantImageModuleService.replaceVariantImages(
      variantId,
      sanitized
    )

  res.json({
    variant_images: updated,
  })
}

function sanitizeVariantImagePayload(
  image: VariantImagePayload
): VariantImagePayload | undefined {
  if (!image) {
    return undefined
  }

  const url = typeof image.url === "string" ? image.url.trim() : ""

  if (!url) {
    return undefined
  }

  const payload: VariantImagePayload = {
    url,
  }

  if (typeof image.id === "string" && image.id.trim()) {
    payload.id = image.id.trim()
  }

  if (typeof image.rank === "number" && Number.isFinite(image.rank)) {
    payload.rank = image.rank
  }

  if (
    image.metadata &&
    typeof image.metadata === "object" &&
    !Array.isArray(image.metadata)
  ) {
    payload.metadata = image.metadata
  }

  return payload
}
