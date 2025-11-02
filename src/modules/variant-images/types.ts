export type VariantImageDTO = {
  id: string
  variant_id: string
  url: string
  rank: number
  metadata: Record<string, unknown> | null
}

export type VariantImageUpsertInput = {
  id?: string
  variant_id?: string
  url: string
  rank?: number | null
  metadata?: Record<string, unknown> | null
}

export type VariantImageSelector = Partial<{
  id: string | string[]
  variant_id: string | string[]
  url: string | string[]
}>

