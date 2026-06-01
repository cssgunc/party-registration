import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { hasActiveHold } from "@/lib/api/location/location.service";
import { clientEnv } from "@/lib/config/env.client";
import { getErrorMessage } from "@/lib/errors";
import { isFromThisSchoolYear } from "@/lib/utils";
import { format } from "date-fns";
import { AlertTriangleIcon, CheckCircle, ExternalLink } from "lucide-react";

type Props = {
  last_registered: Date | null | undefined;
  hold_expiration?: Date | null;
  isPending?: boolean;
  error?: Error | null;
};

export default function RegistrationStatus({
  last_registered = null,
  hold_expiration = null,
  isPending = false,
  error = null,
}: Props) {
  if (error) {
    return (
      <Card className="p-4 rounded-md shadow-sm w-full bg-card">
        <CardContent className="p-0">
          <div className="text-center text-destructive py-4">
            <p className="font-semibold mb-1">Error loading course status</p>
            <p className="text-sm">{getErrorMessage(error)}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isPending) {
    return (
      <Card className="p-4 rounded-md shadow-sm w-full bg-card">
        <CardContent className="p-0 overflow-y-hidden">
          <Skeleton className="h-4 w-3/4 mb-4" />
          <Skeleton className="h-4 w-1/2 mb-1" />
        </CardContent>
      </Card>
    );
  }

  const isCompleted = isFromThisSchoolYear(last_registered);
  const hasResidenceHold = hasActiveHold(hold_expiration);

  const expiresLabel = format(clientEnv.academicYearSwitchDate, "MMMM do");
  const courseLink = clientEnv.NEXT_PUBLIC_COURSE_LINK;

  return (
    <Card className="p-4 rounded-md shadow-sm w-full bg-card">
      <CardContent className="p-0 flex flex-col gap-1 text-sm">
        {hasResidenceHold && (
          <div className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangleIcon className="size-4 shrink-0 mb-0.5" />
            <p>
              Residence on hold until{" "}
              <b>{format(hold_expiration!, "MM/dd/yy")}</b>
            </p>
          </div>
        )}
        {isCompleted ? (
          <>
            <div className="flex items-center gap-2 text-gray-800">
              <CheckCircle className="size-4 mb-0.5" />
              <p className="content">
                Completed on{" "}
                <span className="content-bold">
                  {last_registered
                    ? format(last_registered, "M/d/yyyy")
                    : undefined}
                </span>
              </p>
            </div>
            <p className="italic content">Expires {expiresLabel}</p>
          </>
        ) : (
          <div className="content">
            <div className="flex items-center gap-2 mb-1 text-destructive">
              <AlertTriangleIcon className="size-4 mb-0.5" />
              <p>Course not completed</p>
            </div>
            <a
              href={courseLink}
              className="content underline ml-6 inline-flex items-center"
              target="_blank"
              rel="noopener noreferrer"
            >
              Schedule a meeting
              <ExternalLink className="size-4 ml-2" />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
