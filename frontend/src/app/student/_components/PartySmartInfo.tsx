import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function PartySmartInfo() {
  return (
    <div className="mt-4 2xl:mt-0">
      <h1 className="page-title">About Party Smart</h1>
      <Accordion type="single" collapsible className="my-5">
        <AccordionItem value="1">
          <AccordionTrigger>
            How to reduce risk before the Party:
          </AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc list-outside ml-5 space-y-1">
              <li>
                Contact your neighbors in advance to let them know you'll be
                having guests over and ask if there is anything you can do as a
                host to make it easier for them. Give them your phone number so
                they can call you if problems arise. Remember: Informing your
                neighbors does not give you license to be a nuisance.
              </li>
              <li>
                Consider whether you want to allow alcohol at your party at all.
                Planning an event without alcohol reduces many of the potential
                problems of house parties. If you do decide to allow your guests
                to bring alcohol, consider limits. A six-pack of beer or a
                bottle of wine is recommended.
              </li>
              <li>Make a guest list and stick to it.</li>
              <li>
                Make a party plan, including who will monitor the event (sober),
                how access/egress will be managed to insure a safe and secure
                event, what time the event will begin and end, what
                non-alcoholic beverages will be available in addition to food,
                and how guests will get home safely.
              </li>
              <li>
                If you are a member of a fraternity or sorority, make sure your
                event is in compliance with any and all applicable policies; any
                event that you host has the potential to be construed as a
                chapter event.
              </li>
              <li>
                Read your renter's insurance policy to understand any applicable
                stipulations in the coverage.
              </li>
              <li>
                Protect your items; lock rooms you don't want guests to have
                access to; put away valuables, restrict access to candles,
                fireworks and other flammable materials.
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="2">
          <AccordionTrigger>
            How to reduce risk during the Party:
          </AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc list-outside ml-5 space-y-1">
              <li>
                Have at least two people there who are not drinking and
                designate a sober, responsible person to address concerns that
                arise, confront high risk behavior, and speak with the police
                should they come to your event. If the police do come, stay
                calm, be polite and cooperative, and step outside to discus the
                situation. If you are willing to shut the event down, they are
                likely to only give you a warning. If they have to come back,
                you are likely facing an expensive citation.
              </li>
              <li>
                Use your guest list and make sure the house isn't getting
                overcrowded.
              </li>
              <li>
                Limit alcohol consumption (avoid kegs, “pj”, and other common
                source containers), and serve non-alcoholic beverages to
                supplement any alcohol that your guests may bring. Additionally,
                provide food and use cans or clear plastic cups rather than
                glass bottles.
              </li>
              <li>
                Never promote or sponsor a function where you or housemates may
                be interpreted as selling alcohol by selling drink tickets,
                selling empty cups, charging for “all you can drink,” or hosting
                an event in conjunction with a local bar or alcohol distributor.
                Always go BYOB.
              </li>
              <li>
                Do periodic sweeps around the house to make sure folks are
                having fun, and clean up any trash issues in the house or yard.
                - Doing a little bit at a time will save you a big headache
                later on.
              </li>
              <li>Do not permit illegal drug use.</li>
              <li>
                Keep people off balcony's or porches that are not equipped to
                handle large numbers of people.
              </li>
              <li>
                Be aware of guests that may have had too much to drink and get
                help immediately for those that have. Know the signs of alcohol
                poisoning and call 911. Good Samaritan and medical amnesty laws
                will keep you out of trouble if you are focused on getting help
                for a friend.
              </li>
              <li>
                Be aware of the potential for sexual assault to take place.
                People who are incapacitated as a result of their alcohol
                consumption cannot consent to sexual activity. Your best bet as
                a host is to close off bedrooms or other places where sexual
                encounters are likely to occur. If you see a situation that
                looks questionable, say something/do something to prevent
                someone from committing or being a victim of sexual assault.
              </li>
              <li>
                Monitor how people are getting home. Remember social host
                liability: You are liable for the actions of people who leave
                your party intoxicated. Take care of your guests.
              </li>
              <li>
                Ask your guests to respect your neighborhood as they leave: No
                yelling, vandalism, open containers, littering, etc. Clean up
                any mess your event creates - both inside and outside of your
                house. Take a moment to make sure your neighbors' property was
                unaffected by your party.
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="3">
          <AccordionTrigger>
            How to reduce risk after the Party:
          </AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc list-outside ml-5 space-y-1">
              <li>
                Don't let guests leave with an open container of alcohol in
                their hand.
              </li>
              <li>
                Make sure everyone gets home safe; don't let folks wander off
                alone.
              </li>
              <li>Clean up: Your house and the surrounding area outside.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
