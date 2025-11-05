import { useEffect, useMemo, useState } from "react"
import type { CSSProperties } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/types"

type VariantData = HttpTypes.AdminProductVariant | undefined

type CloneOverrides = {
  title?: string
  sku?: string
  barcode?: string
  ean?: string
  upc?: string
  option_overrides?: Record<string, string>
}

const VariantCloneWidget = ({
  data,
}: DetailWidgetProps<VariantData>) => {
  const variant = data

  const [isCloning, setIsCloning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [titleInput, setTitleInput] = useState("")
  const [skuInput, setSkuInput] = useState("")
  const [barcodeInput, setBarcodeInput] = useState("")
  const [eanInput, setEanInput] = useState("")
  const [upcInput, setUpcInput] = useState("")
  const [optionInputs, setOptionInputs] = useState<Record<string, string>>({})

  const originalOptions = useMemo(() => {
    if (!variant?.options) {
      return {}
    }

    return variant.options.reduce<Record<string, string>>((acc, optionValue) => {
      if (!optionValue) {
        return acc
      }

      const title = optionValue.option?.title ?? optionValue.option_id ?? ""
      if (!title) {
        return acc
      }

      const value = extractOptionValue(optionValue)
      acc[title] = value
      return acc
    }, {})
  }, [variant?.options, variant?.id])

  useEffect(() => {
    if (!variant?.id) {
      return
    }

    const defaultTitle = variant?.title
      ? `${variant.title} (Copy)`
      : "New Variant"

    setTitleInput(defaultTitle)
    setSkuInput("")
    setBarcodeInput("")
    setEanInput("")
    setUpcInput("")
    setOptionInputs(
      Object.entries(originalOptions).reduce<Record<string, string>>(
        (acc, [key, value]) => {
          acc[key] = value
          return acc
        },
        {}
      )
    )
    setError(null)
  }, [variant?.id, originalOptions])

  if (!variant?.id) {
    return null
  }

  const productId = variant.product_id ?? variant.product?.id ?? ""

  const handleOptionChange = (title: string, value: string) => {
    setOptionInputs((prev) => ({
      ...prev,
      [title]: value,
    }))
  }

  const handleClone = async () => {
    if (!variant?.id) {
      return
    }

    setIsCloning(true)
    setError(null)

    try {
      const optionOverrides: Record<string, string> = {}
      const optionTitles = Object.keys(originalOptions)

      for (const title of optionTitles) {
        const currentValue = (optionInputs[title] ?? "").trim()
        if (!currentValue) {
          throw new Error(`Option "${title}" requires a value.`)
        }

        const originalValue = (originalOptions[title] ?? "").trim()
        if (currentValue !== originalValue) {
          optionOverrides[title] = currentValue
        }
      }

      const overrides: CloneOverrides = {}

      const trimmedTitle = titleInput.trim()
      if (trimmedTitle) {
        overrides.title = trimmedTitle
      }

      const trimmedSku = skuInput.trim()
      if (trimmedSku) {
        overrides.sku = trimmedSku
      }

      const trimmedBarcode = barcodeInput.trim()
      if (trimmedBarcode) {
        overrides.barcode = trimmedBarcode
      }

      const trimmedEan = eanInput.trim()
      if (trimmedEan) {
        overrides.ean = trimmedEan
      }

      const trimmedUpc = upcInput.trim()
      if (trimmedUpc) {
        overrides.upc = trimmedUpc
      }

      if (Object.keys(optionOverrides).length) {
        overrides.option_overrides = optionOverrides
      }

      const requiresOptionChange = optionTitles.length > 0
      const hasOptionOverrides = Object.keys(optionOverrides).length > 0

      if (requiresOptionChange && !hasOptionOverrides) {
        throw new Error(
          "Update at least one option value before cloning to avoid duplicate variants."
        )
      }

      if (!Object.keys(overrides).length) {
        throw new Error(
          "Provide at least one override before cloning. Adjust options or identifiers so the copy stays unique."
        )
      }

      const response = await fetch(
        `/admin/variants/${variant.id}/clone`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ overrides }),
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
    <div style={containerStyle}>
      <div>
        <h3 style={headingStyle}>Clone Variant</h3>
        <p style={subtitleStyle}>
          Duplicate this variant and tweak identifiers/options before the copy
          is created. Update at least one option value to a new combination to
          avoid conflicts.
        </p>
      </div>

      <div style={formGridStyle}>
        <label style={labelStyle}>
          <span>Title</span>
          <input
            type="text"
            value={titleInput}
            onChange={(event) => setTitleInput(event.target.value)}
            style={inputStyle}
            disabled={isCloning}
          />
        </label>

        <label style={labelStyle}>
          <span>SKU</span>
          <input
            type="text"
            placeholder="Optional"
            value={skuInput}
            onChange={(event) => setSkuInput(event.target.value)}
            style={inputStyle}
            disabled={isCloning}
          />
        </label>

        <label style={labelStyle}>
          <span>Barcode</span>
          <input
            type="text"
            placeholder="Optional"
            value={barcodeInput}
            onChange={(event) => setBarcodeInput(event.target.value)}
            style={inputStyle}
            disabled={isCloning}
          />
        </label>

        <label style={labelStyle}>
          <span>EAN</span>
          <input
            type="text"
            placeholder="Optional"
            value={eanInput}
            onChange={(event) => setEanInput(event.target.value)}
            style={inputStyle}
            disabled={isCloning}
          />
        </label>

        <label style={labelStyle}>
          <span>UPC</span>
          <input
            type="text"
            placeholder="Optional"
            value={upcInput}
            onChange={(event) => setUpcInput(event.target.value)}
            style={inputStyle}
            disabled={isCloning}
          />
        </label>
      </div>

      {Object.keys(originalOptions).length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={optionsHeadingStyle}>Option Overrides</div>
          <p style={optionsHintStyle}>
            Enter values that already exist on the product options. At least one
            option needs a new value to create a unique variant.
          </p>

          {Object.entries(originalOptions).map(([title]) => (
            <label key={title} style={labelStyle}>
              <span>{title}</span>
              <input
                type="text"
                value={optionInputs[title] ?? ""}
                onChange={(event) =>
                  handleOptionChange(title, event.target.value)
                }
                style={inputStyle}
                disabled={isCloning}
              />
            </label>
          ))}
        </div>
      )}

      {error && <div style={errorStyle}>{error}</div>}

      <button
        type="button"
        onClick={handleClone}
        disabled={isCloning}
        style={{
          ...buttonStyle,
          opacity: isCloning ? 0.7 : 1,
          cursor: isCloning ? "not-allowed" : "pointer",
        }}
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

function extractOptionValue(
  optionValue: HttpTypes.AdminProductOptionValue
): string {
  if (!optionValue) {
    return ""
  }

  const rawValue = optionValue.value

  if (typeof rawValue === "string") {
    return rawValue
  }

  if (rawValue && typeof rawValue === "object") {
    return String((rawValue as { value?: string }).value ?? "")
  }

  return ""
}

const containerStyle: CSSProperties = {
  border: "1px solid var(--medusa-border-base)",
  borderRadius: "8px",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
}

const headingStyle: CSSProperties = {
  margin: 0,
  fontSize: "16px",
  fontWeight: 600,
}

const subtitleStyle: CSSProperties = {
  margin: "4px 0 0",
  fontSize: "13px",
  color: "var(--medusa-fg-subtle)",
}

const buttonStyle: CSSProperties = {
  borderRadius: "6px",
  border: "1px solid var(--medusa-fg-interactive)",
  background: "var(--medusa-fg-interactive)",
  color: "var(--medusa-bg-base)",
  padding: "8px 12px",
  fontSize: "13px",
  fontWeight: 600,
}

const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  fontSize: "12px",
  color: "var(--medusa-fg-subtle)",
}

const inputStyle: CSSProperties = {
  borderRadius: "6px",
  border: "1px solid var(--medusa-border-strong)",
  padding: "6px 8px",
  fontSize: "13px",
  color: "var(--medusa-fg-base)",
}

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
}

const optionsHeadingStyle: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
}

const optionsHintStyle: CSSProperties = {
  fontSize: "12px",
  color: "var(--medusa-fg-subtle)",
  margin: 0,
}

const errorStyle: CSSProperties = {
  color: "var(--medusa-status-danger)",
  fontSize: "13px",
}

export const config = defineWidgetConfig({
  zone: "product_variant.details.after",
})

export default VariantCloneWidget

