import { format } from 'date-fns';

export const formatLYD = (amount: number) => `${Number(amount).toLocaleString()} د.ل.`;

export const formatDateTime = (value: string | null | undefined) =>
  value ? format(new Date(value), 'dd MMM yyyy, HH:mm') : '-';
