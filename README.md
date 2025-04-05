
# GenBI - Data Visualization Platform

GenBI is a powerful data visualization platform that allows users to upload, analyze, visualize and transform datasets. The application features a modern, responsive UI with real-time data visualization capabilities, AI-powered insights, and robust data management.

## Tech Stack

### Frontend
- **React**: Main UI framework (v18.3+)
- **TypeScript**: For type-safe code
- **Vite**: Build tool and development server
- **TailwindCSS**: For styling and responsive design
- **shadcn/ui**: Component library for consistent UI elements
- **Recharts & ECharts**: For data visualization
- **React Router**: For client-side routing
- **React Query**: For efficient data fetching and state management

### Backend
- **Supabase**: For authentication, data storage, and serverless functions
  - Authentication with email/password and JWT
  - PostgreSQL database for storing user data and datasets
  - Storage buckets for file management
  - Edge Functions for serverless operations
  - Row-Level Security (RLS) for data protection

### Data Processing
- **PapaParse**: For CSV parsing and schema inference
- **OpenAI API**: For AI-powered queries and insights
- **Anthropic API**: Alternative AI provider for analysis

## Database Schema

### Tables

#### datasets
- `id` (UUID): Primary key
- `user_id` (UUID): References the user who uploaded the dataset
- `name` (TEXT): Dataset name
- `description` (TEXT): Optional dataset description
- `file_name` (TEXT): Original filename
- `file_size` (INTEGER): Size in bytes
- `row_count` (INTEGER): Estimated row count
- `column_schema` (JSONB): Column names and data types
- `storage_type` (TEXT): Storage provider (supabase, s3, etc.)
- `storage_path` (TEXT): Path to the file in storage
- `storage_bucket` (TEXT): 'datasets' or 'cold_storage'
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

#### queries
- `id` (UUID): Primary key
- `user_id` (UUID): References the user who created the query
- `dataset_id` (UUID): References the dataset
- `name` (TEXT): Query name
- `query_text` (TEXT): The query in natural language
- `query_type` (TEXT): Type of query (sql, chart, ai, etc.)
- `query_config` (JSONB): Configuration for the query
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

#### visualizations
- `id` (UUID): Primary key
- `user_id` (UUID): References the user who created the visualization
- `query_id` (UUID): References the query
- `name` (TEXT): Visualization name
- `chart_type` (TEXT): Type of chart (bar, line, pie, etc.)
- `chart_config` (JSONB): Configuration for the chart
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

#### storage_connections
- `id` (UUID): Primary key
- `user_id` (UUID): References the user
- `storage_type` (TEXT): Type of storage (s3, azure, gcs, dropbox)
- `connection_details` (JSONB): Connection details
- `created_at` (TIMESTAMP): Creation timestamp

## Storage Architecture

The application uses a tiered storage approach:

1. **Active Storage**: For frequently used, smaller datasets (< 50MB)
   - Stored in the 'datasets' bucket
   - Optimized for quick access and visualization

2. **Cold Storage**: For large datasets (> 50MB) or archived data
   - Stored in the 'cold_storage' bucket
   - Optimized for cost efficiency

## Authentication System

The application supports:

- **Email/Password Authentication**: For standard users
- **Admin Bypass**: For testing purposes using admin@genbi.com / admin123!
- **JWT Tokens**: For secure API access

## AI Integration

GenBI leverages advanced AI models for data analysis:

- **OpenAI GPT-4**: For natural language query interpretation and advanced analytics
- **Anthropic Claude**: Alternative AI model for data insights

## Key Features

1. **Dataset Management**
   - Upload CSV, Excel, and JSON files
   - Schema inference and data type detection
   - Dataset metadata tracking
   - File storage with Supabase buckets

2. **Data Visualization**
   - Interactive charts and graphs
   - Custom visualization creation
   - Shareable dashboards
   - Real-time updates

3. **AI-Powered Analysis**
   - Natural language queries
   - Automated insights
   - Trend detection
   - Anomaly highlighting

4. **User Management**
   - User authentication
   - Role-based permissions
   - Secure data access controls
   - User-specific dataset libraries

## Microservices Architecture

The application follows a microservices approach:

1. **Auth Service**: Handles user authentication and session management
2. **Data Service**: Manages dataset operations and storage
3. **Query Service**: Processes data queries and analysis
4. **Visualization Service**: Handles chart generation and display
5. **AI Service**: Manages connections to AI providers

## Development Setup

1. Clone the repository
2. Install dependencies with `npm install`
3. Set up Supabase:
   - Create a Supabase project
   - Configure authentication
   - Create the necessary tables
   - Set up storage buckets
4. Configure environment variables
5. Run the development server with `npm run dev`

## Deployment

The application can be deployed using:

1. **Vercel/Netlify**: For the frontend
2. **Supabase**: For backend services and database

## Future Enhancements

- Data transformation capabilities
- Advanced collaboration features
- Custom dashboard creation
- Machine learning model integration
- Extended connectivity to more data sources
