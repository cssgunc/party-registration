"use client";

import { Button } from "@/components/ui/button";
import { FieldGroup, FieldSet } from "@/components/ui/field";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PoliceRole } from "@/lib/api/police/police.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

export const policeAccountFormSchema = z.object({
  email: z.email({ pattern: z.regexes.html5Email }).min(1, "Email is required"),
  role: z.enum(["officer", "police_admin"]),
  is_verified: z.boolean(),
});

export type PoliceAccountFormValues = z.infer<typeof policeAccountFormSchema>;

interface Props {
  onSubmit: (data: PoliceAccountFormValues) => void | Promise<void>;
  editData?: { email: string; role: PoliceRole; is_verified: boolean };
  submissionError?: string | null;
  disableVerificationToggle?: boolean;
}

export default function PoliceAccountTableForm({
  onSubmit,
  editData,
  submissionError,
  disableVerificationToggle = false,
}: Props) {
  const form = useForm<PoliceAccountFormValues>({
    resolver: zodResolver(policeAccountFormSchema),
    defaultValues: {
      email: editData?.email ?? "",
      role: editData?.role ?? "officer",
      is_verified: editData?.is_verified ?? false,
    },
  });
  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <FieldSet>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="officer@department.gov"
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="officer">Officer</SelectItem>
                      <SelectItem value="police_admin">Police Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_verified"
              render={({ field }) => (
                <FormItem data-disabled={disableVerificationToggle}>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={String(!!field.value)}
                    onValueChange={(value) => field.onChange(value === "true")}
                    disabled={disableVerificationToggle}
                  >
                    <FormControl>
                      <SelectTrigger
                        title={
                          disableVerificationToggle
                            ? "Only OCSL admins can change this field"
                            : undefined
                        }
                      >
                        <SelectValue placeholder="Select verification status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Unverified</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              {submissionError && (
                <div
                  className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                  role="alert"
                >
                  {submissionError}
                </div>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Save Changes"}
              </Button>
            </div>
          </FieldSet>
        </FieldGroup>
      </form>
    </Form>
  );
}
