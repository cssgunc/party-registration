import partySamrtVertical from "@/components/icons/party_smart_logo_vertical.svg";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";

type AuthCardProps = {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
};

export default function AuthCard({
  title,
  description,
  children,
}: AuthCardProps) {
  return (
    <main className="h-full overflow-y-auto flex items-center justify-center px-4 py-6">
      <Card className="w-full max-w-md my-auto">
        <CardHeader className="px-10 pt-6 text-center">
          <div className="flex justify-center mb-3">
            <Image
              src={partySamrtVertical}
              alt="Party Smart by OCSL"
              loading="eager"
              className="h-[min(22dvh,240px)] w-auto"
            />
          </div>
          <CardTitle className="text-2xl mb-2">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        {children}
      </Card>
    </main>
  );
}
