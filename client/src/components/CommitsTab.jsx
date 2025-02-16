import React, { useState, useEffect } from "react";
import { Text, Loader, SimpleGrid, Card, Group } from "@mantine/core";
import { Bar } from "react-chartjs-2";

const CommitsTab = ({ owner, repo }) => {
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCommits = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/commits/${owner}/${repo}?per_page=20`);
        if (!response.ok) throw new Error("Failed to fetch commits");
        const data = await response.json();
        setCommits(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCommits();
  }, [owner, repo]);

  if (loading) {
    return <Loader />;
  }

  if (!commits.length) {
    return <Text>No commits found.</Text>;
  }

  return (
    <div>
      <Text weight={500} mb="md">
        Recent Commits ({commits.length})
      </Text>
      <SimpleGrid cols={1}>
        {commits.map((commit) => (
          <Card key={commit.sha} shadow="sm" p="md" radius="md" withBorder>
            <Group>
              <Text weight={500}>{commit.author_name}</Text>
              <Text color="dimmed">{commit.author_email}</Text>
            </Group>
            <Text size="sm">{commit.message}</Text>
            <Text size="xs" color="dimmed">
              {new Date(commit.date).toLocaleString()} (SHA: {commit.sha.slice(0, 7)})
            </Text>
          </Card>
        ))}
      </SimpleGrid>

      {/* Example: You can also chart commits over time */}
      {/* <Bar data={...} options={...} /> */}
    </div>
  );
};

export default CommitsTab;
