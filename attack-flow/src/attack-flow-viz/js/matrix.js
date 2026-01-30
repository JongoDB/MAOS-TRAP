/**
 * Matrix Visualization
 * Generates an ATT&CK matrix view highlighting techniques from the flow
 */

class MatrixVisualization {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            domain: options.domain || 'enterprise',
            ...options
        };
        this.parser = null;

        // Enterprise ATT&CK tactics (14 tactics)
        this.tactics = [
            { id: 'TA0043', name: 'Reconnaissance', short: 'Recon' },
            { id: 'TA0042', name: 'Resource Development', short: 'Resource Dev' },
            { id: 'TA0001', name: 'Initial Access', short: 'Initial Access' },
            { id: 'TA0002', name: 'Execution', short: 'Execution' },
            { id: 'TA0003', name: 'Persistence', short: 'Persistence' },
            { id: 'TA0004', name: 'Privilege Escalation', short: 'Priv Esc' },
            { id: 'TA0005', name: 'Defense Evasion', short: 'Defense Evasion' },
            { id: 'TA0006', name: 'Credential Access', short: 'Cred Access' },
            { id: 'TA0007', name: 'Discovery', short: 'Discovery' },
            { id: 'TA0008', name: 'Lateral Movement', short: 'Lateral Mvmt' },
            { id: 'TA0009', name: 'Collection', short: 'Collection' },
            { id: 'TA0011', name: 'Command and Control', short: 'C2' },
            { id: 'TA0010', name: 'Exfiltration', short: 'Exfiltration' },
            { id: 'TA0040', name: 'Impact', short: 'Impact' }
        ];
    }

    render(parser) {
        this.parser = parser;
        this.container.innerHTML = '';

        const metadata = parser.getFlowMetadata();
        if (metadata) {
            const header = document.createElement('div');
            header.className = 'matrix-header';
            header.innerHTML = `
                <h3>${this.escapeHtml(metadata.name)}</h3>
                <p>${this.escapeHtml(metadata.description || '')}</p>
            `;
            this.container.appendChild(header);
        }

        // Get all techniques from the flow
        const flowTechniques = new Set();
        parser.graph.nodes.forEach(node => {
            if (node.technique_id) {
                flowTechniques.add(node.technique_id);
            }
        });

        if (flowTechniques.size === 0) {
            this.container.innerHTML += '<p class="loading">No techniques found in the flow.</p>';
            return;
        }

        // Create simplified matrix
        const matrixDiv = this.createMatrix(flowTechniques);
        this.container.appendChild(matrixDiv);

        // Create legend
        const legend = this.createLegend(flowTechniques.size);
        this.container.appendChild(legend);
    }

    createMatrix(flowTechniques) {
        const matrixDiv = document.createElement('div');
        matrixDiv.className = 'matrix-grid';
        
        // Set grid columns
        matrixDiv.style.gridTemplateColumns = `repeat(${this.tactics.length}, 1fr)`;

        // Create header row
        this.tactics.forEach(tactic => {
            const cell = document.createElement('div');
            cell.className = 'matrix-cell header';
            cell.textContent = tactic.short;
            cell.title = tactic.name;
            matrixDiv.appendChild(cell);
        });

        // Group techniques by tactic
        const techniquesByTactic = this.groupTechniquesByTactic();

        // Find max techniques in any tactic to determine row count
        let maxRows = 0;
        this.tactics.forEach(tactic => {
            const tacticTechs = techniquesByTactic.get(tactic.name) || [];
            maxRows = Math.max(maxRows, tacticTechs.length);
        });

        // Create rows
        for (let row = 0; row < Math.max(maxRows, 5); row++) {
            this.tactics.forEach(tactic => {
                const tacticTechs = techniquesByTactic.get(tactic.name) || [];
                const technique = tacticTechs[row];

                const cell = document.createElement('div');
                cell.className = 'matrix-cell';

                if (technique) {
                    const isHighlighted = flowTechniques.has(technique.technique_id);
                    
                    if (isHighlighted) {
                        cell.classList.add('highlighted');
                    }

                    cell.textContent = `${technique.technique_id}\n${technique.name}`;
                    cell.title = `${technique.technique_id}: ${technique.name}${technique.description ? '\n\n' + technique.description : ''}`;
                    
                    cell.addEventListener('click', () => {
                        window.open(`https://attack.mitre.org/techniques/${technique.technique_id}/`, '_blank');
                    });
                } else {
                    cell.classList.add('empty');
                }

                matrixDiv.appendChild(cell);
            });
        }

        return matrixDiv;
    }

    groupTechniquesByTactic() {
        const grouped = new Map();
        
        if (!this.parser) return grouped;

        this.parser.graph.nodes.forEach(node => {
            if (node.technique_id) {
                const tactic = this.parser.inferTactic(node.technique_id);
                if (!grouped.has(tactic)) {
                    grouped.set(tactic, []);
                }
                // Avoid duplicates
                if (!grouped.get(tactic).some(t => t.technique_id === node.technique_id)) {
                    grouped.get(tactic).push(node);
                }
            }
        });

        return grouped;
    }

    createLegend(techniqueCount) {
        const legend = document.createElement('div');
        legend.className = 'matrix-legend';
        legend.style.marginTop = '20px';
        legend.style.padding = '15px';
        legend.style.background = '#f9f9f9';
        legend.style.borderRadius = '4px';
        
        legend.innerHTML = `
            <div style="display: flex; gap: 20px; align-items: center;">
                <div><strong>Legend:</strong></div>
                <div style="display: flex; align-items: center; gap: 5px;">
                    <div style="width: 20px; height: 20px; background: #ff6b6b; border-radius: 2px;"></div>
                    <span>Technique used in flow (${techniqueCount} total)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 5px;">
                    <div style="width: 20px; height: 20px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 2px;"></div>
                    <span>Empty cell</span>
                </div>
            </div>
        `;
        
        return legend;
    }

    updateDomain(domain) {
        this.options.domain = domain;
        // Would need to load different tactic lists for mobile/ICS
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
    module.exports = MatrixVisualization;
}

