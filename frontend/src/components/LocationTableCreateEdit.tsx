"use client";

import AddressSearch from "@/components/AddressSearch";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldSet
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { AutocompleteResult, LocationService } from "@/services/locationService";
import { addBusinessDays, format, isAfter, startOfDay } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import * as z from "zod";

export const LocationCreateEditSchema = z.object({
    address: z.string().min(1, "Address is required"),
    placeId: z.string().min(1, "Please select an address from the search results"),
    holdExpiration: z.date().nullable(),
    warningCount: z.number(),
    citationCount: z.number(),
});

type LocationCreateEditValues = z.infer<typeof LocationCreateEditSchema>;

interface StudentRegistrationFormProps {
    onSubmit: (data: LocationCreateEditValues) => void | Promise<void>;
    editData?: LocationCreateEditValues
}

export default function LocationTableCreateEditForm({ onSubmit, editData }: StudentRegistrationFormProps) {
    const locationService = new LocationService();
    
    const [formData, setFormData] = useState<Partial<LocationCreateEditValues>>({
        address: editData?.address ?? "",
        placeId: editData?.placeId ?? undefined,
        holdExpiration: editData?.holdExpiration ?? null,
        warningCount: editData?.warningCount ?? 0,
        citationCount: editData?.citationCount ?? 0,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        const result = LocationCreateEditSchema.safeParse(formData);

        if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            result.error.issues.forEach((issue) => {
                if (issue.path[0]) {
                    fieldErrors[issue.path[0].toString()] = issue.message;
                }
            });
            setErrors(fieldErrors);
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(result.data);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddressSelect = (address: AutocompleteResult | null) => {
        setFormData(prev => ({
            ...prev,
            address: address?.formatted_address || "",
            placeId: address?.place_id || undefined
        }));
        if (errors.address) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.address;
                return newErrors;
            });
        }
    };

    const updateField = <K extends keyof LocationCreateEditValues>(
        field: K,
        value: LocationCreateEditValues[K]
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <FieldGroup>
                <FieldSet>
                    <Field data-invalid={!!errors.address}>
                        <FieldLabel htmlFor="party-address">Party Address</FieldLabel>
                        <AddressSearch
                            value={formData.address}
                            onSelect={handleAddressSelect}
                            locationService={locationService}
                            placeholder="Search for the location address..."
                            className="w-full"
                            error={errors.address}
                        />
                        {errors.address && <FieldError>{errors.address}</FieldError>}
                    </Field>

                    <Field data-invalid={!!errors.holdExpiration}>
                        <FieldLabel htmlFor="hold-expiration">Hold Expiration</FieldLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="hold-expiration"
                                    variant="outline"
                                    className={`w-full justify-start text-left font-normal ${!formData.holdExpiration && "text-muted-foreground"
                                        }`}
                                >
                                    {formData.holdExpiration ? (
                                        format(formData.holdExpiration, "PPP")
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={formData.holdExpiration || undefined}
                                    onSelect={(date) => updateField("holdExpiration", date as Date)}
                                    disabled={(date) =>
                                        !isAfter(startOfDay(date), addBusinessDays(startOfDay(new Date()), 1))
                                    }
                                />
                            </PopoverContent>
                        </Popover>
                        {errors.holdExpiration && <FieldError>{errors.holdExpiration}</FieldError>}
                    </Field>

                    <Field data-invalid={!!errors.warningCount}>
                        <FieldLabel htmlFor="warning-count">Warning count</FieldLabel>
                        <Input
                            value={formData.warningCount}
                            onChange={(e) => updateField("warningCount", Number(e.target.value))}
                            id="warning-count"
                            type="number"
                            min={0}
                            step={1}
                        />
                        {errors.warningCount && <FieldError>{errors.warningCount}</FieldError>}
                    </Field>

                    <Field data-invalid={!!errors.citationCount}>
                        <FieldLabel htmlFor="citation-count">Citation count</FieldLabel>
                        <Input
                            value={formData.citationCount}
                            onChange={(e) => updateField("citationCount", Number(e.target.value))}
                            id="warning-count"
                            type="number"
                            min={0}
                            step={1}
                        />
                        {errors.citationCount && <FieldError>{errors.citationCount}</FieldError>}
                    </Field>

                    <Field orientation="vertical">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Submitting..." : "Save"}
                        </Button>
                    </Field>
                </FieldSet>
            </FieldGroup>
        </form>
    );
}