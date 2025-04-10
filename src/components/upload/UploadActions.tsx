
import { useDatasets } from '@/hooks/useDatasets';
import { useFileUpload } from '@/hooks/useFileUpload';
import { toast } from '@/hooks/use-toast';

export const useUploadActions = () => {
  const {
    handleUpload: originalHandleUpload,
    retryUpload: originalRetryUpload,
    handleOverwriteConfirm: originalHandleOverwriteConfirm,
    selectedFile
  } = useFileUpload();
  
  const { loadDatasets } = useDatasets();

  const handleUploadClick = async () => {
    try {
      const systemUserId = 'fe4ab121-d26c-486d-92ca-b5cc4d99e984';
      
      if (selectedFile && selectedFile.size > 50 * 1024 * 1024) {
        toast({
          title: "Large file detected",
          description: "Uploading large files may take some time. Please be patient.",
        });
      }
      
      try {
        await originalHandleUpload(true, systemUserId);
        loadDatasets();
      } catch (uploadErr) {
        console.error("Upload attempt failed:", uploadErr);
      }
    } catch (error) {
      console.error("Upload process failed:", error);
      toast({
        title: "Upload error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const handleRetryUpload = async () => {
    try {
      const systemUserId = 'fe4ab121-d26c-486d-92ca-b5cc4d99e984';
      originalRetryUpload(true, systemUserId);
    } catch (error) {
      console.error("Retry upload failed:", error);
      toast({
        title: "Retry failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const handleOverwriteConfirmClick = async () => {
    try {
      const systemUserId = 'fe4ab121-d26c-486d-92ca-b5cc4d99e984';
      originalHandleOverwriteConfirm(true, systemUserId);
    } catch (error) {
      console.error("Overwrite confirmation failed:", error);
      toast({
        title: "Overwrite failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  return {
    handleUploadClick,
    handleRetryUpload,
    handleOverwriteConfirmClick
  };
};
