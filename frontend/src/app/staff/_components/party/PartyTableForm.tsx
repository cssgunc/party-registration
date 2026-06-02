"use client";

import AddressSearch from "@/components/AddressSearch";
import DatePicker from "@/components/DatePicker";
import StudentSearch from "@/components/StudentSearch";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
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
import { LocationService } from "@/lib/api/location/location.service";
import { AutocompleteResult } from "@/lib/api/location/location.types";
import { PARTY_RULE_MESSAGES, PartyDto } from "@/lib/api/party/party.types";
import { AdminStudentService } from "@/lib/api/student/admin-student.service";
import { formatPhoneNumberInput, phoneNumberSchema } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { addBusinessDays, format, isAfter, startOfDay } from "date-fns";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

export const createPartyTableFormSchema = (isAdmin: boolean) => {
  const partyDateSchema = isAdmin
    ? z.date({
        message: "Party date is required",
      })
    : z
        .date({
          message: "Party date is required",
        })
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
  const locationService = useMemo(() => new LocationService(), []);
  const adminStudentService = useMemo(() => new AdminStudentService(), []);

  const partyTableFormSchema = useMemo(
    () => createPartyTableFormSchema(isAdmin),
    [isAdmin]
  );

  const form = useForm<PartyTableFormInput, unknown, PartyTableFormValues>({
    resolver: zodResolver(partyTableFormSchema),
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
  const isSubmitting = form.formState.isSubmitting;

  const handleAddressSelect = (address: AutocompleteResult | null) => {
    form.setValue("address", address?.formatted_address || "", {
      shouldValidate: true,
    });
    form.setValue("placeId", address?.google_place_id || "", {
      shouldValidate: true,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <FieldSet>
            <FormField
              control={form.control}
              name="address"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Party Address</FormLabel>
                  <FormControl>
                    <AddressSearch
                      value={field.value}
                      initialSelection={
                        editData?.location
                          ? {
                              formatted_address:
                                editData.location.formatted_address,
                              google_place_id:
                                editData.location.google_place_id,
                            }
                          : null
                      }
                      onSelect={handleAddressSelect}
                      locationService={locationService}
                      placeholder="Search for the party address..."
                      className="w-full"
                      error={fieldState.error?.message}
                      chapelHillOnly
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="partyDate"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Party Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        dateFormat="MM/dd/yy"
                        value={field.value ?? null}
                        onChange={field.onChange}
                        aria-invalid={fieldState.invalid}
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
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="partyTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Party Time</FormLabel>
                    <FormControl>
                      <Input {...field} type="time" autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
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
                      adminStudentService={adminStudentService}
                      placeholder="Search by name, PID, email, onyen, etc..."
                      className="w-full"
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

              <FormField
                control={form.control}
                name="contactTwoEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="student@unc.edu"
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactTwoFirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          placeholder="John"
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactTwoLastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          placeholder="Doe"
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="contactTwoPhoneNumber"
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
                name="contactTwoPreference"
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
            </FieldSet>

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
