
import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AnalyzePage = () => {
  const { datasetId } = useParams();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Analyze Data</h1>
      <Card>
        <CardHeader>
          <CardTitle>Dataset Analysis - ID: {datasetId}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Analysis tools for this dataset will be shown here.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyzePage;
