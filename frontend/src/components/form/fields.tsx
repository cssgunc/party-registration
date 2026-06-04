"use client";

import AddressSearch from "@/components/AddressSearch";
import DatePicker from "@/components/DatePicker";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AutocompleteResult } from "@/lib/api/location/location.types";
import { cn, formatPhoneNumberInput } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

/**
 * App-specific form field components built on top of the shadcn `Form`
 * primitives + react-hook-form. Each wraps the
 * FormField -> FormItem -> FormLabel -> FormControl -> FormMessage chain so
 * the label/spacing/error styling lives in one place. Pass `control` and a
 * typed `name`; layout stays in the consuming form. For anything these don't
 * cover, drop down to a raw <FormField> (the escape hatch).
 */

/** Props shared by every field: how it binds + how the surrounding chrome looks. */
type BaseFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: React.ReactNode;
  description?: React.ReactNode;
  /** className for the FormItem (layout: width, grid span, gap overrides). */
  className?: string;
  /** className for the FormLabel. */
  labelClassName?: string;
  /** className for the FormDescription. */
  descriptionClassName?: string;
};

// -- TextField ---------------------------------------------------------------

type TextFieldProps<T extends FieldValues> = BaseFieldProps<T> & {
  inputClassName?: string;
} & Omit<
    React.ComponentProps<typeof Input>,
    "name" | "value" | "defaultValue" | "onChange" | "onBlur" | "className"
  >;

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  labelClassName,
  descriptionClassName,
  inputClassName,
  ...inputProps
}: TextFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel className={labelClassName}>{label}</FormLabel>
          <FormControl>
            <Input
              {...inputProps}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              onChange={field.onChange}
              value={(field.value as string | undefined) ?? ""}
              className={inputClassName}
            />
          </FormControl>
          {description && (
            <FormDescription className={descriptionClassName}>
              {description}
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// -- PhoneField --------------------------------------------------------------

type PhoneFieldProps<T extends FieldValues> = BaseFieldProps<T> & {
  placeholder?: string;
  disabled?: boolean;
  inputClassName?: string;
};

export function PhoneField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  labelClassName,
  descriptionClassName,
  inputClassName,
  placeholder = "(123) 456-7890",
  disabled,
}: PhoneFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel className={labelClassName}>{label}</FormLabel>
          <FormControl>
            <Input
              type="tel"
              placeholder={placeholder}
              disabled={disabled}
              maxLength={14}
              autoComplete="off"
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={formatPhoneNumberInput((field.value as string) ?? "")}
              onChange={(e) =>
                field.onChange(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              className={inputClassName}
            />
          </FormControl>
          {description && (
            <FormDescription className={descriptionClassName}>
              {description}
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// -- PasswordField -----------------------------------------------------------

type PasswordFieldProps<T extends FieldValues> = BaseFieldProps<T> & {
  autoComplete?: string;
  inputClassName?: string;
};

export function PasswordField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  labelClassName,
  descriptionClassName,
  inputClassName,
  autoComplete,
}: PasswordFieldProps<T>) {
  const [show, setShow] = useState(false);
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel className={labelClassName}>{label}</FormLabel>
          <div className="relative">
            <FormControl>
              <Input
                type={show ? "text" : "password"}
                autoComplete={autoComplete}
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                onChange={field.onChange}
                value={(field.value as string | undefined) ?? ""}
                className={cn("pr-10", inputClassName)}
              />
            </FormControl>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setShow((v) => !v)}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </Button>
          </div>
          {description && (
            <FormDescription className={descriptionClassName}>
              {description}
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// -- TextareaField -----------------------------------------------------------

type TextareaFieldProps<T extends FieldValues> = BaseFieldProps<T> & {
  textareaClassName?: string;
} & Omit<
    React.ComponentProps<typeof Textarea>,
    "name" | "value" | "defaultValue" | "onChange" | "onBlur" | "className"
  >;

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  labelClassName,
  descriptionClassName,
  textareaClassName,
  ...textareaProps
}: TextareaFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel className={labelClassName}>{label}</FormLabel>
          <FormControl>
            <Textarea
              {...textareaProps}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              onChange={field.onChange}
              value={(field.value as string | undefined) ?? ""}
              className={textareaClassName}
            />
          </FormControl>
          {description && (
            <FormDescription className={descriptionClassName}>
              {description}
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// -- SelectField -------------------------------------------------------------

type SelectFieldProps<T extends FieldValues> = BaseFieldProps<T> & {
  options: ReadonlyArray<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  triggerClassName?: string;
  itemClassName?: string;
  /** title attr on the trigger (e.g. disabled-field explanation). */
  triggerTitle?: string;
};

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  labelClassName,
  descriptionClassName,
  triggerClassName,
  itemClassName,
  triggerTitle,
  options,
  placeholder,
  disabled,
}: SelectFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel className={labelClassName}>{label}</FormLabel>
          <Select
            value={field.value as string | undefined}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger className={triggerClassName} title={triggerTitle}>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className={itemClassName}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && (
            <FormDescription className={descriptionClassName}>
              {description}
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// -- DateField ---------------------------------------------------------------

type DateFieldProps<T extends FieldValues> = BaseFieldProps<T> &
  Omit<
    React.ComponentProps<typeof DatePicker>,
    "value" | "onChange" | "aria-invalid"
  >;

export function DateField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  labelClassName,
  descriptionClassName,
  ...datePickerProps
}: DateFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className={className}>
          <FormLabel className={labelClassName}>{label}</FormLabel>
          <FormControl>
            <DatePicker
              {...datePickerProps}
              value={(field.value as Date | null | undefined) ?? null}
              onChange={field.onChange}
              aria-invalid={fieldState.invalid}
            />
          </FormControl>
          {description && (
            <FormDescription className={descriptionClassName}>
              {description}
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// -- AddressField ------------------------------------------------------------

type AddressFieldProps<T extends FieldValues> = BaseFieldProps<T> & {
  /**
   * Derives the value stored in the bound field from the selected address.
   * Defaults to the formatted address string.
   */
  getStoredValue?: (address: AutocompleteResult | null) => unknown;
  /** Extra side-effect on select, e.g. setting a companion placeId field. */
  onSelect?: (address: AutocompleteResult | null) => void;
} & Omit<
    React.ComponentProps<typeof AddressSearch>,
    "onSelect" | "error" | "id"
  >;

export function AddressField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  labelClassName,
  descriptionClassName,
  getStoredValue,
  onSelect,
  value,
  ...addressProps
}: AddressFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        // When the bound field holds the formatted address (default), use it as
        // the search input's display value. When it holds something else (e.g. a
        // place_id via getStoredValue), rely on the explicit `value`/initialSelection.
        const displayValue =
          value ?? (getStoredValue ? undefined : (field.value as string));
        return (
          <FormItem className={className}>
            <FormLabel className={labelClassName}>{label}</FormLabel>
            <FormControl>
              <AddressSearch
                {...addressProps}
                value={displayValue}
                error={fieldState.error?.message}
                onSelect={(address) => {
                  field.onChange(
                    getStoredValue
                      ? getStoredValue(address)
                      : (address?.formatted_address ?? "")
                  );
                  onSelect?.(address);
                }}
              />
            </FormControl>
            {description && (
              <FormDescription className={descriptionClassName}>
                {description}
              </FormDescription>
            )}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
