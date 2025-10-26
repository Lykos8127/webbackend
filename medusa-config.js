// medusa-config.js
require("dotenv").config()
const { defineConfig } = require("@medusajs/framework/utils")

const clean = (s) => (s ? s.replace(/\s/g, "").trim() : undefined)
const S3_BUCKET = clean(process.env.S3_BUCKET)
const S3_REGION = clean(process.env.S3_REGION)
const S3_BASE_URL =
  clean(process.env.S3_BASE_URL) ||
  (S3_BUCKET && S3_REGION
    ? `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`
    : undefined)

if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(S3_BUCKET || "")) {
  throw new Error(`S3_BUCKET invalid: "${S3_BUCKET}". Re-enter it (no spaces/newlines).`)
}
console.log("[S3 check]", { S3_BUCKET, S3_REGION, S3_BASE_URL })

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

    // Files (S3)
    ...(S3_BUCKET
      ? {
          file: {
            resolve: "@medusajs/file",
            options: {
              defaultProvider: "s3",
              providers: [
                {
                  id: "s3",
                  resolve: "@medusajs/file-s3",
                  options: {
                    region: "eu-central-1",
                    bucket: "medusa-s3-bucket-lykos",
                    base_url: "https://medusa-s3-bucket-lykos.s3.eu-central-1.amazonaws.com",

                    // If App Runner uses an instance role, keep keys unset
                    // access_key_id: process.env.AWS_ACCESS_KEY_ID,
                    // secret_access_key: process.env.AWS_SECRET_ACCESS_KEY,

                    // Only for MinIO/compat:
                    // endpoint: process.env.S3_ENDPOINT,
                    // force_path_style: false,
                  },
                },
              ],
            },
          },
        }
      : {}),

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
