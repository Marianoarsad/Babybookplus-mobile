const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// Native build and QA artifacts must not enter Metro's file crawl.
const existing = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : [existing].filter(Boolean)),
  /[/\\]\.cache[/\\]|[/\\]\.cxx[/\\]|[/\\]\.gradle[/\\]|[/\\]android[/\\](?:app[/\\])?build[/\\]/,
];
module.exports = config;
