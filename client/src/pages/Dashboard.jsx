import React, { useState, useEffect } from "react";
import { Tabs, Card, Avatar, Text, Group, Stack } from "@mantine/core";

const Dashboard = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [contributorsData, setContributorsData] = useState(null);

  useEffect(() => {
    // Fetch analytics data
    setTimeout(() => {
      setAnalyticsData({
        totalCommits: 1200,
        totalLines: 45000,
        filesChanged: 150,
        codeComplexity: 2.8,
      });
    }, 1000);

    // Fetch contributors data from API
    const fetchContributors = async () => {
      try {
        const response = await fetch('/api/contributors/evnkim/treehacks2025');
        if (!response.ok) {
          throw new Error('Failed to fetch contributors');
        }
        const data = await response.json();
        // Check if data is an array before mapping
        if (!Array.isArray(data)) {
          console.error('Expected array of contributors, received:', data);
          setContributorsData([]);
          return;
        }
        const formattedData = data.map(contributor => ({
          username: contributor.login,
          commits: contributor.total_commits || contributor.contributions,
          avatarUrl: contributor.avatar_url,
          additions: contributor.total_additions || 0,
          deletions: contributor.total_deletions || 0,
          recentCommits: contributor.recent_commits || 0,
          recentAdditions: contributor.recent_additions || 0,
          recentDeletions: contributor.recent_deletions || 0
        }));
        setContributorsData(formattedData);
      } catch (error) {
        console.error('Error fetching contributors:', error);
        setContributorsData([]); 
      }
    };

    fetchContributors();
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

  const Contributors = () => (
    <Stack gap="md">
      {contributorsData.map((contributor) => (
        <Card key={contributor.username} padding="md" radius="md" withBorder>
          <Group>
            <Avatar 
              src={contributor.avatarUrl} 
              size="lg" 
              radius="xl"
              alt={contributor.username}
            />
            <div style={{ flex: 1 }}>
              <Text fw={500} size="lg">{contributor.username}</Text>
              <Group gap="xl">
                <Text size="sm" c="dimmed">
                  {contributor.commits} commits
                </Text>
                <Text size="sm" c="green">
                  +{contributor.additions} lines
                </Text>
                <Text size="sm" c="red">
                  -{contributor.deletions} lines
                </Text>
              </Group>
              <Group gap="xl" mt="xs">
                <Text size="sm" c="dimmed">
                  Recent (4 weeks):
                </Text>
                <Text size="sm" c="dimmed">
                  {contributor.recentCommits} commits
                </Text>
                <Text size="sm" c="green">
                  +{contributor.recentAdditions} lines
                </Text>
                <Text size="sm" c="red">
                  -{contributor.recentDeletions} lines
                </Text>
              </Group>
            </div>
          </Group>
        </Card>
      ))}
    </Stack>
  );

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Code Analytics Dashboard</h1>
      </header>
      
      <Tabs defaultValue="overview" styles={{
        tab: {
          padding: '8px 16px',
          fontSize: '1rem',
          '&:hover': {
            backgroundColor: '#f8fafc'
          }
        },
        panel: {
          padding: '16px 0'
        }
      }}>
        <Tabs.List grow>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="contributors">Contributors</Tabs.Tab>
          <Tabs.Tab value="commits">Commits</Tabs.Tab>
          <Tabs.Tab value="code">Code Analysis</Tabs.Tab>
          <Tabs.Tab value="performance">Performance</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          {analyticsData ? <AnalyticsOverview /> : (
            <p className="text-gray-600">Loading analytics data...</p>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="contributors" pt="md">
          {contributorsData ? <Contributors /> : (
            <p className="text-gray-600">Loading contributors data...</p>
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
