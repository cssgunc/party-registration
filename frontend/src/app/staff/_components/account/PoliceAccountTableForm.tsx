"use client";

import { FormShell } from "@/components/form/FormShell";
import { SelectField, TextField } from "@/components/form/fields";
import { PoliceRole } from "@/lib/api/police/police.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Exported schema/type: is_verified is a boolean — this is what callers expect.
export const policeAccountFormSchema = z.object({
  email: z.email({ pattern: z.regexes.html5Email }).min(1, "Email is required"),
  role: z.enum(["officer", "police_admin"]),
  is_verified: z.boolean(),
});

export type PoliceAccountFormValues = z.infer<typeof policeAccountFormSchema>;

// Internal form schema: is_verified as a string enum so SelectField can bind
// it directly. handleValid converts back to boolean before calling onSubmit.
const formSchema = z.object({
  email: z.email({ pattern: z.regexes.html5Email }).min(1, "Email is required"),
  role: z.enum(["officer", "police_admin"]),
  is_verified: z.enum(["true", "false"]),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  onSubmit: (data: PoliceAccountFormValues) => void | Promise<void>;
  editData?: { email: string; role: PoliceRole; is_verified: boolean };
  submissionError?: string | null;
  disableVerificationToggle?: boolean;
  isPending?: boolean;
}

/**
 * Edit form for a police account rendered in the staff sidebar.
 *
 * Allows updating the officer's email, role (officer/police_admin), and
 * verification status. The verification toggle can be disabled when only
 * OCSL admins are permitted to change it. Internally stores `is_verified`
 * as a string enum for the SelectField, then converts back to boolean
 * before calling `onSubmit`.
 */
export default function PoliceAccountTableForm({
  onSubmit,
  editData,
  submissionError,
  disableVerificationToggle = false,
  isPending,
}: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      email: editData?.email ?? "",
      role: editData?.role ?? "officer",
      is_verified: editData?.is_verified ? "true" : "false",
    },
  });

  const handleValid = (data: FormValues) =>
    onSubmit({ ...data, is_verified: data.is_verified === "true" });

  return (
    <FormShell
      form={form}
      onSubmit={handleValid}
      submitLabel="Save Changes"
      submissionError={submissionError}
      pending={isPending}
    >
      <TextField
        control={form.control}
        name="email"
        label="Email"
        type="email"
        placeholder="officer@department.gov"
        autoComplete="off"
      />

      <SelectField
        control={form.control}
        name="role"
        label="Role"
        placeholder="Select role"
        options={[
          { value: "officer", label: "Officer" },
          { value: "police_admin", label: "Police Admin" },
        ]}
      />

      <SelectField
        control={form.control}
        name="is_verified"
        label="Status"
        placeholder="Select verification status"
        disabled={disableVerificationToggle}
        triggerTitle={
          disableVerificationToggle
            ? "Only OCSL admins can change this field"
            : undefined
        }
        options={[
          { value: "true", label: "Active" },
          { value: "false", label: "Unverified" },
        ]}
      />
    </FormShell>
  );
}
