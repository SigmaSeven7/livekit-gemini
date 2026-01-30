"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ConfigurationFormFieldProps,
  ConfigurationFormSchema,
} from "@/components/configuration-form";
import {
  FormField,
  FormControl,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { modalities } from "@/data/modalities";

export function ModalitiesSelector({
  form,
  ...props
}: ConfigurationFormFieldProps) {
  const [hoverCardOpen, setHoverCardOpen] = React.useState(false);

  return (
    <FormField
      control={form.control}
      name="modalities"
      render={({ field }) => (
        <FormItem className="flex flex-row items-center space-y-0 justify-between px-1">
          <FormLabel className="text-sm font-medium text-fg1">Response modalities</FormLabel>
          <HoverCard openDelay={200} open={hoverCardOpen} onOpenChange={setHoverCardOpen}>
            <HoverCardTrigger asChild>
              <div>
                <Select
                  onValueChange={(v) => {
                    if (
                      ConfigurationFormSchema.shape.modalities.safeParse(v).success
                    ) {
                      field.onChange(v);
                    }
                  }}
                  defaultValue={form.formState.defaultValues!.modalities!}
                  value={field.value}
                  aria-label="Response modalities"
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose modalities" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {modalities.map((modality) => (
                      <SelectItem
                        key={`select-item-modality-${modality.id}`}
                        value={modality.id}
                      >
                        {modality.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </HoverCardTrigger>
            <HoverCardContent
              align="start"
              className="w-[260px] text-sm"
              side="right"
            >
              The set of modalities the model can respond with.
            </HoverCardContent>
          </HoverCard>
        </FormItem>
      )}
    />
  );
}
