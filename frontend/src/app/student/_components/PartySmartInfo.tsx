import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function PartySmartInfo() {
  
  return (
    <div className="mt-4 2xl:mt-0">
      <h1 className="page-title">About Party Smart</h1>
      <Accordion
      type="single"
      collapsible
      className="my-5"
      >
        <AccordionItem value="1">
          <AccordionTrigger>
            Common scenarios that get you in trouble</AccordionTrigger>
          <AccordionContent>
            Change me
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="2">
          <AccordionTrigger>How to reduce risk</AccordionTrigger>
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
    </div>
  );
}
