// client/src/components/FileTreeExplorer.jsx

import React, { useState, useEffect } from "react";
import { Card, Group, Text, ActionIcon, Stack, Title, Loader } from "@mantine/core";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";

const FileTreeExplorer = () => {
  // Get repo from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const repoFullName = urlParams.get('repo'); // e.g. "owner/repo"
  const [owner, repo] = repoFullName ? repoFullName.split('/') : [];

  // Tracks top-level nodes from GitHub
  const [rootNodes, setRootNodes] = useState([]);

  // Keeps track of which paths are "expanded" (for directories) or "open" (for files)
  const [expandedPaths, setExpandedPaths] = useState({}); // e.g. { "src/components": true }
  // Holds children for each directory path once loaded
  const [childrenByPath, setChildrenByPath] = useState({});
  // Holds analysis for each file path
  const [analysisByPath, setAnalysisByPath] = useState({});
  // Track loading state for file analysis
  const [loadingPaths, setLoadingPaths] = useState({});

  // Fetch repository root contents on mount
  useEffect(() => {
    if (owner && repo) {
      fetch(`/api/github/list-files/${owner}/${repo}?path=`)
        .then((response) => response.json())
        .then((data) => setRootNodes(data))
        .catch((error) => console.error("Error fetching root file tree:", error));
    }
  }, [owner, repo]);

  // Expand or collapse a directory. If expanding for the first time, fetch its children.
  const toggleDirectory = async (node) => {
    // If not yet expanded, fetch children
    const isCurrentlyExpanded = expandedPaths[node.path];
    if (!isCurrentlyExpanded && !childrenByPath[node.path]) {
      try {
        const response = await fetch(
          `/api/github/list-files/${owner}/${repo}?path=${encodeURIComponent(node.path)}`
        );
        const data = await response.json();
        setChildrenByPath((prev) => ({ ...prev, [node.path]: data }));
      } catch (error) {
        console.error("Error fetching folder contents:", error);
      }
    }

    // Toggle expansion state
    setExpandedPaths((prev) => ({
      ...prev,
      [node.path]: !prev[node.path],
    }));
  };

  // Fetch file analysis if we haven't yet, then toggle "expanded" for the file
  const toggleFile = async (node) => {
    const isCurrentlyExpanded = expandedPaths[node.path];
    if (!analysisByPath[node.path] && !isCurrentlyExpanded) {
      setLoadingPaths(prev => ({ ...prev, [node.path]: true }));
      try {
        const fileRes = await fetch(
          `/api/github/get-file/${owner}/${repo}?path=${encodeURIComponent(node.path)}`
        );
        const fileContent = await fileRes.text();
        const analysisRes = await fetch("/api/analyze/file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_content: fileContent }),
        });
        const analysisData = await analysisRes.json();
        setAnalysisByPath((prev) => ({ ...prev, [node.path]: analysisData }));
      } catch (error) {
        console.error("Error fetching file analysis:", error);
      } finally {
        setLoadingPaths(prev => ({ ...prev, [node.path]: false }));
      }
    }

    // Toggle file's "expanded" state
    setExpandedPaths((prev) => ({
      ...prev,
      [node.path]: !prev[node.path],
    }));
  };

  // Renders file analysis
  const renderAnalysis = (analysis) => (
    <Stack spacing="xs">
      {Object.entries(analysis).map(([key, value]) => (
        <Text key={key}>
          <Text span fw={700}>{formatKey(key)}:</Text> {String(value)}
        </Text>
      ))}
    </Stack>
  );

  // Helper to format snake_case keys to "Snake Case"
  const formatKey = (key) =>
    key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

  // Recursive node component
  const TreeNode = ({ node, level = 0 }) => {
    if (node.name.startsWith(".")) return null; // Skip hidden files/folders
    const isDirectory = node.type === "dir" || node.type === "folder";
    const isFile = node.type === "file";

    // Check if currently expanded
    const isExpanded = !!expandedPaths[node.path];
    const isLoading = loadingPaths[node.path];

    // Decide how to handle a click
    const handleClick = (e) => {
      e.stopPropagation();
      if (isDirectory) {
        toggleDirectory(node);
      } else if (isFile) {
        toggleFile(node);
      }
    };

    return (
      <Stack spacing="xs" ml={level * 20}>
        <Card 
          shadow="sm" 
          p="sm"
          onClick={handleClick}
          style={{ cursor: 'pointer' }}
          withBorder
        >
          <Group>
            {isDirectory && (
              <ActionIcon variant="subtle" sx={{ cursor: 'pointer' }}>
                {isExpanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
              </ActionIcon>
            )}
            <Text>{node.name}</Text>
            {isLoading && <Loader size="sm" />}
          </Group>
        </Card>

        {/* If file is expanded, show analysis */}
        {isFile && isExpanded && analysisByPath[node.path] && (
          <Card shadow="sm" p="sm" withBorder ml={20}>
            {renderAnalysis(analysisByPath[node.path])}
          </Card>
        )}

        {/* If directory is expanded, show child nodes */}
        {isDirectory && isExpanded && (
          <Stack spacing="xs">
            {(childrenByPath[node.path] || []).map((child) => (
              <TreeNode key={child.path} node={child} level={level + 1} />
            ))}
          </Stack>
        )}
      </Stack>
    );
  };

  return (
    <Stack p="md">
      <Title order={2}>Repository File Tree</Title>
      {!repoFullName ? (
        <Text>Please select a repository first</Text>
      ) : rootNodes.length > 0 ? (
        rootNodes.map((node) => (
          <TreeNode key={node.path} node={node} level={0} />
        ))
      ) : (
        <Text>Loading file tree...</Text>
      )}
    </Stack>
  );
};

export default FileTreeExplorer;