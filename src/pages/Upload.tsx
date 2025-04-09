
import React from 'react';
import { UserDatasetLibrary } from '@/components/upload/UserDatasetLibrary';
import { UploadTabContent } from '@/components/upload/UploadTabContent';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from '@/components/ui/card';

const Upload = () => {
  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold mb-6">Data Explorer</h1>
      
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="upload">Upload New Dataset</TabsTrigger>
          <TabsTrigger value="library">My Dataset Library</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload">
          <Card>
            <CardContent className="pt-6">
              <UploadTabContent />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="library">
          <UserDatasetLibrary />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Upload;
