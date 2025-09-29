const description: string = "Get weather information for provided city";
const name: string = "getWeather";
const parameters: object = {
  type: "object",
  properties: {
    city: {
      type: "string",
      description: "The city name to get weather information for",
    },
    units: {
      type: "string",
      enum: ["celsius", "fahrenheit"],
      description: "Temperature units to use",
      default: "celsius",
    },
  },
  required: ["city"],
};

const run = async (args: { city: string; units?: string }): Promise<object> => {
  const { city, units = "celsius" } = args;
  const temperature = units === "fahrenheit" ? 101.3 : 38.5;

  return {
    city,
    temperature,
    units,
    condition: "sunny",
    humidity: "65%",
    windSpeed: "10 km/h",
  };
};

export { name, description, parameters, run };
