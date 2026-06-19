import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const dummyCostData = [
  { month: 'Jan', cost: 12000 },
  { month: 'Feb', cost: 8000 },
  { month: 'Mar', cost: 15000 },
  { month: 'Apr', cost: 11000 },
  { month: 'May', cost: 13500 },
  { month: 'Jun', cost: 10500 },
];

const dummyDeptData = [
  { name: 'Logistics', value: 4500 },
  { name: 'Packaging', value: 3200 },
  { name: 'SMS', value: 2800 },
  { name: 'Mill', value: 4500 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const MaintenanceCharts = ({ frequencyData, deptData, monthlyData }) => {
  return (
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
      {/* Monthly Maintenance Activity */}
      <div className="rounded-lg border border-blue-200 shadow-md bg-white overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
          <h3 className="text-sm font-semibold text-blue-700">Monthly Maintenance Activity</h3>
          <p className="text-[10px] text-blue-600 font-medium">Activity for past 6 months</p>
        </div>
        <div className="p-4 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                formatter={(value) => [value, 'Tasks']}
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <Bar dataKey="tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Department Task Analysis */}
      <div className="rounded-lg border border-purple-200 shadow-md bg-white overflow-hidden">
        <div className="p-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50">
          <h3 className="text-sm font-semibold text-purple-700">Department Task Distribution</h3>
          <p className="text-[10px] text-purple-600 font-medium">Real Data by Department</p>
        </div>
        <div className="p-4 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={deptData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                nameKey="name"
              >
                {deptData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Frequent Maintenance Chart */}
      <div className="rounded-lg border border-purple-200 shadow-md bg-white overflow-hidden lg:col-span-2">
        <div className="p-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50">
          <h3 className="text-sm font-semibold text-purple-700">Frequent Maintenance</h3>
          <p className="text-[10px] text-purple-600 font-medium">Real Data from Tasks</p>
        </div>
        <div className="p-4 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={frequencyData} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" fontSize={11} tickLine={false} axisLine={false} width={80} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceCharts;
