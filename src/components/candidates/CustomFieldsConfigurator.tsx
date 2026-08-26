import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { GripVertical, Trash2, Plus, RotateCcw } from "lucide-react";

export interface CustomFieldDefinition {
  id: string;
  name: string;
  required: boolean;
  isStandard?: boolean;
}

interface CustomFieldsConfiguratorProps {
  fields: CustomFieldDefinition[];
  onChange: (fields: CustomFieldDefinition[]) => void;
  title?: string;
  description?: string;
}

export function CustomFieldsConfigurator({
  fields,
  onChange,
  title = "Custom fields",
  description = "Customize fields / questions to be asked.",
}: CustomFieldsConfiguratorProps) {
  const [fieldName, setFieldName] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const handleAddField = () => {
    const trimmed = fieldName.trim();
    if (!trimmed) {
      setNameError("Please enter a field name");
      return;
    }

    if (
      fields.some(
        (f) => f.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setNameError(`"${trimmed}" already exists`);
      return;
    }

    const newField: CustomFieldDefinition = {
      id: "cf_" + Math.random().toString(36).substring(2, 9),
      name: trimmed,
      required: isRequired,
      isStandard: false,
    };

    onChange([...fields, newField]);
    handleClearField();
  };

  const handleClearField = () => {
    setFieldName("");
    setIsRequired(false);
    setNameError(null);
  };

  const handleRemoveField = (id: string) => {
    onChange(fields.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h3 className="text-base font-bold text-foreground tracking-tight">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>

      {/* Input Row: Field Name */}
      <div className="max-w-md space-y-1">
        <Input
          placeholder="Field name"
          value={fieldName}
          onChange={(e) => {
            setFieldName(e.target.value);
            if (nameError) setNameError(null);
          }}
          className="h-10 text-sm bg-background border-border"
        />
        <p className="text-[11px] text-muted-foreground">A descriptive field name helps.</p>
        {nameError && <p className="text-[11px] text-destructive">{nameError}</p>}
      </div>

      {/* Required Checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="custom-field-required"
          checked={isRequired}
          onCheckedChange={(checked) => setIsRequired(Boolean(checked))}
        />
        <Label
          htmlFor="custom-field-required"
          className="text-xs font-normal text-foreground cursor-pointer"
        >
          Required
        </Label>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-1">
        <Button
          type="button"
          onClick={handleAddField}
          size="sm"
          className="h-8 px-4 text-xs font-semibold uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Field
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={handleClearField}
          size="sm"
          className="h-8 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Clear Field
        </Button>
      </div>

      {/* Fields List */}
      <div className="pt-2 space-y-1.5 border-t border-border">
        {fields.map((field) => (
          <div
            key={field.id}
            className="flex items-center justify-between py-2 px-2.5 rounded-md hover:bg-muted/40 transition-colors group"
          >
            <div className="flex items-center gap-2.5 text-sm">
              <GripVertical className="w-4 h-4 text-muted-foreground/60 cursor-grab shrink-0" />
              <span className="font-semibold text-foreground">{field.name}</span>
              {field.required && (
                <span className="text-destructive font-bold text-sm leading-none">*</span>
              )}
            </div>

            {!field.isStandard && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveField(field.id)}
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Remove field"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        ))}

        {fields.length === 0 && (
          <p className="text-xs text-muted-foreground italic py-2">
            No fields added yet. Enter a field name above and click ADD FIELD.
          </p>
        )}
      </div>
    </div>
  );
}
