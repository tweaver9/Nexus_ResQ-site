// Utility to transform flat location array into a nested tree structure
// Usage: const tree = buildLocationTree(locationsArray);

export function buildLocationTree(locations) {
  // Map each location by id
  const nodeMap = {};
  locations.forEach(loc => {
    nodeMap[loc.id] = { ...loc, children: [] };
  });
  // Build tree
  const tree = [];
  locations.forEach(loc => {
    if (loc.parentId && nodeMap[loc.parentId]) {
      nodeMap[loc.parentId].children.push(nodeMap[loc.id]);
    } else {
      tree.push(nodeMap[loc.id]);
    }
  });
  return tree; // Array of root nodes, each with children recursively
}

// Example usage in your parent tree/list component:
// import { buildLocationTree } from './buildLocationTree';
// const tree = useMemo(() => buildLocationTree(locations), [locations]);
// Then recursively render each node and its children.
