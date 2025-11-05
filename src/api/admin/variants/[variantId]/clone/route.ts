import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { createProductVariantsWorkflow } from "@medusajs/core-flows"

type VariantOptionValue = {
  option?: { title?: string | null }
  option_id?: string | null
  value?: string | { value?: string | null } | null
}

type VariantPrice = {
  amount: number
  currency_code?: string | null
  rules?: Array<{
    attribute: string
    value: string
  }>
  min_quantity?: number | null
  max_quantity?: number | null
  region_id?: string | null
}

type VariantInventoryItem = {
  inventory_item_id: string
  required_quantity?: number | null
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { variantId } = req.params as { variantId?: string }

  if (!variantId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "variantId path parameter is required"
    )
  }

  const productModuleService = req.scope.resolve("product")

  const [sourceVariant] = await productModuleService.listProductVariants(
    { id: variantId },
    {
      relations: [
        "options",
        "options.option",
        "prices",
        "prices.price_rules",
      ],
    }
  )

  if (!sourceVariant) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Variant ${variantId} was not found`
    )
  }

  const variantData = sourceVariant as any

  const optionsPayload = buildOptionsPayload(variantData.options ?? [])
  const pricesPayload = buildPricesPayload(variantData.prices ?? [])
  const inventoryPayload = buildInventoryPayload(
    variantData.inventory_items ?? []
  )

  const productId = sourceVariant.product_id ?? variantData.product?.id

  if (!productId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Unable to determine the associated product for the variant."
    )
  }

  const clonedVariantInput: any = {
    product_id: productId,
    title: buildCloneTitle(sourceVariant.title),
    allow_backorder: sourceVariant.allow_backorder ?? false,
    manage_inventory: sourceVariant.manage_inventory ?? true,
    requires_shipping: sourceVariant.requires_shipping ?? true,
    hs_code: sourceVariant.hs_code ?? null,
    origin_country: sourceVariant.origin_country ?? null,
    mid_code: sourceVariant.mid_code ?? null,
    material: sourceVariant.material ?? null,
    weight: sourceVariant.weight ?? null,
    length: sourceVariant.length ?? null,
    height: sourceVariant.height ?? null,
    width: sourceVariant.width ?? null,
    metadata: sourceVariant.metadata ?? null,
    // Unique identifiers are cleared to prevent conflicts
    sku: undefined,
    barcode: undefined,
    ean: undefined,
    upc: undefined,
    options: optionsPayload,
    prices: pricesPayload,
    inventory_items: inventoryPayload,
  }

  const workflow = createProductVariantsWorkflow(req.scope)
  const { result } = await workflow.run({
    input: {
      product_variants: [clonedVariantInput],
      additional_data: {
        cloned_from_variant_id: sourceVariant.id,
      },
    },
  })

  const clonedVariant = result?.[0]

  res.status(201).json({
    variant: clonedVariant,
  })
}

function buildCloneTitle(title?: string | null) {
  if (!title) {
    return "New Variant"
  }

  const suffix = " (Copy)"
  return title.endsWith(suffix) ? title : `${title}${suffix}`
}

function extractOptionValue(value: VariantOptionValue["value"]) {
  if (!value) {
    return ""
  }
  if (typeof value === "string") {
    return value
  }
  if (typeof value === "object" && value !== null) {
    return value.value ?? ""
  }
  return ""
}

function buildOptionsPayload(options: VariantOptionValue[]) {
  return options.reduce<Record<string, string>>((acc, optionValue) => {
    const title = optionValue.option?.title ?? optionValue.option_id ?? ""
    const value = extractOptionValue(optionValue.value)

    if (!title || !value) {
      return acc
    }

    acc[title] = value
    return acc
  }, {})
}

function buildPricesPayload(prices: VariantPrice[]) {
  return prices
    .filter((price) => typeof price.amount === "number")
    .map((price) => ({
      amount: price.amount,
      currency_code: price.currency_code ?? undefined,
      min_quantity: price.min_quantity ?? undefined,
      max_quantity: price.max_quantity ?? undefined,
      region_id: price.region_id ?? undefined,
      rules: Array.isArray(price.rules)
        ? price.rules.map((rule) => ({
            attribute: rule.attribute,
            value: rule.value,
          }))
        : undefined,
    }))
}

function buildInventoryPayload(items: VariantInventoryItem[]) {
  return items
    .filter((item) => !!item?.inventory_item_id)
    .map((item) => ({
      inventory_item_id: item.inventory_item_id,
      required_quantity: item.required_quantity ?? undefined,
    }))
}
