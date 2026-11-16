"use client";

import { useMemo, useState } from "react";
import { Select } from "@base-ui/react/select";
import { Switch } from "@base-ui/react/switch";
import { Slider } from "@base-ui/react/slider";
import { Popover } from "@base-ui/react/popover";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface OrbisSelectProps {
  value: string;
  onValueChange: (next: string) => void;
  options: SelectOption[];
  ariaLabel: string;
  placeholder?: string;
  className?: string;
}

export function OrbisSelect({
  value,
  onValueChange,
  options,
  ariaLabel,
  placeholder = "Select…",
  className = "",
}: OrbisSelectProps) {
  const activeLabel =
    options.find((o) => o.value === value)?.label ?? placeholder;

  return (
    <Select.Root
      items={options}
      value={value}
      onValueChange={(next) => {
        if (next != null) onValueChange(String(next));
      }}
    >
      <Select.Trigger
        aria-label={ariaLabel}
        className={`orbis-press inline-flex items-center justify-between gap-2 rounded-xl border border-white/15 bg-[#0d1017] px-3 py-2 text-xs text-zinc-100 hover:border-white/25 focus-visible:outline-2 focus-visible:outline-cyan-400 ${className}`}
      >
        <span className="truncate">{activeLabel}</span>
        <Select.Icon className="text-zinc-400 shrink-0">
          <ChevronDown className="size-3.5" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          alignItemWithTrigger={false}
          sideOffset={6}
          className="z-[70]"
        >
          <Select.Popup className="orbis-popover orbis-glass min-w-[180px] max-w-[300px] max-h-64 overflow-y-auto rounded-2xl p-1.5 shadow-2xl">
            <Select.List className="space-y-0.5">
              {options.map((opt) => (
                <Select.Item
                  key={opt.value}
                  value={opt.value}
                  className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs text-zinc-200 cursor-pointer outline-none data-[highlighted]:bg-white/10 data-[selected]:text-white data-[selected]:font-medium"
                >
                  <Select.ItemText className="truncate">
                    {opt.label}
                  </Select.ItemText>
                  <Select.ItemIndicator className="text-cyan-400 shrink-0">
                    <Check className="size-3.5" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

interface OrbisSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  accent?: "cyan" | "amber";
}

export function OrbisSwitch({
  checked,
  onCheckedChange,
  label,
  accent = "cyan",
}: OrbisSwitchProps) {
  const checkedTrack =
    accent === "amber"
      ? "data-[checked]:border-amber-400/60 data-[checked]:bg-amber-400/20"
      : "data-[checked]:border-cyan-400/60 data-[checked]:bg-cyan-400/20";
  const checkedThumb =
    accent === "amber"
      ? "data-[checked]:bg-amber-300"
      : "data-[checked]:bg-cyan-300";

  return (
    <label className="inline-flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer select-none">
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={`orbis-press relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-white/15 bg-white/10 p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 ${checkedTrack}`}
      >
        <Switch.Thumb
          className={`pointer-events-none block size-3.5 rounded-full bg-zinc-400 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] data-[checked]:translate-x-4 ${checkedThumb}`}
        />
      </Switch.Root>
      <span>{label}</span>
    </label>
  );
}

interface OrbisSliderProps {
  value: number;
  onValueChange: (next: number) => void;
  min: number;
  max: number;
  step?: number;
  ariaLabel: string;
  accent?: "amber" | "cyan";
}

export function OrbisSlider({
  value,
  onValueChange,
  min,
  max,
  step = 1,
  ariaLabel,
  accent = "amber",
}: OrbisSliderProps) {
  const barColor = accent === "cyan" ? "bg-cyan-400" : "bg-amber-400";
  const thumbBorder =
    accent === "cyan"
      ? "border-cyan-400 shadow-[0_0_12px_rgba(56,189,248,0.45)]"
      : "border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.45)]";

  return (
    <Slider.Root
      value={value}
      min={min}
      max={max}
      step={step}
      onValueChange={(val) => onValueChange(Array.isArray(val) ? val[0] : val)}
    >
      <Slider.Control className="relative flex w-full touch-none select-none items-center py-2.5 cursor-pointer">
        <Slider.Track className="relative h-1.5 w-full grow rounded-full bg-white/12 overflow-hidden">
          <Slider.Indicator className={`h-full rounded-full ${barColor}`} />
        </Slider.Track>
        <Slider.Thumb
          aria-label={ariaLabel}
          className={`block size-4 rounded-full bg-white border-2 transition-transform active:scale-110 focus-visible:outline-2 focus-visible:outline-white ${thumbBorder}`}
        />
      </Slider.Control>
    </Slider.Root>
  );
}

interface OrbisDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (next: string) => void;
  ariaLabel?: string;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseIsoParts(iso: string): [number, number, number] {
  const parts = iso.split("-").map(Number);
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return [parts[0], parts[1] - 1, parts[2]];
  }
  const now = new Date();
  return [now.getFullYear(), now.getMonth(), now.getDate()];
}

function toIso(y: number, mZero: number, d: number): string {
  return `${y}-${String(mZero + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function OrbisDatePicker({
  value,
  onChange,
  ariaLabel = "Select date watched",
}: OrbisDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [selY, selM, selD] = parseIsoParts(value);
  const [viewYear, setViewYear] = useState(selY);
  const [viewMonth, setViewMonth] = useState(selM);

  const formattedDisplay = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(selY, selM, selD));
  }, [selY, selM, selD]);

  const firstDayOffset = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setViewYear(selY);
          setViewMonth(selM);
        }
        setOpen(next);
      }}
    >
      <Popover.Trigger
        aria-label={ariaLabel}
        className="orbis-press w-full inline-flex items-center justify-between gap-2 rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-xs font-mono text-white tabular-nums hover:border-white/30"
      >
        <span>{formattedDisplay}</span>
        <Calendar className="size-3.5 text-cyan-300 shrink-0" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-[70]">
          <Popover.Popup className="orbis-popover orbis-glass w-64 rounded-2xl p-3 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="orbis-press rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
                aria-label="Previous month"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="font-mono text-xs font-medium text-white">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="orbis-press rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
                aria-label="Next month"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] text-zinc-500">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs tabular-nums">
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <span key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                (day) => {
                  const iso = toIso(viewYear, viewMonth, day);
                  const isSelected = iso === value;
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => {
                        onChange(iso);
                        setOpen(false);
                      }}
                      className={`orbis-press h-7 rounded-lg flex items-center justify-center ${
                        isSelected
                          ? "bg-amber-400 text-black font-bold"
                          : "text-zinc-200 hover:bg-white/10"
                      }`}
                    >
                      {day}
                    </button>
                  );
                },
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-2">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  onChange(
                    toIso(now.getFullYear(), now.getMonth(), now.getDate()),
                  );
                  setOpen(false);
                }}
                className="font-mono text-[11px] text-cyan-300 hover:underline"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const yest = new Date(Date.now() - 86400000);
                  onChange(
                    toIso(yest.getFullYear(), yest.getMonth(), yest.getDate()),
                  );
                  setOpen(false);
                }}
                className="font-mono text-[11px] text-zinc-400 hover:text-white"
              >
                Yesterday
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
