import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function AdminTestsEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: "Sample Test Title",
    description: "This is a sample test description",
    duration: "60",
    totalQuestions: "20",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Test Updated",
      description: "The test has been updated successfully.",
    });
    navigate("/admin/tests");
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin/tests")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-heading font-bold">Edit Test</h1>
          <p className="text-muted-foreground mt-1">
            Modify test details and settings
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Test Details</CardTitle>
              <CardDescription>
                Update test information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="title" className="text-base">
                    Test Title
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-base">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="mt-2"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duration" className="text-base">
                      Duration (minutes)
                    </Label>
                    <Input
                      id="duration"
                      name="duration"
                      type="number"
                      value={formData.duration}
                      onChange={handleChange}
                      required
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="totalQuestions" className="text-base">
                      Total Questions
                    </Label>
                    <Input
                      id="totalQuestions"
                      name="totalQuestions"
                      type="number"
                      value={formData.totalQuestions}
                      onChange={handleChange}
                      required
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/admin/tests")}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="hero">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Info */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Test Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Test ID</p>
                <p className="font-mono">{id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created</p>
                <p>2024-04-10</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Modified</p>
                <p>2024-04-15</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
