// medusa-config.js
require("dotenv").config()
const { defineConfig } = require("@medusajs/framework/utils")

const BUCKET = "medusa-s3-bucket-lykos"
const REGION = "eu-central-1"
const PUBLIC_URL = `https://${BUCKET}.s3.${REGION}.amazonaws.com`



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
                    region: REGION,
                    bucket: BUCKET,
                    file_url: PUBLIC_URL,   // <-- REQUIRED in v2.10
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
