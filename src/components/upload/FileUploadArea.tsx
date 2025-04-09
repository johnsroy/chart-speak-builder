
import React, { useEffect } from 'react';
import { Upload, AlertTriangle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogCancel, 
  AlertDialogAction 
} from '@/components/ui/alert-dialog';

interface FileUploadAreaProps {
  dragActive: boolean;
  handleDrag: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedFile: File | null;
  datasetName: string;
  setDatasetName: (name: string) => void;
  datasetDescription: string;
  setDatasetDescription: (description: string) => void;
  schemaPreview: Record<string, string> | null;
  isUploading: boolean;
  uploadProgress: number;
  uploadError: string | null;
  retryUpload: () => void;
  handleUpload: () => void;
  uploadedDatasetId?: string | null;
  showOverwriteConfirm?: boolean;
  handleOverwriteConfirm?: () => void;
  handleOverwriteCancel?: () => void;
}

const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  dragActive,
  handleDrag,
  handleDrop,
  handleFileInput,
  selectedFile,
  datasetName,
  setDatasetName,
  datasetDescription,
  setDatasetDescription,
  schemaPreview,
  isUploading,
  uploadProgress,
  uploadError,
  retryUpload,
  handleUpload,
  uploadedDatasetId,
  showOverwriteConfirm = false,
  handleOverwriteConfirm = () => {},
  handleOverwriteCancel = () => {}
}) => {
  // Dispatch custom event when upload is successful
  useEffect(() => {
    if (uploadedDatasetId) {
      console.log("Dispatching upload:success event with dataset ID:", uploadedDatasetId);
      // Dispatch a custom event that the upload page can listen for
      const event = new CustomEvent('upload:success', { 
        detail: { datasetId: uploadedDatasetId } 
      });
      window.dispatchEvent(event);
    }
  }, [uploadedDatasetId]);

  return (
    <div className="glass-card p-6">
      <h2 className="text-xl font-medium mb-4 text-left">Upload File</h2>
      
      <div 
        className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center h-64 transition-colors cursor-pointer ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'}`} 
        onDragEnter={handleDrag} 
        onDragLeave={handleDrag} 
        onDragOver={handleDrag} 
        onDrop={handleDrop} 
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <div className="p-4 bg-secondary rounded-full mb-4">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <p className="text-lg font-medium mb-2">
          {selectedFile ? selectedFile.name : 'Drag & Drop Your File'}
        </p>
        <p className="text-sm mb-4 text-slate-100">Supported formats: CSV, Excel, JSON</p>
        <input 
          type="file" 
          id="fileInput" 
          className="hidden" 
          onChange={handleFileInput} 
          accept=".csv,.xlsx,.xls,.json" 
          disabled={isUploading}
        />
        <Button 
          size="sm" 
          variant="outline" 
          className="font-bold bg-violet-900 hover:bg-violet-800"
          disabled={isUploading}
        >
          <Upload className="h-4 w-4 mr-2" /> Browse Files
        </Button>
      </div>
      
      {uploadError && (
        <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-md p-4">
          <h3 className="flex items-center text-red-400 font-medium">
            <AlertTriangle className="h-4 w-4 mr-2" /> 
            Upload Failed
          </h3>
          <p className="mt-1 text-sm text-red-300">{uploadError}</p>
          <div className="mt-3 flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={retryUpload}
              disabled={isUploading}
            >
              Try Again
            </Button>
          </div>
        </div>
      )}
      
      {selectedFile && !uploadError && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">Dataset Name</label>
            <input 
              type="text" 
              value={datasetName} 
              onChange={e => setDatasetName(e.target.value)} 
              className="w-full px-3 py-2 rounded-md border bg-black/70 backdrop-blur-sm border-white/20 focus:outline-none focus:ring-2 focus:ring-primary" 
              placeholder="Enter dataset name" 
              disabled={isUploading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white mb-1">Description (optional)</label>
            <textarea 
              value={datasetDescription} 
              onChange={e => setDatasetDescription(e.target.value)} 
              className="w-full px-3 py-2 rounded-md border bg-black/70 backdrop-blur-sm border-white/20 focus:outline-none focus:ring-2 focus:ring-primary" 
              placeholder="Enter dataset description" 
              rows={3}
              disabled={isUploading}
            />
          </div>
          
          {schemaPreview && (
            <div className="bg-white/10 rounded-md p-3 border border-white/20">
              <h4 className="text-sm font-medium mb-2">Schema Preview</h4>
              <div className="max-h-40 overflow-y-auto text-xs">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="text-left py-1 px-2">Column</th>
                      <th className="text-left py-1 px-2">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(schemaPreview).map(([column, type], idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white/5" : ""}>
                        <td className="py-1 px-2">{column}</td>
                        <td className="py-1 px-2">{type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-1" />
            </div>
          )}
          
          <Button 
            onClick={handleUpload} 
            disabled={isUploading || !datasetName.trim()} 
            className="w-full purple-gradient"
          >
            {isUploading ? 'Uploading...' : 'Upload Dataset'}
          </Button>
        </div>
      )}

      <AlertDialog open={showOverwriteConfirm} onOpenChange={() => {}} >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              File Already Exists
            </AlertDialogTitle>
            <AlertDialogDescription>
              A dataset with the file name "{selectedFile?.name}" already exists. 
              Would you like to overwrite it with this new file?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleOverwriteCancel}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleOverwriteConfirm}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Overwrite File
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FileUploadArea;
