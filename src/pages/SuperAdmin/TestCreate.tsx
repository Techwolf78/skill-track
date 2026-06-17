import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Save,
  Play,
  Settings,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { testService, CreateTestRequest, ProctoringMode } from "@/lib/test-service";
import { useToast } from "@/hooks/use-toast";

const getProctoringPreset = (mode: ProctoringMode) => {
  const defaults = {
    enableTabSwitchTracking: false,
    blockCopyPaste: false,
    blockRightClick: false,
    warnOnFullscreenExit: false,
    maxWarnings: 0,
    requireWebcam: false,
    detectFaceNotVisible: false,
    detectMultipleFaces: false,
    detectSuspiciousAudio: false,
    detectObjects: false,
    periodicSnapshots: false,
    evidenceCapture: false,
    requireMicrophone: false,
    requireScreenShare: false,
    detectDevTools: false,
    detectScreenShareStop: false,
    enableLiveProctoring: false,
    autoSubmitOnCriticalViolations: false,
    maxCriticalViolations: 0,
  };

  if (mode === "LOW") {
    return {
      ...defaults,
      enableTabSwitchTracking: true,
      blockCopyPaste: true,
      blockRightClick: true,
      warnOnFullscreenExit: true,
      maxWarnings: 5,
    };
  }
  if (mode === "MEDIUM") {
    return {
      ...defaults,
      enableTabSwitchTracking: true,
      blockCopyPaste: true,
      blockRightClick: true,
      warnOnFullscreenExit: true,
      maxWarnings: 3,
      requireWebcam: true,
      detectFaceNotVisible: true,
      detectMultipleFaces: true,
      detectSuspiciousAudio: true,
      detectObjects: true,
      periodicSnapshots: true,
      evidenceCapture: true,
    };
  }
  if (mode === "HIGH") {
    return {
      ...defaults,
      enableTabSwitchTracking: true,
      blockCopyPaste: true,
      blockRightClick: true,
      warnOnFullscreenExit: true,
      maxWarnings: 3,
      requireWebcam: true,
      detectFaceNotVisible: true,
      detectMultipleFaces: true,
      detectSuspiciousAudio: true,
      detectObjects: true,
      periodicSnapshots: true,
      evidenceCapture: true,
      requireMicrophone: true,
      requireScreenShare: true,
      detectDevTools: true,
      detectScreenShareStop: true,
      enableLiveProctoring: true,
      autoSubmitOnCriticalViolations: true,
      maxCriticalViolations: 1,
    };
  }
  return defaults;
};

