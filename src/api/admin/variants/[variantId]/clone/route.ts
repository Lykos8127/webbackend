import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"
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

  const remoteQuery = req.scope.resolve(
    ContainerRegistrationKeys.REMOTE_QUERY
  ) as (query: any) => Promise<any[]>

  const query = remoteQueryObjectFromString({
    entryPoint: "product_variant",
    variables: {
      filters: { id: variantId },
    },
    fields: remapKeysForVariant([
      "id",
      "title",
      "product_id",
      "sku",
      "barcode",
      "ean",
      "upc",
      "allow_backorder",
      "manage_inventory",
      "requires_shipping",
      "hs_code",
      "origin_country",
      "mid_code",
      "material",
      "weight",
      "length",
      "height",
      "width",
      "variant_rank",
      "metadata",
      "options.id",
      "options.value",
      "options.option_id",
      "options.option.title",
      "price_set.id",
      "price_set.prices.id",
      "price_set.prices.amount",
      "price_set.prices.currency_code",
      "price_set.prices.min_quantity",
      "price_set.prices.max_quantity",
      "price_set.prices.region_id",
      "price_set.prices.price_rules.id",
      "price_set.prices.price_rules.attribute",
      "price_set.prices.price_rules.value",
    ]),
  })

  const [variantRaw] = await remoteQuery(query)

  if (!variantRaw) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Variant ${variantId} was not found`
    )
  }

  const sourceVariant = remapVariantResponse(variantRaw)

  const optionsPayload = buildOptionsPayload(sourceVariant.options ?? [])
  const pricesPayload = buildPricesPayload(sourceVariant.prices ?? [])
  const inventoryPayload = buildInventoryPayload(
    (sourceVariant as any).inventory_items ?? []
  )

  const productId = sourceVariant.product_id

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

function remapVariantResponse(variant: any) {
  if (!variant) {
    return variant
  }

  const response = {
    ...variant,
    prices: variant.price_set?.prices?.map((price: any) => ({
      id: price.id,
      amount: price.amount,
      currency_code: price.currency_code,
      min_quantity: price.min_quantity,
      max_quantity: price.max_quantity,
      variant_id: variant.id,
      region_id: price.region_id,
      created_at: price.created_at,
      updated_at: price.updated_at,
      rules: buildPriceRules(price),
    })),
  }

  delete response.price_set

  return response
}

function buildPriceRules(price: any) {
  const rules: Record<string, string> = {}

  for (const priceRule of price?.price_rules || []) {
    const ruleAttribute = priceRule.attribute
    if (ruleAttribute) {
      rules[ruleAttribute] = priceRule.value
    }
  }

  return rules
}

function remapKeysForVariant(selectFields: string[]) {
  const isPricing = (fieldName: string) =>
    fieldName.startsWith("prices.") || fieldName.startsWith("*prices")

  const variantFields = selectFields.filter((field) => !isPricing(field))
  const pricingFields = selectFields
    .filter((field) => isPricing(field))
    .map((field) => field.replace("prices.", "price_set.prices."))

  return [...variantFields, ...pricingFields]
}
