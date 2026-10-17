export const Platform = {
  OS: 'android',
  select: (obj: any) => obj.android || obj.default,
};

export const NativeModules = {};

export default {
  Platform,
  NativeModules,
};
