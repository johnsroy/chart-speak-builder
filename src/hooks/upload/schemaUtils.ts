
import { SchemaPreview } from './types';

/**
 * Extracts a schema preview from a file by reading its contents
 * @param file The file to preview
 * @returns A promise that resolves to the schema preview
 */
export const previewFileSchema = async (file: File): Promise<SchemaPreview> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event: ProgressEvent<FileReader>) => {
      const text = (event.target?.result as string) || '';
      const lines = text.split('\n');
      if (lines.length < 1) {
        reject(new Error("File is empty or has no headers"));
        return;
      }

      const headers = lines[0].split(',').map(header => header.trim());
      if (headers.length === 0) {
        reject(new Error("No columns found in the header row"));
        return;
      }

      const preview: SchemaPreview = {};
      headers.forEach(header => {
        preview[header] = 'string';
      });

      if (lines.length > 1) {
        const firstDataRow = lines[1].split(',');
        if (firstDataRow.length === headers.length) {
          headers.forEach((header, index) => {
            const value = firstDataRow[index].trim();
            if (!isNaN(Number(value))) {
              preview[header] = 'number';
            } else if (!isNaN(Date.parse(value))) {
              preview[header] = 'date';
            }
          });
        }
      }

      resolve(preview);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read the file"));
    };

    reader.readAsText(file, 'UTF-8');
  });
};
