// client/src/components/OverviewTab.jsx
import React, { useEffect, useState } from "react";
import { Loader, Text, SimpleGrid, Paper, Group } from "@mantine/core";

const OverviewTab = ({ owner, repo }) => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOverview = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/overview/${owner}/${repo}`);
        if (!response.ok) throw new Error("Failed to fetch overview data");
        const data = await response.json();
        setOverview(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, [owner, repo]);

  if (loading) {
    return <Loader />;
  }

  if (!overview) {
    return <Text>No overview data available.</Text>;
  }

  return (
    <div>
      <Text size="xl" weight={600} mb="md">
        Repository Overview
      </Text>
      <SimpleGrid cols={2} spacing="md">
        <Paper withBorder p="md">
          <Text weight={600}>Name</Text>
          <Text>{overview.name}</Text>
        </Paper>
        <Paper withBorder p="md">
          <Text weight={600}>Description</Text>
          <Text>{overview.description || "—"}</Text>
        </Paper>
        <Paper withBorder p="md">
          <Text weight={600}>Stars</Text>
          <Text>{overview.stars}</Text>
        </Paper>
        <Paper withBorder p="md">
          <Text weight={600}>Forks</Text>
          <Text>{overview.forks}</Text>
        </Paper>
        <Paper withBorder p="md">
          <Text weight={600}>Watchers</Text>
          <Text>{overview.watchers}</Text>
        </Paper>
        <Paper withBorder p="md">
          <Text weight={600}>Open Issues</Text>
          <Text>{overview.open_issues}</Text>
        </Paper>
        <Paper withBorder p="md">
          <Text weight={600}>Total Commits</Text>
          <Text>{overview.total_commits || "N/A"}</Text>
        </Paper>
        <Paper withBorder p="md">
          <Text weight={600}>Avg Complexity</Text>
          <Text>{overview.average_complexity}</Text>
        </Paper>
        <Paper withBorder p="md">
          <Text weight={600}>Lines of Code</Text>
          <Text>{overview.total_lines_of_code}</Text>
        </Paper>
      </SimpleGrid>
    </div>
  );
};

export default OverviewTab;
