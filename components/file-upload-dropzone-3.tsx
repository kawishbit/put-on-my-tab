"use client";

import { FileUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
} from "@/components/ui/file-upload";

type FileUploadDropzone3Props = {
  value: File[];
  onValueChange: (files: File[]) => void;
  disabled?: boolean;
  accept?: string;
  maxFiles?: number;
  maxSize?: number;
  className?: string;
  title?: string;
  subtitle?: string;
};

const FileUploadDropzone3 = ({
  value,
  onValueChange,
  disabled = false,
  accept,
  maxFiles = 1,
  maxSize = 5 * 1024 * 1024,
  className,
  title = "Drop file here or click to upload",
  subtitle = "Max 1 file, 5MB",
}: FileUploadDropzone3Props) => {
  return (
    <FileUpload
      maxFiles={maxFiles}
      maxSize={maxSize}
      className={className ?? "w-full"}
      value={value}
      onValueChange={onValueChange}
      multiple={maxFiles > 1}
      accept={accept}
      disabled={disabled}
    >
      <FileUploadDropzone className="flex-row gap-3 px-4 py-3">
        <FileUp className="size-5 text-muted-foreground" />
        <div className="flex-1 text-left">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </FileUploadDropzone>
      <FileUploadList>
        {value.map((file) => (
          <FileUploadItem
            key={`${file.name}-${file.size}-${file.lastModified}`}
            value={file}
          >
            <FileUploadItemPreview />
            <FileUploadItemMetadata />
            <FileUploadItemDelete asChild>
              <Button variant="ghost" size="icon" className="size-7">
                <X className="size-4" />
              </Button>
            </FileUploadItemDelete>
          </FileUploadItem>
        ))}
      </FileUploadList>
    </FileUpload>
  );
};

export default FileUploadDropzone3;
