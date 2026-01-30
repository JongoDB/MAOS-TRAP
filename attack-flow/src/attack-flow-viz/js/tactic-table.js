/**
 * Tactic Table Visualization
 * Generates a CISA-style tactic table from attack flow
 */

class TacticTableVisualization {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = options;
        this.parser = null;
    }

    render(parser) {
        this.parser = parser;
        this.container.innerHTML = '';

        const metadata = parser.getFlowMetadata();
        if (metadata) {
            const header = document.createElement('div');
            header.className = 'table-header';
            header.innerHTML = `
                <h3>${this.escapeHtml(metadata.name)}</h3>
                <p>${this.escapeHtml(metadata.description || '')}</p>
            `;
            this.container.appendChild(header);
        }

        const tactics = parser.getTactics();
        
        if (tactics.size === 0) {
            this.container.innerHTML += '<p class="loading">No tactics found in the flow.</p>';
            return;
        }

        const table = this.createTable(tactics);
        this.container.appendChild(table);
    }

    createTable(tactics) {
        const table = document.createElement('table');
        table.className = 'tactic-table';

        // Create header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Tactic</th>
                <th>Technique ID</th>
                <th>Technique Name</th>
                <th>Description</th>
            </tr>
        `;
        table.appendChild(thead);

        // Create body
        const tbody = document.createElement('tbody');
        
        // Sort tactics by a predefined order
        const tacticOrder = [
            'Reconnaissance',
            'Resource Development',
            'Initial Access',
            'Execution',
            'Persistence',
            'Privilege Escalation',
            'Defense Evasion',
            'Credential Access',
            'Discovery',
            'Lateral Movement',
            'Collection',
            'Command and Control',
            'Exfiltration',
            'Impact'
        ];

        const sortedTactics = Array.from(tactics.keys()).sort((a, b) => {
            const indexA = tacticOrder.indexOf(a);
            const indexB = tacticOrder.indexOf(b);
            if (indexA === -1 && indexB === -1) return a.localeCompare(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        sortedTactics.forEach(tactic => {
            const techniques = tactics.get(tactic);
            techniques.forEach((node, index) => {
                const row = document.createElement('tr');
                
                // Only show tactic name on first row for this tactic
                const tacticCell = document.createElement('td');
                if (index === 0) {
                    tacticCell.textContent = tactic;
                    tacticCell.rowSpan = techniques.length;
                    row.appendChild(tacticCell);
                }
                
                const idCell = document.createElement('td');
                const idLink = document.createElement('a');
                idLink.href = `https://attack.mitre.org/techniques/${node.technique_id}/`;
                idLink.target = '_blank';
                idLink.className = 'technique-link';
                idLink.textContent = node.technique_id || 'N/A';
                idCell.appendChild(idLink);
                row.appendChild(idCell);
                
                const nameCell = document.createElement('td');
                nameCell.textContent = node.name || 'Unnamed';
                row.appendChild(nameCell);
                
                const descCell = document.createElement('td');
                descCell.textContent = node.description || '';
                row.appendChild(descCell);
                
                tbody.appendChild(row);
            });
        });

        table.appendChild(tbody);
        return table;
    }

    exportCSV() {
        if (!this.parser) return '';

        const tactics = this.parser.getTactics();
        let csv = 'Tactic,Technique ID,Technique Name,Description\n';

        tactics.forEach((techniques, tactic) => {
            techniques.forEach(node => {
                const row = [
                    tactic,
                    node.technique_id || '',
                    node.name || '',
                    (node.description || '').replace(/"/g, '""')
                ];
                csv += row.map(cell => `"${cell}"`).join(',') + '\n';
            });
        });

        return csv;
    }

    downloadCSV() {
        const csv = this.exportCSV();
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tactic-table.csv';
        a.click();
        URL.revokeObjectURL(url);
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
    module.exports = TacticTableVisualization;
}

