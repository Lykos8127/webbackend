// medusa-config.js
require("dotenv").config()
const { defineConfig } = require("@medusajs/framework/utils")

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
    // ❌ remove this — it’s already provided somewhere in your stack
    // salesChannel: { resolve: "@medusajs/sales-channel" },

    // Auth / Users
    user: {
      resolve: "@medusajs/user",
      options: { jwt_secret: process.env.JWT_SECRET || "dev" },
    },
    auth: {
      resolve: "@medusajs/auth",
      options: { providers: [{ resolve: "@medusajs/auth-emailpass", id: "emailpass" }] },
    },

    // Files (S3) — v2 modules
    ...(process.env.S3_BUCKET
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
                    file_url: process.env.S3_FILE_URL, // e.g. https://<bucket>.s3.<region>.amazonaws.com
                    region: process.env.S3_REGION,
                    bucket: process.env.S3_BUCKET,
                    access_key_id: process.env.AWS_ACCESS_KEY_ID,
                    secret_access_key: process.env.AWS_SECRET_ACCESS_KEY,
                  },
                },
              ],
            },
          },
        }
      : {}),

    // Fulfillment (Manual) — v2 entry
    fulfillment: {
      resolve: "@medusajs/fulfillment",
      options: {
        providers: [{ resolve: "@medusajs/fulfillment-manual", id: "manual", options: {} }],
      },
    },

    // Payments (Stripe) — v2 entry
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
