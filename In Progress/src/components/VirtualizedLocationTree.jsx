import React, { useState, useMemo, useCallback } from "react";
import { FixedSizeList as List } from "react-window";
import LocationNode from "./LocationNode";
import { buildLocationTree } from "./buildLocationTree";

// Flattens tree to a list for virtualization
function flattenTree(nodes, expandedId, depth = 0) {
  let result = [];
  nodes.forEach(node => {
    result.push({ node, depth });
    // Only show children if parent is expanded
    if (node.children && node.children.length > 0 && expandedId === node.id) {
      result = result.concat(flattenTree(node.children, expandedId, depth + 1));
    }
  });
  return result;
}

export default function VirtualizedLocationTree({ locations, assets, height = 600, rowHeight = 64 }) {
  // Build tree structure from flat locations
  const tree = useMemo(() => buildLocationTree(locations), [locations]);
  // Track expanded node id (single expand for demo)
  const [expandedId, setExpandedId] = useState(null);

  // Flatten tree for virtualization
  const flatList = useMemo(() => flattenTree(tree, expandedId), [tree, expandedId]);

  // Helper: get assets for a location node
  const getNodeAssets = useCallback(
    node => {
      return assets.filter(
        a =>
          a.location_id === node.id ||
          a.sublocation_id === node.id ||
          a.precisionlocation_id === node.id
      );
    },
    [assets]
  );

  // Row renderer for react-window
  const Row = ({ index, style }) => {
    const { node, depth } = flatList[index];
    return (
      <div style={{ ...style, marginLeft: depth * 18 }}>
        <LocationNode
          location={node}
          assets={getNodeAssets(node)}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
        />
      </div>
    );
  };

  return (
    <List
      height={height}
      itemCount={flatList.length}
      itemSize={rowHeight}
      width={"100%"}
      overscanCount={6}
    >
      {Row}
    </List>
  );
}
