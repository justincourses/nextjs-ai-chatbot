'use client';

import cx from 'classnames';
import { format } from 'date-fns';

interface CurrencyData {
  provider?: string;
  base: string;
  date: string;
  time_last_updated?: number;
  rates: Record<string, number>;
}

interface SingleCurrencyData {
  base: string;
  target: string;
  rate: number;
  date: string;
  provider?: string;
}

type CurrencyResult = CurrencyData | SingleCurrencyData;

function isSingleCurrency(data: CurrencyResult): data is SingleCurrencyData {
  return 'target' in data && 'rate' in data;
}

const SAMPLE_SINGLE: SingleCurrencyData = {
  base: 'USD',
  target: 'EUR',
  rate: 0.881,
  date: '2025-05-24',
  provider: 'https://www.exchangerate-api.com'
};

const SAMPLE_MULTIPLE: CurrencyData = {
  provider: 'https://www.exchangerate-api.com',
  base: 'USD',
  date: '2025-05-24',
  rates: {
    'EUR': 0.881,
    'JPY': 142.67,
    'GBP': 0.74,
    'CNY': 7.18,
    'CAD': 1.38,
    'AUD': 1.54,
    'CHF': 0.822,
    'KRW': 1368.37
  }
};

export function Currency({
  currencyData = SAMPLE_SINGLE,
}: {
  currencyData?: CurrencyResult;
}) {
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatRate = (rate: number) => {
    if (rate >= 1) {
      return rate.toFixed(2);
    } else {
      return rate.toFixed(4);
    }
  };

  if (isSingleCurrency(currencyData)) {
    // Single currency conversion display
    return (
      <div className="flex flex-col gap-4 rounded-2xl p-4 bg-gradient-to-br from-green-500 to-emerald-600 text-white max-w-[400px]">
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-col">
            <div className="text-sm opacity-90">Exchange Rate</div>
            <div className="text-2xl font-bold">
              {currencyData.base} → {currencyData.target}
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-3xl font-bold">
              {formatRate(currencyData.rate)}
            </div>
            <div className="text-sm opacity-90">
              1 {currencyData.base} = {formatRate(currencyData.rate)} {currencyData.target}
            </div>
          </div>
        </div>
        
        <div className="flex flex-row justify-between items-center text-sm opacity-90">
          <div>Updated: {formatDate(currencyData.date)}</div>
          {currencyData.provider && (
            <div>Exchange Rate API</div>
          )}
        </div>
      </div>
    );
  } else {
    // Multiple currencies display
    const popularCurrencies = ['EUR', 'JPY', 'GBP', 'CNY', 'CAD', 'AUD'];
    const displayCurrencies = popularCurrencies.filter(currency => 
      currencyData.rates[currency] !== undefined
    ).slice(0, 6);

    return (
      <div className="flex flex-col gap-4 rounded-2xl p-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white max-w-[500px]">
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-col">
            <div className="text-sm opacity-90">Exchange Rates</div>
            <div className="text-2xl font-bold">
              {currencyData.base} Base
            </div>
          </div>
          <div className="text-sm opacity-90">
            {formatDate(currencyData.date)}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {displayCurrencies.map((currency) => (
            <div key={currency} className="flex flex-row justify-between items-center bg-white/10 rounded-lg p-3">
              <div className="flex flex-col">
                <div className="font-semibold">{currency}</div>
                <div className="text-xs opacity-90">
                  1 {currencyData.base}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">
                  {formatRate(currencyData.rates[currency])}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {Object.keys(currencyData.rates).length > displayCurrencies.length && (
          <div className="text-center text-sm opacity-90">
            +{Object.keys(currencyData.rates).length - displayCurrencies.length} more currencies available
          </div>
        )}
      </div>
    );
  }
}
