
// Sample chart data for testing visualization
export const chartData = [
  { month: 'Jan', sales: 120, customers: 45 },
  { month: 'Feb', sales: 150, customers: 53 },
  { month: 'Mar', sales: 190, customers: 68 },
  { month: 'Apr', sales: 85, customers: 32 },
  { month: 'May', sales: 210, customers: 71 },
  { month: 'Jun', sales: 180, customers: 62 }
];

// Sample query configurations for testing
export const sampleQueries = {
  barChart: {
    query_config: {
      type: "bar",
      x: "month",
      y: "sales",
      title: "Monthly Sales Performance"
    }
  },
  pieChart: {
    query_config: {
      type: "pie",
      x: "region",
      y: "sales",
      title: "Sales Distribution by Region"
    }
  },
  lineChart: {
    query_config: {
      type: "line",
      x: "month",
      y: "customers",
      title: "Customer Growth Trends"
    }
  }
};

// Mock NLP response data for demonstration
export const nlpResponses = {
  sales: {
    chart_type: "bar",
    x_axis: "month",
    y_axis: "sales",
    chart_title: "Monthly Sales Performance",
    explanation: "Sales have been trending upward with the highest performance in May. There was a significant drop in April which warrants investigation.",
    data: [
      { month: 'Jan', sales: 120 },
      { month: 'Feb', sales: 150 },
      { month: 'Mar', sales: 190 },
      { month: 'Apr', sales: 85 },
      { month: 'May', sales: 210 },
      { month: 'Jun', sales: 180 }
    ],
    columns: ["month", "sales"]
  },
  products: {
    chart_type: "pie",
    x_axis: "product",
    y_axis: "quantity",
    chart_title: "Product Distribution by Quantity",
    explanation: "Product A represents the largest portion of your inventory, followed by Product C. Product B has the smallest share.",
    data: [
      { product: 'Product A', quantity: 350 },
      { product: 'Product B', quantity: 125 },
      { product: 'Product C', quantity: 225 }
    ],
    columns: ["product", "quantity"]
  },
  regions: {
    chart_type: "pie",
    x_axis: "region",
    y_axis: "sales",
    chart_title: "Regional Sales Distribution",
    explanation: "The North region contributes the highest percentage of sales, followed by West. The East region shows the lowest performance and may need additional focus.",
    data: [
      { region: 'North', sales: 23500 },
      { region: 'South', sales: 18700 },
      { region: 'East', sales: 15200 },
      { region: 'West', sales: 21800 }
    ],
    columns: ["region", "sales"]
  },
  timeSeries: {
    chart_type: "line",
    x_axis: "month",
    y_axis: "customers",
    chart_title: "Customer Acquisition Trends",
    explanation: "Customer acquisition shows a positive trend with steady growth from January to March, followed by a significant drop in April. May shows a strong recovery with the highest number of new customers.",
    data: [
      { month: 'Jan', customers: 45 },
      { month: 'Feb', customers: 53 },
      { month: 'Mar', customers: 68 },
      { month: 'Apr', customers: 32 },
      { month: 'May', customers: 71 },
      { month: 'Jun', customers: 62 }
    ],
    columns: ["month", "customers"]
  },
  default: {
    chart_type: "bar",
    x_axis: "category",
    y_axis: "value",
    chart_title: "Data Analysis",
    explanation: "Here's a general analysis of the data you provided. The categories show varying values with Category C having the highest value.",
    data: [
      { category: 'Category A', value: 42 },
      { category: 'Category B', value: 28 },
      { category: 'Category C', value: 63 },
      { category: 'Category D', value: 35 }
    ],
    columns: ["category", "value"]
  }
};
