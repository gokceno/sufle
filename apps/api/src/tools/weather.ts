import { z } from "zod";

const name: string = "weather";
const description: string = `Get weather information for any city. When asked about weather for ANY city, you MUST call the "weather" tool with that city name.`;

const baseUrl = "http://api.openweathermap.org";

const create = (opts) => {
  const schema = z.object({
    city: z.string().describe("Name of the city to find the weather for."),
  });
  const provider = async (input: any) => {
    const { city } = schema.parse(input);
    const { lat, lon } = await geocode(city, opts as Opts);
    const { weather, main } = await find(lat, lon, opts as Opts);
    return {
      ...main,
      weather: weather.map((w) => w.description),
    };
  };
  return { provider, schema, name, description };
};

const geocode = async (
  city: string,
  opts: Opts
): Promise<{ lat: number; lon: number }> => {
  const { apiKey } = opts;
  const request = await fetch(
    `${baseUrl}/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`
  );
  const [response] = await request.json();
  return {
    lat: response.lat,
    lon: response.lon,
  };
};

const find = async (
  lat: number,
  lon: number,
  opts: Opts
): Promise<{
  weather: Array<{ description: string }>;
  main: { feelsLike: number; minTemprature: number; maxTemprature: number };
}> => {
  const { apiKey } = opts as Opts;
  const request = await fetch(
    `${baseUrl}/data/2.5/weather?units=metric&lon=${lon}&lat=${lat}&appid=${apiKey}`
  );
  const response = await request.json();
  return {
    weather: response.weather,
    main: {
      feelsLike: response.main.feels_like,
      minTemprature: response.main.min_temp,
      maxTemprature: response.main.max_temp,
    },
  };
};

type Opts = {
  apiKey?: string;
};

export { create, name, description };
