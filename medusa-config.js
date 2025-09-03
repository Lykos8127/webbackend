
// medusa-config.js
require("dotenv").config()
const { defineConfig } = require("@medusajs/framework/utils")

module.exports = defineConfig({
  projectConfig: {
    http: {
      storeCors: process.env.STORE_CORS,
      adminCors: process.env.ADMIN_CORS,
      authCors: process.env.AUTH_CORS,
    },
  },
  admin: { disable: false, path: "/app" },

  // 👇 Use `modules` to register providers (Stripe lives under the payment module)
  modules: [
        // keep your user/auth/file modules as you have them (object or plugin), e.g.:
    { resolve: "@medusajs/user", options: { jwt_secret: process.env.JWT_SECRET || "dev" } },
    { resolve: "@medusajs/auth", options: { providers: [{ resolve: "@medusajs/auth-emailpass", id: "emailpass" }] } },

    // S3 file provider (keep your existing options)
    ...(process.env.S3_BUCKET
      ? [{
          resolve: "@medusajs/file",
          options: {
            defaultProvider: "s3",
            providers: [{
              id: "s3",
              resolve: "@medusajs/file-s3",
              options: {
                region: process.env.S3_REGION,
                bucket: process.env.S3_BUCKET,
                access_key_id: process.env.AWS_ACCESS_KEY_ID,
                secret_access_key: process.env.AWS_SECRET_ACCESS_KEY,
              },
            }],
          },
        }]
      : []),

    // ✅ Stripe as a payment provider
    {
      resolve: "@medusajs/medusa/payment",       // the payment module
      options: {
        providers: [
          {
            resolve: "@medusajs/payment-stripe", // the Stripe provider package
            id: "stripe",                        // your provider id
            options: {
              apiKey: process.env.STRIPE_API_KEY,
              webhookSecret: process.env.STRIPE_WEBHOOK_SECRET, // set in .env (see below)
              // optional:
              // capture: true,
              // automatic_payment_methods: true,
            },
          },
        ],
      },
    },
  ],
})
