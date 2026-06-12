"use client";
import PartyRegistrationForm, {
  PartyFormValues,
  partyFormValuesToDto,
} from "@/app/(student)/_components/PartyRegistrationForm";
import { Card } from "@/components/ui/card";
import { useSnackbar } from "@/contexts/SnackbarContext";
import { hasActiveHold } from "@/lib/api/location/location.service";
import { useRegisterParty } from "@/lib/api/party/party.queries";
import { getPartyValidationError } from "@/lib/api/party/party.types";
import {
  useCurrentStudent,
  useUpdateStudent,
} from "@/lib/api/student/student.queries";
import { getErrorMessage } from "@/lib/errors";
import { isFromThisSchoolYear } from "@/lib/utils";
import { ArrowLeft, Info } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RegistrationForm() {
  const registerPartyMutation = useRegisterParty();
  const updateStudentMutation = useUpdateStudent();
  const studentQuery = useCurrentStudent();
  const router = useRouter();
  const { openSnackbar } = useSnackbar();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const courseCompleted = studentQuery.data
    ? isFromThisSchoolYear(studentQuery.data.last_registered)
    : false;
  const residenceHasActiveHold = hasActiveHold(
    studentQuery.data?.residence?.location.hold_expiration ?? null
  );
  const canRegisterParty = courseCompleted && !residenceHasActiveHold;
  const isRedirectingBlockedStudent =
    !studentQuery.isPending && !!studentQuery.data && !canRegisterParty;

  useEffect(() => {
    if (!isRedirectingBlockedStudent) return;
    router.replace("/");
  }, [isRedirectingBlockedStudent, router]);

  const handleSubmit = async (values: PartyFormValues) => {
    setSubmissionError(null);
    try {
      // If student didn't have contact info yet, save what they entered inline
      if (!studentQuery.data?.phone_number) {
        await updateStudentMutation.mutateAsync({
          phone_number: values.studentPhoneNumber,
          contact_preference: values.studentContactPreference,
          last_registered: studentQuery.data?.last_registered ?? null,
        });
      }

      const partyData = partyFormValuesToDto(values);
      const hasValidResidence = isFromThisSchoolYear(
        studentQuery.data?.residence?.residence_chosen_date
      );
      await registerPartyMutation.mutateAsync({
        partyData,
        residencePlaceId: hasValidResidence
          ? undefined
          : values.location.google_place_id,
      });
      openSnackbar("Party created successfully!", "success");
      router.push("/");
    } catch (err) {
      const validationError = getPartyValidationError(err);
      setSubmissionError(
        validationError
          ? validationError.message
          : getErrorMessage(err, {
              status: {
                409: "That phone number is already in use.",
                400: "You've already set your residence for this academic year.",
              },
              fallback: "Failed to register your party. Please try again.",
            })
      );
    }
  };

  if (isRedirectingBlockedStudent) {
    return null;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-4 mt-4">
        <nav className="flex items-center content pb-2 lg:hidden">
          <ArrowLeft className="h-4" />
          <Link href="/">Back</Link>
        </nav>
        <Card className="mb-12">
          <div>
            <nav className="hidden content lg:flex lg:items-center lg:px-8 lg:py-6">
              <ArrowLeft className="h-4" />
              <Link href="/">Back</Link>
            </nav>
            <div className="px-8 py-6 lg:px-18 lg:py-0 lg:pb-12">
              <h1 className="page-title md:mb-4">Register Party</h1>

              <Link
                href="/about-party-smart"
                className="flex items-center py-2 md:hidden"
              >
                <Info className="h-4 mr-1 content" />
                <p className="content underline">Learn About Party Smart</p>
              </Link>

              <PartyRegistrationForm
                onSubmit={handleSubmit}
                student={studentQuery.data}
                submissionError={submissionError}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
