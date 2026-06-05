"use client";

import StudentSearch from "@/components/StudentSearch";
import { FormShell } from "@/components/form/FormShell";
import {
  AddressField,
  DateField,
  PhoneField,
  SelectField,
  TextField,
} from "@/components/form/fields";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PARTY_RULE_MESSAGES, PartyDto } from "@/lib/api/party/party.types";
import { phoneNumberSchema } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { addBusinessDays, format, isAfter, startOfDay } from "date-fns";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

export const createPartyTableFormSchema = (isAdmin: boolean) => {
  const partyDateSchema = isAdmin
    ? z.date({ message: "Party date is required" })
    : z
        .date({ message: "Party date is required" })
        .refine(
          (date) =>
            isAfter(
              startOfDay(date),
              addBusinessDays(startOfDay(new Date()), 1)
            ),
          PARTY_RULE_MESSAGES.PARTY_DATE_TOO_SOON
        );

  return z.object({
    address: z.string().min(1, "Address is required"),
    placeId: z
      .string()
      .min(1, "Please select an address from the search results"),
    partyDate: partyDateSchema,
    partyTime: z.string().min(1, "Party time is required"),
    contactOneStudentId: z
      .number({ message: "Please select a student" })
      .positive("Please select a student"),
    contactTwoEmail: z
      .email({ pattern: z.regexes.html5Email })
      .min(1, "Contact email is required")
      .refine((v) => v.toLowerCase().endsWith("@unc.edu"), {
        message: "Contact two email must be a UNC email address (@unc.edu)",
      }),
    contactTwoFirstName: z.string().min(1, "First name is required"),
    contactTwoLastName: z.string().min(1, "Last name is required"),
    contactTwoPhoneNumber: phoneNumberSchema,
    contactTwoPreference: z.enum(["call", "text"], {
      message: "Please select a contact preference",
    }),
  });
};

export type PartyTableFormValues = z.infer<
  ReturnType<typeof createPartyTableFormSchema>
>;
type PartyTableFormInput = z.input<
  ReturnType<typeof createPartyTableFormSchema>
>;

interface PartyTableFormProps {
  onSubmit: (data: PartyTableFormValues) => void | Promise<void>;
  editData?: PartyDto;
  submissionError?: string | null;
}

export default function PartyTableForm({
  onSubmit,
  editData,
  submissionError,
}: PartyTableFormProps) {
  const { data: session } = useSession();
  const isAdmin = session?.role === "admin";

  const partyTableFormSchema = useMemo(
    () => createPartyTableFormSchema(isAdmin),
    [isAdmin]
  );

  const form = useForm<PartyTableFormInput, unknown, PartyTableFormValues>({
    resolver: zodResolver(partyTableFormSchema),
    mode: "onBlur",
    defaultValues: {
      address: editData?.location.formatted_address ?? "",
      placeId: editData?.location.google_place_id ?? "",
      partyDate: editData?.party_datetime ?? undefined,
      partyTime: editData?.party_datetime
        ? format(editData.party_datetime, "HH:mm")
        : "",
      contactOneStudentId: editData?.contact_one.id ?? undefined,
      contactTwoEmail: editData?.contact_two.email ?? "",
      contactTwoFirstName: editData?.contact_two.first_name ?? "",
      contactTwoLastName: editData?.contact_two.last_name ?? "",
      contactTwoPhoneNumber: editData?.contact_two.phone_number ?? "",
      contactTwoPreference:
        editData?.contact_two.contact_preference ?? undefined,
    },
  });

  return (
    <FormShell
      form={form}
      onSubmit={onSubmit}
      submitLabel="Save Changes"
      submissionError={submissionError}
    >
      <AddressField
        control={form.control}
        name="address"
        label="Party Address"
        placeholder="Search for the party address..."
        chapelHillOnly
        initialSelection={
          editData?.location
            ? {
                formatted_address: editData.location.formatted_address,
                google_place_id: editData.location.google_place_id,
              }
            : null
        }
        onSelect={(address) =>
          form.setValue("placeId", address?.google_place_id || "", {
            shouldValidate: true,
          })
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DateField
          control={form.control}
          name="partyDate"
          label="Party Date"
          dateFormat="MM/dd/yy"
          forwardDate={true}
          disabled={
            isAdmin
              ? undefined
              : (date) =>
                  !isAfter(
                    startOfDay(date),
                    addBusinessDays(startOfDay(new Date()), 1)
                  )
          }
        />
        <TextField
          control={form.control}
          name="partyTime"
          label="Party Time"
          type="time"
          autoComplete="off"
        />
      </div>

      <FormField
        control={form.control}
        name="contactOneStudentId"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>First Contact</FormLabel>
            <FormControl>
              <StudentSearch
                initialSelection={
                  editData?.contact_one
                    ? {
                        student_id: editData.contact_one.id,
                        first_name: editData.contact_one.first_name,
                        last_name: editData.contact_one.last_name,
                        matched_field_name: "email",
                        matched_field_value: editData.contact_one.email,
                      }
                    : null
                }
                onSelect={(student) =>
                  field.onChange(student?.student_id ?? undefined)
                }
                placeholder="Search by name, PID, email, onyen, etc..."
                error={fieldState.error?.message}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FieldSet className="pt-2">
        <FieldLegend className="font-semibold text-foreground">
          Second Contact Information
        </FieldLegend>

        <TextField
          control={form.control}
          name="contactTwoEmail"
          label="Contact Email"
          type="email"
          placeholder="student@unc.edu"
          autoComplete="off"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            control={form.control}
            name="contactTwoFirstName"
            label="First Name"
            type="text"
            placeholder="John"
            autoComplete="off"
          />
          <TextField
            control={form.control}
            name="contactTwoLastName"
            label="Last Name"
            type="text"
            placeholder="Doe"
            autoComplete="off"
          />
        </div>

        <PhoneField
          control={form.control}
          name="contactTwoPhoneNumber"
          label="Phone Number"
        />

        <SelectField
          control={form.control}
          name="contactTwoPreference"
          label="Contact Preference"
          placeholder="Select preference"
          options={[
            { value: "call", label: "Call" },
            { value: "text", label: "Text" },
          ]}
        />
      </FieldSet>
    </FormShell>
  );
}
