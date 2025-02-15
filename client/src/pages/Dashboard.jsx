import React, { useState, useEffect } from "react";
import { Tabs } from "@mantine/core";

const Dashboard = () => {
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    // Simulate fetching data from an API
    setTimeout(() => {
      setAnalyticsData({
        totalCommits: 1200,
        totalLines: 45000,
        filesChanged: 150,
        codeComplexity: 2.8,
      });
    }, 1000);
  }, []);

  const AnalyticsOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">Total Commits</h2>
        <p className="text-2xl">{analyticsData.totalCommits}</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">Total Lines of Code</h2>
        <p className="text-2xl">{analyticsData.totalLines}</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">Files Changed</h2>
        <p className="text-2xl">{analyticsData.filesChanged}</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">Avg. Code Complexity</h2>
        <p className="text-2xl">{analyticsData.codeComplexity}</p>
      </div>
    </div>
  );

  return (
    <div className="p-3">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Code Analytics Dashboard</h1>
      </header>
      
      <Tabs defaultValue="overview">
        <Tabs.List>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="commits">Commits</Tabs.Tab>
          <Tabs.Tab value="code">Code Analysis</Tabs.Tab>
          <Tabs.Tab value="performance">Performance</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          {analyticsData ? <AnalyticsOverview /> : (
            <p className="text-gray-600">Loading analytics data...</p>
          )}
        </Tabs.Panel>
        
        <Tabs.Panel value="commits" pt="md">
          <p>Commit history and statistics will go here</p>
        </Tabs.Panel>
        
        <Tabs.Panel value="code" pt="md">
          <p>Detailed code analysis metrics will go here</p>
        </Tabs.Panel>
        
        <Tabs.Panel value="performance" pt="md">
          <p>Performance metrics and trends will go here</p>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
};

export default Dashboard;
