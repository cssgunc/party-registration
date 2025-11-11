"use client";

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
import { addBusinessDays, format, isAfter, startOfDay } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import * as z from "zod";

export const LocationTableCreateEditSchema = z.object({
    address: z.string().min(1, "Address is required"),
    holdExpiration: z.date().nullable(),
    warningCount: z.number(),
    citationCount: z.number(),
});

type LocationCreateEditValues = z.infer<typeof LocationTableCreateEditSchema>;

interface StudentRegistrationFormProps {
    onSubmit: (data: LocationCreateEditValues) => void | Promise<void>;
}

export default function LocationTableCreateEditForm({ onSubmit }: StudentRegistrationFormProps) {
    const [formData, setFormData] = useState<Partial<LocationCreateEditValues>>({
        address: "",
        holdExpiration: null,
        warningCount: 0,
        citationCount: 0
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        const result = LocationTableCreateEditSchema.safeParse(formData);

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
                        <Input
                            id="party-address"
                            placeholder="123 Main St, Chapel Hill, NC"
                            value={formData.address}
                            onChange={(e) => updateField("address", e.target.value)}
                            aria-invalid={!!errors.address}
                        />
                        {errors.address && <FieldError>{errors.address}</FieldError>}
                    </Field>

                    <Field data-invalid={!!errors.holdExpiration}>
                        <FieldLabel htmlFor="party-date">Party Date</FieldLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="party-date"
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
                        {errors.partyDate && <FieldError>{errors.partyDate}</FieldError>}
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