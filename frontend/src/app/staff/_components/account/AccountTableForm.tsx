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
}

export default function AccountTableForm({
  onSubmit,
  editData,
  submissionError,
}: AccountTableFormProps) {
  const form = useForm<AccountTableFormValues>({
    resolver: zodResolver(accountTableFormSchema),
    defaultValues: {
      email: editData?.email ?? "",
      role: editData?.role ?? undefined,
    },
  });
  const isSubmitting = form.formState.isSubmitting;

  const isEditMode = !!editData;
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
                      placeholder="staff@unc.edu"
                      disabled={isEditMode}
                      title={
                        isEditMode
                          ? "Email cannot be changed after invite is sent"
                          : undefined
                      }
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
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3 *:w-full">
              {submissionError && (
                <div
                  className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                  role="alert"
                >
                  {submissionError}
                </div>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Send Invite"}
              </Button>
            </div>
          </FieldSet>
        </FieldGroup>
      </form>
    </Form>
  );
}
