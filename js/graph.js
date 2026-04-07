// D3 Graph Visualization for Referral Network

const renderGraph = (patients, relations, containerId, timeFilter = 'all') => {
    const container = document.getElementById(containerId);
    container.innerHTML = ""; // Clear existing

    if (!container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Filter relations based on time
    let filteredRelations = relations;
    const now = new Date("2024-04-07"); // Simulation current date based on mock data
    
    if (timeFilter === '1y') {
        filteredRelations = relations.filter(r => {
            const diffTime = Math.abs(now - new Date(r.date));
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 365;
        });
    } else if (timeFilter === '6m') {
        filteredRelations = relations.filter(r => {
            const diffTime = Math.abs(now - new Date(r.date));
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 180;
        });
    }

    // Identify which nodes are present in the filtered graph
    // Include all patients but node sizes will reflect connection count
    const nodes = patients.map(p => ({
        id: p.id,
        name: p.name,
        val: 1 // Base radius
    }));

    const links = filteredRelations.map(r => ({
        source: r.source,
        target: r.target,
        type: r.type
    }));

    // Calculate node weight (Hub impact) based on OUTGOING + INCOMING referrals
    links.forEach(link => {
        const sourceNode = nodes.find(n => n.id === link.source);
        const targetNode = nodes.find(n => n.id === link.target);
        if (sourceNode) sourceNode.val += 2; // Source gets more weight for introducing
        if (targetNode) targetNode.val += 0.5;
    });

    // Setup SVG
    const svg = d3.select(`#${containerId}`)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .call(d3.zoom().on("zoom", (event) => {
            g.attr("transform", event.transform);
        }))
        .append("g");

    const g = svg.append("g");

    // Simulation
    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius(d => d.val * 3 + 10).iterations(2));

    // Colors
    const getEdgeColor = (type) => type === 'family' ? 'rgba(59, 130, 246, 0.6)' : 'rgba(16, 185, 129, 0.6)';

    // Edges
    const link = g.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(links)
        .enter().append("line")
        .attr("class", "link")
        .attr("stroke-width", 2)
        .attr("stroke", d => getEdgeColor(d.type));

    // Nodes
    const node = g.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("class", "node")
        .attr("r", d => 10 + Math.sqrt(d.val) * 5)
        .attr("fill", d => d.val > 3 ? "#4F46E5" : "#94A3B8") // Highlight hubs
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    // Node Labels
    const labels = g.append("g")
        .attr("class", "labels")
        .selectAll("text")
        .data(nodes)
        .enter().append("text")
        .attr("class", "node-label")
        .attr("dx", 15)
        .attr("dy", 4)
        .text(d => d.val > 2 ? d.name : ""); // Only show names for hubs or connected nodes

    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        labels
            .attr("x", d => d.x)
            .attr("y", d => d.y);
    });

    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
};

window.DentalGraph = { render: renderGraph };
