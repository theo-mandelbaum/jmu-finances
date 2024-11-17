import * as d3 from 'd3';
import * as d3Sankey from "d3-sankey";

const width = 928;
const height = 600;
const format = d3.format(",.0f");
const linkColor = "source-target"; // source, target, source-target, or a color string.

// Create a SVG container.
const svg = d3.create("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", [0, 0, width, height])
  .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

// Configure Sankey generator.
const sankey = d3Sankey.sankey()
  .nodeId(d => d.name) // Use 'name' as the unique identifier
  .nodeAlign(d3Sankey.sankeyJustify) // d3.sankeyLeft, etc.
  .nodeWidth(15)
  .nodePadding(10)
  .extent([[1, 5], [width - 1, height - 5]]);

// Helper functions to process data into nodes and links.
function generateNodesAndLinks(dataset) {
  let nodes = [];
  let links = [];

  // Generate nodes for income items, categories, JMU, and expenses.
  const incomeItems = dataset["jmu-revenues"]
    .filter(d => ["Nonoperating revenues (expenses)", "Operating revenues", "Other revenues"].includes(d.type))
    .map((d, index) => ({
      name: `incomeItem${index}`,
      value: d.value,
      title: d.name,
      category: "incomeItem"
    }));

  const incomeCategories = dataset["jmu-revenues"]
    .filter(d => ["Operating revenues", "Nonoperating revenues", "Other revenues"].includes(d.type))
    .map((d, index) => ({
      name: `incomeCategory${index}`,
      value: 0, // Default to 0 if not available
      title: d.category,
      category: "incomeCategory"
    }));

  const jmu = {
    name: "JMU",
    value: 0, // Value will be calculated through links
    title: "James Madison University",
    category: "center"
  };

  const expenseCategories = dataset["jmu-revenues"]
    .filter(d => d.type === "Operating expense")
    .map((d, index) => ({
      name: `expenseCategory${index}`,
      value: d.value,
      title: d.name,
      category: "expenseCategory"
    }));

  const expenseItems = dataset["jmu-revenues"]
    .filter(d => d.type === "Operating expense")
    .map((d, index) => ({
      name: `expenseItem${index}`,
      value: 0, // Default to 0 if not available
      title: d.name,
      category: "expenseItem"
    }));

  nodes = [...incomeItems, ...incomeCategories, jmu, ...expenseCategories, ...expenseItems];

  // Generate links based on relationships.
  incomeItems.forEach((item, index) => {
    links.push({
      source: item.name,
      target: incomeCategories[index % incomeCategories.length]?.name,
      value: item.value
    });
  });

  incomeCategories.forEach(category => {
    links.push({
      source: category.name,
      target: jmu.name,
      value: category.value || 0
    });
  });

  expenseCategories.forEach(category => {
    links.push({
      source: jmu.name,
      target: category.name,
      value: category.value
    });
  });

  expenseItems.forEach((item, index) => {
    links.push({
      source: expenseCategories[index % expenseCategories.length]?.name,
      target: item.name,
      value: item.value || 0
    });
  });

  return { nodes, links };
}

async function init() {
  const dataJMU = await d3.json("data/jmu.json");

  // Process data into Sankey nodes and links.
  const { nodes, links } = generateNodesAndLinks(dataJMU);

  // Create Sankey layout.
  const sankeyData = sankey({
    nodes: nodes.map(d => ({ ...d })), // Copy nodes
    links: links.map(d => ({ ...d }))  // Copy links
  });

  console.log('nodes', nodes);
  console.log('links', links);

  // Define color scale.
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  // Create rects for nodes.
  const rect = svg.append("g")
    .attr("stroke", "#000")
    .selectAll("rect")
    .data(sankeyData.nodes)
    .join("rect")
    .attr("x", d => d.x0)
    .attr("y", d => d.y0)
    .attr("height", d => d.y1 - d.y0)
    .attr("width", d => d.x1 - d.x0)
    .attr("fill", d => color(d.category));

  rect.append("title").text(d => `${d.title}\n${format(d.value)}`);

  // Create paths for links.
  const link = svg.append("g")
    .attr("fill", "none")
    .attr("stroke-opacity", 0.5)
    .selectAll("path")
    .data(sankeyData.links)
    .join("path")
    .attr("d", d3Sankey.sankeyLinkHorizontal())
    .attr("stroke", linkColor === "source-target" ? d => `url(#${d.index})` : "#ccc")
    .attr("stroke-width", d => Math.max(1, d.width));

  link.append("title").text(d => `${d.source.title} → ${d.target.title}\n${format(d.value)}`);

  // Add node labels.
  svg.append("g")
    .selectAll("text")
    .data(sankeyData.nodes)
    .join("text")
    .attr("x", d => (d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6))
    .attr("y", d => (d.y0 + d.y1) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", d => (d.x0 < width / 2 ? "start" : "end"))
    .text(d => d.title);

  document.body.appendChild(svg.node());
}

init();