export default function TestCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Form state
  const [formData, setFormData] = useState<Partial<CreateTestRequest>>({
    title: "",
    description: "",
    durationMins: 60,
    difficulty: "MEDIUM",
    passMark: 40,
    status: "DRAFT",
    instructions: {},
    questions: [],
    proctoringMode: "NONE",
    enableTabSwitchTracking: false,
    blockCopyPaste: false,
    blockRightClick: false,
    warnOnFullscreenExit: false,
    maxWarnings: 0,
    requireWebcam: false,
    detectFaceNotVisible: false,
    detectMultipleFaces: false,
    detectSuspiciousAudio: false,
    detectObjects: false,
    periodicSnapshots: false,
    evidenceCapture: false,
    requireMicrophone: false,
    requireScreenShare: false,
    detectDevTools: false,
    detectScreenShareStop: false,
    enableLiveProctoring: false,
    autoSubmitOnCriticalViolations: false,
    maxCriticalViolations: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setCurrentUserId(user.id || "");
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Test title is required";
    }

    if (formData.durationMins < 1) {
      newErrors.durationMins = "Duration must be at least 1 minute";
    }

    if (formData.durationMins > 480) {
      newErrors.durationMins = "Duration cannot exceed 480 minutes";
    }

    if (formData.passMark < 0 || formData.passMark > 100) {
      newErrors.passMark = "Passing mark must be between 0 and 100";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleNumberChange = (name: string, value: string) => {
    const numValue = parseInt(value, 10);
    setFormData((prev) => ({
      ...prev,
      [name]: isNaN(numValue) ? 60 : numValue,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleProctoringModeChange = (value: string) => {
    const mode = value as ProctoringMode;
    const presets = getProctoringPreset(mode);
    setFormData((prev) => ({
      ...prev,
      proctoringMode: mode,
      ...presets,
    }));
  };

  const createTestAndContinue = async (status: "DRAFT" | "PUBLISHED") => {
    if (status === "PUBLISHED" && !validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before publishing",
        variant: "destructive",
      });
      return;
    }

    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Test title is required",
        variant: "destructive",
      });
      return;
    }

    // REMOVE this check - backend will get user from token
    // if (!currentUserId) {
    //   toast({
    //     title: "Error",
    //     description: "User not authenticated. Please log in.",
    //     variant: "destructive",
    //   });
    //   return;
    // }

    setLoading(true);
    try {
      // Make sure all required fields have valid values
      const createData: CreateTestRequest = {
        title: formData.title!,
        description: formData.description || "",
        durationMins: formData.durationMins || 60,
        difficulty: formData.difficulty as "EASY" | "MEDIUM" | "HARD",
        passMark: formData.passMark || 40,
        status: status as "DRAFT" | "PUBLISHED",
        instructions: formData.instructions || {},
        questions: [],
        isActive: true,
        proctoringMode: formData.proctoringMode || "NONE",
        enableTabSwitchTracking: formData.enableTabSwitchTracking || false,
        blockCopyPaste: formData.blockCopyPaste || false,
        blockRightClick: formData.blockRightClick || false,
        warnOnFullscreenExit: formData.warnOnFullscreenExit || false,
        maxWarnings: formData.maxWarnings || 0,
        requireWebcam: formData.requireWebcam || false,
        detectFaceNotVisible: formData.detectFaceNotVisible || false,
        detectMultipleFaces: formData.detectMultipleFaces || false,
        detectSuspiciousAudio: formData.detectSuspiciousAudio || false,
        detectObjects: formData.detectObjects || false,
        periodicSnapshots: formData.periodicSnapshots || false,
        evidenceCapture: formData.evidenceCapture || false,
        requireMicrophone: formData.requireMicrophone || false,
        requireScreenShare: formData.requireScreenShare || false,
        detectDevTools: formData.detectDevTools || false,
        detectScreenShareStop: formData.detectScreenShareStop || false,
        enableLiveProctoring: formData.enableLiveProctoring || false,
        autoSubmitOnCriticalViolations: formData.autoSubmitOnCriticalViolations || false,
        maxCriticalViolations: formData.maxCriticalViolations || 0,
      };

      console.log("Creating test with data:", createData);

      const createdTest = await testService.createTest(createData);

      console.log("Test created successfully:", createdTest);

      toast({
        title: "Success",
        description:
          status === "DRAFT"
            ? "Test saved as draft! Now add questions."
            : "Test published! Now add questions.",
      });

      // Get the test ID from the response
      let testId =
        typeof createdTest === "object"
          ? createdTest.id || createdTest._id
          : null;

      if (!testId) {
        console.warn(
          "No test ID in response, attempting to find test by title...",
        );
        try {
          const allTests = await testService.getAllTests();
          const foundTest = allTests.find((t) => t.title === createData.title);
          if (foundTest) {
            testId = foundTest.id;
            console.log("Found created test ID via fallback:", testId);
          }
        } catch (fetchError) {
          console.error("Failed to fetch tests for fallback:", fetchError);
        }
      }

      if (!testId) {
        console.error(
          "No test ID in response and fallback failed:",
          createdTest,
        );
        toast({
          title: "Warning",
          description:
            "Test created successfully, but we couldn't redirect you to add questions automatically. Please find your test in the list.",
          variant: "default",
        });
        navigate("/superadmin/tests");
        return;
      }

      // Navigate to add questions page
      navigate(`/superadmin/tests/${testId}/questions`);
    } catch (error: unknown) {
      console.error("Failed to create test:", error);
      const errorMessage: string =
        error instanceof Error ? error.message : "Failed to create test";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  const handleSaveAsDraft = () => createTestAndContinue("DRAFT");
  const handlePublish = () => createTestAndContinue("PUBLISHED");

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/superadmin/tests")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-heading font-bold">Create New Test</h1>
            <p className="text-muted-foreground mt-1">
              Step 1: Configure basic test settings
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Set the test name, duration, and passing criteria
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Test Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Python Fundamentals Assessment"
                  className={errors.title ? "border-destructive" : ""}
                />
                {errors.title && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.title}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description || ""}
                  onChange={handleInputChange}
                  placeholder="Describe the purpose and scope of this test..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="durationMins">Duration (minutes)</Label>
                  <Input
                    id="durationMins"
                    name="durationMins"
                    type="number"
                    value={formData.durationMins}
                    onChange={(e) =>
                      handleNumberChange("durationMins", e.target.value)
                    }
                    min="1"
                    max="480"
                    className={errors.durationMins ? "border-destructive" : ""}
                  />
                  {errors.durationMins && (
                    <p className="text-xs text-destructive">
                      {errors.durationMins}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passMark">Passing Mark (%)</Label>
                  <Input
                    id="passMark"
                    name="passMark"
                    type="number"
                    value={formData.passMark}
                    onChange={(e) =>
                      handleNumberChange("passMark", e.target.value)
                    }
                    min="0"
                    max="100"
                    className={errors.passMark ? "border-destructive" : ""}
                  />
                  {errors.passMark && (
                    <p className="text-xs text-destructive">
                      {errors.passMark}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) =>
                    handleSelectChange("difficulty", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EASY">
                      <Badge className="bg-green-500/10 text-green-500">
                        Easy
                      </Badge>
                    </SelectItem>
                    <SelectItem value="MEDIUM">
                      <Badge className="bg-yellow-500/10 text-yellow-500">
                        Medium
                      </Badge>
                    </SelectItem>
                    <SelectItem value="HARD">
                      <Badge className="bg-red-500/10 text-red-500">Hard</Badge>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Proctoring Settings</CardTitle>
              <CardDescription>
                Configure anti-cheating and monitoring rules for this assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="proctoringMode">Proctoring Mode</Label>
                <Select
                  value={formData.proctoringMode}
                  onValueChange={handleProctoringModeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select proctoring mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No Proctoring</SelectItem>
                    <SelectItem value="LOW">Low Proctoring</SelectItem>
                    <SelectItem value="MEDIUM">Medium Proctoring</SelectItem>
                    <SelectItem value="HIGH">High Proctoring</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.proctoringMode === "NONE" ? (
                <p className="text-sm text-muted-foreground italic">
                  This assessment will run without proctoring.
                </p>
              ) : (
                <div className="space-y-6 pt-2">
                  {/* Category 1: Browser Controls */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      Browser & Shell Control
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="enableTabSwitchTracking"
                          checked={formData.enableTabSwitchTracking}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange("enableTabSwitchTracking", !!checked)
                          }
                          disabled={formData.proctoringMode !== "CUSTOM"}
                        />
                        <Label
                          htmlFor="enableTabSwitchTracking"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Enable tab switch tracking
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="blockCopyPaste"
                          checked={formData.blockCopyPaste}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange("blockCopyPaste", !!checked)
                          }
                          disabled={formData.proctoringMode !== "CUSTOM"}
                        />
                        <Label
                          htmlFor="blockCopyPaste"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Block copy/paste
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="blockRightClick"
                          checked={formData.blockRightClick}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange("blockRightClick", !!checked)
                          }
                          disabled={formData.proctoringMode !== "CUSTOM"}
                        />
                        <Label
                          htmlFor="blockRightClick"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Block right click
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="warnOnFullscreenExit"
                          checked={formData.warnOnFullscreenExit}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange("warnOnFullscreenExit", !!checked)
                          }
                          disabled={formData.proctoringMode !== "CUSTOM"}
                        />
                        <Label
                          htmlFor="warnOnFullscreenExit"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Warn on fullscreen exit
                        </Label>
                      </div>
                    </div>

                    <div className="space-y-2 max-w-xs">
                      <Label htmlFor="maxWarnings">Max warnings allowed</Label>
                      <Input
                        id="maxWarnings"
                        type="number"
                        value={formData.maxWarnings}
                        onChange={(e) =>
                          handleNumberChange("maxWarnings", e.target.value)
                        }
                        disabled={formData.proctoringMode !== "CUSTOM"}
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Category 2: Webcam & Audio Monitoring */}
                  {(formData.proctoringMode === "MEDIUM" ||
                    formData.proctoringMode === "HIGH" ||
                    formData.proctoringMode === "CUSTOM") && (
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                        Webcam & Audio Monitoring
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="requireWebcam"
                            checked={formData.requireWebcam}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("requireWebcam", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          <Label
                            htmlFor="requireWebcam"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Require webcam
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="detectFaceNotVisible"
                            checked={formData.detectFaceNotVisible}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("detectFaceNotVisible", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          <Label
                            htmlFor="detectFaceNotVisible"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Detect face not visible
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="detectMultipleFaces"
                            checked={formData.detectMultipleFaces}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("detectMultipleFaces", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          <Label
                            htmlFor="detectMultipleFaces"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Detect multiple faces
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="detectSuspiciousAudio"
                            checked={formData.detectSuspiciousAudio}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("detectSuspiciousAudio", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          <Label
                            htmlFor="detectSuspiciousAudio"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Detect suspicious audio
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="detectObjects"
                            checked={formData.detectObjects}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("detectObjects", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          <Label
                            htmlFor="detectObjects"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Detect objects (phone/book/etc.)
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="periodicSnapshots"
                            checked={formData.periodicSnapshots}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("periodicSnapshots", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          <Label
                            htmlFor="periodicSnapshots"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Periodic snapshots
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="evidenceCapture"
                            checked={formData.evidenceCapture}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("evidenceCapture", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          <Label
                            htmlFor="evidenceCapture"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Evidence capture
                          </Label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Category 3: Advanced Security & Hardware */}
                  {(formData.proctoringMode === "HIGH" ||
                    formData.proctoringMode === "CUSTOM") && (
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                        Advanced Security & Hardware
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="requireMicrophone"
                            checked={formData.requireMicrophone}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("requireMicrophone", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          <Label
                            htmlFor="requireMicrophone"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Require microphone
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="requireScreenShare"
                            checked={formData.requireScreenShare}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("requireScreenShare", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          <Label
                            htmlFor="requireScreenShare"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Require screen share
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="detectDevTools"
                            checked={formData.detectDevTools}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("detectDevTools", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          <Label
                            htmlFor="detectDevTools"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Detect DevTools
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="detectScreenShareStop"
                            checked={formData.detectScreenShareStop}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("detectScreenShareStop", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          <Label
                            htmlFor="detectScreenShareStop"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Detect screen-share stop
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="enableLiveProctoring"
                            checked={formData.enableLiveProctoring}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("enableLiveProctoring", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          <Label
                            htmlFor="enableLiveProctoring"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Enable live proctoring
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="autoSubmitOnCriticalViolations"
                            checked={formData.autoSubmitOnCriticalViolations}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(
                                "autoSubmitOnCriticalViolations",
                                !!checked
                              )
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          <Label
                            htmlFor="autoSubmitOnCriticalViolations"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Auto-submit after critical violations
                          </Label>
                        </div>
                      </div>

                      <div className="space-y-2 max-w-xs">
                        <Label htmlFor="maxCriticalViolations">
                          Max critical violations allowed
                        </Label>
                        <Input
                          id="maxCriticalViolations"
                          type="number"
                          value={formData.maxCriticalViolations}
                          onChange={(e) =>
                            handleNumberChange(
                              "maxCriticalViolations",
                              e.target.value
                            )
                          }
                          disabled={formData.proctoringMode !== "CUSTOM"}
                          min="0"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
              <CardDescription>
                After creating the test, you'll be able to add questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleSaveAsDraft}
                disabled={loading}
                className="w-full"
                variant="outline"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save as Draft & Add Questions
              </Button>
              <Button
                onClick={handlePublish}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Publish & Add Questions
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Preview Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Preview</CardTitle>
              <CardDescription>Review your test configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Title:</span>
                <span className="text-sm font-medium">
                  {formData.title || "Not set"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">
                  Description:
                </span>
                <span className="text-sm font-medium">
                  {formData.description
                    ? formData.description.length > 50
                      ? formData.description.substring(0, 50) + "..."
                      : formData.description
                    : "No description"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Duration:</span>
                <span className="text-sm font-medium">
                  {formData.durationMins} minutes
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">
                  Passing Mark:
                </span>
                <span className="text-sm font-medium">
                  {formData.passMark}%
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">
                  Difficulty:
                </span>
                <Badge
                  className={
                    formData.difficulty === "EASY"
                      ? "bg-green-500/10 text-green-500"
                      : formData.difficulty === "MEDIUM"
                        ? "bg-yellow-500/10 text-yellow-500"
                        : "bg-red-500/10 text-red-500"
                  }
                >
                  {formData.difficulty}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant="outline">
                  {formData.status === "DRAFT" ? "Draft" : "Published"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What's Next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium">Create Test</p>
                  <p className="text-sm text-muted-foreground">
                    Fill in basic test details above
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium">Add Questions</p>
                  <p className="text-sm text-muted-foreground">
                    Select questions from the question bank
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium">Review & Publish</p>
                  <p className="text-sm text-muted-foreground">
                    Review all questions and publish the test
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
