// medusa-config.js
/** @type {import('@medusajs/medusa').PluginOptions[]} */
const plugins = [
  {
    resolve: "@medusajs/admin",
    options: {
      serve: true,
      outDir: ".medusa/server/public/admin",
    },
  },
  // … any other plugins …
];

module.exports = {
  projectConfig: {
    // … your projectConfig …
  },
  plugins,
};
