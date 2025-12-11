import alertTriangleIcon from "@/components/icons/alert-triangle.svg";
import checkIcon from "@/components/icons/check-circle.svg";
import { Card, CardContent } from "@/components/ui/card";
import { isAfter, isBefore, startOfDay } from "date-fns";
import Image from "next/image";

type CompletionCardProps = {
  lastRegistered: Date | null | undefined;
  isPending?: boolean;
  error?: Error | null;
};

export default function StatusComponent({
  lastRegistered = null,
  isPending = false,
  error = null,
}: CompletionCardProps) {
  if (error) {
    return (
      <Card className="p-4 rounded-2xl shadow-sm w-full bg-white">
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
      <Card className="p-4 rounded-2xl shadow-sm w-full bg-white">
        <CardContent className="p-0">
          <div className="text-center text-muted-foreground py-4">
            <p>Loading course status...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate the most recent August 1st
  const now = new Date();
  const currentYear = now.getFullYear();
  const augustFirst = new Date(currentYear, 7, 1);
  const mostRecentAugust1 = isBefore(now, augustFirst)
    ? new Date(currentYear - 1, 7, 1)
    : augustFirst;

  const isCompleted =
    lastRegistered !== null &&
    isAfter(startOfDay(lastRegistered), startOfDay(mostRecentAugust1));

  return (
    <Card className="p-4 rounded-2xl shadow-sm w-full bg-white">
      <CardContent className="p-0 flex flex-col gap-1 text-sm">
        {isCompleted ? (
          <>
            <div className="flex items-center gap-2 text-gray-800">
              <Image src={checkIcon} alt="check icon" />
              <span>
                Completed on{" "}
                <strong>{lastRegistered?.toLocaleDateString()}</strong>
              </span>
            </div>

            <div className="italic text-[#09294E]">Expires August 1st</div>
          </>
        ) : (
          <div>
            <div className="flex items-center gap-2 text-gray-800">
              <Image src={alertTriangleIcon} alt="alert icon" />
              <span>Course not completed</span>
            </div>
            <a href="#" className="text-blue-600 underline text-sm">
              Schedule a meeting
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
