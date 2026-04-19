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
import { AdminStudentService } from "@/lib/api/student/admin-student.service";
import { StudentSuggestionDto } from "@/lib/api/student/student.types";
import { cn, formatPhoneNumber } from "@/lib/utils";
import { CheckIcon, Loader2Icon, UserIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface StudentSearchProps {
  value?: string;
  initialSelection?: StudentSuggestionDto | null;
  onSelect: (student: StudentSuggestionDto | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  adminStudentService?: AdminStudentService;
  error?: string;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <strong>{text.slice(index, index + query.length)}</strong>
      {text.slice(index + query.length)}
    </>
  );
}

function highlightPhoneMatch(rawPhone: string, query: string): React.ReactNode {
  const digitQuery = query.replace(/\D/g, "");
  const formatted = formatPhoneNumber(rawPhone);
  if (!digitQuery) return formatted;
  const matchStart = rawPhone.indexOf(digitQuery);
  if (matchStart === -1) return formatted;
  const matchEnd = matchStart + digitQuery.length;
  let digitCount = 0;
  let fmtStart = -1;
  let fmtEnd = -1;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      if (digitCount === matchStart) fmtStart = i;
      digitCount++;
      if (digitCount === matchEnd) {
        fmtEnd = i + 1;
        break;
      }
    }
  }
  if (fmtStart === -1) return formatted;
  if (fmtEnd === -1) fmtEnd = formatted.length;
  return (
    <>
      {formatted.slice(0, fmtStart)}
      <strong>{formatted.slice(fmtStart, fmtEnd)}</strong>
      {formatted.slice(fmtEnd)}
    </>
  );
}

/**
 * Reusable student search component with autocomplete functionality.
 * Searches by PID, email, onyen, or phone number.
 * Suggestions display as "First Last - <matched value>" with the matched substring bolded.
 */
export default function StudentSearch({
  value = "",
  initialSelection,
  onSelect,
  placeholder = "Search by PID, email, onyen, or phone...",
  className,
  disabled = false,
  adminStudentService = new AdminStudentService(),
  error: externalError,
}: StudentSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(
    initialSelection
      ? `${initialSelection.first_name} ${initialSelection.last_name}`
      : value
  );
  const [suggestions, setSuggestions] = useState<StudentSuggestionDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] =
    useState<StudentSuggestionDto | null>(initialSelection ?? null);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const serviceRef = useRef(adminStudentService);
  const selectedStudentRef = useRef(selectedStudent);

  serviceRef.current = adminStudentService;
  selectedStudentRef.current = selectedStudent;

  const displayError = externalError || internalError;

  useEffect(() => {
    if (value && !initialSelection) {
      setSearchTerm(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const fetchSuggestions = async (input: string) => {
      const trimmed = input.trim();

      if (trimmed.length < 1) {
        setSuggestions([]);
        return;
      }

      // Skip API call if search term matches the currently selected student's display name
      const current = selectedStudentRef.current;
      if (current && `${current.first_name} ${current.last_name}` === trimmed) {
        return;
      }

      setIsLoading(true);
      setInternalError(null);

      try {
        const results = await serviceRef.current.autocompleteStudents(trimmed);
        setSuggestions(results);
      } catch (err) {
        console.error("Error fetching student suggestions:", err);
        setInternalError(
          "Failed to fetch student suggestions. Please try again."
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
  }, [searchTerm]);

  const handleSelect = (studentId: string) => {
    const suggestion = suggestions.find(
      (s) => String(s.student_id) === studentId
    );

    if (suggestion) {
      setSelectedStudent(suggestion);
      setSearchTerm(`${suggestion.first_name} ${suggestion.last_name}`);
      onSelect(suggestion);
    }

    setOpen(false);
    setInternalError(null);
  };

  const handleClear = () => {
    setSelectedStudent(null);
    setSearchTerm("");
    setSuggestions([]);
    setOpen(false);
    setInternalError(null);
    onSelect(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedStudent) return;

    const newValue = e.target.value;
    setSearchTerm(newValue);
    if (newValue.length >= 1) {
      setOpen(true);
    }
  };

  const handleFocus = () => {
    if (selectedStudent) return;

    if (searchTerm.length >= 1) {
      setOpen(true);
    }
  };

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
          handleSelect(String(suggestions[highlightedIndex].student_id));
        }
        break;
      case "Escape":
        setOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestions]);

  return (
    <div className={cn("w-full", className)}>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          if (disabled || selectedStudent) return;
          setOpen(nextOpen);
        }}
      >
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
              readOnly={!!selectedStudent}
              className={cn(
                "pr-16",
                selectedStudent &&
                  "bg-muted text-muted-foreground cursor-not-allowed",
                displayError && "border-destructive"
              )}
              aria-label="Student search input"
              aria-describedby={displayError ? "student-error" : undefined}
              aria-invalid={!!displayError}
              aria-controls="student-suggestions"
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
                  aria-label="Clear student selection"
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
          <Command shouldFilter={false} loop>
            <CommandList id="student-suggestions">
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
              {!displayError && !isLoading && searchTerm.trim().length < 1 && (
                <CommandEmpty>Type to search for a student.</CommandEmpty>
              )}
              {!displayError &&
                !isLoading &&
                searchTerm.trim().length >= 1 &&
                suggestions.length === 0 && (
                  <CommandEmpty>No students found.</CommandEmpty>
                )}
              {!isLoading && suggestions.length > 0 && (
                <CommandGroup>
                  {suggestions.map((suggestion, index) => (
                    <CommandItem
                      key={suggestion.student_id}
                      value={String(suggestion.student_id)}
                      onSelect={handleSelect}
                      className={cn(
                        "cursor-pointer",
                        highlightedIndex === index && "bg-accent"
                      )}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <UserIcon className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm flex-1">
                        {suggestion.first_name} {suggestion.last_name}
                        {" — "}
                        {suggestion.matched_field_name === "phone_number"
                          ? highlightPhoneMatch(
                              suggestion.matched_field_value,
                              searchTerm.trim()
                            )
                          : highlightMatch(
                              suggestion.matched_field_value,
                              searchTerm.trim()
                            )}
                      </span>
                      <CheckIcon
                        className={cn(
                          "ml-2 h-4 w-4 flex-shrink-0",
                          selectedStudent?.student_id === suggestion.student_id
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
        <p
          id="student-error"
          className="mt-2 text-sm text-destructive"
          role="alert"
        >
          {displayError}
        </p>
      )}
    </div>
  );
}
