"use client";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Info } from "lucide-react";
import { ReactNode, useState } from "react";

type AccordionDialogItemProps = {
  value: string;
  title: string;
  dialogTitle: string;
  children: ReactNode;
};

function AccordionDialogItem({
  value,
  title,
  dialogTitle,
  children,
}: AccordionDialogItemProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <AccordionItem value={value}>
        <AccordionTrigger
          className="[&>svg]:hidden"
          onClick={() => setOpen(true)}
        >
          <span className="flex w-full items-center justify-between gap-4">
            <span>{title}</span>
            <Info className="size-4 shrink-0 text-muted-foreground" />
          </span>
        </AccordionTrigger>
      </AccordionItem>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-text">
            {dialogTitle}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Modal with detailed information for this section.
          </DialogDescription>
        </DialogHeader>
        <div className="content space-y-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export default function PartyRegistrationInfo() {
  return (
    <div className="mt-4 2xl:mt-0">
      <h1 className="page-title">About Party Registration</h1>
      <Accordion type="single" collapsible className="mt-5">
        <AccordionDialogItem
          value="1"
          title="How does party registration work?"
          dialogTitle="How does party registration work?"
        >
          <p>For first-time users*:</p>
          <p>
            Fill out the party registration form on-line (below) at least 72
            regular business hours (three weekdays) in advance of the
            gathering**, wait for a response from the program administrators,
            and schedule a time to meet with them (will take no more than 15
            minutes and will be via video call).
          </p>
          <p className="content-sub">
            *party registration renews every academic year, so you are
            considered a first time user the first time you register each year.
          </p>
          <p className="content-sub">
            **For example, if your party is on a Friday night, your form needs
            to be submitted by the preceding Tuesday at 5:00 p.m. If your
            gathering is on a Monday evening, your form would need to be in by
            the preceding Wednesday at 5:00 p.m.
          </p>
          <p>For Repeat Users:</p>
          <p>
            Fill out the party registration form on-line (below) at least 48
            regular business hours (two weekdays) in advance, wait for a
            response from the program administrators. On the registration form,
            provide us with two contact persons, two UNC-Chapel Hill emails, two
            cell phone numbers, and your local Chapel Hill address. If a noise
            complaint on your house is received, Chapel Hill police will call or
            text and give you a warning. You will have 20 minutes to shut the
            party down and avoid the police officers.
          </p>
        </AccordionDialogItem>

        <AccordionDialogItem
          value="2"
          title="Why register your party?"
          dialogTitle="Why register your party?"
        >
          <p>
            Unlike a citation for a noise violation, registration is FREE. You
            do not want the police officers to stop by - so limit your chance of
            that happening! It gives you an opportunity to take responsibility
            (before the officers arrive). If you do not register your party, the
            presumptive outcome of a noise complaint on your party is a
            citation. Chapel Hill police will, in most circumstances, no longer
            give warnings to loud parties that have not been registered.
          </p>
        </AccordionDialogItem>

        <AccordionDialogItem
          value="3"
          title="Want to know the fine print?"
          dialogTitle="Want to know the fine print?"
        >
          <ul className="list-disc list-outside ml-5 space-y-1">
            <li>You can register parties for any night of the week.</li>
            <li>
              You MUST register by the 72 hours (three business days) deadline
              each week. No exceptions.
            </li>
            <li>
              You MUST live at the house being registered. You cannot register a
              friend&apos;s party.
            </li>
            <li>
              Party registration is for noise complaints only, and does not
              protect you or your guests against any other violations including
              state and local orders on gatherings, open containers, minor in
              possession, or public urination.
            </li>
            <li>
              Parties in a common areas (e.g. pools, garages, parks, apartment
              courtyards) cannot be registered.
            </li>
            <li>
              Residences that receive two consecutive warnings on registered
              parties from Chapel Hill police will lose party registration
              privileges for 90 days. Any unregistered location that receives a
              citation or is warned two or more times will be prohibited from
              registering a party for one calendar year from the date the
              citation was received or second warning was issued.
            </li>
          </ul>
        </AccordionDialogItem>
      </Accordion>
    </div>
  );
}
