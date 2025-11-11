"use client";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { AutocompleteResult, LocationService } from "@/services/locationService";
import { Loader2Icon, MapPinIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface AddressSearchProps {
  value?: string;
  onSelect: (address: AutocompleteResult | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  locationService: LocationService;
  error?: string;
}

/**
 * Reusable address search component with autocomplete functionality
 */
export default function AddressSearch({
  value = "",
  onSelect,
  placeholder = "Search for an address...",
  className,
  disabled = false,
  locationService,
  error: externalError,
}: AddressSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<AutocompleteResult | null>(null);
  const [internalError, setInternalError] = useState<string | null>(null);
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const displayError = externalError || internalError;

  /**
   * Sync internal state with external value prop
   */
  useEffect(() => {
    if (value !== searchTerm && !selectedAddress) {
      setSearchTerm(value);
    }
  }, [value, searchTerm, selectedAddress]);

  /**
   * Fetch address suggestions with debouncing
   */
  useEffect(() => {
    const fetchSuggestions = async (input: string) => {
      const trimmedInput = input.trim();
      
      if (trimmedInput.length < 3) {
        setSuggestions([]);
        setOpen(false);
        return;
      }

      setIsLoading(true);
      setInternalError(null);

      try {
        const results = await locationService.autocompleteAddress(trimmedInput);
        setSuggestions(results);
        
        if (results.length > 0 && !selectedAddress) {
          setOpen(true);
        } else if (results.length === 0) {
          setOpen(false);
        }
      } catch (err) {
        console.error("Error fetching address suggestions:", err);
        setInternalError("Failed to fetch address suggestions. Please try again.");
        setSuggestions([]);
        setOpen(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (selectedAddress) {
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(searchTerm);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm, selectedAddress, locationService]);

  /**
   * Handle address selection from dropdown
   */
  const handleSelect = (suggestion: AutocompleteResult) => {
    setSelectedAddress(suggestion);
    setSearchTerm(suggestion.formatted_address);
    setSuggestions([]);
    setOpen(false);
    setInternalError(null);
    onSelect(suggestion);
  };

  /**
   * Clear selected address and reset component state
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
   * Handle input text changes
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedAddress) {
      return;
    }
    setSearchTerm(e.target.value);
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape" && selectedAddress) {
      e.preventDefault();
      // Allow user to clear selection with Escape key
      handleClear();
    }
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Popover open={open && !selectedAddress && !disabled} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              value={searchTerm}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || !!selectedAddress}
              className={cn(
                "pr-20",
                selectedAddress && "cursor-not-allowed bg-muted",
                displayError && "border-destructive"
              )}
              readOnly={!!selectedAddress}
              aria-label="Address search input"
              aria-describedby={displayError ? "address-error" : undefined}
              aria-invalid={!!displayError}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {isLoading && (
                <Loader2Icon 
                  className="h-4 w-4 animate-spin text-muted-foreground" 
                  aria-label="Loading suggestions"
                />
              )}
              {selectedAddress && !disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hover:bg-transparent"
                  onClick={handleClear}
                  aria-label="Clear address selection"
                  tabIndex={0}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              )}
              <MapPinIcon 
                className="h-4 w-4 text-muted-foreground" 
                aria-hidden="true"
              />
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandList>
              {displayError && (
                <div 
                  id="address-error"
                  className="px-3 py-2 text-sm text-destructive"
                  role="alert"
                >
                  {displayError}
                </div>
              )}
              {!displayError && !isLoading && searchTerm.trim().length < 3 && (
                <CommandEmpty>Type at least 3 characters to search.</CommandEmpty>
              )}
              {!displayError && !isLoading && searchTerm.trim().length >= 3 && suggestions.length === 0 && (
                <CommandEmpty>No addresses found. Try a different search.</CommandEmpty>
              )}
              {suggestions.length > 0 && (
                <CommandGroup>
                  {suggestions.map((suggestion) => (
                    <CommandItem
                      key={suggestion.place_id}
                      value={suggestion.place_id}
                      onSelect={() => handleSelect(suggestion)}
                      className="cursor-pointer"
                    >
                      <MapPinIcon className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="line-clamp-2 text-sm">
                        {suggestion.formatted_address}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
