import { z } from "zod";

const name: string = "exchangeRates";
const description: string = `Get exchange rate information for input currency. When asked about exchange rates for ANY currency, you MUST call the "exchangeRates" tool with that currency name.`;

const create = (opts) => {
  const schema = z.object({
    currency: z
      .string()
      .describe("Name of the currency to get the exchange rate for."),
  });
  const provider = async (input: any) => {
    const { currency } = schema.parse(input);
    return {
      sourceCurrency: currency,
      targetCurrency: "TRL",
      exchangeRate: 47.5,
    };
  };
  return { provider, schema, name, description };
};

export { create, name, description };
