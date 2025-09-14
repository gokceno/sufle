import * as rclone from "./rclone";
import * as local from "./local";

const storageProviders = {
  rclone,
  local,
};

const factory = (provider) => {
  if (!(provider in storageProviders)) {
    throw new Error(`Invalid storage provider: ${provider}`);
  }
  return storageProviders[provider];
};

export { factory };
