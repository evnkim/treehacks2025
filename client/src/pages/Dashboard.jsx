// client/src/pages/Dashboard.jsx

import React, { useState, useEffect } from "react";
import {
  Tabs,
  Card,
  Avatar,
  Text,
  Group,
  SimpleGrid,
  Loader,
  Paper,
  Select,
  Button,
  Center,
} from "@mantine/core";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js";
import "chartjs-adapter-date-fns";
import zoomPlugin from "chartjs-plugin-zoom";
import FileTreeExplorer from "../components/FileTreeExplorer";
import { useNavigate, useSearchParams } from "react-router-dom";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  zoomPlugin
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [repositories, setRepositories] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(searchParams.get('repo') || "");
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [contributorsData, setContributorsData] = useState([]);

  useEffect(() => {
    // Fetch user's repositories on mount
    const fetchRepositories = async () => {
      try {
        const response = await fetch("/api/github/repositories");
        if (!response.ok) throw new Error("Failed to fetch repositories");
        const data = await response.json();
        setRepositories(data);
      } catch (error) {
        console.error("Error fetching repositories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRepositories();
  }, []);

  useEffect(() => {
    if (!selectedRepo) return;

    // Update URL when selected repo changes
    navigate(`/dashboard?repo=${encodeURIComponent(selectedRepo)}`, { replace: true });

    const [owner, repo] = selectedRepo.split("/");

    // Fetch analytics data for selected repository
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`/api/analytics/${owner}/${repo}`);
        if (!response.ok) throw new Error("Failed to fetch analytics");
        const data = await response.json();
        setAnalyticsData({
          totalCommits: data.total_commits || 0,
          totalLines: data.total_lines || 0,
          filesChanged: data.files_changed || 0,
          codeComplexity: data.code_complexity || 0,
        });
      } catch (error) {
        console.error("Error fetching analytics:", error);
      }
    };

    // Fetch contributors data for selected repository
    const fetchContributors = async () => {
      try {
        const response = await fetch(`/api/contributors/${owner}/${repo}`);
        if (!response.ok) throw new Error("Failed to fetch contributors");
        const data = await response.json();
        if (!Array.isArray(data)) {
          console.error("Expected array of contributors, received:", data);
          setContributorsData([]);
          return;
        }
        const formattedData = data.map((contributor) => {
          const commitHistory = contributor.commit_history || [];
          return {
            username: contributor.login,
            commits: contributor.total_commits || contributor.contributions,
            avatarUrl: contributor.avatar_url,
            additions: contributor.total_additions || 0,
            deletions: contributor.total_deletions || 0,
            commitHistory,
          };
        });
        setContributorsData(formattedData);
      } catch (error) {
        console.error("Error fetching contributors:", error);
        setContributorsData([]);
      }
    };

    fetchAnalytics();
    fetchContributors();
  }, [selectedRepo, navigate]);

  if (loading) {
    return (
      <Center style={{ height: "100vh" }}>
        <Loader size="xl" />
      </Center>
    );
  }

  if (!selectedRepo) {
    return (
      <Center style={{ height: "100vh" }}>
        <Card shadow="sm" p="xl" radius="md" withBorder style={{ width: "400px" }}>
          <Text size="xl" weight={500} align="center" mb="md">
            Select a Repository
          </Text>
          <Select
            label="Choose a repository"
            placeholder="Select a repository"
            data={repositories.map(repo => ({
              value: `${repo.owner}/${repo.name}`,
              label: repo.name
            }))}
            value={selectedRepo}
            onChange={setSelectedRepo}
            searchable
            mb="md"
          />
        </Card>
      </Center>
    );
  }

  const AnalyticsOverview = () => (
    <SimpleGrid cols={4} spacing="md">
      <Paper withBorder p="md">
        <Text weight={500}>Total Commits</Text>
        <Text size="xl">{analyticsData?.totalCommits}</Text>
      </Paper>
      <Paper withBorder p="md">
        <Text weight={500}>Total Lines of Code</Text>
        <Text size="xl">{analyticsData?.totalLines}</Text>
      </Paper>
      <Paper withBorder p="md">
        <Text weight={500}>Files Changed</Text>
        <Text size="xl">{analyticsData?.filesChanged}</Text>
      </Paper>
      <Paper withBorder p="md">
        <Text weight={500}>Avg. Code Complexity</Text>
        <Text size="xl">{analyticsData?.codeComplexity}</Text>
      </Paper>
    </SimpleGrid>
  );

  const OverallCommitGraph = () => {
    const allCommits = {};
    contributorsData.forEach((contributor) => {
      contributor.commitHistory.forEach((week) => {
        const date = week.date;
        allCommits[date] = (allCommits[date] || 0) + week.commits;
      });
    });
    const sortedDates = Object.keys(allCommits).sort();
    return (
      <div style={{ height: "300px", marginBottom: "2rem" }}>
        <Bar
          data={{
            labels: sortedDates.map((date) => new Date(date)),
            datasets: [
              {
                label: "Total Repository Commits",
                data: sortedDates.map((date) => allCommits[date]),
                backgroundColor: "rgba(54, 162, 235, 0.6)",
                borderColor: "rgb(54, 162, 235)",
                borderWidth: 1,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { type: "time", time: { unit: "week" } },
              y: {
                beginAtZero: true,
                title: { display: true, text: "Number of Commits" },
              },
            },
            plugins: {
              legend: { display: false },
              title: {
                display: true,
                text: "Repository Commits Over Time",
                font: { size: 16 },
              },
              zoom: {
                pan: { enabled: true, mode: "x" },
                zoom: {
                  wheel: { enabled: true },
                  pinch: { enabled: true },
                  mode: "x",
                },
              },
            },
          }}
        />
      </div>
    );
  };

  const Contributors = () => (
    <>
      {contributorsData && contributorsData.length > 0 && <OverallCommitGraph />}
      <SimpleGrid cols={2} spacing="md">
        {contributorsData && contributorsData.length > 0 ? (
          contributorsData.map((contributor) => (
            <Card key={contributor.username} shadow="sm" p="lg" radius="md" withBorder>
              <Group>
                <Avatar src={contributor.avatarUrl} size="lg" radius="xl" alt={contributor.username} />
                <div style={{ flex: 1 }}>
                  <Text weight={500} size="lg">
                    {contributor.username}
                  </Text>
                  <Group spacing="xl">
                    <Text size="sm" color="dimmed">
                      {contributor.commits} commits
                    </Text>
                    <Text size="sm" color="green">
                      +{contributor.additions} lines
                    </Text>
                    <Text size="sm" color="red">
                      -{contributor.deletions} lines
                    </Text>
                  </Group>
                </div>
              </Group>
              <div style={{ height: "200px", marginTop: "1rem" }}>
                <Bar
                  data={{
                    labels: contributor.commitHistory.map((week) => new Date(week.date)),
                    datasets: [
                      {
                        label: "Commits",
                        data: contributor.commitHistory.map((week) => week.commits),
                        backgroundColor: "rgba(75, 192, 192, 0.6)",
                        borderColor: "rgb(75, 192, 192)",
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      x: { type: "time", time: { unit: "week" } },
                      y: { beginAtZero: true, ticks: { stepSize: 1 } },
                    },
                    plugins: {
                      legend: { display: false },
                      title: { display: true, text: "Commits Over Time" },
                      zoom: {
                        pan: { enabled: true, mode: "x" },
                        zoom: {
                          wheel: { enabled: true },
                          pinch: { enabled: true },
                          mode: "x",
                        },
                      },
                    },
                  }}
                />
              </div>
            </Card>
          ))
        ) : (
          <Text>No contributors data available</Text>
        )}
      </SimpleGrid>
    </>
  );

  return (
    <div className="py-8 px-12">
      <header className="mb-6">
        <Group position="apart">
          <h1 className="text-2xl font-bold">Code Analytics Dashboard</h1>
          <Select
            value={selectedRepo}
            onChange={setSelectedRepo}
            data={repositories.map(repo => ({
              value: `${repo.owner}/${repo.name}`,
              label: repo.name
            }))}
            placeholder="Switch repository"
            style={{ width: "200px" }}
          />
        </Group>
      </header>

      <Tabs defaultValue="overview" styles={{
        tab: {
          padding: "8px 16px",
          fontSize: "1rem",
          "&:hover": { backgroundColor: "#f8fafc" },
        },
        panel: { padding: "16px 0" },
      }}>
        <Tabs.List grow>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="contributors">Contributors</Tabs.Tab>
          <Tabs.Tab value="commits">Commits</Tabs.Tab>
          <Tabs.Tab value="code">Code Analysis</Tabs.Tab>
          <Tabs.Tab value="codebase">Codebase</Tabs.Tab>
          <Tabs.Tab value="performance">Performance</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          {analyticsData ? <AnalyticsOverview /> : <Text>Loading analytics data...</Text>}
        </Tabs.Panel>

        <Tabs.Panel value="contributors" pt="md">
          {contributorsData ? <Contributors /> : <Text>Loading contributors data...</Text>}
        </Tabs.Panel>

        <Tabs.Panel value="commits" pt="md">
          <Text>Commit history and statistics will go here</Text>
        </Tabs.Panel>

        <Tabs.Panel value="code" pt="md">
          <Text>Detailed code analysis metrics will go here</Text>
        </Tabs.Panel>

        <Tabs.Panel value="codebase" pt="md">
          <FileTreeExplorer />
        </Tabs.Panel>

        <Tabs.Panel value="performance" pt="md">
          <Text>Performance metrics and trends will go here</Text>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
};

export default Dashboard;