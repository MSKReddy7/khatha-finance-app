// Mock react-native for Node.js test environment
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function (id) {
  if (id === 'react-native') {
    return {
      Platform: {
        OS: 'android',
        select: (obj) => obj.android || obj.default,
      },
      NativeModules: {},
    };
  }
  return originalRequire.apply(this, arguments);
};
