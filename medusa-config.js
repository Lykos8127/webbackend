// medusa-config.js

/**
 * Medusa project configuration.
 * For more options, see: https://docs.medusajs.com/configuration
 */

/** @type {import('@medusajs/medusa').ConfigModule} */
const config = {
  projectConfig: {
    // Database connection URL (Postgres)
    database_url: process.env.DATABASE_URL,
    // Optional Redis connection for caching and job queues
    redis_url: process.env.REDIS_URL,
    // Server HTTP settings
    http: {
      // Port on which Medusa will run
      port: process.env.PORT || 9000,
      // Secret for signing JWT tokens (must be set in production)
      jwtSecret: process.env.JWT_SECRET,
      // Secret for signing cookies; falls back to JWT secret
      cookieSecret: process.env.COOKIE_SECRET || process.env.JWT_SECRET,
    },
    // Directory where the admin UI is output (must match your build)
    store_cors: process.env.STORE_CORS || "*",
    admin_cors: process.env.ADMIN_CORS || "*",
  },
  plugins: [
    {
      resolve: "@medusajs/admin",
      options: {
        // Serve the Admin UI from this directory
        serve: true,
        outDir: ".medusa/server/public/admin",
      },
    },
    // Add other plugins below as needed:
    // {
    //   resolve: "medusa-plugin-stripe",
    //   options: {
    //     api_key: process.env.STRIPE_API_KEY,
    //   },
    // },
  ],
};

module.exports = config;
