"use client";

import { Languages } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getLocale, locales, setLocale } from "@/paraglide/runtime.js";
import {
  locale_ar,
  locale_de,
  locale_en,
  locale_he,
  locale_ru,
  setup_review_language,
} from "@/paraglide/messages";

const labels: Record<(typeof locales)[number], () => string> = {
  en: () => String(locale_en()),
  de: () => String(locale_de()),
  ru: () => String(locale_ru()),
  ar: () => String(locale_ar()),
  he: () => String(locale_he()),
};

export function LocaleSwitcher() {
  const current = getLocale();

  return (
    <Select
      variant="ghost"
      value={current}
      onValueChange={(value) => {
        void setLocale(value as (typeof locales)[number]);
      }}
    >
      <SelectTrigger
        aria-label={String(setup_review_language())}
        size="md"
        className={cn(
          "h-9 w-[min(100%,11rem)] gap-2 rounded-xl border border-sky-200/80 bg-white/80 px-3 text-sm font-medium text-gray-700 shadow-sm backdrop-blur-sm",
          "transition-all hover:border-sky-300/90 hover:bg-white/95 hover:shadow",
          "data-[state=open]:border-sky-300 data-[state=open]:bg-white data-[state=open]:shadow-md",
          "focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:ring-offset-0",
          "[&>svg:last-child]:h-4 [&>svg:last-child]:w-4 [&>svg:last-child]:shrink-0 [&>svg:last-child]:text-gray-500",
        )}
      >
        <Languages
          className="h-3.5 w-3.5 shrink-0 text-sky-600/90"
          aria-hidden
        />
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        position="popper"
        className={cn(
          "z-[60] max-h-72 min-w-[var(--radix-select-trigger-width)] rounded-xl border border-sky-200/80 bg-white/95 p-1.5 text-sm shadow-lg shadow-sky-200/40 backdrop-blur-md",
        )}
      >
        {locales.map((loc) => (
          <SelectItem
            key={loc}
            value={loc}
            className={cn(
              "rounded-lg py-2 text-center text-gray-700",
              "pl-8 pr-8",
              "[&>span:last-child]:block [&>span:last-child]:w-full",
              "focus:bg-sky-50 data-[highlighted]:bg-sky-50",
              "data-[state=checked]:bg-indigo-50/90 data-[state=checked]:text-gray-800",
            )}
          >
            {labels[loc]()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
