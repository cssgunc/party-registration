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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { addBusinessDays, format, isAfter, startOfDay } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import * as z from "zod";

export const StudentCreateEditValues = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Second name is required"),
    phoneNumber: z.string().min(1, "Phone number is required"),
    contactPreference: z.enum(["call", "text"]),
    lastRegistered: z.date().nullable(),
    pid: z.string().length(9, "Please input a valid PID")
});

type StudentCreateEditValues = z.infer<typeof StudentCreateEditValues>;

interface StudentRegistrationFormProps {
    onSubmit: (data: StudentCreateEditValues) => void | Promise<void>;
    editData?: StudentCreateEditValues
}

export default function StudentTableCreateEditForm({ onSubmit, editData }: StudentRegistrationFormProps) {
    const [formData, setFormData] = useState<Partial<StudentCreateEditValues>>({
        pid: editData?.pid ?? "",
        firstName: editData?.firstName ?? "",
        lastName: editData?.lastName ?? "",
        phoneNumber: editData?.phoneNumber ?? "",
        contactPreference: editData?.contactPreference ?? undefined,
        lastRegistered: editData?.lastRegistered ?? null
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        const result = StudentCreateEditValues.safeParse(formData);

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

    const updateField = <K extends keyof StudentCreateEditValues>(
        field: K,
        value: StudentCreateEditValues[K]
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
                    <Field data-invalid={!!errors.pid}>
                        <FieldLabel htmlFor="pid">PID</FieldLabel>
                        <Input
                            id="first-name"
                            placeholder="123456789"
                            value={formData.pid}
                            onChange={(e) => updateField("pid", e.target.value)}
                            aria-invalid={!!errors.pid}
                        />
                        {errors.pid && <FieldError>{errors.pid}</FieldError>}
                    </Field>
                    <Field data-invalid={!!errors.firstName}>
                        <FieldLabel htmlFor="first-name">First name</FieldLabel>
                        <Input
                            id="first-name"
                            placeholder="John"
                            value={formData.firstName}
                            onChange={(e) => updateField("firstName", e.target.value)}
                            aria-invalid={!!errors.firstName}
                        />
                        {errors.firstName && <FieldError>{errors.firstName}</FieldError>}
                    </Field>

                    <Field data-invalid={!!errors.lastName}>
                        <FieldLabel htmlFor="last-name">Last name</FieldLabel>
                        <Input
                            id="last-name"
                            placeholder="Doe"
                            value={formData.lastName}
                            onChange={(e) => updateField("lastName", e.target.value)}
                            aria-invalid={!!errors.lastName}
                        />
                        {errors.lastName && <FieldError>{errors.lastName}</FieldError>}
                    </Field>

                    <Field data-invalid={!!errors.phoneNumber}>
                        <FieldLabel htmlFor="phone-number">Phone Number</FieldLabel>
                        <Input
                            id="phone-number"
                            placeholder="(123) 456-7890"
                            value={formData.phoneNumber}
                            onChange={(e) => updateField("phoneNumber", e.target.value)}
                            aria-invalid={!!errors.phoneNumber}
                        />
                        {errors.phoneNumber && <FieldError>{errors.phoneNumber}</FieldError>}
                    </Field>

                    <Field data-invalid={!!errors.lastRegistered}>
                        <FieldLabel htmlFor="party-date">Last registered</FieldLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="party-date"
                                    variant="outline"
                                    className={`w-full justify-start text-left font-normal ${!formData.lastRegistered && "text-muted-foreground"
                                        }`}
                                >
                                    {formData.lastRegistered ? (
                                        format(formData.lastRegistered, "PPP")
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={formData.lastRegistered || undefined}
                                    onSelect={(date) => updateField("lastRegistered", date ?? null)}
                                    disabled={(date) =>
                                        isAfter(startOfDay(date), addBusinessDays(startOfDay(new Date()), 0))
                                    }
                                />
                            </PopoverContent>
                        </Popover>
                        {errors.lastRegistered && <FieldError>{errors.lastRegistered}</FieldError>}
                    </Field>

                    <Field data-invalid={!!errors.contactPreference}>
                        <FieldLabel htmlFor="contact-preference">Contact Preference</FieldLabel>
                        <Select
                            value={formData.contactPreference}
                            onValueChange={(value) => updateField("contactPreference", value as "call" | "text")}
                        >
                            <SelectTrigger id="contact-two-preference">
                                <SelectValue placeholder="Select preference" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="call">Call</SelectItem>
                                <SelectItem value="text">Text</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.contactPreference && <FieldError>{errors.contactPreference}</FieldError>}
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