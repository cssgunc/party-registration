"use client";

import AddressSearch from "@/components/AddressSearch";
import DatePicker from "@/components/DatePicker";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldSet } from "@/components/ui/field";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AutocompleteResult } from "@/lib/api/location/location.types";
import { ResidenceDto } from "@/lib/api/student/student.types";
import { formatPhoneNumberInput, phoneNumberSchema } from "@/lib/utils";
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
}

export default function StudentTableForm({
  onSubmit,
  editData,
  submissionError,
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
  const isSubmitting = form.formState.isSubmitting;

  const isPIDEditMode = !!editData;
  const ssoTitle = isPIDEditMode
    ? "This field is managed by UNC SSO"
    : undefined;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <FieldSet>
            <FormField
              control={form.control}
              name="pid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PID</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="730456789"
                      disabled={isPIDEditMode}
                      title={ssoTitle}
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="John"
                      disabled={isPIDEditMode}
                      title={ssoTitle}
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Doe"
                      disabled={isPIDEditMode}
                      title={ssoTitle}
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      placeholder="student@unc.edu"
                      disabled={isPIDEditMode}
                      title={ssoTitle}
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="onyen"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Onyen</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="johndoe"
                      disabled={isPIDEditMode}
                      title={ssoTitle}
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="tel"
                      placeholder="(123) 456-7890"
                      value={formatPhoneNumberInput(field.value ?? "")}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value.replace(/\D/g, "").slice(0, 10)
                        )
                      }
                      maxLength={14}
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_preference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Preference</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select preference" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="residence_place_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Residence Address</FormLabel>
                  <FormControl>
                    <AddressSearch
                      initialSelection={initialResidenceSelection}
                      onSelect={(address) =>
                        field.onChange(address?.google_place_id ?? null)
                      }
                      placeholder="Search for student's residence..."
                    />
                  </FormControl>
                  <FormDescription>
                    Leave blank to remove the student&apos;s current residence.
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="last_registered"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
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
                  </FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      aria-invalid={fieldState.invalid}
                      disabled={(date) =>
                        isAfter(
                          startOfDay(date),
                          addBusinessDays(startOfDay(new Date()), 0)
                        )
                      }
                      clearable
                    />
                  </FormControl>
                  <FormDescription>
                    Leave blank if student is not registered.
                  </FormDescription>
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
                {isSubmitting ? "Submitting..." : "Save Changes"}
              </Button>
            </div>
          </FieldSet>
        </FieldGroup>
      </form>
    </Form>
  );
}
