import alertTriangleIcon from "@/components/icons/alert-triangle.svg";
import checkIcon from "@/components/icons/check-circle.svg";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

type CompletionCardProps = {
    completion_date: string | null;
    expiration_date: string | null;
};

export default function StatusComponent({ completion_date, expiration_date }: CompletionCardProps) {
    const isCompleted = completion_date && expiration_date;

    return (
        <Card className="p-4 rounded-2xl shadow-sm w-full bg-white">
            <CardContent className="p-0 flex flex-col gap-1 text-sm">

                {isCompleted ? (
                    <>
                        <div className="flex items-center gap-2 text-gray-800">
                            <Image src={checkIcon} alt="check icon" />
                            <span>
                                Completed on <strong>{completion_date}</strong>
                            </span>
                        </div>

                        <div className="italic text-[#09294E]">
                            Expires {expiration_date}
                        </div>

                    </>
                ) : (
                    <div>
                        <div className="flex items-center gap-2 text-gray-800">
                            <Image src={alertTriangleIcon} alt="alert icon" />
                            <span>
                                Course not completed
                            </span>
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

