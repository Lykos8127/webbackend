import { useState } from "react"
import type { CSSProperties } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/types"

type VariantData = HttpTypes.AdminProductVariant | undefined

const VariantCloneWidget = ({
  data,
}: DetailWidgetProps<VariantData>) => {
  const variant = data
  const [isCloning, setIsCloning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!variant?.id) {
    return null
  }

  const productId = variant.product_id ?? variant.product?.id ?? ""

  const handleClone = async () => {
    if (!variant?.id) {
      return
    }

    const shouldProceed = window.confirm(
      "Clone this variant? A new variant will be created with the same options, prices, and inventory."
    )

    if (!shouldProceed) {
      return
    }

    setIsCloning(true)
    setError(null)

    try {
      const response = await fetch(
        `/admin/variants/${variant.id}/clone`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        const message = await extractErrorMessage(response)
        throw new Error(message || response.statusText)
      }

      const payload = await response.json()
      const clonedVariantId = payload?.variant?.id

      if (clonedVariantId && productId) {
        window.location.href = `/app/products/${productId}/variants/${clonedVariantId}`
        return
      }

      window.location.reload()
    } catch (err) {
      console.error(err)
      setError(
        err instanceof Error
          ? err.message
          : "Unable to clone the variant."
      )
    } finally {
      setIsCloning(false)
    }
  }

  return (
    <div
      style={{
        border: "1px solid var(--medusa-border-base)",
        borderRadius: "8px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div>
        <h3
          style={{
            margin: 0,
            fontSize: "16px",
            fontWeight: 600,
          }}
        >
          Clone Variant
        </h3>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: "13px",
            color: "var(--medusa-fg-subtle)",
          }}
        >
          Duplicate this variant so you can adjust the copy without
          starting from scratch.
        </p>
      </div>

      {error && (
        <div
          style={{
            color: "var(--medusa-status-danger)",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleClone}
        disabled={isCloning}
        style={buttonStyle}
      >
        {isCloning ? "Cloning…" : "Clone this variant"}
      </button>
    </div>
  )
}

async function extractErrorMessage(response: Response) {
  try {
    const payload = await response.json()
    return payload?.message ?? payload?.errors?.[0]?.message
  } catch {
    return null
  }
}

const buttonStyle: CSSProperties = {
  borderRadius: "6px",
  border: "1px solid var(--medusa-fg-interactive)",
  background: "var(--medusa-fg-interactive)",
  color: "var(--medusa-bg-base)",
  padding: "8px 12px",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
}

export const config = defineWidgetConfig({
  zone: "product_variant.details.after",
})

export default VariantCloneWidget
