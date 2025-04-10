
// This file now just re-exports from the new modular structure
// to maintain backwards compatibility
import { uploadFileToStorage } from './storage/uploader';
import { ensureStorageBuckets, testBucketPermissions } from './storage/storageInit';
import { uploadSmallFile } from './storage/directUploader';
import { uploadLargeFile } from './storage/chunkedUploader';

export {
  uploadFileToStorage,
  ensureStorageBuckets,
  testBucketPermissions,
  uploadSmallFile,
  uploadLargeFile
};
