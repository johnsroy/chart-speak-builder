
# Data Visualization Platform

A powerful data visualization platform for uploading, analyzing, and visualizing datasets with advanced AI capabilities.

## Project Overview

This platform allows users to upload datasets (CSV, Excel, JSON), analyze them, and create interactive visualizations. Built with modern web technologies and integrating AI-powered features, it streamlines the data analysis process for both technical and non-technical users.

## Features

- **Data Upload**: Upload CSV, Excel, or JSON files with automatic schema inference
- **Large File Support**: Handles large files with chunked uploading and progress tracking
- **Cloud Storage Integration**: Connect to AWS S3, Azure Storage, Google Cloud Storage, or Dropbox
- **Interactive Data Visualization**: Create charts and graphs using Recharts and shadcn/ui
- **AI-Powered Analytics**: Generate insights using OpenAI and Anthropic AI models
- **Authentication**: Secure user authentication via Supabase
- **Responsive Design**: Fully responsive UI that works on desktop and mobile devices

## Technology Stack

### Frontend
- **React**: UI library for building component-based interfaces
- **TypeScript**: For type safety and improved developer experience
- **Vite**: For fast development and optimized builds
- **Tailwind CSS**: For utility-first styling
- **shadcn/ui**: For high-quality UI components
- **Recharts**: For data visualization components
- **Tanstack Query**: For efficient data fetching and state management

### Backend (Supabase)
- **PostgreSQL**: For database storage
- **Supabase Storage**: For file storage
- **Supabase Auth**: For user authentication
- **Row Level Security (RLS)**: For data protection
- **Edge Functions**: For serverless API endpoints

### AI Integration
- **OpenAI API**: For natural language processing and data analysis
- **Anthropic API**: For conversational AI and alternative NLP capabilities

## Database Schema

### Tables

#### datasets
- **id**: UUID (Primary Key)
- **name**: Text
- **description**: Text (optional)
- **user_id**: UUID (Foreign Key to auth.users)
- **file_name**: Text
- **file_size**: Integer
- **row_count**: Integer
- **column_schema**: JSONB (column name -> data type)
- **created_at**: Timestamp with timezone
- **updated_at**: Timestamp with timezone
- **storage_type**: Text ('supabase', 's3', 'azure', 'gcs', 'dropbox')
- **storage_path**: Text

#### queries
- **id**: UUID (Primary Key)
- **name**: Text
- **query_text**: Text
- **query_type**: Text
- **query_config**: JSONB
- **dataset_id**: UUID (Foreign Key to datasets)
- **user_id**: UUID (Foreign Key to auth.users)
- **created_at**: Timestamp with timezone
- **updated_at**: Timestamp with timezone

#### visualizations
- **id**: UUID (Primary Key)
- **name**: Text
- **chart_type**: Text
- **chart_config**: JSONB
- **query_id**: UUID (Foreign Key to queries)
- **user_id**: UUID (Foreign Key to auth.users)
- **created_at**: Timestamp with timezone
- **updated_at**: Timestamp with timezone

#### storage_connections
- **id**: UUID (Primary Key)
- **user_id**: UUID (Foreign Key to auth.users)
- **storage_type**: Text ('s3', 'azure', 'gcs', 'dropbox')
- **connection_details**: JSONB
- **created_at**: Timestamp with timezone

## Storage Buckets

- **datasets**: Stores uploaded dataset files
- **secure**: Stores sensitive credentials for cloud storage connections

## Authentication

The platform uses Supabase Authentication with:
- Email/password authentication
- JWT token-based sessions
- Row Level Security policies ensuring users can only access their own data
- Admin user capabilities for system management

## AI Features

### Natural Language Querying
- Transform natural language questions into SQL or data queries
- Support for both OpenAI and Anthropic models
- Query history and saved queries

### Data Insights
- Automatic pattern detection and insights generation
- Anomaly detection in datasets
- Smart visualization recommendations

## File Upload & Processing

The platform handles file uploads with a robust approach:
- Chunked uploads for large files (>5MB)
- Automatic retries with exponential backoff
- Progress tracking and cancelation
- Server-side validation and schema inference

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Run development server with `npm run dev`
4. Open http://localhost:5173 in your browser

## Environment Setup

The project connects to Supabase for backend functionality. The following environment variables are used:

- Supabase URL: https://rehadpogugijylybwmoe.supabase.co
- Supabase public key (automatically configured)
- OpenAI API key (for AI features)
- Anthropic API key (for alternative AI model)

## Deployment

The application can be deployed using the Lovable publishing feature, which provides:
- Automatic builds and deployments
- Custom domain support
- SSL certificate management
- CDN and edge caching

## License

This project is MIT licensed.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
