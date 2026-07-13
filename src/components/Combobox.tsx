import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search } from 'lucide-react';

export default function Combobox({
  value, onChange, options, placeholder, allowCreate = true,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  allowCreate?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (!allowCreate) setQuery(value);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [allowCreate, value]);

  useEffect(() => {
    if (!open) return;
    const updateRect = () => {
      if (!rootRef.current) return;
      const r = rootRef.current.getBoundingClientRect();
      setRect({ top: r.bottom + 8, left: r.left, width: r.width });
    };
    updateRect();
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [open]);

  const searchText = allowCreate ? value : query;
  const filtered = options.filter(o => o.toLowerCase().includes(searchText.toLowerCase()));
  const exactMatch = options.some(o => o.toLowerCase() === searchText.trim().toLowerCase());

  const handleSelect = (option: string) => {
    onChange(option);
    setQuery(option);
    setOpen(false);
  };

  const showDropdown = open && rect && (filtered.length > 0 || (allowCreate && searchText.trim() && !exactMatch) || (!allowCreate && searchText.trim() && filtered.length === 0));

  return (
    <div ref={rootRef} className="relative">
      <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        type="text"
        required
        value={searchText}
        onChange={e => allowCreate ? onChange(e.target.value) : setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        className="glass-input w-full p-4 pr-11 rounded-2xl"
        placeholder={placeholder}
        autoComplete="off"
      />
      {showDropdown && createPortal(
        <div
          style={{ position: 'fixed', top: rect.top, left: rect.left, width: rect.width, zIndex: 9999 }}
          className="glass-card rounded-2xl overflow-hidden shadow-xl max-h-56 overflow-y-auto bg-white/95 dark:bg-gray-900/95"
        >
          {filtered.map(option => (
            <button
              key={option}
              type="button"
              onMouseDown={e => { e.preventDefault(); handleSelect(option); }}
              className="w-full text-right px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              {option}
            </button>
          ))}
          {allowCreate && searchText.trim() && !exactMatch && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); setOpen(false); }}
              className="w-full text-right px-4 py-3 text-sm font-bold text-primary hover:bg-primary/10 transition-colors flex items-center gap-2 border-t border-white/40 dark:border-white/5"
            >
              <Plus size={14} />
              إنشاء جديد: {searchText.trim()}
            </button>
          )}
          {!allowCreate && searchText.trim() && filtered.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">لا توجد نتائج</div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
