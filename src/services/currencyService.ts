import { useState, useEffect } from 'react';

export const currencies = [
  { code: "INR", symbol: "₹" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "JPY", symbol: "¥" },
];

export function useCurrency() {
  const [currency, setCurrency] = useState(() => {
    const saved = localStorage.getItem('finflow_currency');
    return saved ? JSON.parse(saved) : currencies[0];
  });

  const updateCurrency = (code: string) => {
    const selected = currencies.find(c => c.code === code) || currencies[0];
    setCurrency(selected);
    localStorage.setItem('finflow_currency', JSON.stringify(selected));
    // Trigger a storage event for other components if needed
    window.dispatchEvent(new Event('storage'));
  };

  return { currency, updateCurrency };
}

export function formatCurrency(amount: number, currency: { code: string, symbol: string }) {
  return `${currency.symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
