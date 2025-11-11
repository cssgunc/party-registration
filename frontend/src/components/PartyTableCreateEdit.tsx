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

export const PartyTableCreateEditSchema = z.object({
    address: z.string().min(1, "Address is required"),
    partyDate: z.date({
        message: "Party date is required",
    }).refine(
        (date) => isAfter(startOfDay(date), addBusinessDays(startOfDay(new Date()), 1)),
        "Party must be at least 2 business days in the future"
    ),
    partyTime: z.string().min(1, "Party time is required"),
    contactOneEmail: z.email({ pattern: z.regexes.html5Email })
        .min(1, "Contact email is required"),
    contactTwoEmail: z.email({ pattern: z.regexes.html5Email })
        .min(1, "Contact email is required"),
    contactTwoFirstName: z.string().min(1, "First name is required"),
    contactTwoLastName: z.string().min(1, "Last name is required"),
    contactTwoPhoneNumber: z.string().min(1, "Phone number is required"),
    contactTwoPreference: z.string()

});

type PartyCreateEditValues = z.infer<typeof PartyTableCreateEditSchema>;

interface PartyRegistrationFormProps {
    onSubmit: (data: PartyCreateEditValues) => void | Promise<void>;
}

export default function PartyTableCreateEditForm({ onSubmit }: PartyRegistrationFormProps) {
    const [formData, setFormData] = useState<Partial<PartyCreateEditValues>>({
        address: "",
        partyDate: undefined,
        partyTime: "",
        contactOneEmail: "",
        contactTwoEmail: "",
        contactTwoFirstName: "",
        contactTwoLastName: "",
        contactTwoPhoneNumber: "",
        contactTwoPreference: ""
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        const result = PartyTableCreateEditSchema.safeParse(formData);

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

    const updateField = <K extends keyof PartyCreateEditValues>(
        field: K,
        value: PartyCreateEditValues[K]
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

                    <div className="grid grid-cols-2 gap-4">
                        <Field data-invalid={!!errors.partyDate}>
                            <FieldLabel htmlFor="party-date">Party Date</FieldLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="party-date"
                                        variant="outline"
                                        className={`w-full justify-start text-left font-normal ${!formData.partyDate && "text-muted-foreground"
                                            }`}
                                    >
                                        {formData.partyDate ? (
                                            format(formData.partyDate, "PPP")
                                        ) : (
                                            <span>Pick a date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={formData.partyDate}
                                        onSelect={(date) => updateField("partyDate", date as Date)}
                                        disabled={(date) =>
                                            !isAfter(startOfDay(date), addBusinessDays(startOfDay(new Date()), 1))
                                        }
                                    />
                                </PopoverContent>
                            </Popover>
                            {errors.partyDate && <FieldError>{errors.partyDate}</FieldError>}
                        </Field>

                        <Field data-invalid={!!errors.partyTime}>
                            <FieldLabel htmlFor="party-time">Party Time</FieldLabel>
                            <Input
                                id="party-time"
                                type="time"
                                value={formData.partyTime}
                                onChange={(e) => updateField("partyTime", e.target.value)}
                                aria-invalid={!!errors.partyTime}
                            />
                            {errors.partyTime && <FieldError>{errors.partyTime}</FieldError>}
                        </Field>
                    </div>

                    <Field data-invalid={!!errors.contactOneEmail}>
                        <FieldLabel htmlFor="contact-one-email">First Contact Email</FieldLabel>
                        <Input
                            id="contact-one-email"
                            type="email"
                            placeholder="student@unc.edu"
                            value={formData.contactOneEmail}
                            onChange={(e) => updateField("contactOneEmail", e.target.value)}
                            aria-invalid={!!errors.contactOneEmail}
                        />
                        {errors.contactOneEmail && <FieldError>{errors.contactOneEmail}</FieldError>}
                    </Field>

                    <Field data-invalid={!!errors.contactTwoEmail}>
                        <FieldLabel htmlFor="contact-two-email">Second Contact Email</FieldLabel>
                        <Input
                            id="contact-two-email"
                            type="email"
                            placeholder="student@unc.edu"
                            value={formData.contactTwoEmail}
                            onChange={(e) => updateField("contactTwoEmail", e.target.value)}
                            aria-invalid={!!errors.contactTwoEmail}
                        />
                        {errors.contactTwoEmail && <FieldError>{errors.contactTwoEmail}</FieldError>}
                    </Field>

                    <Field data-invalid={!!errors.contactTwoFirstName}>
                        <FieldLabel htmlFor="contact-two-first-name">First Name</FieldLabel>
                        <Input
                            id="contact-two-first-name"
                            type="text"
                            placeholder="John"
                            value={formData.contactTwoFirstName}
                            onChange={(e) => updateField("contactTwoFirstName", e.target.value)}
                            aria-invalid={!!errors.contactTwoFirstName}
                        />
                        {errors.contactTwoFirstName && <FieldError>{errors.contactTwoFirstName}</FieldError>}
                    </Field>

                    <Field data-invalid={!!errors.contactTwoLastName}>
                        <FieldLabel htmlFor="contact-two-last-name">Last Name</FieldLabel>
                        <Input
                            id="contact-two-last-name"
                            type="text"
                            placeholder="Doe"
                            value={formData.contactTwoLastName}
                            onChange={(e) => updateField("contactTwoLastName", e.target.value)}
                            aria-invalid={!!errors.contactTwoLastName}
                        />
                        {errors.contactTwoLastName && <FieldError>{errors.contactTwoLastName}</FieldError>}
                    </Field>

                    <Field data-invalid={!!errors.contactTwoPhoneNumber}>
                        <FieldLabel htmlFor="contact-two-phone-number">Your Phone Number</FieldLabel>
                        <Input
                            id="contact-two-phone-number"
                            placeholder="(123) 456-7890"
                            value={formData.contactTwoPhoneNumber}
                            onChange={(e) => updateField("contactTwoPhoneNumber", e.target.value)}
                            aria-invalid={!!errors.contactTwoPhoneNumber}
                        />
                        {errors.contactTwoPhoneNumber && <FieldError>{errors.contactTwoPhoneNumber}</FieldError>}
                    </Field>

                    <Field data-invalid={!!errors.contactTwoPreference}>
                        <FieldLabel htmlFor="contact-two-preference">Contact Preference</FieldLabel>
                        <Select
                            value={formData.contactTwoPreference}
                            onValueChange={(value) => updateField("contactTwoPreference", value as "call" | "text")}
                        >
                            <SelectTrigger id="contact-two-preference">
                                <SelectValue placeholder="Select your preference" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="call">Call</SelectItem>
                                <SelectItem value="text">Text</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.contactTwoPreference && <FieldError>{errors.contactTwoPreference}</FieldError>}
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