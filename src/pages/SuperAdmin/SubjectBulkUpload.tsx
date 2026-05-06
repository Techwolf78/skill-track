// Add these imports at the top
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  Download,
  FileJson,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Add new state variables after existing state declarations
const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);
const [bulkJsonData, setBulkJsonData] = useState("");
const [uploadStatus, setUploadStatus] = useState<{
  type: "success" | "error" | "warning" | null;
  message: string;
  details?: string[];
}>({ type: null, message: "" });
const [uploading, setUploading] = useState(false);

// Add bulk upload handler function
const handleBulkUpload = async () => {
  if (!bulkJsonData.trim()) {
    setUploadStatus({
      type: "error",
      message: "Please enter JSON data",
    });
    return;
  }

  setUploading(true);
  setUploadStatus({ type: null, message: "" });

  try {
    const data = JSON.parse(bulkJsonData);
    
    // Validate structure
    if (!data.subjects || !Array.isArray(data.subjects)) {
      throw new Error("Invalid format: Expected { subjects: [] }");
    }

    const errors: string[] = [];
    let subjectsCreated = 0;
    let topicsCreated = 0;
    let subtopicsCreated = 0;

    for (const subjectData of data.subjects) {
      if (!subjectData.name) {
        errors.push(`Subject missing name: ${JSON.stringify(subjectData)}`);
        continue;
      }

      try {
        // Create subject
        const subject = await testService.createSubject(subjectData.name);
        subjectsCreated++;

        // Create topics under this subject
        if (subjectData.topics && Array.isArray(subjectData.topics)) {
          for (const topicData of subjectData.topics) {
            if (!topicData.name) {
              errors.push(`Topic missing name under subject ${subjectData.name}`);
              continue;
            }

            try {
              const topic = await testService.createTopic(
                topicData.name,
                subject.id
              );
              topicsCreated++;

              // Create subtopics under this topic
              if (topicData.subtopics && Array.isArray(topicData.subtopics)) {
                for (const subtopicName of topicData.subtopics) {
                  if (!subtopicName) continue;
                  
                  await testService.createSubtopic(subtopicName, topic.id);
                  subtopicsCreated++;
                }
              }
            } catch (error) {
              errors.push(`Failed to create topic "${topicData.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }
      } catch (error) {
        errors.push(`Failed to create subject "${subjectData.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      setUploadStatus({
        type: "warning",
        message: `Partial success: ${subjectsCreated} subjects, ${topicsCreated} topics, ${subtopicsCreated} subtopics created`,
        details: errors.slice(0, 5), // Show first 5 errors
      });
    } else {
      setUploadStatus({
        type: "success",
        message: `Successfully created ${subjectsCreated} subjects, ${topicsCreated} topics, and ${subtopicsCreated} subtopics!`,
      });
      setBulkJsonData("");
      fetchData(); // Refresh the tree view
      
      // Auto close after 2 seconds on success
      setTimeout(() => {
        setBulkUploadDialogOpen(false);
        setUploadStatus({ type: null, message: "" });
      }, 2000);
    }
  } catch (error) {
    setUploadStatus({
      type: "error",
      message: error instanceof Error ? error.message : "Invalid JSON format",
    });
  } finally {
    setUploading(false);
  }
};

// Add download template function
const downloadTemplate = () => {
  const template = {
    subjects: [
      {
        name: "Mathematics",
        topics: [
          {
            name: "Algebra",
            subtopics: ["Linear Equations", "Quadratic Equations", "Polynomials"]
          },
          {
            name: "Calculus",
            subtopics: ["Differentiation", "Integration", "Limits"]
          }
        ]
      },
      {
        name: "Computer Science",
        topics: [
          {
            name: "Data Structures",
            subtopics: ["Arrays", "Linked Lists", "Trees", "Graphs"]
          },
          {
            name: "Algorithms",
            subtopics: ["Sorting", "Searching", "Dynamic Programming"]
          }
        ]
      }
    ]
  };

  const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "subjects_template.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Add example JSON data
const exampleJson = `{
  "subjects": [
    {
      "name": "Mathematics",
      "topics": [
        {
          "name": "Algebra",
          "subtopics": ["Linear Equations", "Quadratic Equations"]
        },
        {
          "name": "Geometry",
          "subtopics": ["Triangles", "Circles", "Coordinate Geometry"]
        }
      ]
    },
    {
      "name": "Physics",
      "topics": [
        {
          "name": "Mechanics",
          "subtopics": ["Kinematics", "Dynamics", "Laws of Motion"]
        },
        {
          "name": "Thermodynamics",
          "subtopics": ["Heat Transfer", "Laws of Thermodynamics"]
        }
      ]
    }
  ]
}`;