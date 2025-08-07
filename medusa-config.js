// medusa-config.js

/** @type {import('@medusajs/medusa').ConfigModule} */
const config = {
  projectConfig: {
    // v2-style Postgres URL
    databaseUrl: process.env.DATABASE_URL,

    // Optional Redis URL (if you provision one)
    //redisUrl: process.env.REDIS_URL,

    // HTTP / CORS / auth settings
    http: {
      // Medusa reads process.env.PORT by default (9000 fallback)
      jwtSecret:    process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET || process.env.JWT_SECRET,

      // CORS settings for the storefront/admin
      storeCors:    process.env.STORE_CORS || "*",
      adminCors:    process.env.ADMIN_CORS || "*",
    },
  },

  plugins: [
    {
      resolve: "@medusajs/admin",
      options: {
        serve:  true,
        outDir: ".medusa/server/public/admin",
      },
    },
    // other plugins…
  ],
}

module.exports = config
