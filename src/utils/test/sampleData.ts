
import { Dataset } from "@/services/types/datasetTypes";
import { QueryConfig, SavedQuery } from "@/services/queryService";

/**
 * Sample dataset for testing
 */
export const sampleDataset: Dataset = {
  id: "test-dataset-123",
  name: "Sales Data",
  description: "Monthly sales data for testing",
  file_name: "sales_data.csv",
  file_size: 1024,
  storage_type: "local",
  storage_path: "test/sales_data.csv",
  row_count: 12,
  column_schema: {
    month: "string",
    sales: "number",
    region: "string",
    customers: "number",
    product_category: "string"
  },
  user_id: "test-user-123",
  created_at: "2025-01-01T00:00:00.000Z",
  updated_at: "2025-01-01T00:00:00.000Z"
};

/**
 * Sample sales data for testing
 */
export const sampleSalesData = [
  { month: "January", sales: 1200, region: "North", customers: 45, product_category: "Electronics" },
  { month: "February", sales: 1500, region: "North", customers: 52, product_category: "Electronics" },
  { month: "March", sales: 1800, region: "South", customers: 61, product_category: "Electronics" },
  { month: "April", sales: 1300, region: "South", customers: 48, product_category: "Furniture" },
  { month: "May", sales: 2100, region: "East", customers: 72, product_category: "Furniture" },
  { month: "June", sales: 2400, region: "East", customers: 83, product_category: "Furniture" },
  { month: "July", sales: 2200, region: "West", customers: 76, product_category: "Clothing" },
  { month: "August", sales: 1900, region: "West", customers: 65, product_category: "Clothing" },
  { month: "September", sales: 2300, region: "North", customers: 79, product_category: "Clothing" },
  { month: "October", sales: 2700, region: "North", customers: 92, product_category: "Electronics" },
  { month: "November", sales: 3100, region: "South", customers: 105, product_category: "Electronics" },
  { month: "December", sales: 3500, region: "South", customers: 118, product_category: "Furniture" }
];

/**
 * Sample query configurations for testing
 */
export const sampleQueries: Record<string, SavedQuery> = {
  barChart: {
    name: "Monthly Sales Bar Chart",
    dataset_id: "test-dataset-123",
    query_type: "ui_builder",
    query_text: "",
    query_config: {
      dataset_id: "test-dataset-123",
      chart_type: "bar",
      measures: [{ field: "sales", aggregation: "sum" }],
      dimensions: [{ field: "month" }],
      limit: 12
    }
  },
  pieChart: {
    name: "Sales by Region Pie Chart",
    dataset_id: "test-dataset-123",
    query_type: "ui_builder",
    query_text: "",
    query_config: {
      dataset_id: "test-dataset-123",
      chart_type: "pie",
      measures: [{ field: "sales", aggregation: "sum" }],
      dimensions: [{ field: "region" }],
      limit: 4
    }
  },
  lineChart: {
    name: "Customer Trends Line Chart",
    dataset_id: "test-dataset-123",
    query_type: "ui_builder",
    query_text: "",
    query_config: {
      dataset_id: "test-dataset-123",
      chart_type: "line",
      measures: [{ field: "customers", aggregation: "sum" }],
      dimensions: [{ field: "month" }],
      limit: 12
    }
  },
  naturalLanguage: {
    name: "Sales by Product Category",
    dataset_id: "test-dataset-123",
    query_type: "natural_language",
    query_text: "Show me sales by product category",
    query_config: {
      dataset_id: "test-dataset-123",
      chart_type: "bar",
      measures: [],
      dimensions: []
    }
  }
};

/**
 * Sample AI query responses for testing
 */
export const sampleAIResponses = {
  salesByCategory: {
    chart_type: "bar",
    x_axis: "product_category",
    y_axis: "sales",
    chart_title: "Sales by Product Category",
    explanation: "This chart shows the total sales for each product category. Electronics has the highest sales, followed by Furniture and Clothing.",
    data: [
      { product_category: "Electronics", sales: 10300 },
      { product_category: "Furniture", sales: 5800 },
      { product_category: "Clothing", sales: 6400 }
    ],
    columns: ["product_category", "sales"]
  },
  monthlySales: {
    chart_type: "line",
    x_axis: "month",
    y_axis: "sales",
    chart_title: "Monthly Sales Trends",
    explanation: "This chart shows sales increasing throughout the year, with a peak in December.",
    data: sampleSalesData,
    columns: ["month", "sales", "region", "customers", "product_category"]
  }
};

/**
 * Sample chart data for visualizations
 */
export const chartData = {
  barChart: [
    { category: "Category A", value: 35 },
    { category: "Category B", value: 45 },
    { category: "Category C", value: 30 },
    { category: "Category D", value: 25 },
    { category: "Category E", value: 55 }
  ],
  pieChart: [
    { segment: "Segment 1", value: 30 },
    { segment: "Segment 2", value: 25 },
    { segment: "Segment 3", value: 15 },
    { segment: "Segment 4", value: 30 }
  ],
  lineChart: [
    { date: "2025-01", value: 10 },
    { date: "2025-02", value: 25 },
    { date: "2025-03", value: 15 },
    { date: "2025-04", value: 35 },
    { date: "2025-05", value: 30 },
    { date: "2025-06", value: 40 }
  ]
};
