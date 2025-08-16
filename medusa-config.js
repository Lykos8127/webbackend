// medusa-config.js

/** @type {import('@medusajs/medusa').ConfigModule} */
const config = {
  projectConfig: {
    // v2-style Postgres URL
    databaseUrl: process.env.DATABASE_URL,

    // HTTP / CORS / auth settings
    http: {
      // Medusa reads process.env.PORT by default (9000 fallback)
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET || process.env.JWT_SECRET,

      // CORS settings for the storefront/admin
      storeCors: process.env.STORE_CORS || "*",
      adminCors: process.env.ADMIN_CORS || "*",
    },
  },

  // Built-in Admin served by the backend (optional but handy)
  admin: {
    disable: false,
    path: "/app",
  },

  /**
   * IMPORTANT: The File Module with the S3 provider
   * - Install: npm install @medusajs/file-s3@2.8.7 --save-exact
   * - The "resolve" ids are exactly as below.
   */
  modules: [
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            // Provider package you installed is "@medusajs/file-s3",
            // but the resolve id stays "@medusajs/medusa/file-s3".
            resolve: "@medusajs/medusa/file-s3",
            id: "s3",
            options: {
              bucket: process.env.S3_BUCKET,                 
              region: process.env.S3_REGION,                 
              endpoint: process.env.S3_ENDPOINT || "",       
              file_url: process.env.S3_FILE_URL,             
             
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
            },
          },
        ],
      },
    },
  ],

  // Keep plugins only if you actually use some. Otherwise empty is fine.
  plugins: [],
};

module.exports = config;
