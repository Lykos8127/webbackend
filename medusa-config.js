// medusa-config.js
require("ts-node").register({ transpileOnly: true });
module.exports = require("./medusa-config.ts").default || require("./medusa-config.ts");
