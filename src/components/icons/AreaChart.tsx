
import React from 'react';

interface AreaChartProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

const AreaChart: React.FC<AreaChartProps> = ({ size = 24, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 18h18" />
      <path d="M3 18C9 10, 13 18, 21 10V4" />
      <path d="M3 18C9 10, 13 18, 21 10" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
};

export default AreaChart;
