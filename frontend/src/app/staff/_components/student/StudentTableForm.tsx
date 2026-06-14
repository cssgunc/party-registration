"use client";

import { FormShell } from "@/components/form/FormShell";
import {
  AddressField,
  DateField,
  PhoneField,
  SelectField,
  TextField,
} from "@/components/form/fields";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { AutocompleteResult } from "@/lib/api/location/location.types";
import { ResidenceDto } from "@/lib/api/student/student.types";
import { phoneNumberSchema } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { addBusinessDays, isAfter, startOfDay } from "date-fns";
import { Info } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";

export const studentTableFormSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Second name is required"),
  email: z.email("Please enter a valid email").min(1, "Email is required"),
  phone_number: phoneNumberSchema,
  contact_preference: z.enum(["call", "text"], {
    message: "Please select a contact preference",
  }),
  last_registered: z.date().nullable(),
  pid: z
    .string()
    .regex(/^\d{9}$/, { message: "Please input a valid PID" })
    .min(1, "PID is required"),
  onyen: z.string().min(1, "Onyen is required"),
  residence: z.custom<ResidenceDto | null>().default(null),
  residence_place_id: z.string().nullable().optional(),
});

type StudentTableFormValues = z.infer<typeof studentTableFormSchema>;

interface StudentTableFormProps {
  onSubmit: (data: StudentTableFormValues) => void | Promise<void>;
  editData?: Partial<StudentTableFormValues>;
  submissionError?: string | null;
  isPending?: boolean;
}

export default function StudentTableForm({
  onSubmit,
  editData,
  submissionError,
  isPending,
}: StudentTableFormProps) {
  const initialResidenceSelection: AutocompleteResult | null =
    editData?.residence
      ? {
          formatted_address: editData.residence.location.formatted_address,
          google_place_id: editData.residence.location.google_place_id,
        }
      : null;

  const form = useForm<
    z.input<typeof studentTableFormSchema>,
    unknown,
    StudentTableFormValues
  >({
    resolver: zodResolver(studentTableFormSchema),
    mode: "onBlur",
    defaultValues: {
      pid: editData?.pid ?? "",
      first_name: editData?.first_name ?? "",
      last_name: editData?.last_name ?? "",
      email: editData?.email ?? "",
      onyen: editData?.onyen ?? "",
      phone_number: editData?.phone_number ?? "",
      contact_preference: editData?.contact_preference ?? undefined,
      last_registered: editData?.last_registered ?? null,
      residence: editData?.residence ?? null,
      residence_place_id: editData?.residence_place_id ?? null,
    },
  });

  const isPIDEditMode = !!editData;
  const ssoTitle = isPIDEditMode
    ? "This field is managed by UNC SSO"
    : undefined;

  return (
    <FormShell
      form={form}
      onSubmit={onSubmit}
      submitLabel="Save Changes"
      submissionError={submissionError}
      pending={isPending}
    >
      <TextField
        control={form.control}
        name="pid"
        label="PID"
        placeholder="123456789"
        disabled={isPIDEditMode}
        title={ssoTitle}
        autoComplete="off"
      />
      <TextField
        control={form.control}
        name="first_name"
        label="First name"
        placeholder="John"
        disabled={isPIDEditMode}
        title={ssoTitle}
        autoComplete="off"
      />
      <TextField
        control={form.control}
        name="last_name"
        label="Last name"
        placeholder="Doe"
        disabled={isPIDEditMode}
        title={ssoTitle}
        autoComplete="off"
      />
      <TextField
        control={form.control}
        name="email"
        label="Email"
        type="email"
        placeholder="student@unc.edu"
        disabled={isPIDEditMode}
        title={ssoTitle}
        autoComplete="off"
      />
      <TextField
        control={form.control}
        name="onyen"
        label="Onyen"
        placeholder="johndoe"
        disabled={isPIDEditMode}
        title={ssoTitle}
        autoComplete="off"
      />

      <PhoneField
        control={form.control}
        name="phone_number"
        label="Phone Number"
      />

      <SelectField
        control={form.control}
        name="contact_preference"
        label="Contact Preference"
        placeholder="Select preference"
        options={[
          { value: "call", label: "Call" },
          { value: "text", label: "Text" },
        ]}
      />

      <AddressField
        control={form.control}
        name="residence_place_id"
        label="Residence Address"
        placeholder="Search for student's residence..."
        initialSelection={initialResidenceSelection}
        getStoredValue={(address) => address?.google_place_id ?? null}
        description="Leave blank to remove the student's current residence."
      />

      <DateField
        control={form.control}
        name="last_registered"
        labelClassName="flex items-center gap-1"
        label={
          <>
            Last Registered
            <HoverCard>
              <HoverCardTrigger asChild>
                <Info className="h-3.5 w-3.5 cursor-pointer text-muted-foreground ml-1" />
              </HoverCardTrigger>
              <HoverCardContent className="max-w-64">
                A student is considered registered if they have a last
                registered date within the current academic year.
              </HoverCardContent>
            </HoverCard>
          </>
        }
        description="Leave blank if student is not registered."
        clearable
        disabled={(date) =>
          isAfter(startOfDay(date), addBusinessDays(startOfDay(new Date()), 0))
        }
      />
    </FormShell>
  );
}
