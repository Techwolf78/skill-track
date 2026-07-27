import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

export interface CustomFieldItem {
  id: string;
  key: string;
  value: string;
}

interface CustomFieldsSectionProps {
  customFields: CustomFieldItem[];
  onChange: (fields: CustomFieldItem[]) => void;
}

export function CustomFieldsSection({ customFields, onChange }: CustomFieldsSectionProps) {
  const handleAddField = () => {
    const newField: CustomFieldItem = {
      id: "cf_" + Math.random().toString(36).substring(2, 9),
      key: "",
      value: "",
    };
    onChange([...customFields, newField]);
  };

  const handleRemoveField = (id: string) => {
    onChange(customFields.filter((f) => f.id !== id));
  };

  const handleFieldChange = (id: string, fieldKey: "key" | "value", newValue: string) => {
    onChange(
      customFields.map((f) => {
        if (f.id === id) {
          return { ...f, [fieldKey]: newValue };
        }
        return f;
      })
    );
  };

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Custom Fields</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddField}
          className="h-8 text-xs flex items-center gap-1.5 border-dashed"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Custom Field
        </Button>
      </div>

      {customFields.length > 0 ? (
        <div className="space-y-4">
          {customFields.map((field, idx) => (
            <div key={field.id} className="p-3.5 rounded-lg border border-border bg-muted/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Field Name</label>
                  <Input
                    placeholder="e.g. Department"
                    value={field.key}
                    onChange={(e) => handleFieldChange(field.id, "key", e.target.value)}
                    className="h-10 text-sm rounded-md"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Field Value</label>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="e.g. Engineering"
                      value={field.value}
                      onChange={(e) => handleFieldChange(field.id, "value", e.target.value)}
                      className="h-10 text-sm rounded-md flex-1"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => handleRemoveField(field.id)}
                      className="h-10 w-10 rounded-md bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground shrink-0 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No custom fields added yet. Click above to add key-value pairs.</p>
      )}
    </div>
  );
}

export function formatCustomFieldsToExtraFields(
  college: string,
  course: string,
  customFields: CustomFieldItem[]
): Record<string, string> {
  const extraFields: Record<string, string> = {};
  if (college && college.trim()) extraFields.college = college.trim();
  if (course && course.trim()) extraFields.course = course.trim();

  for (const item of customFields) {
    const k = item.key.trim();
    const v = item.value.trim();
    if (k && v) {
      extraFields[k] = v;
    }
  }

  return extraFields;
}
