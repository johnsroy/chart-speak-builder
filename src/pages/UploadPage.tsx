
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import UploadArea from '@/components/UploadArea';

const UploadPage = () => {
  const { user } = useAuth();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Data Upload</h1>
      <Card>
        <CardHeader>
          <CardTitle>Upload Your Dataset</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadArea />
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadPage;
