// client/src/components/FileTreeExplorer.jsx

import React, { useState, useEffect } from "react";

const FileTreeExplorer = () => {
  // Tracks top-level nodes from GitHub
  const [rootNodes, setRootNodes] = useState([]);

  // Keeps track of which paths are “expanded” (for directories) or “open” (for files)
  const [expandedPaths, setExpandedPaths] = useState({}); // e.g. { "src/components": true }
  // Holds children for each directory path once loaded
  const [childrenByPath, setChildrenByPath] = useState({});
  // Holds analysis for each file path
  const [analysisByPath, setAnalysisByPath] = useState({});

  // Fetch repository root contents on mount
  useEffect(() => {
    fetch("/api/github/list-files/techx/plume?path=")
      .then((response) => response.json())
      .then((data) => setRootNodes(data))
      .catch((error) => console.error("Error fetching root file tree:", error));
  }, []);

  // Expand or collapse a directory. If expanding for the first time, fetch its children.
  const toggleDirectory = async (node) => {
    // If not yet expanded, fetch children
    const isCurrentlyExpanded = expandedPaths[node.path];
    if (!isCurrentlyExpanded && !childrenByPath[node.path]) {
      try {
        const response = await fetch(
          `/api/github/list-files/techx/plume?path=${encodeURIComponent(node.path)}`
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

  // Fetch file analysis if we haven’t yet, then toggle “expanded” for the file
  const toggleFile = async (node) => {
    const isCurrentlyExpanded = expandedPaths[node.path];
    if (!analysisByPath[node.path] && !isCurrentlyExpanded) {
      // If we’ve never fetched analysis for this file, do so
      try {
        const fileRes = await fetch(
          `/api/github/get-file/techx/plume?path=${encodeURIComponent(node.path)}`
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
      }
    }

    // Toggle file’s “expanded” state
    setExpandedPaths((prev) => ({
      ...prev,
      [node.path]: !prev[node.path],
    }));
  };

  // Renders file analysis
  const renderAnalysis = (analysis) => (
    <div style={{ lineHeight: "1.5em" }}>
      {Object.entries(analysis).map(([key, value]) => (
        <div key={key}>
          <strong>{formatKey(key)}:</strong> {String(value)}
        </div>
      ))}
    </div>
  );

  // Helper to format snake_case keys to “Snake Case”
  const formatKey = (key) =>
    key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

  // Recursive node component
  const TreeNode = ({ node, level = 0 }) => {
    if (node.name.startsWith(".")) return null; // Skip hidden files/folders
    const isDirectory = node.type === "dir" || node.type === "folder";
    const isFile = node.type === "file";

    // Check if currently expanded
    const isExpanded = !!expandedPaths[node.path];

    // Decide how to handle a click
    const handleClick = (e) => {
      e.stopPropagation();
      if (isDirectory) {
        toggleDirectory(node);
      } else if (isFile) {
        toggleFile(node);
      }
    };

    // Render children for a directory if expanded
    let children = null;
    if (isDirectory && isExpanded) {
      const dirChildren = childrenByPath[node.path] || [];
      children = (
        <div style={{ marginLeft: 20, marginTop: "5px" }}>
          {dirChildren.map((child) => (
            <TreeNode key={child.path} node={child} level={level + 1} />
          ))}
        </div>
      );
    }

    // Render file analysis if expanded
    let fileAnalysis = null;
    if (isFile && isExpanded && analysisByPath[node.path]) {
      fileAnalysis = (
        <div
          style={{
            marginLeft: 20,
            marginTop: "5px",
            backgroundColor: "#f9f9f9",
            padding: "5px",
            border: "1px solid #ddd",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {renderAnalysis(analysisByPath[node.path])}
        </div>
      );
    }

    return (
      <div style={{ marginLeft: level * 20, marginBottom: "5px" }}>
        {/* Node header */}
        <div
          style={{
            padding: "8px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            backgroundColor: isDirectory ? "#e0f7fa" : "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
          onClick={handleClick}
        >
          {/* Directory toggle arrows */}
          {isDirectory && (
            <span style={{ marginRight: "8px", fontSize: "18px" }}>
              {isExpanded ? "▼" : "►"}
            </span>
          )}
          <span>{node.name}</span>
        </div>

        {/* If file is expanded, show analysis */}
        {fileAnalysis}

        {/* If directory is expanded, show child nodes */}
        {children}
      </div>
    );
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>
        Repository File Tree
      </h2>
      {rootNodes.length > 0 ? (
        rootNodes.map((node) => (
          <TreeNode key={node.path} node={node} level={0} />
        ))
      ) : (
        <div>Loading file tree...</div>
      )}
    </div>
  );
};

export default FileTreeExplorer;
