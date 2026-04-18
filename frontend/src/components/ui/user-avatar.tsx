import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  firstName?: string;
  lastName?: string;
  name?: string | null;
  email?: string | null;
  className?: string;
}

function getInitials({
  firstName,
  lastName,
  name,
  email,
}: Omit<UserAvatarProps, "className">): string {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const fallbackText = fullName || name?.trim() || email?.trim() || "U";
  const normalized = fallbackText.replace(/@.*/, "");
  const tokens = normalized.split(/[\s._-]+/).filter(Boolean);

  if (tokens.length === 0) return "U";
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return `${tokens[0][0]}${tokens[1][0]}`.toUpperCase();
}

export function UserAvatar({
  firstName,
  lastName,
  name,
  email,
  className,
}: UserAvatarProps) {
  const initials = getInitials({ firstName, lastName, name, email });

  return (
    <Avatar size="lg" className={cn("bg-secondary", className)}>
      <AvatarFallback className="bg-secondary text-white text-sm font-semibold leading-none">
        <span className="translate-y-px">{initials}</span>
      </AvatarFallback>
    </Avatar>
  );
}
