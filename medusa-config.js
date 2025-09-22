require("dotenv").config()
const { defineConfig } = require("@medusajs/framework/utils")
console.log("[BOOT] STRIPE_API_KEY=", process.env.STRIPE_API_KEY ? "present" : "MISSING")


module.exports = defineConfig({
  projectConfig: {
    http: {
      // allow your Next app + any other tools you use in dev
      storeCors: process.env.STORE_CORS || "http://localhost:3000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:9000",
      authCors: process.env.AUTH_CORS || "http://localhost:3000",
    },
  },

  // enable the built-in admin (served at /app)
  admin: { disable: false, path: "/app" },

  // IMPORTANT: modules must be an OBJECT (not an array)
  modules: {
    // --- Auth / Users ---
    user: {
      resolve: "@medusajs/user",
      options: { jwt_secret: process.env.JWT_SECRET || "dev" },
    },
    auth: {
      resolve: "@medusajs/auth",
      options: {
        providers: [
          { resolve: "@medusajs/auth-emailpass", id: "emailpass" },
        ],
      },
    },

    // --- Files (S3) — optional ---
    // Only include if you actually use S3. This conditional keeps config tidy.
    ...(process.env.S3_BUCKET
      ? {
          file: {
            resolve: "@medusajs/medusa/file",
      options: {
        defaultProvider: "s3",
        providers: [
          {
            id: "s3",
            resolve: "@medusajs/medusa/file-s3",
            options: {
              // MUST be your public base URL (no trailing slash)
              file_url: process.env.S3_FILE_URL, 
              region: process.env.S3_REGION,                 // eu-central-1
              bucket: process.env.S3_BUCKET,                 // medusa-s3-bucket-lykos

              // Use IAM role in production if you want; keep keys locally
              access_key_id: process.env.AWS_ACCESS_KEY_ID,
              secret_access_key: process.env.AWS_SECRET_ACCESS_KEY,
                  },
                },
              ],
            },
          },
        }
      : {}),

    // --- Fulfillment (Manual) ---
    fulfillment: {
      resolve: "@medusajs/medusa/fulfillment",
      options: {
        providers: [
          { resolve: "@medusajs/fulfillment-manual", id: "manual", options: {} },
        ],
      },
    },

    // --- Payments (Stripe) ---
    payment: {
    resolve: "@medusajs/medusa/payment",
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