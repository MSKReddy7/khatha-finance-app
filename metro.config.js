// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable WebAssembly for expo-sqlite web support
config.resolver.assetExts.push('wasm');

module.exports = config;
