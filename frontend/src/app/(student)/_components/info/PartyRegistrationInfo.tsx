"use client";

import { clientEnv } from "@/lib/config/env.client";
import { format } from "date-fns";
import DialogItem from "./DialogItem";

export default function PartyRegistrationInfo({
  className,
}: {
  className?: string;
}) {
  const minLeadHours = clientEnv.NEXT_PUBLIC_PARTY_MIN_LEAD_HOURS;
  const maxLeadDays = clientEnv.NEXT_PUBLIC_PARTY_MAX_LEAD_DAYS;
  const courseLink = clientEnv.NEXT_PUBLIC_COURSE_LINK;
  const contactEmail = clientEnv.NEXT_PUBLIC_CONTACT_EMAIL;
  const academicYearStart = format(clientEnv.academicYearSwitchDate, "MMMM do");

  return (
    <div className={className}>
      <h1 className="page-title">About Party Registration</h1>
      <div className="card-shadow bg-card text-card-foreground content mt-3 rounded-md border">
        <DialogItem title="How does party registration work?">
          <p>
            Registering your party lets you give Chapel Hill police a heads-up
            about a gathering at your residence. In most cases, a noise
            complaint on a registered party results in a warning and a chance to
            shut things down, rather than a citation. Here&apos;s the process:
          </p>
          <ol className="ml-5 list-outside list-decimal space-y-1">
            <li>
              <span className="content-bold">
                Complete the Party Smart course.
              </span>{" "}
              This is a short meeting with the program administrators (no more
              than 15 minutes, held over video call). You only need to do this
              once per academic year. You can schedule it{" "}
              <a
                href={courseLink}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                here
              </a>
              .
            </li>
            <li>
              <span className="content-bold">Set your residence.</span> This is
              the Chapel Hill address where you live and will host. You choose
              it once per academic year, and your parties are registered at this
              address (see &ldquo;Your residence &amp; holds&rdquo; below).
            </li>
            <li>
              <span className="content-bold">
                Register your party from the dashboard
              </span>{" "}
              by pressing &ldquo;New Party,&rdquo; at least {minLeadHours} hours
              before your gathering* and no more than {maxLeadDays} days in
              advance.
            </li>
            <li>
              <span className="content-bold">Add a second contact</span> (anyone
              else attending who is willing to take responsibility for the
              party) with their UNC-Chapel Hill email and cell phone number.
            </li>
          </ol>
          <p>
            If a noise complaint is received on your registered party, Chapel
            Hill police will call or text using the contact preference you
            provided and give you a warning. You will have 20 minutes to shut
            the party down and avoid the police officers.
          </p>
          <p className="content-sub">
            *For example, if your party is on Saturday at 9:00 p.m. and the
            minimum is 24 hours, your form needs to be submitted by Friday at
            9:00 p.m. at the latest. Only one party may be registered per
            calendar day.
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

        <DialogItem title="Your residence & holds">
          <p>
            Your residence is the Chapel Hill address where you live, and it is
            the address your parties are registered at. You can only register
            parties at your own residence; you cannot register a friend&apos;s
            party.
          </p>
          <p>
            You set your residence once per academic year. After choosing it,
            you cannot change it again until the next academic year begins. For
            extraordinary circumstances, contact{" "}
            <a href={`mailto:${contactEmail}`} className="underline">
              {contactEmail}
            </a>
            .
          </p>
          <p>
            If program administrators place a hold on your residence, you will
            not be able to register a party there until the hold expires. If you
            have an active hold, you will be able to see it on your home page.
          </p>
        </DialogItem>

        <DialogItem title="Want to know the fine print?">
          <ul className="ml-5 list-outside list-disc space-y-1">
            <li>You can register parties for any night of the week.</li>
            <li>
              You MUST register at least {minLeadHours} hours in advance. No
              exceptions. You may not register more than one party per day, and
              you cannot schedule a party more than {maxLeadDays} days in
              advance.
            </li>
            <li>
              The academic year resets on {academicYearStart}. That is when your
              Party Smart completion expires and when you can choose a new
              residence.
            </li>
            <li>
              You must complete the Party Smart course each academic year before
              you can register a party.
            </li>
            <li>
              You MUST live at the residence being registered. You cannot
              register a friend&apos;s party.
            </li>
            <li>
              Your second contact must be a different person from you, with a
              UNC-Chapel Hill (@unc.edu) email and a cell phone number that
              differs from your own.
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
              If the police should show up at your residence, be respectful. Let
              them know you registered and be sure to shut your party down. If
              you ignore your warning, whether by phone or by the police, you
              are likely to get a citation.
            </li>
            <li>
              Residences that receive two consecutive warnings on registered
              parties from Chapel Hill police will lose party registration
              privileges for 90 days, enforced as a hold on the residence (see
              &ldquo;Your residence &amp; holds&rdquo; above). Any unregistered
              location that receives a citation or is warned two or more times
              will be prohibited from registering a party for one calendar year
              from the date the citation was received or second warning was
              issued.
            </li>
          </ul>
        </DialogItem>
      </div>
    </div>
  );
}
