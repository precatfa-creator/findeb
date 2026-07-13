import type { ComponentType, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export default function SelectField({
  value, onChange, children, className = '', icon: Icon,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  className?: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className={`relative ${className}`}>
      {Icon && <Icon size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`glass-input w-full p-3.5 rounded-2xl appearance-none cursor-pointer ${Icon ? 'pr-11' : ''} pl-10`}
      >
        {children}
      </select>
      <ChevronDown size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}
