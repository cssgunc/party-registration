"use client";

import DialogItem from "./DialogItem";

export default function PartyRegistrationInfo({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={className}>
      <h1 className="page-title">About Party Registration</h1>
      <div className="card-shadow bg-card text-card-foreground content mt-3 rounded-md border">
        <DialogItem title="How does party registration work?">
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
        </DialogItem>

        <DialogItem title="Why register your party?">
          <p>
            Unlike a citation for a noise violation, registration is FREE. You
            do not want the police officers to stop by - so limit your chance of
            that happening! It gives you an opportunity to take responsibility
            (before the officers arrive). If you do not register your party, the
            presumptive outcome of a noise complaint on your party is a
            citation. Chapel Hill police will, in most circumstances, no longer
            give warnings to loud parties that have not been registered.
          </p>
        </DialogItem>

        <DialogItem title="Want to know the fine print?">
          <ul className="ml-5 list-outside list-disc space-y-1">
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
        </DialogItem>
      </div>
    </div>
  );
}
