import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { isFromThisSchoolYear } from "@/lib/utils";
import { AlertTriangleIcon, CheckCircle, ExternalLink } from "lucide-react";
import Link from "next/link";

type CompletionCardProps = {
  last_registered: Date | null | undefined;
  isPending?: boolean;
  error?: Error | null;
};

export default function StatusComponent({
  last_registered = null,
  isPending = false,
  error = null,
}: CompletionCardProps) {
  if (error) {
    return (
      <Card className="p-4 rounded-md shadow-sm w-full bg-card">
        <CardContent className="p-0">
          <div className="text-center text-destructive py-4">
            <p className="font-semibold mb-1">Error loading course status</p>
            <p className="text-sm">{error.message}</p>
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

  return (
    <Card className="p-4 rounded-md shadow-sm w-full bg-card">
      <CardContent className="p-0 flex flex-col gap-1 text-sm">
        {isCompleted ? (
          <>
            <div className="flex items-center gap-2 text-gray-800">
              <CheckCircle className="w-4 h-4" />
              <p className="content">
                Completed on{" "}
                <span className="content-bold">
                  {last_registered?.toLocaleDateString()}
                </span>
              </p>
            </div>
            <p className="italic content">Expires August 1st</p>
          </>
        ) : (
          <div className="content">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangleIcon className="w-4 h-4" />
              <p>Course not completed</p>
            </div>
            <div className="flex items-center">
              <a href="#" className="content underline ml-6">
                Schedule a meeting
              </a>
              <Link href="/">
                {" "}
                {/*change*/}
                <ExternalLink className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
