import React, { createContext, useContext, useState, useEffect } from 'react';
import { IndianRupee, DollarSign, Euro, PoundSterling, Coins } from 'lucide-react';

const CurrencyContext = createContext({
  currency: '₹',
  setCurrency: () => {},
  formatAmount: (amount) => `₹${amount}`,
  currencies: []
});

export const AVAILABLE_CURRENCIES = [
  { symbol: '₹', code: 'INR', name: 'Indian Rupee (₹)', country: 'India' },
  { symbol: '$', code: 'USD', name: 'US Dollar ($)', country: 'United States' },
  { symbol: '€', code: 'EUR', name: 'Euro (€)', country: 'European Union' },
  { symbol: '£', code: 'GBP', name: 'British Pound (£)', country: 'United Kingdom' },
  { symbol: 'AED', code: 'AED', name: 'UAE Dirham (AED)', country: 'United Arab Emirates' },
  { symbol: 'SAR', code: 'SAR', name: 'Saudi Riyal (SAR)', country: 'Saudi Arabia' }
];

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => {
    try {
      return localStorage.getItem('resstock_currency') || '₹';
    } catch (e) {
      return '₹';
    }
  });

  const setCurrency = (symbol) => {
    setCurrencyState(symbol);
    try {
      localStorage.setItem('resstock_currency', symbol);
    } catch (e) {
      console.error('Failed to save currency to localStorage:', e);
    }
  };

  const formatAmount = (amount, decimals = 2) => {
    const num = parseFloat(amount) || 0;
    const formatted = num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    // Add a space if currency symbol is a word like 'AED' or 'SAR'
    const space = currency.length > 1 ? ' ' : '';
    return `${currency}${space}${formatted}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        formatAmount,
        currencies: AVAILABLE_CURRENCIES
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

export function CurrencyIcon({ className = 'w-5 h-5', currency = '₹' }) {
  if (currency === '₹') return <IndianRupee className={className} />;
  if (currency === '$') return <DollarSign className={className} />;
  if (currency === '€') return <Euro className={className} />;
  if (currency === '£') return <PoundSterling className={className} />;
  return <Coins className={className} />;
}
