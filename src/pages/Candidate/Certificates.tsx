import { useEffect, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Award, Download, ShieldCheck, Calendar, RefreshCw, Trophy } from "lucide-react";
import { toast } from "sonner";
import { candidateService } from "@/lib/candidate-service";
import { testService, TestSession, TestResult, Test } from "@/lib/test-service";

interface CertEntry {
  session: TestSession;
  test: Test | null;
  result: TestResult;
}

export default function Certificates() {
  const [loading, setLoading] = useState(true);
  const [certs, setCerts] = useState<CertEntry[]>([]);
  const [previewCert, setPreviewCert] = useState<CertEntry | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })();
  const userId: string = storedUser?.id || "";
  const candidateName: string = storedUser?.name || "Candidate";

  const loadCerts = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const candidate = await candidateService.getCandidateByUserId(userId);
      if (!candidate) {
        toast.error("Candidate profile not found.");
        return;
      }

      const [allSessions, allTests] = await Promise.all([
        testService.getAllSessions(),
        testService.getAllTests(),
      ]);

      const mySessions = allSessions.filter((s) => s.candidateId === candidate.id);
      const certEntries: CertEntry[] = [];

      await Promise.all(
        mySessions.map(async (session) => {
          if (session.status !== "SUBMITTED" && session.status !== "EVALUATED") return;
          try {
            const res = await testService.pollResultBySessionId(session.id);
            const statusCode = res.statusCode || res.status;
            if (statusCode === 200 && res.data && res.data.passed) {
              const test = allTests.find((t) => t.id === session.testId) || null;
              certEntries.push({ session, test, result: res.data });
            }
          } catch { /* no result yet */ }
        })
      );

      // Sort newest first
      certEntries.sort((a, b) =>
        new Date(b.result.evaluatedAt || b.session.submittedAt || "").getTime() -
        new Date(a.result.evaluatedAt || a.session.submittedAt || "").getTime()
      );
      setCerts(certEntries);
    } catch (err: unknown) {
      toast.error("Failed to load certificates: " + ((err as Error).message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadCerts(); }, [userId]);

  const handleDownload = async (sessionId: string, title: string) => {
    try {
      setPdfLoadingId(sessionId);
      const { data: blob, filename } = await testService.downloadScorecard(sessionId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`Scorecard PDF for '${title}' downloaded.`);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Scorecard PDF not available yet.");
    } finally {
      setPdfLoadingId(null);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading text-foreground">Certificates</h2>
          <p className="text-sm text-muted-foreground">
            Official certificates for assessments you have passed. Download and share your achievements.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadCerts} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border border-border/60 animate-pulse">
              <CardHeader className="space-y-3">
                <div className="w-12 h-12 bg-muted rounded-xl" />
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardHeader>
              <CardFooter className="border-t p-4">
                <div className="h-8 bg-muted rounded w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : certs.length === 0 ? (
        <Card className="border border-border/60">
          <CardContent className="py-16 text-center">
            <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-3">
              <Trophy className="w-8 h-8 text-muted-foreground opacity-40" />
            </div>
            <p className="text-sm font-bold text-foreground">No certificates yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Certificates are issued for assessments you pass. Complete and pass a test to earn one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {certs.map((entry) => (
            <Card key={entry.session.id} className="border border-border/60 flex flex-col justify-between hover:shadow-lg card-hover">
              <CardHeader className="space-y-2">
                <div className="p-3 bg-gradient-primary w-fit rounded-xl text-primary-foreground shadow-sm">
                  <Award className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg font-bold font-heading line-clamp-2">
                  {entry.test?.title || "Assessment Certificate"}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Issued: {formatDate(entry.result.evaluatedAt || entry.session.submittedAt)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="border-t border-border/50 pt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Score Achieved</span>
                  <span className="font-bold text-emerald-600">
                    {entry.result.totalScore} / {entry.result.maxScore} ({entry.result.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold uppercase tracking-wider bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full w-fit">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Pass
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/40 p-4 bg-muted/10 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-border gap-1 hover:bg-muted text-xs font-semibold h-9"
                  onClick={() => setPreviewCert(entry)}
                >
                  <Award className="w-3.5 h-3.5" /> Preview
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary hover:bg-primary/5 h-9 w-9"
                  onClick={() => handleDownload(entry.session.id, entry.test?.title || "Certificate")}
                  disabled={pdfLoadingId === entry.session.id}
                >
                  <Download className={`w-4 h-4 ${pdfLoadingId === entry.session.id ? "animate-pulse" : ""}`} />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Certificate Preview Modal */}
      {previewCert && (
        <Dialog open={!!previewCert} onOpenChange={(open) => !open && setPreviewCert(null)}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden bg-white border-0 shadow-2xl">
            <div className="p-8 bg-amber-50/15 border-8 border-amber-900/10 flex flex-col items-center text-center relative font-serif text-slate-800">
              <div className="absolute inset-0 pointer-events-none opacity-5 flex items-center justify-center">
                <Award className="w-96 h-96 text-slate-900" />
              </div>
              <div className="border-2 border-double border-amber-800/25 p-8 w-full h-full flex flex-col items-center">
                {/* Header */}
                <div className="flex flex-col items-center gap-1 mb-6">
                  <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground shadow-md mb-2">
                    <span className="font-heading font-extrabold text-2xl">R</span>
                  </div>
                  <span className="text-xs uppercase tracking-widest font-heading font-semibold text-amber-800/80">RxOne Skill Track Assessment</span>
                  <div className="w-24 h-0.5 bg-amber-600/30 my-1" />
                </div>

                <span className="text-sm italic font-medium text-slate-500 mb-4">Certificate of Accomplishment</span>

                <span className="text-xs text-slate-400 uppercase tracking-widest">This is proudly awarded to</span>
                <span className="text-3xl font-extrabold font-heading text-slate-900 my-4 tracking-wide border-b border-amber-800/30 pb-2 px-12">
                  {candidateName}
                </span>

                <p className="max-w-lg text-sm leading-relaxed text-slate-600 italic">
                  for successfully demonstrating mastery and passing with honors the comprehensive examinations for
                </p>
                <p className="text-xl font-bold font-heading text-amber-900 my-3">
                  {previewCert.test?.title || "Assessment"}
                </p>
                <p className="text-xs text-slate-500 max-w-md">
                  with an aggregate score of <strong className="text-slate-800">{previewCert.result.percentage.toFixed(1)}%</strong> ({previewCert.result.totalScore} / {previewCert.result.maxScore} marks).
                </p>

                <div className="grid grid-cols-2 w-full mt-10 border-t border-slate-100 pt-6">
                  <div className="flex flex-col items-center">
                    <span className="text-lg text-slate-700 italic border-b border-slate-200 px-6 pb-1">RxOne Academy</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider mt-1.5 font-heading">Director of Evaluation</span>
                  </div>
                  <div className="flex flex-col items-center justify-end">
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold uppercase tracking-wider bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Secure Verified
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 mt-2">Session: {previewCert.session.id.slice(0, 16)}...</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setPreviewCert(null)} className="border-slate-200">
                Close Preview
              </Button>
              <Button
                onClick={() => {
                  handleDownload(previewCert.session.id, previewCert.test?.title || "Certificate");
                  setPreviewCert(null);
                }}
                className="bg-gradient-primary text-white hover:opacity-95 shadow-primary gap-1"
              >
                <Download className="w-4 h-4" /> Download Scorecard PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
