import React, { useState, useEffect } from 'react';

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

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Code Analytics Dashboard</h1>
      </header>
      {analyticsData ? (
        <div className="dashboard-cards">
          <div className="card">
            <h2>Total Commits</h2>
            <p>{analyticsData.totalCommits}</p>
          </div>
          <div className="card">
            <h2>Total Lines of Code</h2>
            <p>{analyticsData.totalLines}</p>
          </div>
          <div className="card">
            <h2>Files Changed</h2>
            <p>{analyticsData.filesChanged}</p>
          </div>
          <div className="card">
            <h2>Avg. Code Complexity</h2>
            <p>{analyticsData.codeComplexity}</p>
          </div>
        </div>
      ) : (
        <p>Loading analytics data...</p>
      )}
    </div>
  );
};

export default Dashboard;
