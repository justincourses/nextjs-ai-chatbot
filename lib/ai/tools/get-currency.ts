import { tool } from 'ai';
import { z } from 'zod';

export const getCurrency = tool({
  description: 'Get current exchange rates for a base currency',
  parameters: z.object({
    baseCurrency: z.string().default('USD').describe('The base currency code (e.g., USD, EUR, JPY, CNY)'),
    targetCurrency: z.string().optional().describe('Optional target currency code to get specific rate'),
  }),
  execute: async ({ baseCurrency, targetCurrency }) => {
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${baseCurrency.toUpperCase()}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
    }

    const currencyData = await response.json();
    
    // If a specific target currency is requested, return just that rate
    if (targetCurrency) {
      const rate = currencyData.rates[targetCurrency.toUpperCase()];
      if (rate) {
        return {
          base: currencyData.base,
          target: targetCurrency.toUpperCase(),
          rate: rate,
          date: currencyData.date,
          provider: currencyData.provider
        };
      } else {
        throw new Error(`Currency ${targetCurrency.toUpperCase()} not found`);
      }
    }
    
    // Return all rates
    return currencyData;
  },
});
