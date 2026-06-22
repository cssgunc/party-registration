import partySamrtVertical from "@/components/icons/party_smart_logo_vertical.svg";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
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
    <div className="h-full overflow-y-auto flex items-center justify-center px-4 py-6">
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
          <h1 className="leading-none font-semibold text-2xl mb-2">{title}</h1>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        {children}
      </Card>
    </div>
  );
}
