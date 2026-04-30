import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Download, Building2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BulkUploadCandidatesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  isSuperAdmin?: boolean; // Prop to identify SuperAdmin mode
}

export function BulkUploadCandidates({ open, onOpenChange, onSuccess, isSuperAdmin }: BulkUploadCandidatesProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [organisations, setOrganisations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch organisations if SuperAdmin
  React.useEffect(() => {
    if (isSuperAdmin && open) {
      apiClient.get("/organisations")
        .then(res => setOrganisations(res.data.data || []))
        .catch(err => console.error("Failed to fetch organisations", err));
    }
  }, [isSuperAdmin, open]);

  const getOrganisationId = () => {
    if (isSuperAdmin) return selectedOrgId;
    if (user?.organisationData?.id) return user.organisationData.id;
    if (user?.organisationId) return user.organisationId;
    return null;
  };

  const getOrganisationName = () => {
    if (isSuperAdmin) {
      const org = organisations.find(o => o.id === selectedOrgId);
      return org?.name || "Selected Organisation";
    }
    if (user?.organisationData?.name) return user.organisationData.name;
    if (user?.organisationName) return user.organisationName;
    return null;
  };

  const organisationId = getOrganisationId();
  const organisationName = getOrganisationName();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
      
      if (!['.csv'].includes(fileExtension)) {
        setError("Please upload a valid CSV file");
        setFile(null);
        return;
      }
      
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  };

  const transformCSV = async (file: File, orgId: string): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const lines = content.split(/\r?\n/);
          
          if (lines.length === 0) {
            reject(new Error("Empty file"));
            return;
          }
          
          const originalHeaders = lines[0].split(",").map(h => h.trim());
          const orgIdIndex = originalHeaders.findIndex(h => h.toLowerCase() === "organisation_id");
          
          let newHeaders: string[];
          let newLines: string[];
          
          if (orgIdIndex === -1) {
            const insertPosition = Math.min(4, originalHeaders.length);
            newHeaders = [...originalHeaders];
            newHeaders.splice(insertPosition, 0, "Organisation_ID");
            
            newLines = lines.slice(1).map(line => {
              if (line.trim() === "") return line;
              const cells = line.split(",");
              cells.splice(insertPosition, 0, orgId);
              return cells.join(",");
            });
          } else {
            newHeaders = [...originalHeaders];
            newHeaders[orgIdIndex] = "Organisation_ID";
            
            newLines = lines.slice(1).map(line => {
              if (line.trim() === "") return line;
              const cells = line.split(",");
              cells[orgIdIndex] = orgId;
              return cells.join(",");
            });
          }
          
          const newCSV = [newHeaders.join(","), ...newLines].join("\n");
          resolve(new File([newCSV], file.name, { type: "text/csv" }));
        } catch (err) {
          reject(err);
        }
      };
      
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  const downloadTemplate = () => {
    const headers = ["Name", "Email", "Password", "PhoneNumber", "College", "Course", "Year", "Skills"];
    const sampleRow = [
      "John Doe",
      "john.doe@example.com",
      "password123",
      "9876543210",
      "Pune University",
      "MCA",
      "Final Year",
      "Java, Spring Boot, React"
    ];
    
    const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "candidates_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Template Downloaded",
      description: "Organisation will be auto-added when uploading",
    });
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    const effectiveOrgId = getOrganisationId();

    if (!effectiveOrgId) {
      setError(isSuperAdmin ? "Please select an organisation" : "Unable to determine your organisation. Please contact support.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    try {
      const transformedFile = await transformCSV(file, effectiveOrgId);
      const formData = new FormData();
      formData.append("file", transformedFile);
      formData.append("organisationId", effectiveOrgId);

      await apiClient.post("/candidates/bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      clearInterval(progressInterval);
      setProgress(100);
      
      toast({ title: "Success", description: "Candidates uploaded successfully" });
      
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        setFile(null);
        setProgress(0);
      }, 1500);
      
    } catch (error: any) {
      clearInterval(progressInterval);
      setProgress(0);
      
      const errorMessage = error.response?.data?.message || error.message || "Failed to upload candidates";
      setError(errorMessage);
      
      toast({ title: "Upload Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Upload Candidates</DialogTitle>
          <DialogDescription>
            Upload multiple candidates at once using a CSV file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Organisation Selection/Display */}
          {isSuperAdmin ? (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Target Organisation
              </label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an organisation" />
                </SelectTrigger>
                <SelectContent>
                  {organisations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-medium">
                Assigning to: {organisationName || organisationId || "Loading..."}
              </div>
            </div>
          )}

          {/* Template Card */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">CSV Template</p>
                  <p className="text-xs text-muted-foreground">Download template with correct format</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>

          {/* Upload Area */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Upload File</label>
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex flex-col items-center justify-center">
                <Upload className="w-6 h-6 mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">CSV files only (Max 10MB)</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".csv"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>
            
            {file && (
              <div className="flex items-center gap-2 text-sm p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-xs flex-1">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setFile(null)}
                  disabled={uploading}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-1">
              <Progress value={progress} />
              <p className="text-xs text-center text-muted-foreground">
                Uploading... {progress}%
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading || !organisationId}>
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}