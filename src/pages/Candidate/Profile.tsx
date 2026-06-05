import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  GraduationCap, 
  UploadCloud, 
  FileText, 
  Trash2, 
  CheckCircle2, 
  Plus, 
  X
} from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const [formData, setFormData] = useState({
    name: "Alex Rivera",
    email: "alex.rivera@gryphonacademy.co.in",
    phone: "+91 98765 43210",
    location: "Mumbai, India",
    university: "State Institute of Technology",
    degree: "B.Tech in Computer Science",
    gradYear: "2026",
    cgpa: "8.9/10"
  });

  const [skills, setSkills] = useState(["React", "Node.js", "JavaScript", "Python", "SQL", "HTML/CSS"]);
  const [newSkill, setNewSkill] = useState("");
  const [resume, setResume] = useState<string | null>("alex_rivera_resume.pdf");
  const [isUploading, setIsUploading] = useState(false);

  // Profile completion calculations
  const calculateCompletion = () => {
    let completed = 0;
    if (formData.name) completed += 15;
    if (formData.email) completed += 15;
    if (formData.phone) completed += 10;
    if (formData.location) completed += 10;
    if (formData.university) completed += 15;
    if (formData.degree) completed += 15;
    if (skills.length > 0) completed += 10;
    if (resume) completed += 10;
    return completed;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Profile saved successfully!", {
      description: "Your candidate profile information has been updated.",
      duration: 3000
    });
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
      toast.success(`Skill '${newSkill.trim()}' added.`);
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
    toast.info(`Skill '${skill}' removed.`);
  };

  const handleResumeUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploading(true);
      setTimeout(() => {
        setResume(file.name);
        setIsUploading(false);
        toast.success(`Resume '${file.name}' uploaded successfully!`);
      }, 1500);
    }
  };

  const handleRemoveResume = () => {
    setResume(null);
    toast.info("Resume removed.");
  };

  const completion = calculateCompletion();

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header and Progress */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-bold font-heading text-foreground">My Profile</h2>
          <p className="text-sm text-muted-foreground">Manage your educational information, resume uploads, and tech stacks for assessments screening.</p>
        </div>
        <Card className="border border-border/60 bg-muted/30 w-full md:w-80">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-xs font-semibold text-muted-foreground">
              <span>PROFILE COMPLETION</span>
              <span className="text-primary font-bold">{completion}%</span>
            </div>
            <Progress value={completion} className="h-2 [&>div]:bg-gradient-primary" />
            <p className="text-[10px] text-muted-foreground italic text-center">Complete profile leads to better placement matches!</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Forms (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Personal Details */}
            <Card className="border border-border/60">
              <CardHeader>
                <CardTitle className="text-lg font-bold font-heading flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" /> Personal Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    value={formData.phone} 
                    onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location">Location</Label>
                  <Input 
                    id="location" 
                    value={formData.location} 
                    onChange={(e) => setFormData({...formData, location: e.target.value})} 
                  />
                </div>
              </CardContent>
            </Card>

            {/* Education Milestone */}
            <Card className="border border-border/60">
              <CardHeader>
                <CardTitle className="text-lg font-bold font-heading flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" /> Education Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="university">University / College</Label>
                  <Input 
                    id="university" 
                    value={formData.university} 
                    onChange={(e) => setFormData({...formData, university: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="degree">Degree / Course</Label>
                  <Input 
                    id="degree" 
                    value={formData.degree} 
                    onChange={(e) => setFormData({...formData, degree: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5 grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="gradYear">Graduation</Label>
                    <Input 
                      id="gradYear" 
                      value={formData.gradYear} 
                      onChange={(e) => setFormData({...formData, gradYear: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cgpa">CGPA / Score</Label>
                    <Input 
                      id="cgpa" 
                      value={formData.cgpa} 
                      onChange={(e) => setFormData({...formData, cgpa: e.target.value})} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full bg-gradient-primary text-white hover:opacity-95 shadow-primary">
              Save Changes
            </Button>
          </form>
        </div>

        {/* Sidebar details (Resume & Skills) */}
        <div className="space-y-6">
          
          {/* Resume Upload */}
          <Card className="border border-border/60">
            <CardHeader>
              <CardTitle className="text-md font-bold font-heading">Resume / CV</CardTitle>
              <CardDescription>Upload your latest resume for corporate screening applications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {resume ? (
                <div className="p-4 bg-muted/40 border border-border rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-8 h-8 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{resume}</p>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Active CV
                      </p>
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:bg-destructive/10 h-8 w-8 flex-shrink-0"
                    onClick={handleRemoveResume}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl p-8 text-center relative cursor-pointer">
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                    accept=".pdf,.doc,.docx"
                    onChange={handleResumeUpload}
                    disabled={isUploading}
                  />
                  <div className="space-y-3">
                    <div className="p-3 bg-primary/5 rounded-full w-fit mx-auto text-primary">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        {isUploading ? "Uploading CV..." : "Click or drag to upload"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">PDF, DOC, DOCX up to 5MB</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skills Management */}
          <Card className="border border-border/60">
            <CardHeader>
              <CardTitle className="text-md font-bold font-heading">Key Skills</CardTitle>
              <CardDescription>Adding core programming stacks helps match assessment questions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Skill Tags */}
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span 
                    key={skill} 
                    className="bg-muted border border-border text-foreground text-xs font-semibold pl-3 pr-2 py-1.5 rounded-full flex items-center gap-1.5"
                  >
                    {skill}
                    <button 
                      type="button" 
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-muted-foreground hover:text-destructive rounded-full hover:bg-muted-foreground/15 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add Skill Form */}
              <form onSubmit={handleAddSkill} className="flex gap-2 pt-2">
                <Input 
                  type="text" 
                  placeholder="e.g., Docker" 
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  className="h-9"
                />
                <Button type="submit" size="sm" className="bg-primary text-white h-9">
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </form>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}
