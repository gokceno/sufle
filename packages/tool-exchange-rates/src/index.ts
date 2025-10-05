import { z } from "zod";
import { fetchCurrency } from "kurlar";

const name: string = "exchangeRates";
const description: string = `Get exchange rate information for input currency. When asked about exchange rates for ANY currency, you MUST call the "exchangeRates" tool with the 3-letter currency code.`;

const create = (opts) => {
  const schema = z.object({
    currency: z
      .enum([
        "USD",
        "AUD",
        "DKK",
        "EUR",
        "GBP",
        "CHF",
        "SEK",
        "CAD",
        "KWD",
        "NOK",
        "SAR",
        "JPY",
        "BGN",
        "RON",
        "RUB",
        "CNY",
        "PKR",
        "QAR",
        "KRW",
        "AZN",
        "AED",
      ])
      .describe("3-letter code of the currency to get the exchange rate for."),
  });
  const provider = async (input: any) => {
    const { currency } = schema.parse(input);
    const result = await fetchCurrency({
      currency,
    });
    return result;
  };
  return { provider, schema, name, description };
};

export { create, name, description };
