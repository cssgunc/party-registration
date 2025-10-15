"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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

interface PartyFormData {
  address: string;
  partyDate: Date | undefined;
  partyTime: string;
  phoneNumber: string;
  contactPreference: "call" | "text" | "";
  contactTwoEmail: string;
}

interface PartyRegistrationFormProps {
  onSubmit: (data: PartyFormData) => void | Promise<void>;
}

export default function PartyRegistrationForm({ onSubmit }: PartyRegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<PartyFormData>({
    address: "",
    partyDate: undefined,
    partyTime: "",
    phoneNumber: "",
    contactPreference: "",
    contactTwoEmail: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof PartyFormData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PartyFormData, string>> = {};

    // Address validation
    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }

    // Date validation - must be at least 2 business days in the future
    if (!formData.partyDate) {
      newErrors.partyDate = "Party date is required";
    } else {
      if (!isAfter(startOfDay(formData.partyDate), addBusinessDays(startOfDay(new Date()), 1))) {
        newErrors.partyDate = "Party must be at least 2 business days in the future";
      }
    }

    // Time validation
    if (!formData.partyTime) {
      newErrors.partyTime = "Party time is required";
    }

    // Phone validation
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (formData.phoneNumber.replace(/\D/g, "").length < 10) {
      newErrors.phoneNumber = "Phone number must be at least 10 digits";
    }

    // Contact preference validation
    if (!formData.contactPreference) {
      newErrors.contactPreference = "Please select a contact preference";
    }

    // Email validation
    if (!formData.contactTwoEmail.trim()) {
      newErrors.contactTwoEmail = "Contact email is required";
    } else if (!/^[\w\.-]+@[\w\.-]+\.\w+$/.test(formData.contactTwoEmail)) {
      newErrors.contactTwoEmail = "Invalid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = <K extends keyof PartyFormData>(
    field: K,
    value: PartyFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="text-sm font-medium">Party Address</label>
        <Input
          placeholder="123 Main St, Chapel Hill, NC"
          value={formData.address}
          onChange={(e) => updateField("address", e.target.value)}
          className="mt-2"
        />
        <p className="text-sm text-muted-foreground mt-1">
          Enter the address where the party will be held
        </p>
        {errors.address && (
          <p className="text-sm text-red-500 mt-1">{errors.address}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Party Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full mt-2 justify-start text-left font-normal ${
                  !formData.partyDate && "text-muted-foreground"
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
                onSelect={(date) => updateField("partyDate", date)}
                disabled={(date) =>
                  !isAfter(startOfDay(date), addBusinessDays(startOfDay(new Date()), 1))
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <p className="text-sm text-muted-foreground mt-1">
            Must be at least 2 business days from today
          </p>
          {errors.partyDate && (
            <p className="text-sm text-red-500 mt-1">{errors.partyDate}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">Party Time</label>
          <Input
            type="time"
            value={formData.partyTime}
            onChange={(e) => updateField("partyTime", e.target.value)}
            className="mt-2"
          />
          <p className="text-sm text-muted-foreground mt-1">Select the start time</p>
          {errors.partyTime && (
            <p className="text-sm text-red-500 mt-1">{errors.partyTime}</p>
          )}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Your Phone Number</label>
        <Input
          placeholder="(123) 456-7890"
          value={formData.phoneNumber}
          onChange={(e) => updateField("phoneNumber", e.target.value)}
          className="mt-2"
        />
        <p className="text-sm text-muted-foreground mt-1">
          We will use this to contact you about the party
        </p>
        {errors.phoneNumber && (
          <p className="text-sm text-red-500 mt-1">{errors.phoneNumber}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Contact Preference</label>
        <Select
          value={formData.contactPreference || undefined}
          onValueChange={(value) => updateField("contactPreference", value as "call" | "text")}
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Select your preference" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="call">Call</SelectItem>
            <SelectItem value="text">Text</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground mt-1">
          How should we contact you?
        </p>
        {errors.contactPreference && (
          <p className="text-sm text-red-500 mt-1">{errors.contactPreference}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Second Contact Email</label>
        <Input
          type="email"
          placeholder="student@unc.edu"
          value={formData.contactTwoEmail}
          onChange={(e) => updateField("contactTwoEmail", e.target.value)}
          className="mt-2"
        />
        <p className="text-sm text-muted-foreground mt-1">
          Email address of the second contact person
        </p>
        {errors.contactTwoEmail && (
          <p className="text-sm text-red-500 mt-1">{errors.contactTwoEmail}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Submitting..." : "Register Party"}
      </Button>
    </form>
  );
}