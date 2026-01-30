/**
 * Treemap Visualization
 * Shows technique distribution across attack flows using a treemap
 */

class TreemapVisualization {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            colorBy: options.colorBy || 'tactic',
            width: options.width || 1200,
            height: options.height || 600,
            ...options
        };
        this.parser = null;

        // Color schemes
        this.tacticColors = {
            'Reconnaissance': '#8B4513',
            'Resource Development': '#D2691E',
            'Initial Access': '#FF6347',
            'Execution': '#FF8C00',
            'Persistence': '#FFD700',
            'Privilege Escalation': '#ADFF2F',
            'Defense Evasion': '#00FF00',
            'Credential Access': '#00CED1',
            'Discovery': '#1E90FF',
            'Lateral Movement': '#9370DB',
            'Collection': '#FF1493',
            'Command and Control': '#DC143C',
            'Exfiltration': '#8B0000',
            'Impact': '#000000',
            'Unknown': '#808080'
        };
    }

    render(parser) {
        this.parser = parser;
        this.container.innerHTML = '';

        const metadata = parser.getFlowMetadata();
        if (metadata) {
            const header = document.createElement('div');
            header.className = 'treemap-header';
            header.innerHTML = `
                <h3>${this.escapeHtml(metadata.name)}</h3>
                <p>${this.escapeHtml(metadata.description || '')}</p>
            `;
            this.container.appendChild(header);
        }

        const techniqueCounts = parser.getTechniqueCounts();
        const tactics = parser.getTactics();

        if (techniqueCounts.size === 0) {
            this.container.innerHTML += '<p class="loading">No techniques found in the flow.</p>';
            return;
        }

        // Prepare data for treemap
        const data = this.prepareTreemapData(tactics, techniqueCounts);
        
        // Create D3 treemap
        this.createD3Treemap(data);
    }

    prepareTreemapData(tactics, counts) {
        const children = [];

        tactics.forEach((techniques, tactic) => {
            const tacticGroup = {
                name: tactic,
                children: []
            };

            techniques.forEach(node => {
                const count = counts.get(node.technique_id) || 1;
                tacticGroup.children.push({
                    name: node.technique_id,
                    fullName: node.name,
                    description: node.description,
                    tactic: tactic,
                    value: count
                });
            });

            if (tacticGroup.children.length > 0) {
                children.push(tacticGroup);
            }
        });

        return {
            name: 'Attack Flow',
            children: children
        };
    }

    createD3Treemap(data) {
        const width = this.options.width;
        const height = this.options.height;

        // Create SVG
        const svg = d3.select(this.container)
            .append('svg')
            .attr('width', '100%')
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        // Create hierarchy
        const root = d3.hierarchy(data)
            .sum(d => d.value || 0)
            .sort((a, b) => b.value - a.value);

        // Create treemap layout
        const treemap = d3.treemap()
            .size([width, height])
            .paddingInner(2)
            .paddingOuter(4)
            .paddingTop(20);

        treemap(root);

        // Create tooltip
        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('display', 'none');

        // Create groups for each tactic
        const groups = svg.selectAll('g')
            .data(root.children)
            .join('g')
            .attr('transform', d => `translate(${d.x0},${d.y0})`);

        // Add tactic labels
        groups.append('text')
            .attr('x', 5)
            .attr('y', 15)
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .style('fill', '#333')
            .text(d => d.data.name);

        // Add technique rectangles
        const cells = groups.selectAll('rect')
            .data(d => d.children || [])
            .join('rect')
            .attr('x', d => d.x0 - d.parent.x0)
            .attr('y', d => d.y0 - d.parent.y0)
            .attr('width', d => Math.max(0, d.x1 - d.x0))
            .attr('height', d => Math.max(0, d.y1 - d.y0))
            .attr('fill', d => {
                const tactic = d.data.tactic;
                return this.tacticColors[tactic] || this.tacticColors['Unknown'];
            })
            .attr('opacity', 0.8)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => {
                d3.select(event.currentTarget)
                    .attr('opacity', 1);
                
                tooltip
                    .style('display', 'block')
                    .html(`
                        <strong>${d.data.name}</strong><br/>
                        ${d.data.fullName}<br/>
                        <em>Count: ${d.data.value}</em>
                        ${d.data.description ? '<br/>' + d.data.description.substring(0, 100) + '...' : ''}
                    `);
            })
            .on('mousemove', (event) => {
                tooltip
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY + 10) + 'px');
            })
            .on('mouseout', (event) => {
                d3.select(event.currentTarget)
                    .attr('opacity', 0.8);
                tooltip.style('display', 'none');
            })
            .on('click', (event, d) => {
                window.open(`https://attack.mitre.org/techniques/${d.data.name}/`, '_blank');
            });

        // Add technique labels
        groups.selectAll('text.technique-label')
            .data(d => (d.children || []).filter(c => {
                const width = c.x1 - c.x0;
                const height = c.y1 - c.y0;
                return width > 60 && height > 30;
            }))
            .join('text')
            .attr('class', 'technique-label')
            .attr('x', d => (d.x0 + d.x1) / 2 - d.parent.x0)
            .attr('y', d => (d.y0 + d.y1) / 2 - d.parent.y0 - 5)
            .attr('text-anchor', 'middle')
            .style('fill', '#fff')
            .style('font-size', '11px')
            .style('font-weight', '600')
            .style('pointer-events', 'none')
            .text(d => d.data.name);

        // Add count labels
        groups.selectAll('text.count-label')
            .data(d => (d.children || []).filter(c => {
                const width = c.x1 - c.x0;
                const height = c.y1 - c.y0;
                return width > 60 && height > 30;
            }))
            .join('text')
            .attr('class', 'count-label')
            .attr('x', d => (d.x0 + d.x1) / 2 - d.parent.x0)
            .attr('y', d => (d.y0 + d.y1) / 2 - d.parent.y0 + 10)
            .attr('text-anchor', 'middle')
            .style('fill', '#fff')
            .style('font-size', '10px')
            .style('pointer-events', 'none')
            .text(d => `(${d.data.value})`);
    }

    updateColorScheme(colorBy) {
        this.options.colorBy = colorBy;
        if (this.parser) {
            this.render(this.parser);
        }
    }

    export() {
        if (typeof html2canvas !== 'undefined') {
            return html2canvas(this.container).then(canvas => {
                return canvas.toDataURL('image/png');
            });
        }
        return Promise.reject('Export library not available');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TreemapVisualization;
}

