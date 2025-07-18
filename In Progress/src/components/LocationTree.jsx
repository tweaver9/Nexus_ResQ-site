import React, { useState, useMemo, useCallback } from "react";
import LocationNode from "./LocationNode";
import { buildLocationTree } from "./buildLocationTree";

// Example: assets = [{ id, type, serial_no, location_id, sublocation_id, precisionlocation_id }]
// locations = flat array from Firebase
export default function LocationTree({ locations, assets }) {
  // Build tree structure from flat locations
  const tree = useMemo(() => buildLocationTree(locations), [locations]);
  // Track expanded node id (single expand for demo, can be array for multi-expand)
  const [expandedId, setExpandedId] = useState(null);

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

  // Recursive render
  const renderTree = nodes =>
    nodes.map(node => (
      <div key={node.id} style={{ marginLeft: node.level * 18 }}>
        <LocationNode
          location={node}
          assets={getNodeAssets(node)}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
        />
        {/* Render children if present */}
        {node.children && node.children.length > 0 && renderTree(node.children)}
      </div>
    ));

  return <div>{renderTree(tree)}</div>;
}
