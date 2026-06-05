import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  HelpCircle, 
  Plus, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Mail,
  Phone
} from "lucide-react";
import { toast } from "sonner";

export default function Support() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");

  const [tickets, setTickets] = useState([
    {
      id: "TKT-1024",
      subject: "Coding Editor Layout glitch on Safari",
      category: "Technical",
      status: "Resolved",
      date: "June 02, 2026",
      replies: 2
    },
    {
      id: "TKT-0985",
      subject: "Extra time request due to network drop",
      category: "Assessment",
      status: "In Progress",
      date: "May 29, 2026",
      replies: 1
    }
  ]);

  const faqs = [
    {
      q: "What happens if my internet disconnects during a test?",
      a: "Do not panic. RxOne autosaves your answers locally in real-time. Once your network restores, your timer will resume from where you left off, and your progress is synced. If you experience extended drops, raise a ticket immediately with details of the outage."
    },
    {
      q: "Can I copy-paste code into the assessment compiler?",
      a: "No. The secure exam portal disables copy-paste features. Code must be written directly in our built-in coding playground. External pastes trigger security flags which could invalidate your assessment."
    },
    {
      q: "When do I get my certificate after passing an exam?",
      a: "Once you successfully complete a test, our auto-evaluation engine evaluates MCQs instantly. Code assessments are evaluated via automated test suites within minutes. Certificates are issued instantly once the threshold score is met."
    },
    {
      q: "How can I update my name on the certificate?",
      a: "Certificates are issued with the name currently saved in your profile. If you need corrections, update your profile details under the 'Profile' section, then re-download your certificate."
    }
  ];

  const handleRaiseTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDescription.trim()) return;

    const newTicket = {
      id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      subject: ticketSubject,
      category: "Technical",
      status: "Open",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
      replies: 0
    };

    setTickets([newTicket, ...tickets]);
    setTicketSubject("");
    setTicketDescription("");
    setIsDialogOpen(false);

    toast.success("Support ticket raised successfully!", {
      description: `Ticket ID ${newTicket.id} has been logged in our queue.`,
      duration: 4000
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Resolved":
        return <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-100"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Resolved</span>;
      case "In Progress":
        return <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-amber-100"><Clock className="w-3 h-3 text-amber-500" /> In Progress</span>;
      case "Open":
      default:
        return <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-blue-100"><AlertCircle className="w-3 h-3 text-blue-500" /> Open</span>;
    }
  };

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header and Call to Action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-heading text-foreground">Support & Help Center</h2>
          <p className="text-sm text-muted-foreground">Find quick answers to common assessment queries or connect with evaluation admins.</p>
        </div>

        {/* Raise Ticket Trigger */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary text-white hover:opacity-95 shadow-primary gap-1.5">
              <Plus className="w-4 h-4" /> Raise a Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold font-heading">Raise Support Ticket</DialogTitle>
              <DialogDescription>Describe the issue you're facing. Technical queries are typically answered within 2 hours during exams.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleRaiseTicket} className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject / Issue Title</Label>
                <Input 
                  id="subject" 
                  placeholder="e.g. Test submission error or network interruption" 
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Detailed Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="Explain exactly what happened. If you were taking a test, specify the test name." 
                  rows={4}
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 border-border"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-gradient-primary text-white shadow-primary">
                  Submit Ticket
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* FAQs Accordion (Left 2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" /> Frequently Asked Questions
          </h3>
          <Card className="border border-border/60">
            <CardContent className="p-6">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, idx) => (
                  <AccordionItem key={idx} value={`faq-${idx}`}>
                    <AccordionTrigger className="text-sm font-bold text-foreground hover:text-primary text-left leading-normal py-4">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-xs text-muted-foreground leading-relaxed pt-1 pb-4">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* Tickets & Contacts (Right column) */}
        <div className="space-y-6">
          {/* Active Tickets */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> My Tickets
            </h3>
            <Card className="border border-border/60">
              <CardContent className="p-0 divide-y divide-border">
                {tickets.map((t) => (
                  <div key={t.id} className="p-4 space-y-2.5 hover:bg-muted/10 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-mono font-bold text-muted-foreground">{t.id}</span>
                      {getStatusBadge(t.status)}
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-foreground leading-snug line-clamp-1">{t.subject}</h4>
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                        <span>Submitted: {t.date}</span>
                        <span>{t.replies} Admin Replies</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Quick Contact */}
          <Card className="border border-border/60 bg-gradient-to-br from-indigo-50/20 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Need Immediate Help?</CardTitle>
              <CardDescription className="text-xs">If you are currently locked out of an active exam, contact us directly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                <span>support@gryphonacademy.co.in</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                <span>+91 22 49302 9180</span>
              </div>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}
