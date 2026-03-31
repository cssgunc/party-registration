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
      <div className="my-4 2xl:flex 2xl:justify-between">
        <Button
          type="button"
          variant="link"
          className="p-0 content"
          onClick={() => {
            setIsOpen((open) => !open);
            clearAllFilters();
          }}
        >
          {!isOpen && <p>Advanced Search</p>}
          {isOpen && <p>Hide Advanced Search</p>}
        </Button>

        <div className="flex items-center gap-4">
          {isOpen && <p className="content">({selectedCount}) Selected</p>}
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
        <div className="flex flex-wrap gap-4">
          <div>
            <Label className="mb-2">Start</Label>
            <div className="flex gap-2 items-end">
              <div className="flex gap-2">
                <Select
                  value={filters.timeFilterType || "exact"}
                  onValueChange={(val: TimeFilterType) =>
                    patch("timeFilterType", val)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
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
                  className="w-32"
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="mb-2">Phone</Label>
            <Input
              className="w-fit"
              placeholder="None"
              type="text"
              value={filters.phone}
              onChange={(e) => patch("phone", e.target.value)}
            />
          </div>

          <div>
            <Label className="mb-2">Name</Label>
            <Input
              className="w-fit"
              placeholder="None"
              type="text"
              value={filters.name}
              onChange={(e) => patch("name", e.target.value)}
            />
          </div>

          <div>
            <Label className="mb-2">Preference</Label>
            <div className="gap-2">
              <Select
                value={filters.contactPreference}
                onValueChange={(val: ContactPreferenceFilter) =>
                  patch("contactPreference", val)
                }
              >
                <SelectTrigger className="w-fit">
                  <SelectValue placeholder="None" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
              {filters.contactPreference && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => patch("contactPreference", "")}
                  className="h-auto p-1 content-sub"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label className="mb-2">Incident Severity</Label>
            <div className="gap-2">
              <Select
                value={filters.severity}
                onValueChange={(val: SeverityFilter) => patch("severity", val)}
              >
                <SelectTrigger className="w-fit">
                  <SelectValue placeholder="None" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="complaint">Complaint</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="citation">Citation</SelectItem>
                </SelectContent>
              </Select>
              {filters.severity && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => patch("severity", "")}
                  className="h-auto p-1"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
