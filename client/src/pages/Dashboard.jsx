import React, { useState, useEffect } from "react";
import { Tabs, Card, Avatar, Text, Group, Stack, SimpleGrid } from "@mantine/core";
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
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';

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
  const [analyticsData, setAnalyticsData] = useState(null);
  const [contributorsData, setContributorsData] = useState([]);  // Initialize as empty array

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
        const response = await fetch('/api/contributors/techx/plume');
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
        const formattedData = data.map(contributor => {
          // Get full commit history
          const commitHistory = contributor.commit_history || [];
          
          return {
            username: contributor.login,
            commits: contributor.total_commits || contributor.contributions,
            avatarUrl: contributor.avatar_url,
            additions: contributor.total_additions || 0,
            deletions: contributor.total_deletions || 0,
            commitHistory: commitHistory // Store full history
          };
        });
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
        <p className="text-2xl">{analyticsData?.totalCommits}</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">Total Lines of Code</h2>
        <p className="text-2xl">{analyticsData?.totalLines}</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">Files Changed</h2>
        <p className="text-2xl">{analyticsData?.filesChanged}</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">Avg. Code Complexity</h2>
        <p className="text-2xl">{analyticsData?.codeComplexity}</p>
      </div>
    </div>
  );

  const OverallCommitGraph = () => {
    // Combine all contributors' commit histories
    const allCommits = {};
    contributorsData.forEach(contributor => {
      contributor.commitHistory.forEach(week => {
        const date = week.date;
        allCommits[date] = (allCommits[date] || 0) + week.commits;
      });
    });

    const sortedDates = Object.keys(allCommits).sort();
    const lastFourWeeks = sortedDates.slice(-4); // Only get last 4 weeks initially
    
    return (
      <div style={{ height: '300px', marginBottom: '2rem' }}>
        <Bar
          data={{
            labels: sortedDates.map(date => new Date(date)),
            datasets: [{
              label: 'Total Repository Commits',
              data: sortedDates.map(date => allCommits[date]),
              backgroundColor: 'rgba(54, 162, 235, 0.6)',
              borderColor: 'rgb(54, 162, 235)',
              borderWidth: 1
            }]
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                type: 'time',
                time: {
                  unit: 'week'
                },
                title: {
                  display: false,
                },
                min: lastFourWeeks[0], // Set initial view to last 4 weeks
                max: lastFourWeeks[lastFourWeeks.length - 1]
              },
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Number of Commits'
                }
              }
            },
            plugins: {
              legend: {
                display: false
              },
              title: {
                display: true,
                text: 'Repository Commits Over Time',
                font: {
                  size: 16
                }
              },
              zoom: {
                pan: {
                  enabled: true,
                  mode: 'x'
                },
                zoom: {
                  wheel: {
                    enabled: true
                  },
                  pinch: {
                    enabled: true
                  },
                  mode: 'x',
                  limits: {
                    x: {min: sortedDates[0], max: sortedDates[sortedDates.length - 1]}
                  }
                }
              }
            }
          }}
        />
      </div>
    );
  };

  const Contributors = () => (
    <>
      {contributorsData && contributorsData.length > 0 && <OverallCommitGraph />}
      <SimpleGrid cols={2} spacing="md">
        {contributorsData && contributorsData.length > 0 ? contributorsData.map((contributor) => (
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
              </div>
            </Group>
            <div style={{ height: '200px', marginTop: '1rem' }}>
              <Bar
                data={{
                  labels: contributor.commitHistory.map(week => new Date(week.date)),
                  datasets: [
                    {
                      label: 'Commits',
                      data: contributor.commitHistory.map(week => week.commits),
                      backgroundColor: 'rgba(75, 192, 192, 0.6)',
                      borderColor: 'rgb(75, 192, 192)',
                      borderWidth: 1
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: {
                      type: 'time',
                      time: {
                        unit: 'week'
                      }
                    },
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      display: false
                    },
                    title: {
                      display: true,
                      text: 'Commits Over Time'
                    },
                    zoom: {
                      pan: {
                        enabled: true,
                        mode: 'x'
                      },
                      zoom: {
                        wheel: {
                          enabled: true
                        },
                        pinch: {
                          enabled: true
                        },
                        mode: 'x',
                        limits: {
                          x: {min: 'original', max: 'original'}
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </Card>
        )) : (
          <Text>No contributors data available</Text>
        )}
      </SimpleGrid>
    </>
  );

  return (
    <div className="py-8 px-12">
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
