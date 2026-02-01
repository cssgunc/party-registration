"use client";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LocationService } from "@/lib/api/location/location.service";
import { AutocompleteResult } from "@/lib/api/location/location.types";
import { cn } from "@/lib/utils";
import { CheckIcon, Loader2Icon, MapPinIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface AddressSearchProps {
  value?: string;
  onSelect: (address: AutocompleteResult | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  locationService?: LocationService;
  error?: string;
}

/**
 * Reusable address search component with autocomplete functionality
 * Built using shadcn Combobox pattern with async address fetching
 */
export default function AddressSearch({
  value = "",
  onSelect,
  placeholder = "Search for an address...",
  className,
  disabled = false,
  locationService = new LocationService(),
  error: externalError,
}: AddressSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] =
    useState<AutocompleteResult | null>(null);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const commandRef = useRef<HTMLDivElement>(null);

  const displayError = externalError || internalError;

  /**
   * Sync internal state with external value prop
   */
  useEffect(() => {
    if (value && value !== selectedAddress?.formatted_address) {
      setSearchTerm(value); // Ensure input shows the initial value
      // If there's an external value, try to find matching suggestion
      const match = suggestions.find((s) => s.formatted_address === value);
      if (match) {
        setSelectedAddress(match);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  /**
   * Fetch address suggestions with debouncing
   * Skip fetching if the search term matches the selected address
   */
  useEffect(() => {
    const fetchSuggestions = async (input: string) => {
      const trimmedInput = input.trim();

      if (trimmedInput.length < 3) {
        setSuggestions([]);
        return;
      }

      // Skip API call if the search term exactly matches the selected address
      if (
        selectedAddress &&
        selectedAddress.formatted_address === trimmedInput
      ) {
        setSuggestions([selectedAddress]);
        return;
      }

      setIsLoading(true);
      setInternalError(null);

      try {
        const results = await locationService.autocompleteAddress(trimmedInput);
        setSuggestions(results);
      } catch (err) {
        console.error("Error fetching address suggestions:", err);
        setInternalError(
          "Failed to fetch address suggestions. Please try again."
        );
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(searchTerm);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm, locationService, selectedAddress]);

  /**
   * Handle address selection from dropdown
   */
  const handleSelect = (currentValue: string) => {
    const suggestion = suggestions.find(
      (s) => s.google_place_id === currentValue
    );

    if (suggestion) {
      setSelectedAddress(suggestion);
      setSearchTerm(suggestion.formatted_address);
      onSelect(suggestion);
    }

    setOpen(false);
    setInternalError(null);
  };

  /**
   * Clear the selected address
   */
  const handleClear = () => {
    setSelectedAddress(null);
    setSearchTerm("");
    setSuggestions([]);
    setOpen(false);
    setInternalError(null);
    onSelect(null);
  };

  /**
   * Handle input value changes
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);

    // Open popover when user starts typing
    if (newValue.length >= 3) {
      setOpen(true);
    }
  };

  /**
   * Handle input focus - open popover if there's enough text
   */
  const handleFocus = () => {
    if (searchTerm.length >= 3) {
      setOpen(true);
    }
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelect(suggestions[highlightedIndex].google_place_id);
        }
        break;
      case "Escape":
        setOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Reset highlighted index when suggestions change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestions]);

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              ref={inputRef}
              value={searchTerm}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className={cn("pr-16", displayError && "border-destructive")}
              aria-label="Address search input"
              aria-describedby={displayError ? "address-error" : undefined}
              aria-invalid={!!displayError}
              aria-controls="address-suggestions"
              aria-autocomplete="list"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {isLoading && (
                <Loader2Icon
                  className="h-4 w-4 animate-spin text-muted-foreground"
                  aria-label="Loading suggestions"
                />
              )}
              {searchTerm && !disabled && !isLoading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-transparent cursor-pointer"
                  onClick={handleClear}
                  aria-label="Clear address selection"
                  tabIndex={-1}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={false} ref={commandRef} loop>
            <CommandList id="address-suggestions">
              {isLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {displayError && !isLoading && (
                <div
                  className="px-3 py-2 text-sm text-destructive"
                  role="alert"
                >
                  {displayError}
                </div>
              )}
              {!displayError && !isLoading && searchTerm.trim().length < 3 && (
                <CommandEmpty>
                  Type at least 3 characters to search.
                </CommandEmpty>
              )}
              {!displayError &&
                !isLoading &&
                searchTerm.trim().length >= 3 &&
                suggestions.length === 0 && (
                  <CommandEmpty>
                    No addresses found. Try a different search.
                  </CommandEmpty>
                )}
              {!isLoading && suggestions.length > 0 && (
                <CommandGroup>
                  {suggestions.map((suggestion, index) => (
                    <CommandItem
                      key={suggestion.google_place_id}
                      value={suggestion.google_place_id}
                      onSelect={handleSelect}
                      className={cn(
                        "cursor-pointer",
                        highlightedIndex === index && "bg-accent"
                      )}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <MapPinIcon className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="line-clamp-2 text-sm flex-1">
                        {suggestion.formatted_address}
                      </span>
                      <CheckIcon
                        className={cn(
                          "ml-2 h-4 w-4 flex-shrink-0",
                          selectedAddress?.google_place_id ===
                            suggestion.google_place_id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {displayError && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {displayError}
        </p>
      )}

      {selectedAddress && (
        <div className="mt-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
          <p className="text-sm font-medium text-green-900 dark:text-green-100">
            ✓ Selected: {selectedAddress.formatted_address}
          </p>
        </div>
      )}
    </div>
  );
}
