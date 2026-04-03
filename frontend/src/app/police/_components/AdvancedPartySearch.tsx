import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IncidentSeverity } from "@/lib/api/location/location.types";
import { ContactPreference } from "@/lib/api/student/student.types";
import { X } from "lucide-react";
import { useMemo, useState } from "react";

export type TimeFilterType = "" | "before" | "after" | "exact";
export type ContactPreferenceFilter = "" | ContactPreference;
export type SeverityFilter = "" | IncidentSeverity;

export type AdvancedPartyFilters = {
  timeFilterType: TimeFilterType;
  startTime: string;
  name: string;
  phone: string;
  contactPreference: ContactPreferenceFilter;
  severity: SeverityFilter;
};

type Props = {
  filters: AdvancedPartyFilters;
  onFiltersChange: (next: AdvancedPartyFilters) => void;
};

export default function AdvancedPartySearch({
  filters,
  onFiltersChange,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedCount = useMemo(() => {
    let count = 0;
    if (filters.startTime) count++;
    if (filters.phone) count++;
    if (filters.name) count++;
    if (filters.contactPreference) count++;
    if (filters.severity) count++;
    return count;
  }, [filters]);

  function patch<K extends keyof AdvancedPartyFilters>(
    key: K,
    value: AdvancedPartyFilters[K]
  ) {
    onFiltersChange({ ...filters, [key]: value });
  }

  function clearAllFilters() {
    onFiltersChange({
      timeFilterType: "exact",
      startTime: "",
      name: "",
      phone: "",
      contactPreference: "",
      severity: "",
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="link"
          className="p-0 h-auto text-secondary content underline"
          onClick={() => {
            setIsOpen((open) => !open);
            clearAllFilters();
          }}
        >
          {!isOpen ? "Advanced Search" : "Hide Advanced Search"}
        </Button>

        <div className="flex items-center gap-3">
          {isOpen && (
            <span className="content text-secondary">
              ({selectedCount}) Selected
            </span>
          )}
          {selectedCount > 0 && (
            <Button
              type="button"
              size="sm"
              onClick={clearAllFilters}
              title="Clear all filters"
            >
              Clear all filters
            </Button>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-3">
          <div className="flex flex-col gap-1">
            <Label>Start</Label>
            <div className="flex gap-2">
              <Select
                value={filters.timeFilterType || "exact"}
                onValueChange={(val: TimeFilterType) =>
                  patch("timeFilterType", val)
                }
              >
                <SelectTrigger className="w-28 bg-card border-border input-shadow">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="before">Before</SelectItem>
                  <SelectItem value="after">After</SelectItem>
                  <SelectItem value="exact">Exactly</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="time"
                value={filters.startTime}
                onChange={(e) => patch("startTime", e.target.value)}
                className="w-36 bg-card border-border input-shadow"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label>Phone</Label>
            <Input
              className="w-36 bg-card border-border input-shadow"
              placeholder="None"
              type="text"
              value={filters.phone}
              onChange={(e) => patch("phone", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label>Name</Label>
            <Input
              className="w-36 bg-card border-border input-shadow"
              placeholder="None"
              type="text"
              value={filters.name}
              onChange={(e) => patch("name", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label>Preference</Label>
            <Select
              value={filters.contactPreference}
              onValueChange={(val: ContactPreferenceFilter) =>
                patch("contactPreference", val)
              }
            >
              <SelectTrigger className="w-36 bg-card border-border input-shadow">
                <SelectValue placeholder="None" />
                {filters.contactPreference && (
                  <span
                    role="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      patch("contactPreference", "");
                    }}
                    className="ml-1 rounded-sm opacity-60 hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="text">Text</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label>Citation Type</Label>
            <Select
              value={filters.severity}
              onValueChange={(val: SeverityFilter) => patch("severity", val)}
            >
              <SelectTrigger className="w-40 bg-card border-border input-shadow">
                <SelectValue placeholder="None" />
                {filters.severity && (
                  <span
                    role="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      patch("severity", "");
                    }}
                    className="ml-1 rounded-sm opacity-60 hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="complaint">Complaint</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="citation">Citation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
