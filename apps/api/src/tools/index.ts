import * as getWeather from "./get-weather";

const toolProviders = {
  getWeather,
};

const factory = (provider: string) => {
  if (!(provider in toolProviders)) {
    throw new Error(`Invalid tool provider: ${provider}`);
  }
  return toolProviders[provider];
};

export { factory };
