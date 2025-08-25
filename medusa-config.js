// medusa-config.js (for Medusa v2.9)
const { defineConfig } = require("@medusajs/framework/utils")

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,

    http: {
      // CORS for store/admin/auth
      storeCors: process.env.STORE_CORS || "http://localhost:3000,http://localhost:8000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:9000,http://localhost:7000,http://localhost:7001",
      authCors: process.env.AUTH_CORS  || "http://localhost:9000,http://localhost:7000,http://localhost:7001",
      // port is autodetected from PORT (defaults to 9000)
    },
    // redisUrl: process.env.REDIS_URL, // optional in dev
  },

  // Serve the bundled Admin UI at /app if you built it into .medusa/server
  admin: { disable: false, path: "/app" },

  // v2 uses MODULES (not plugins). Register what you actually use:
  modules: [
    // Needed so `medusa user ...` works and invites can be created
    {
      resolve: "@medusajs/user",
      options: {
        // required for invite tokens etc.
        jwt_secret: process.env.JWT_SECRET || "dev-secret-change-me",
      },
    },
    // Email/password auth provider for /auth/user/emailpass/*
    {
      resolve: "@medusajs/auth",
      options: {
        providers: [
          { resolve: "@medusajs/auth-emailpass", id: "emailpass" },
        ],
      },
    },

    // —— OPTIONAL: file storage via S3 (only if you set the envs) ——
    ...(process.env.S3_BUCKET ? [{
      resolve: "@medusajs/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/file-s3",
            id: "s3",
            options: {
              region: process.env.S3_REGION,
              bucket: process.env.S3_BUCKET,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              // optional: endpoint: process.env.S3_ENDPOINT,
            },
          },
        ],
      },
    }] : []),

    // —— OPTIONAL: Stripe (only if you set the envs) ——
    ...(process.env.STRIPE_API_KEY ? [{
      resolve: "@medusajs/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/payment-stripe",
            id: "stripe",
            options: {
              api_key: process.env.STRIPE_API_KEY,
              webhook_secret: process.env.STRIPE_WEBHOOK_SECRET, // if you use webhooks
            },
          },
        ],
      },
    }] : []),
  ],
})
