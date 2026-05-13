// src/components/QuestionPreview.tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Interactive components removed for view-only mode
import {
  Code,
  ListChecks,
  Eye,
  FileText,
  Shield,
  Image as ImageIcon,
  CheckSquare,
  Circle,
  HelpCircle,
  Terminal,
  Clock,
  HardDrive,
  Tag,
  BookOpen,
  AlertCircle,
} from "lucide-react";
import { Question, McqType } from "@/lib/test-service";

interface QuestionPreviewProps {
  question: Question | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MCQ_TYPES_INFO: Record<McqType, { label: string; icon: React.ReactNode; description: string }> = {
  "SINGLE_CORRECT": { 
    label: "Single Correct", 
    icon: <Circle className="w-4 h-4" />, 
    description: "Select one correct answer from multiple options" 
  },
  "MULTIPLE_CORRECT": { 
    label: "Multiple Correct", 
    icon: <CheckSquare className="w-4 h-4" />, 
    description: "Select all correct answers from multiple options" 
  },
  "TRUE_FALSE": { 
    label: "True / False", 
    icon: <HelpCircle className="w-4 h-4" />, 
    description: "Determine if the statement is true or false" 
  },
  "IMAGE_SINGLE_CORRECT": { 
    label: "Image Based (Single)", 
    icon: <ImageIcon className="w-4 h-4" />, 
    description: "Select the correct image from multiple options" 
  },
  "IMAGE_MULTIPLE_CORRECT": { 
    label: "Image Based (Multiple)", 
    icon: <ImageIcon className="w-4 h-4" />, 
    description: "Select all correct images from multiple options" 
  },
  "ASSERTION_REASON": { 
    label: "Assertion & Reason", 
    icon: <Shield className="w-4 h-4" />, 
    description: "Evaluate assertion and reason statements" 
  },
  "FILL_IN_THE_BLANK": { 
    label: "Fill in the Blank", 
    icon: <FileText className="w-4 h-4" />, 
    description: "Complete the sentence with the correct word" 
  },
};

const difficultyColors: Record<string, string> = {
  EASY: "bg-green-500/10 text-green-500 border-green-500/20",
  MEDIUM: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  HARD: "bg-red-500/10 text-red-500 border-red-500/20",
};

export function QuestionPreview({ question, open, onOpenChange }: QuestionPreviewProps) {


  if (!question) return null;

  const isMcq = question.questionType === "MCQ";
  const mcqType = question.mcqType as McqType;
  const isMultipleCorrect = question.multipleCorrect || mcqType === "MULTIPLE_CORRECT" || mcqType === "IMAGE_MULTIPLE_CORRECT";
  const isImageBased = mcqType === "IMAGE_SINGLE_CORRECT" || mcqType === "IMAGE_MULTIPLE_CORRECT";
  const isAssertionReason = mcqType === "ASSERTION_REASON";
  const isFillBlank = mcqType === "FILL_IN_THE_BLANK";
  const isTrueFalse = mcqType === "TRUE_FALSE";

  // Extract Assertion and Reason from prompt if missing for ASSERTION_REASON
  let assertion = question.assertion;
  let reason = question.reason;
  
  if (isAssertionReason && (!assertion || !reason)) {
    const match = question.prompt?.match(/Assertion \(A\): (.*?)\.? Reason \(R\): (.*?)\.?$/);
    if (match) {
      if (!assertion) assertion = match[1];
      if (!reason) reason = match[2];
    }
  }

  // Helper functions to handle both snake_case (backend) and camelCase (fallback)
  const getSubjectName = () => {
    if (question.subject?.name) return question.subject.name;
    if (question.subject_id) return `Subject (${question.subject_id.substring(0, 8)}...)`;
    return "Unknown";
  };

  const getTopicName = () => {
    if (question.topic?.name) return question.topic.name;
    if (question.topic_id) return `Topic (${question.topic_id.substring(0, 8)}...)`;
    return "None";
  };

  const getSubtopicName = () => {
    if (question.subtopic?.name) return question.subtopic.name;
    if (question.subtopic_id) return `Subtopic (${question.subtopic_id.substring(0, 8)}...)`;
    return "None";
  };



  // Render MCQ Preview
  const renderMcqPreview = () => {
    if (isAssertionReason) {
      return (
        <div className="space-y-6">
          <div className="rounded-lg bg-muted/30 p-4 border-l-4 border-primary">
            <p className="text-sm font-medium text-muted-foreground mb-2">Assertion (A)</p>
            <p className="text-base">{assertion || "No assertion provided"}</p>
          </div>
          <div className="rounded-lg bg-muted/30 p-4 border-l-4 border-primary">
            <p className="text-sm font-medium text-muted-foreground mb-2">Reason (R)</p>
            <p className="text-base">{reason || "No reason provided"}</p>
          </div>
          <div className="space-y-3 mt-4">
            <p className="text-sm font-medium">Options:</p>
            {question.mcqOptions?.map((option, idx) => {
              const isCorrect = option.isCorrect;
              return (
                <div 
                  key={idx} 
                  className={`flex items-center justify-between space-x-3 p-3 rounded-lg ${
                    isCorrect ? "bg-green-500/10 border border-green-500/20" : "bg-muted/30"
                  }`}
                >
                  <div className="flex-1">
                    <span className="font-medium">{String.fromCharCode(65 + idx)})</span> {option.text}
                  </div>
                  {isCorrect && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                      Correct
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (isFillBlank) {
      return (
        <div className="space-y-6">
          <div className="rounded-lg bg-muted/30 p-6 text-center">
            <p className="text-lg mb-4">
              {question.prompt?.split("________").map((part, idx, arr) => (
                <span key={idx}>
                  {part}
                  {idx < arr.length - 1 && (
                    <span className="inline-block mx-1 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-green-600 font-medium">
                      {question.correctAnswer || "________"}
                    </span>
                  )}
                </span>
              ))}
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>💡 The blank is filled with the correct answer above.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {isImageBased && (
          <div className="rounded-lg bg-muted/30 p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">Reference Image:</p>
            <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Question Image Placeholder</span>
            </div>
          </div>
        )}
        
        <div className="space-y-3">
          <p className="text-sm font-medium">Options:</p>
          {question.mcqOptions?.map((option, idx) => {
            const isCorrect = option.isCorrect;
            return (
              <div 
                key={idx} 
                className={`flex items-center justify-between space-x-3 p-3 rounded-lg ${
                  isCorrect ? "bg-green-500/10 border border-green-500/20" : "bg-muted/30"
                }`}
              >
                <div className="flex-1">
                  {isImageBased && option.imageUrl && (
                    <div className="flex items-center gap-3">
                      <img 
                        src={option.imageUrl} 
                        alt={option.text}
                        className="w-12 h-12 object-cover rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/api/placeholder/48/48";
                        }}
                      />
                      <span>{option.text}</span>
                    </div>
                  )}
                  {!isImageBased && (
                    <span><span className="font-medium">{String.fromCharCode(65 + idx)})</span> {option.text}</span>
                  )}
                </div>
                {isCorrect && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                    Correct
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
        
        {question.shuffleOptions && (
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
            <AlertCircle className="w-3 h-3" />
            Options will be shuffled when displayed to candidates
          </div>
        )}
      </div>
    );
  };

  // Render Coding Preview
  const renderCodingPreview = () => {
    // Get available languages
    const availableLanguages = Object.keys(question.codeTemplate || {}).filter(
      lang => question.codeTemplate?.[lang]?.code?.trim()
    );

    return (
      <div className="space-y-6">
        {question.title && (
          <div>
            <h3 className="text-lg font-semibold mb-2">{question.title}</h3>
          </div>
        )}
        
        {question.constraints && (
          <div className="rounded-lg bg-yellow-500/10 p-4 border border-yellow-500/20">
            <p className="text-sm font-medium text-yellow-600 mb-2">Constraints:</p>
            <pre className="text-sm whitespace-pre-wrap">{question.constraints}</pre>
          </div>
        )}
        
        {question.sampleExplanation && (
          <div className="rounded-lg bg-green-500/10 p-4 border border-green-500/20">
            <p className="text-sm font-medium text-green-600 mb-2">Sample Explanation:</p>
            <p className="text-sm">{question.sampleExplanation}</p>
          </div>
        )}
        
        {question.examples && question.examples.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Examples:</p>
            <div className="space-y-3">
              {question.examples.map((example, idx) => (
                <div key={idx} className="rounded-lg bg-muted/30 p-4">
                  <div className="mb-2">
                    <span className="text-sm font-medium">Input:</span>
                    <pre className="text-sm bg-black/5 dark:bg-white/5 p-2 rounded mt-1">
                      {example.input as string}
                    </pre>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Output:</span>
                    <pre className="text-sm bg-black/5 dark:bg-white/5 p-2 rounded mt-1">
                      {example.output as string}
                    </pre>
                  </div>
                  {example.explanation && (
                    <div className="mt-2">
                      <span className="text-sm font-medium">Explanation:</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {example.explanation as string}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {question.hints && question.hints.length > 0 && (
          <div className="rounded-lg bg-blue-500/10 p-4 border border-blue-500/20">
            <p className="text-sm font-medium text-blue-600 mb-2">Hints:</p>
            <ul className="list-disc list-inside space-y-1">
              {question.hints.map((hint, idx) => (
                <li key={idx} className="text-sm">{hint}</li>
              ))}
            </ul>
          </div>
        )}
        
        {availableLanguages.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Available Languages:</p>
            <div className="flex flex-wrap gap-2">
              {availableLanguages.map(lang => (
                <Badge key={lang} variant="outline" className="capitalize">
                  {lang === "python3" ? "Python" : lang}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {question.codeTemplate && availableLanguages.length > 0 && (
          <Tabs defaultValue={availableLanguages[0]} className="w-full">
            <TabsList className="w-full justify-start">
              {availableLanguages.map(lang => (
                <TabsTrigger key={lang} value={lang} className="capitalize">
                  {lang === "python3" ? "Python" : lang}
                </TabsTrigger>
              ))}
            </TabsList>
            {availableLanguages.map(lang => (
              <TabsContent key={lang} value={lang}>
                <div className="rounded-lg bg-black/90 p-4 overflow-auto">
                  <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                    {question.codeTemplate?.[lang]?.code || "// No template provided"}
                  </pre>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <ScrollArea className="h-full max-h-[90vh]">
          <div className="p-6 space-y-6">
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-2xl flex items-center gap-2">
                    {isMcq ? <ListChecks className="w-6 h-6 text-primary" /> : <Code className="w-6 h-6 text-primary" />}
                    Question Preview
                  </DialogTitle>
                  <DialogDescription>
                    View question details and simulate candidate experience
                  </DialogDescription>
                </div>
                <Badge variant="outline" className="bg-primary/10">
                  {isMcq ? "MCQ" : "Coding"}
                </Badge>
              </div>
            </DialogHeader>

            {/* Question Metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <BookOpen className="w-4 h-4" />
                    Subject
                  </div>
                  <p className="font-medium">{getSubjectName()}</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Tag className="w-4 h-4" />
                    Topic
                  </div>
                  <p className="font-medium">{getTopicName()}</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <AlertCircle className="w-4 h-4" />
                    Difficulty
                  </div>
                  <Badge className={difficultyColors[question.difficulty || "MEDIUM"]}>
                    {question.difficulty || "MEDIUM"}
                  </Badge>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Eye className="w-4 h-4" />
                    Marks
                  </div>
                  <p className="font-medium">{question.marks || 0} marks</p>
                </CardContent>
              </Card>
            </div>

            {/* MCQ Type Info */}
            {isMcq && mcqType && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    {MCQ_TYPES_INFO[mcqType]?.icon}
                    <span className="font-medium">{MCQ_TYPES_INFO[mcqType]?.label}</span>
                    <span className="text-sm text-muted-foreground">
                      - {MCQ_TYPES_INFO[mcqType]?.description}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Special Type Cards */}
            {isMcq && isTrueFalse && (
              <Card className="bg-blue-500/10 border-blue-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-blue-600">
                    <HelpCircle className="w-4 h-4" />
                    <span className="text-sm">Determine whether the statement is true or false</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {isMcq && isImageBased && (
              <Card className="bg-purple-500/10 border-purple-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-purple-600">
                    <ImageIcon className="w-4 h-4" />
                    <span className="text-sm">Image-based question - select the correct image(s)</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Coding Question Metadata */}
            {!isMcq && (
              <div className="grid grid-cols-2 gap-4">
                {question.timeLimitSecs !== undefined && question.timeLimitSecs !== null && (
                  <Card className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Clock className="w-4 h-4" />
                        Time Limit
                      </div>
                      <p className="font-medium">{question.timeLimitSecs} seconds</p>
                    </CardContent>
                  </Card>
                )}
                {question.memoryLimitMb !== undefined && question.memoryLimitMb !== null && (
                  <Card className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <HardDrive className="w-4 h-4" />
                        Memory Limit
                      </div>
                      <p className="font-medium">{question.memoryLimitMb} MB</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <Separator />

            {/* Question Prompt */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Question Prompt</h3>
              <div className="rounded-lg bg-muted/30 p-4">
                <p className="text-base whitespace-pre-wrap">{question.prompt}</p>
              </div>
            </div>

            {/* Answer Section */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                {isFillBlank ? "Your Answer" : "Answer Options"}
              </h3>
              <div className="rounded-lg border p-4">
                {isMcq ? renderMcqPreview() : renderCodingPreview()}
              </div>
            </div>

            {/* Solution/Answer Key for Admin */}
            {isMcq && (
              <div className="rounded-lg bg-green-500/10 p-4 border border-green-500/20">
                <p className="text-sm font-medium text-green-600 mb-2">✓ Answer Key (Admin Only)</p>
                <div className="space-y-1">
                  {question.mcqOptions?.map((option, idx) => (
                    option.isCorrect && (
                      <div key={idx} className="text-sm">
                        {isMultipleCorrect ? "•" : "✓"} Option {String.fromCharCode(65 + idx)}: {option.text}
                        {option.imageUrl && (
                          <span className="ml-2 text-muted-foreground">(Image-based)</span>
                        )}
                      </div>
                    )
                  ))}
                  {question.correctAnswer && (
                    <div className="text-sm">✓ Correct Answer: {question.correctAnswer}</div>
                  )}
                  {isAssertionReason && (
                    <div className="text-sm mt-2 text-muted-foreground">
                      Note: Assertion-Reason questions follow standard format with options A-D as shown above
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            {question.tags && question.tags.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {question.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata Footer */}
            <div className="text-xs text-muted-foreground border-t pt-4">
              <div className="flex justify-between">
                <span>Question ID: {question.id}</span>
                {question.createdAt && (
                  <span>Created: {new Date(question.createdAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}