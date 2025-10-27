require("dotenv").config()
const { defineConfig } = require("@medusajs/framework/utils")

const trim = (value) => (value ?? "").trim()
const removeTrailingSlash = (value) =>
  value ? value.replace(/\/+$/, "") : value

const S3_REGION = trim(process.env.S3_REGION) || "eu-central-1"
const S3_BUCKET = trim(process.env.S3_BUCKET) || "medusa-s3-bucket-lykos"
const S3_ENDPOINT = trim(process.env.S3_ENDPOINT)
const S3_PREFIX = trim(process.env.S3_PREFIX)
const PUBLIC_URL =
  removeTrailingSlash(
    trim(process.env.S3_FILE_URL) ||
      trim(process.env.S3_BASE_URL) ||
      (S3_BUCKET && S3_REGION
        ? `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`
        : "")
  )

if (!S3_BUCKET) {
  throw new Error("S3_BUCKET must be defined (check your env vars).")
}

if (!PUBLIC_URL) {
  throw new Error(
    "Unable to compute the S3 public URL. Set S3_FILE_URL (or S3_BASE_URL) or provide S3_BUCKET/S3_REGION."
  )
}

const AWS_ACCESS_KEY_ID = trim(process.env.AWS_ACCESS_KEY_ID)
const AWS_SECRET_ACCESS_KEY = trim(process.env.AWS_SECRET_ACCESS_KEY)
const useAccessKeys = AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY

const fileProviderOptions = {
  region: S3_REGION,
  bucket: S3_BUCKET,
  file_url: PUBLIC_URL,
  base_url: PUBLIC_URL,
  authentication_method: useAccessKeys ? "access-key" : "s3-iam-role",
  ...(S3_ENDPOINT ? { endpoint: S3_ENDPOINT } : {}),
  ...(S3_PREFIX ? { prefix: S3_PREFIX.replace(/^\/+/, "") } : {}),
  ...(useAccessKeys
    ? {
        access_key_id: AWS_ACCESS_KEY_ID,
        secret_access_key: AWS_SECRET_ACCESS_KEY,
      }
    : {}),
}

if (process.env.NODE_ENV !== "production") {
  console.log("[s3 config]", {
    bucket: S3_BUCKET,
    region: S3_REGION,
    publicUrl: PUBLIC_URL,
    auth: useAccessKeys ? "access-key" : "iam-role",
  })
}

module.exports = defineConfig({
  projectConfig: {
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:3000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:9000",
      authCors: process.env.AUTH_CORS || "http://localhost:3000",
    },
  },

  admin: { disable: false, path: "/app" },

  modules: {
    // Core commerce modules
    product: { resolve: "@medusajs/product" },
    pricing: { resolve: "@medusajs/pricing" },
    cart:    { resolve: "@medusajs/cart" },
    // salesChannel: { resolve: "@medusajs/sales-channel" }, // (leave out if already elsewhere)

    // Auth / Users
    user: {
      resolve: "@medusajs/user",
      options: { jwt_secret: process.env.JWT_SECRET || "dev" },
    },
    auth: {
      resolve: "@medusajs/auth",
      options: { providers: [{ resolve: "@medusajs/auth-emailpass", id: "emailpass" }] },
    },

    file: {
      resolve: "@medusajs/file",
      options: {
        defaultProvider: "s3",
        providers: [
          {
            id: "s3",
            resolve: "@medusajs/file-s3",
            options: fileProviderOptions,
          },
        ],
      },
    },

    // Fulfillment (Manual)
    fulfillment: {
      resolve: "@medusajs/fulfillment",
      options: {
        providers: [{ resolve: "@medusajs/fulfillment-manual", id: "manual", options: {} }],
      },
    },

    // Payments (Stripe)
    payment: {
      resolve: "@medusajs/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
              webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
            },
          },
        ],
      },
    },
  },
})
