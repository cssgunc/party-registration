"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { PartyDto } from "@/lib/api/party/party.types";
import { formatPhoneNumber, formatTime } from "@/lib/utils";
import { format } from "date-fns/format";
import { Ban, Mail, MoreVertical, Pencil, Phone } from "lucide-react";
import { memo } from "react";

type Props = {
  party: PartyDto;
  showActions?: boolean;
  showAddress?: boolean;
  residenceLocationId?: number;
  isPartiesPending?: boolean;
  onEdit: (party: PartyDto) => void;
  onDelete: (party: PartyDto) => void;
};

const RegistrationPartyCard = memo(function RegistrationPartyCard({
  party,
  showActions,
  showAddress,
  residenceLocationId,
  isPartiesPending,
  onEdit,
  onDelete,
}: Props) {
  const shouldShowAddress =
    showAddress ||
    (!!residenceLocationId && party.location.id !== residenceLocationId);

  return (
    <div className="px-4 py-4 border-b border-gray-200 rounded-none">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex content-bold gap-2">
              <p>
                {format(party.party_datetime, "M/d/yyyy")} @{" "}
                {formatTime(party.party_datetime)}
              </p>
            </div>
            {shouldShowAddress &&
              (isPartiesPending ? (
                <Skeleton className="h-4 w-3/4 my-2" />
              ) : (
                <h2 className="content-sub my-0.5">
                  {party.location.formatted_address}
                </h2>
              ))}
          </div>

          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="shrink-0 bg-transparent hover:bg-transparent p-0 h-auto">
                  <MoreVertical className="size-4 content cursor-pointer" />
                  <p className="sr-only">Party actions</p>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(party)}>
                  <Pencil className="size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete(party)}
                >
                  <Ban className="size-4" />
                  Cancel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Contacts Side by Side */}
        <div className="flex flex-wrap gap-y-3">
          {/* Contact One */}
          <div className="content ml-3 min-w-56">
            <p>
              {party.contact_one.first_name} {party.contact_one.last_name}
            </p>
            <div className="flex flex-col gap-0.5 mt-0.5">
              <p className="flex items-center gap-1.5">
                <Phone className="size-3 shrink-0" />
                {formatPhoneNumber(party.contact_one.phone_number)}
                <span className="capitalize">
                  - {party.contact_one.contact_preference}
                </span>
              </p>
              <p className="flex items-center gap-1.5">
                <Mail className="size-3 shrink-0" />
                {party.contact_one.email}
              </p>
            </div>
          </div>

          {/* Contact Two */}
          <div className="content ml-3 min-w-56">
            <p>
              {party.contact_two.first_name} {party.contact_two.last_name}
            </p>
            <div className="flex flex-col gap-0.5 mt-0.5">
              <p className="flex items-center gap-1.5">
                <Phone className="size-3 shrink-0" />
                {formatPhoneNumber(party.contact_two.phone_number)}
                <span className="capitalize">
                  - {party.contact_two.contact_preference}
                </span>
              </p>
              <p className="flex items-center gap-1.5">
                <Mail className="size-3 shrink-0" />
                {party.contact_two.email}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default RegistrationPartyCard;
