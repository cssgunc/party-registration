"use client";

import { FormShell } from "@/components/form/FormShell";
import { SelectField, TextField } from "@/components/form/fields";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

export const accountTableFormSchema = z.object({
  email: z.email({ pattern: z.regexes.html5Email }).min(1, "Email is required"),
  role: z.enum(["staff", "admin"]),
});

type AccountTableFormValues = z.infer<typeof accountTableFormSchema>;

interface AccountTableFormProps {
  onSubmit: (data: AccountTableFormValues) => void | Promise<void>;
  editData?: AccountTableFormValues;
  submissionError?: string | null;
  isPending?: boolean;
}

export default function AccountTableForm({
  onSubmit,
  editData,
  submissionError,
  isPending,
}: AccountTableFormProps) {
  const form = useForm<AccountTableFormValues>({
    resolver: zodResolver(accountTableFormSchema),
    mode: "onBlur",
    defaultValues: {
      email: editData?.email ?? "",
      role: editData?.role ?? undefined,
    },
  });

  const isEditMode = !!editData;

  return (
    <FormShell
      form={form}
      onSubmit={onSubmit}
      submitLabel={isEditMode ? "Save Changes" : "Send Invite"}
      submissionError={submissionError}
      pending={isPending}
    >
      <TextField
        control={form.control}
        name="email"
        label="Email"
        type="email"
        placeholder="staff@unc.edu"
        disabled={isEditMode}
        title={
          isEditMode
            ? "Email cannot be changed after invite is sent"
            : undefined
        }
        autoComplete="off"
      />

      <SelectField
        control={form.control}
        name="role"
        label="Role"
        placeholder="Select role"
        options={[
          { value: "staff", label: "Staff" },
          { value: "admin", label: "Admin" },
        ]}
      />
    </FormShell>
  );
}
