import { useCallback, useEffect, useMemo, useState } from "react"
import type { CSSProperties } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/types"
import type { VariantImageUpsertInput } from "../../modules/variant-images/types"

const messages = {
  loadError: "Unable to load variant images.",
  saveError: "Unable to save variant images.",
  saveSuccess: "Variant images saved.",
}

type VariantData = HttpTypes.AdminProductVariant

const VariantImagesWidget = ({
  data,
}: DetailWidgetProps<VariantData | undefined>) => {
  const variantId = data?.id
  const [images, setImages] = useState<VariantImageUpsertInput[]>([])
  const [newImageUrl, setNewImageUrl] = useState("")
  const [newImageAlt, setNewImageAlt] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const sortedImages = useMemo(() => {
    return [...images].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
  }, [images])

  const fetchImages = useCallback(async () => {
    if (!variantId) {
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await fetch(
        `/admin/variants/${variantId}/variant-images`,
        {
          credentials: "include",
        }
      )

      if (!response.ok) {
        throw new Error(`${response.statusText}`)
      }

      const payload = await response.json()

      const nextImages: VariantImageUpsertInput[] = Array.isArray(
        payload?.variant_images
      )
        ? payload.variant_images.map(
            (image: VariantImageUpsertInput, index: number) => ({
              id: image.id,
              url: image.url ?? "",
              rank:
                typeof image.rank === "number" ? image.rank : Number(index),
              metadata: image.metadata ?? null,
            })
          )
        : []

      setImages(nextImages)
    } catch (error) {
      console.error(error)
      setErrorMessage(messages.loadError)
    } finally {
      setIsLoading(false)
    }
  }, [variantId])

  useEffect(() => {
    if (variantId) {
      fetchImages()
    }
  }, [variantId, fetchImages])

  const handleAddImage = () => {
    const trimmedUrl = newImageUrl.trim()
    const trimmedAlt = newImageAlt.trim()

    if (!trimmedUrl) {
      return
    }

    setImages((prev) => [
      ...prev,
      {
        url: trimmedUrl,
        metadata: trimmedAlt
          ? {
              alt: trimmedAlt,
            }
          : null,
        rank: prev.length,
      },
    ])

    setNewImageUrl("")
    setNewImageAlt("")
  }

  const handleRemoveImage = (index: number) => {
    setImages((prev) =>
      prev
        .filter((_, idx) => idx !== index)
        .map((image, idx) => ({
          ...image,
          rank: idx,
        }))
    )
  }

  const handleUpdateImageUrl = (index: number, url: string) => {
    setImages((prev) =>
      prev.map((image, idx) =>
        idx === index
          ? {
              ...image,
              url,
            }
          : image
      )
    )
  }

  const handleMoveImage = (index: number, direction: "up" | "down") => {
    setImages((prev) => {
      const next = [...prev]
      const newIndex = direction === "up" ? index - 1 : index + 1

      if (newIndex < 0 || newIndex >= next.length) {
        return prev
      }

      const [removed] = next.splice(index, 1)
      next.splice(newIndex, 0, removed)

      return next.map((image, idx) => ({
        ...image,
        rank: idx,
      }))
    })
  }

  const handleSetAltText = (index: number, alt: string) => {
    const trimmedAlt = alt.trim()

    setImages((prev) =>
      prev.map((image, idx) =>
        idx === index
          ? {
              ...image,
              metadata: updateAltMetadata(image.metadata, trimmedAlt),
            }
          : image
      )
    )
  }

  const handleSave = async () => {
    if (!variantId) {
      return
    }

    setIsSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const payload = {
      images: sortedImages.map((image, index) => ({
        ...image,
        rank: index,
      })),
    }

    try {
      const response = await fetch(
        `/admin/variants/${variantId}/variant-images`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) {
        throw new Error(`${response.statusText}`)
      }

      const data = await response.json()

      const nextImages: VariantImageUpsertInput[] = Array.isArray(
        data?.variant_images
      )
        ? data.variant_images.map(
            (image: VariantImageUpsertInput, index: number) => ({
              id: image.id,
              url: image.url ?? "",
              rank:
                typeof image.rank === "number" ? image.rank : Number(index),
              metadata: image.metadata ?? null,
            })
          )
        : []

      setImages(nextImages)
      setSuccessMessage(messages.saveSuccess)
    } catch (error) {
      console.error(error)
      setErrorMessage(messages.saveError)
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    if (!successMessage) {
      return
    }

    const timeout = setTimeout(() => {
      setSuccessMessage(null)
    }, 3000)

    return () => clearTimeout(timeout)
  }, [successMessage])

  if (!variantId) {
    return null
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
          Variant Images
        </h3>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: "13px",
            color: "var(--medusa-fg-subtle)",
          }}
        >
          Manage the images that should display when this variant is selected.
        </p>
      </div>

      {errorMessage && (
        <div
          style={{
            color: "var(--medusa-status-danger)",
            fontSize: "13px",
          }}
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          style={{
            color: "var(--medusa-status-success)",
            fontSize: "13px",
          }}
        >
          {successMessage}
        </div>
      )}

      {isLoading ? (
        <div style={{ fontSize: "13px" }}>Loading variant images…</div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {sortedImages.length === 0 && (
            <div style={{ fontSize: "13px", color: "var(--medusa-fg-subtle)" }}>
              No variant images yet.
            </div>
          )}

          {sortedImages.map((image, index) => (
            <div
              key={image.id ?? `${image.url}-${index}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "8px",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <label style={{ fontSize: "12px", fontWeight: 500 }}>
                  Image URL
                </label>
                <input
                  type="url"
                  value={image.url}
                  onChange={(event) =>
                    handleUpdateImageUrl(index, event.target.value)
                  }
                  placeholder="https://"
                  style={{
                    padding: "6px 8px",
                    fontSize: "13px",
                    borderRadius: "6px",
                    border: "1px solid var(--medusa-border-strong)",
                  }}
                  disabled={isSaving}
                />
                <label style={{ fontSize: "12px", fontWeight: 500 }}>
                  Alt text
                </label>
                <input
                  type="text"
                  value={extractAltText(image.metadata)}
                  onChange={(event) =>
                    handleSetAltText(index, event.target.value)
                  }
                  placeholder="Optional description"
                  style={{
                    padding: "6px 8px",
                    fontSize: "13px",
                    borderRadius: "6px",
                    border: "1px solid var(--medusa-border-strong)",
                  }}
                  disabled={isSaving}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  alignItems: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => handleMoveImage(index, "up")}
                  disabled={isSaving || index === 0}
                  style={buttonStyle}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveImage(index, "down")}
                  disabled={isSaving || index === sortedImages.length - 1}
                  style={buttonStyle}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  disabled={isSaving}
                  style={{
                    ...buttonStyle,
                    color: "var(--medusa-status-danger)",
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          borderTop: "1px solid var(--medusa-border-base)",
          paddingTop: "12px",
        }}
      >
        <div style={{ fontSize: "13px", fontWeight: 500 }}>
          Add a new image
        </div>
        <input
          type="url"
          placeholder="https://"
          value={newImageUrl}
          onChange={(event) => setNewImageUrl(event.target.value)}
          style={{
            padding: "6px 8px",
            fontSize: "13px",
            borderRadius: "6px",
            border: "1px solid var(--medusa-border-strong)",
          }}
          disabled={isSaving}
        />
        <input
          type="text"
          placeholder="Optional alt text"
          value={newImageAlt}
          onChange={(event) => setNewImageAlt(event.target.value)}
          style={{
            padding: "6px 8px",
            fontSize: "13px",
            borderRadius: "6px",
            border: "1px solid var(--medusa-border-strong)",
          }}
          disabled={isSaving}
        />
        <button
          type="button"
          onClick={handleAddImage}
          disabled={isSaving || !newImageUrl.trim()}
          style={primaryButtonStyle}
        >
          Add image
        </button>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isLoading}
          style={primaryButtonStyle}
        >
          {isSaving ? "Saving…" : "Save variant images"}
        </button>
      </div>
    </div>
  )
}

const buttonStyle: CSSProperties = {
  border: "1px solid var(--medusa-border-strong)",
  borderRadius: "6px",
  padding: "4px 8px",
  fontSize: "12px",
  cursor: "pointer",
  background: "var(--medusa-bg-field)",
}

const primaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "var(--medusa-fg-interactive)",
  color: "var(--medusa-bg-base)",
  border: "1px solid var(--medusa-fg-interactive)",
}

export const config = defineWidgetConfig({
  zone: "product_variant.details.after",
  
})

function extractAltText(
  metadata: VariantImageUpsertInput["metadata"]
): string {
  if (
    !metadata ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return ""
  }

  const alt = (metadata as Record<string, unknown>).alt

  return typeof alt === "string" ? alt : ""
}

function updateAltMetadata(
  metadata: VariantImageUpsertInput["metadata"],
  alt: string
): VariantImageUpsertInput["metadata"] {
  const base =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {}

  if (alt) {
    return {
      ...base,
      alt,
    }
  }

  if ("alt" in base) {
    delete (base as Record<string, unknown>).alt
  }

  return Object.keys(base).length ? base : null
}

export default VariantImagesWidget