import {
  MedusaError,
  MedusaService,
  generateEntityId,
  isDefined,
} from "@medusajs/framework/utils"
import type { Context, FindConfig } from "@medusajs/framework/types"
import VariantImage from "./models/variant-image"
import { joinerConfig } from "./joiner-config"
import type {
  VariantImageDTO,
  VariantImageUpsertInput,
} from "./types"

class VariantImageModuleService extends MedusaService({
  VariantImage,
}) {
  __joinerConfig() {
    return joinerConfig
  }

  async listVariantImagesForVariant(
    variantId: string,
    config: FindConfig<VariantImageDTO> = {},
    sharedContext: Context = {}
  ) {
    if (!variantId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "variantId must be provided"
      )
    }

    return await this.listVariantImages(
      { variant_id: variantId },
      this.decorateFindConfig_(config),
      sharedContext
    )
  }

  async deleteVariantImage(id: string, sharedContext: Context = {}) {
    if (!id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Variant image id is required"
      )
    }

    await this.deleteVariantImages([id], sharedContext)
  }

  async replaceVariantImages(
    variantId: string,
    images: VariantImageUpsertInput[] = [],
    sharedContext: Context = {}
  ) {
    if (!variantId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "variantId must be provided"
      )
    }

    const normalized = this.normalizeImages_(variantId, images)

    const existing = await this.listVariantImages(
      { variant_id: variantId },
      {},
      sharedContext
    )

    if (existing.length) {
      await this.deleteVariantImages(
        existing.map((image) => image.id),
        sharedContext
      )
    }

    if (normalized.length) {
      await this.createVariantImages(normalized, sharedContext)
    }

    return await this.listVariantImagesForVariant(
      variantId,
      {},
      sharedContext
    )
  }

  protected decorateFindConfig_(
    config: FindConfig<VariantImageDTO> = {}
  ): FindConfig<VariantImageDTO> {
    return {
      ...config,
      order: {
        rank: "ASC",
        created_at: "ASC",
        ...(config.order ?? {}),
      },
    }
  }

  protected normalizeImages_(
    variantId: string,
    images: VariantImageUpsertInput[] = []
  ) {
    const normalized = images
      .filter(
        (image) =>
          typeof image?.url === "string" && image.url.trim().length > 0
      )
      .map((image, index) => {
        const trimmedUrl = image.url!.trim()
        const rank = isDefined(image.rank) ? Number(image.rank) : index
        const metadata =
          image.metadata &&
          typeof image.metadata === "object" &&
          !Array.isArray(image.metadata)
            ? image.metadata
            : null

        return {
          id: image.id ?? generateEntityId(undefined, "varimg"),
          variant_id: image.variant_id ?? variantId,
          url: trimmedUrl,
          rank,
          metadata,
        }
      })

    const invalidVariantIds = normalized
      .map((image) => image.variant_id)
      .filter((id) => id !== variantId)

    if (invalidVariantIds.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `All images must reference variant ${variantId}`
      )
    }

    return normalized
  }
}

export default VariantImageModuleService

