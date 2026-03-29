import { FileUp, Files, LoaderCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";

interface UploadDropzoneProps {
  loading: boolean;
  onFilesSelected: (files: File[]) => void;
}

export function UploadDropzone({ loading, onFilesSelected }: UploadDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    multiple: true,
    onDrop: onFilesSelected,
  });

  return (
    <div
      {...getRootProps()}
      className={`group cursor-pointer rounded-3xl border border-dashed p-5 transition ${
        isDragActive
          ? "border-orchestrate/60 bg-orchestrate/10"
          : "border-white/15 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]"
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex items-center gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          {loading ? (
            <LoaderCircle className="h-6 w-6 animate-spin text-orchestrate" />
          ) : isDragActive ? (
            <Files className="h-6 w-6 text-orchestrate" />
          ) : (
            <FileUp className="h-6 w-6 text-hcpro" />
          )}
        </div>
        <div>
          <p className="font-medium text-white">Upload Datasets</p>
          <p className="text-sm text-muted">
            Drag and drop CSV or XLSX files here. Workbooks are read across every tab automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
