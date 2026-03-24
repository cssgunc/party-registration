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
import { useMemo, useState } from "react";

export type TimeFilterType = "before" | "after" | "exact" | "";
export type ContactPreferenceFilter = "" | "call" | "text";
export type CitationTypeFilter = "" | "complaint" | "warning" | "citation";

export type AdvancedPartyFilters = {
  timeFilterType: TimeFilterType;
  startTime: string;
  name: string;
  phone: string;
  contactPreference: ContactPreferenceFilter;
  citationType: CitationTypeFilter;
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
    if (filters.citationType) count++;
    return count;
  }, [filters]);

  function patch<K extends keyof AdvancedPartyFilters>(
    key: K,
    value: AdvancedPartyFilters[K]
  ) {
    onFiltersChange({ ...filters, [key]: value });
  }

  return (
    <div>
      <div className="flex items-center my-2 gap-4">
        <Button
          type="button"
          variant="link"
          className="p-0 content"
          onClick={() => setIsOpen((open) => !open)}
        >
          {!isOpen && <p>Advanced Search</p>}
          {isOpen && <p>Hide Advanced Search</p>}
        </Button>
        {isOpen && <p className="content">({selectedCount}) Selected</p>}
      </div>
      {isOpen && (
        <div className="flex flex-wrap gap-4">
          <div>
            <Label className="mb-2">Start</Label>
            <div className="flex gap-4">
              <Select
                value={filters.timeFilterType}
                onValueChange={(val: "before" | "after" | "exact") =>
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

            <Select
              value={filters.contactPreference}
              onValueChange={(val: "call" | "text") =>
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
          </div>

          <div>
            <Label className="mb-2">Citation Type</Label>
            <Select
              value={filters.citationType}
              onValueChange={(val: "complaint" | "warning" | "citation") =>
                patch("citationType", val)
              }
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
          </div>
        </div>
      )}
    </div>
  );
}
