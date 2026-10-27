import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, ChevronDownIcon, SearchIcon, SparklesIcon, MicIcon } from 'lucide-react';
import type { VoiceProfile } from '@/types/voicestudio';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel: string;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  menuPortal?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function SearchableSelect({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder = 'Select…',
  disabled = false,
  searchable = true,
  menuPortal = false,
  className = '',
  size = 'md',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 220,
  });

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q)),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    const idx = filtered.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
    if (menuPortal && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 220),
      });
    }
    if (searchable && options.length > 5) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [open, menuPortal, searchable, options.length]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) =>
        filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0,
      );
    } else if (e.key === 'Enter' && filtered[activeIndex] && !filtered[activeIndex].disabled) {
      e.preventDefault();
      onChange(filtered[activeIndex].value);
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  const menuContent = open ? (
    <div
      ref={menuRef}
      id={listboxId}
      role="listbox"
      aria-label={ariaLabel}
      style={
        menuPortal
          ? {
              position: 'fixed',
              top: Math.min(coords.top, window.innerHeight - 280),
              left: Math.min(coords.left, window.innerWidth - coords.width - 12),
              width: coords.width,
              zIndex: 9999,
            }
          : undefined
      }
      className={`${
        menuPortal ? '' : 'absolute left-0 right-0 top-full z-50 mt-1 min-w-[200px]'
      } overflow-hidden rounded-lg border border-zinc-800 bg-[#14111c] text-zinc-100 shadow-2xl ring-1 ring-white/5`}
      onKeyDown={handleKeyDown}
    >
      {searchable && options.length > 5 && (
        <div className="flex items-center gap-2 border-b border-zinc-800/80 px-2.5 py-1.5">
          <SearchIcon className="size-3.5 shrink-0 text-zinc-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Filter options…"
            aria-label={`Search ${ariaLabel}`}
            className="w-full bg-transparent text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
        </div>
      )}
      <div className="max-h-56 overflow-y-auto p-1">
        {filtered.length === 0 ? (
          <div className="px-2.5 py-3 text-center text-xs text-zinc-500">No matching options</div>
        ) : (
          filtered.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isFocused = idx === activeIndex;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={opt.disabled}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => {
                  if (opt.disabled) return;
                  onChange(opt.value);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                  opt.disabled
                    ? 'cursor-not-allowed opacity-40'
                    : isFocused
                      ? 'bg-[#251f33] text-white'
                      : isSelected
                        ? 'bg-[#F47FA3]/15 text-[#FFD0DB]'
                        : 'text-zinc-300 hover:bg-zinc-800/60'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 truncate font-medium">
                    <span className="truncate">{opt.label}</span>
                    {opt.badge && (
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-normal text-zinc-400">
                        {opt.badge}
                      </span>
                    )}
                  </div>
                  {opt.sublabel && (
                    <div className="truncate text-[11px] text-zinc-400">{opt.sublabel}</div>
                  )}
                </div>
                {isSelected && <CheckIcon className="size-3.5 shrink-0 text-[#F47FA3]" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-md border border-zinc-800 bg-zinc-900/90 text-left text-zinc-100 transition-colors hover:border-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F47FA3]/70 disabled:cursor-not-allowed disabled:opacity-50 ${
          size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-xs'
        }`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : <span className="text-zinc-500">{placeholder}</span>}
        </span>
        <ChevronDownIcon
          className={`size-3.5 shrink-0 text-zinc-400 transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {menuPortal && typeof document !== 'undefined'
        ? createPortal(menuContent, document.body)
        : menuContent}
    </div>
  );
}

interface VoiceSelectorProps {
  profiles: VoiceProfile[];
  value: string;
  onChange: (voiceId: string) => void;
  ariaLabel?: string;
  allowDefault?: boolean;
  defaultLabel?: string;
  disabled?: boolean;
  menuPortal?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function VoiceSelector({
  profiles,
  value,
  onChange,
  ariaLabel = 'Select voice profile',
  allowDefault = false,
  defaultLabel = 'Default Voice',
  disabled = false,
  menuPortal = false,
  className = '',
  size = 'md',
}: VoiceSelectorProps) {
  const options: SelectOption[] = useMemo(() => {
    const list: SelectOption[] = [];
    if (allowDefault) {
      list.push({
        value: 'default',
        label: defaultLabel,
        sublabel: 'Uses workspace default voice',
      });
    }
    for (const p of profiles) {
      list.push({
        value: p.id,
        label: p.name,
        sublabel: p.instruct || p.language,
        badge: p.kind === 'clone' ? 'Clone' : 'Design',
      });
    }
    return list;
  }, [profiles, allowDefault, defaultLabel]);

  const currentProfile = profiles.find((p) => p.id === value);

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="flex size-6 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400">
        {currentProfile?.kind === 'design' ? (
          <SparklesIcon className="size-3.5 text-[#F7AE73]" />
        ) : (
          <MicIcon className="size-3.5 text-[#F47FA3]" />
        )}
      </div>
      <SearchableSelect
        value={value}
        onChange={onChange}
        options={options}
        ariaLabel={ariaLabel}
        disabled={disabled}
        menuPortal={menuPortal}
        size={size}
        className="min-w-0 flex-1"
      />
    </div>
  );
}
