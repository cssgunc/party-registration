import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertTriangleIcon, ArrowLeft } from "lucide-react";

export default function PartyRegistrationInfo() {
  
  return (
    <div className="mt-4 2xl:mt-0">
      <h1 className="page-title">About Party Registration</h1>
      <Accordion
      type="single"
      collapsible
      className="my-5"
      >
        <AccordionItem value="1">
          <AccordionTrigger>
            How does party registration work?</AccordionTrigger>
          <AccordionContent>
            Change me
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="2">
          <AccordionTrigger>
            Why register your party?</AccordionTrigger>
          <AccordionContent>
            Change me
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="3">
          <AccordionTrigger>
            Want to know the fine print?</AccordionTrigger>
          <AccordionContent>
            Change me
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <div className="flex flex-col items-center content 2xl:mt-8 2xl:mb-12">
        <AlertTriangleIcon/>
        <p className="text-center w-4/5 mt-2">Keep in mind that the party registration program only pertains to nuisance noise complaints. Calls to 911 for other violations will likely result in local law enforcement showing up without a warning.</p>
      </div>
    </div>
  );
}
