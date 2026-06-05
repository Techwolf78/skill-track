import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Award, Download, Share2, Eye, Calendar, ShieldCheck, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function Certificates() {
  const [previewCert, setPreviewCert] = useState<any | null>(null);

  const certificates = [
    {
      id: "CERT-2026-904",
      title: "React & Advanced State Architect",
      issueDate: "June 03, 2026",
      score: 92,
      credentialId: "RX1-RASA-88109",
      skills: ["React", "Redux Toolkit", "Zustand", "Performance Optimization"]
    },
    {
      id: "CERT-2026-815",
      title: "RDBMS Design & Query Specialist",
      issueDate: "May 28, 2026",
      score: 85,
      credentialId: "RX1-RDQS-77402",
      skills: ["SQL Queries", "Database Design", "Indexing", "PostgreSQL"]
    },
    {
      id: "CERT-2026-702",
      title: "System Integration & Design Engineer",
      issueDate: "May 20, 2026",
      score: 76,
      credentialId: "RX1-SIDE-66381",
      skills: ["Caching", "Scalability", "Microservices", "Load Balancing"]
    }
  ];

  const handleShare = (title: string) => {
    toast.success(`Share link copied for '${title}'!`, {
      description: "You can now paste it on LinkedIn, Twitter, or your resume.",
      duration: 3000
    });
  };

  const handleDownload = (title: string) => {
    toast.success(`Downloading Certificate PDF for '${title}'...`, {
      description: "Generating secure high-resolution certificate file.",
      duration: 3000
    });
  };

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-heading text-foreground">Certificates</h2>
        <p className="text-sm text-muted-foreground">View and download your official assessments accomplishments, and add verification badges directly to your profiles.</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {certificates.map((cert) => (
          <Card key={cert.id} className="border border-border/60 flex flex-col justify-between hover:shadow-lg card-hover">
            <CardHeader className="space-y-2">
              <div className="p-3 bg-gradient-primary w-fit rounded-xl text-primary-foreground shadow-sm">
                <Award className="w-6 h-6" />
              </div>
              <CardTitle className="text-lg font-bold font-heading line-clamp-1">{cert.title}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                <Calendar className="w-3.5 h-3.5" /> Issued on: {cert.issueDate}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-1">
                {cert.skills.map((skill, idx) => (
                  <span key={idx} className="bg-muted text-muted-foreground text-[10px] font-semibold px-2 py-0.5 rounded">
                    {skill}
                  </span>
                ))}
              </div>
              <div className="border-t border-border/50 pt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Verification ID:</span>
                <span className="font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded text-[10px]">
                  {cert.credentialId}
                </span>
              </div>
            </CardContent>
            <CardFooter className="border-t border-border/40 p-4 bg-muted/10 flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 border-border gap-1 hover:bg-muted text-xs font-semibold h-9"
                onClick={() => setPreviewCert(cert)}
              >
                <Eye className="w-3.5 h-3.5" /> Preview
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-primary hover:bg-primary/5 h-9 w-9"
                onClick={() => handleDownload(cert.title)}
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-accent hover:bg-accent/5 h-9 w-9"
                onClick={() => handleShare(cert.title)}
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Certificate Preview Modal */}
      {previewCert && (
        <Dialog open={!!previewCert} onOpenChange={(open) => !open && setPreviewCert(null)}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden bg-white border-0 shadow-2xl">
            {/* The Certificate Frame */}
            <div className="p-8 bg-amber-50/15 border-8 border-amber-900/10 flex flex-col items-center text-center relative font-serif text-slate-800">
              {/* Background watermark */}
              <div className="absolute inset-0 pointer-events-none opacity-5 flex items-center justify-center">
                <Award className="w-96 h-96 text-slate-900" />
              </div>

              {/* Decorative border */}
              <div className="border-2 border-double border-amber-800/25 p-8 w-full h-full flex flex-col items-center">
                
                {/* Header */}
                <div className="flex flex-col items-center gap-1 mb-6">
                  <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground shadow-md mb-2">
                    <span className="font-heading font-extrabold text-2xl">R</span>
                  </div>
                  <span className="text-xs uppercase tracking-widest font-heading font-semibold text-amber-800/80">RxOne Skill Track Assessment</span>
                  <div className="w-24 h-0.5 bg-amber-600/30 my-1" />
                </div>

                {/* Subtitle */}
                <span className="text-sm italic font-medium text-slate-500 mb-4">Certificate of Accomplishment</span>

                {/* Recipient */}
                <span className="text-xs text-slate-400 uppercase tracking-widest">This is proudly awarded to</span>
                <span className="text-3xl font-extrabold font-heading text-slate-900 my-4 tracking-wide border-b border-amber-800/30 pb-2 px-12">
                  Alex Rivera
                </span>

                {/* Body */}
                <p className="max-w-lg text-sm leading-relaxed text-slate-600 italic">
                  for successfully demonstrating mastery and passing with honors the comprehensive examinations for
                </p>
                <p className="text-xl font-bold font-heading text-amber-900 my-3">
                  {previewCert.title}
                </p>
                <p className="text-xs text-slate-500 max-w-md">
                  Evaluating skills in {previewCert.skills.join(", ")} with an aggregate score of <strong className="text-slate-800">{previewCert.score}%</strong>.
                </p>

                {/* Signatures & Credentials */}
                <div className="grid grid-cols-2 w-full mt-10 border-t border-slate-100 pt-6">
                  <div className="flex flex-col items-center">
                    <span className="font-script text-lg text-slate-700 italic border-b border-slate-200 px-6 pb-1">Dr. Stephen Vance</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider mt-1.5 font-heading">Director of Evaluation</span>
                  </div>
                  <div className="flex flex-col items-center justify-end">
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold uppercase tracking-wider bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Secure Verified
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 mt-2">ID: {previewCert.credentialId}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
              <Button 
                variant="outline" 
                onClick={() => setPreviewCert(null)}
                className="border-slate-200"
              >
                Close Preview
              </Button>
              <Button 
                onClick={() => {
                  handleDownload(previewCert.title);
                  setPreviewCert(null);
                }}
                className="bg-gradient-primary text-white hover:opacity-95 shadow-primary gap-1"
              >
                <Download className="w-4 h-4" /> Download Official PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
