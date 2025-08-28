require("dotenv").config();
const { defineConfig } = require("@medusajs/framework/utils");

module.exports = defineConfig({
  projectConfig: { /* ...as before... */ },
  admin: { disable: false, path: "/app" },

  modules: {
    user: {
      resolve: "@medusajs/user",
      options: { jwt_secret: process.env.JWT_SECRET || "dev" },
    },

    auth: {
      resolve: "@medusajs/auth",
      options: { providers: [{ resolve: "@medusajs/auth-emailpass", id: "emailpass" }] },
    },

    // S3 (unchanged)
    ...(process.env.S3_BUCKET ? {
      file: {
        resolve: "@medusajs/file",
        options: {
          defaultProvider: "s3",
          providers: [
            {
              id: "s3",
              resolve: "@medusajs/file-s3",
              options: {
                region: process.env.S3_REGION,
                bucket: process.env.S3_BUCKET,
                access_key_id: process.env.AWS_ACCESS_KEY_ID,
                secret_access_key: process.env.AWS_SECRET_ACCESS_KEY,
              },
            },
          ],
        },
      },
    } : {}),

    // ✅ Stripe (use camelCase option names)
    ...(process.env.STRIPE_API_KEY ? {
      payment: {
        resolve: "@medusajs/payment",
        options: {
          providers: [
            {
              id: "stripe",
              resolve: "@medusajs/payment-stripe",
              options: {
                apiKey: process.env.STRIPE_API_KEY,             // <— camelCase
                webhookSecret: process.env.STRIPE_WEBHOOK_SECRET // <— camelCase (optional)
              },
            },
          ],
        },
      },
    } : {}),
  },
});
