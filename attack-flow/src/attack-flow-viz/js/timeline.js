/**
 * Enhanced Horizontal Timeline Visualization
 * Chronological left-to-right timeline with time-based axis
 * Stacks simultaneous actions vertically on same branch
 * Requires execution_start timestamps
 */

class TimelineVisualization {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            showTimestamps: options.showTimestamps !== false,
            showDescriptions: options.showDescriptions !== false,
            ...options
        };
        this.parser = null;
        this.svg = null;
        this.zoom = null;
        this.currentZoom = 1;
        
        // Dimensions
        this.margin = { top: 200, right: 40, bottom: 200, left: 80 };
        this.height = 700;
        this.activeTactics = new Set(); // For filtering
        
        // Tactic color scheme
        this.tacticColors = {
            'Reconnaissance': '#8B4513',
            'Resource Development': '#D2691E',
            'Initial Access': '#FF6347',
            'Execution': '#FF8C00',
            'Persistence': '#FFD700',
            'Privilege Escalation': '#ADFF2F',
            'Defense Evasion': '#00FF7F',
            'Credential Access': '#00CED1',
            'Discovery': '#1E90FF',
            'Lateral Movement': '#9370DB',
            'Collection': '#FF1493',
            'Command and Control': '#DC143C',
            'Exfiltration': '#8B0000',
            'Impact': '#000000',
            'Unknown': '#808080'
        };
        
        // Confidence styles
        this.confidenceStyles = {
            'certain': { icon: '●', color: '#4CAF50', label: 'Certain' },
            'probable': { icon: '◐', color: '#FF9800', label: 'Probable' },
            'possible': { icon: '○', color: '#FFC107', label: 'Possible' },
            'null': { icon: '?', color: '#999', label: 'Unknown' }
        };
    }

    render(parser) {
        this.parser = parser;
        this.container.innerHTML = '';

        const metadata = parser.getFlowMetadata();
        if (metadata) {
            this.renderHeader(metadata);
        }

        const sequence = parser.getActionSequence();

        if (sequence.length === 0) {
            this.container.innerHTML += '<p class="loading">No attack actions found in the flow.</p>';
            return;
        }

        // Validate that actions have execution_start timestamps
        const actionsWithTime = sequence.filter(node => node.execution_start);
        
        if (actionsWithTime.length === 0) {
            this.renderNoTimelineMessage(sequence.length);
            return;
        }

        // Warn if some actions missing timestamps
        if (actionsWithTime.length < sequence.length) {
            const missing = sequence.length - actionsWithTime.length;
            this.renderPartialTimelineWarning(missing, sequence.length);
        }

        // Render the horizontal timeline
        this.renderHorizontalTimeline(actionsWithTime);
    }

    renderHeader(metadata) {
        const header = document.createElement('div');
        header.className = 'flow-header';
        header.innerHTML = `
            <h3>${this.escapeHtml(metadata.name)}</h3>
            <p class="flow-description">${this.escapeHtml(metadata.description || '')}</p>
            <div class="flow-meta">
                <span class="badge">${this.escapeHtml(metadata.scope || 'unknown')}</span>
                ${metadata.created ? `<span class="timestamp">Created: ${new Date(metadata.created).toLocaleDateString()}</span>` : ''}
            </div>
        `;
        this.container.appendChild(header);
    }

    renderNoTimelineMessage(totalActions) {
        const message = document.createElement('div');
        message.className = 'timeline-error';
        message.innerHTML = `
            <div style="padding: 40px; text-align: center; background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #856404; margin-bottom: 15px;">⚠️ Timeline View Not Available</h3>
                <p style="color: #856404; line-height: 1.6; margin-bottom: 10px;">
                    This attack flow contains <strong>${totalActions} action${totalActions > 1 ? 's' : ''}</strong> but none have <code>execution_start</code> timestamps.
                </p>
                <p style="color: #856404; line-height: 1.6;">
                    Timeline View requires temporal data to create a chronological visualization.
                    Please use a different visualization type or add execution timestamps to your attack flow.
                </p>
                <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 4px;">
                    <strong>Suggested Alternatives:</strong>
                    <ul style="text-align: left; display: inline-block; margin-top: 10px;">
                        <li>Use <strong>Tactic Table</strong> for organized technique listing</li>
                        <li>Use <strong>Matrix View</strong> for ATT&CK coverage visualization</li>
                        <li>Use <strong>Treemap View</strong> for technique distribution</li>
                    </ul>
                </div>
            </div>
        `;
        this.container.appendChild(message);
    }

    renderPartialTimelineWarning(missing, total) {
        const warning = document.createElement('div');
        warning.className = 'timeline-warning';
        warning.innerHTML = `
            <div style="padding: 15px; background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 6px; margin-bottom: 20px; color: #0c5460;">
                <strong>ℹ️ Note:</strong> ${missing} of ${total} actions are missing execution timestamps and won't appear on the timeline.
            </div>
        `;
        this.container.appendChild(warning);
    }

    renderHorizontalTimeline(actions) {
        // Sort actions by execution_start
        const sortedActions = [...actions].sort((a, b) => {
            return new Date(a.execution_start) - new Date(b.execution_start);
        });

        // Group actions by time (same timestamp = same branch)
        const timeGroups = this.groupByTimestamp(sortedActions);
        
        // Initialize active tactics (all visible by default)
        this.activeTactics = new Set();
        sortedActions.forEach(action => {
            if (action.tactic_name) {
                this.activeTactics.add(action.tactic_name);
            }
        });
        
        // Add tactic filter controls
        this.addTacticFilters(sortedActions);
        
        // Add zoom controls
        const controls = document.createElement('div');
        controls.className = 'timeline-controls';
        controls.innerHTML = `
            <button id="zoomIn" class="zoom-btn">🔍+ Zoom In</button>
            <button id="zoomOut" class="zoom-btn">🔍- Zoom Out</button>
            <button id="zoomReset" class="zoom-btn">⟲ Reset</button>
            <span class="zoom-level">Zoom: <span id="zoomLevel">100%</span></span>
        `;
        this.container.appendChild(controls);
        
        // Create timeline container
        const timelineContainer = document.createElement('div');
        timelineContainer.className = 'horizontal-timeline-container';
        timelineContainer.id = 'timelineContainer';
        
        // Calculate NON-LINEAR spacing based on card density
        // Each branch gets space proportional to its card count
        const branchSpacing = this.calculateNonLinearSpacing(timeGroups);
        const width = Math.max(1400, branchSpacing[branchSpacing.length - 1] + 200);
        
        const svg = d3.select(timelineContainer)
            .append('svg')
            .attr('width', '100%')
            .attr('height', this.height)
            .attr('viewBox', `0 0 ${width + this.margin.left + this.margin.right} ${this.height}`)
            .attr('preserveAspectRatio', 'xMinYMid meet');

        // Add zoom behavior
        const g = svg.append('g')
            .attr('class', 'timeline-zoom-group');

        const zoom = d3.zoom()
            .scaleExtent([0.5, 3])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
                this.currentZoom = event.transform.k;
                document.getElementById('zoomLevel').textContent = `${Math.round(event.transform.k * 100)}%`;
            });

        svg.call(zoom);
        this.zoom = zoom;
        this.svg = svg;

        // Draw main timeline line
        g.append('line')
            .attr('x1', this.margin.left)
            .attr('y1', this.margin.top)
            .attr('x2', width - this.margin.right)
            .attr('y2', this.margin.top)
            .attr('stroke', '#333')
            .attr('stroke-width', 3);

        // Draw each time group (branch) with non-linear spacing
        // Filter groups based on active tactics
        timeGroups.forEach((group, groupIndex) => {
            // Check if any action in this group has an active tactic
            const hasActiveTactic = group.some(action => 
                this.activeTactics.has(action.tactic_name)
            );
            
            if (hasActiveTactic) {
                const xPosition = branchSpacing[groupIndex];
                this.renderTimeBranch(g, group, xPosition, groupIndex, timeGroups);
            }
        });

        this.container.appendChild(timelineContainer);

        // Setup zoom button controls
        this.setupZoomControls();
    }

    groupByTimestamp(actions) {
        const groups = new Map();
        
        actions.forEach(action => {
            const timestamp = action.execution_start;
            if (!groups.has(timestamp)) {
                groups.set(timestamp, []);
            }
            groups.get(timestamp).push(action);
        });

        return Array.from(groups.values());
    }

    calculateNonLinearSpacing(timeGroups) {
        // Calculate spacing for each branch based on card count
        // More cards = more space to prevent overlap
        const baseSpacing = 220; // Base distance for 1 card
        const additionalPerCard = 30; // Extra space per additional card
        const positions = [];
        let currentX = this.margin.left + 100; // Start position
        
        timeGroups.forEach((group, index) => {
            positions.push(currentX);
            // Calculate space needed for this branch
            const cardsInBranch = group.length;
            const spaceNeeded = baseSpacing + (cardsInBranch > 1 ? (cardsInBranch - 1) * additionalPerCard : 0);
            currentX += spaceNeeded;
        });
        
        return positions;
    }

    addTacticFilters(actions) {
        // Check if filter section already exists (prevent duplicates on re-render)
        let filterSection = this.container.querySelector('.tactic-filters');
        if (filterSection) {
            return; // Filters already exist, keep them
        }
        
        // Get unique tactics from actions
        const tactics = new Map();
        actions.forEach(action => {
            if (action.tactic_name && action.tactic_name !== 'Unknown') {
                tactics.set(action.tactic_name, {
                    name: action.tactic_name,
                    color: this.tacticColors[action.tactic_name],
                    count: (tactics.get(action.tactic_name)?.count || 0) + 1
                });
            }
        });

        // Create filter section
        filterSection = document.createElement('div');
        filterSection.className = 'tactic-filters';
        filterSection.innerHTML = '<h4 style="margin: 0 0 10px 0; color: #333;">Filter by Tactic:</h4>';
        
        const filterGrid = document.createElement('div');
        filterGrid.className = 'filter-grid';
        
        // Add "All" checkbox
        const allLabel = document.createElement('label');
        allLabel.className = 'tactic-filter-label';
        allLabel.innerHTML = `
            <input type="checkbox" class="tactic-checkbox" data-tactic="ALL" checked>
            <span class="tactic-filter-text" style="font-weight: 600;">All Tactics (${actions.length})</span>
        `;
        filterGrid.appendChild(allLabel);
        
        // Add checkbox for each tactic
        Array.from(tactics.values()).sort((a, b) => a.name.localeCompare(b.name)).forEach(tactic => {
            const label = document.createElement('label');
            label.className = 'tactic-filter-label';
            label.innerHTML = `
                <input type="checkbox" class="tactic-checkbox" data-tactic="${tactic.name}" checked>
                <span class="tactic-color-dot" style="background: ${tactic.color};"></span>
                <span class="tactic-filter-text">${tactic.name} (${tactic.count})</span>
            `;
            filterGrid.appendChild(label);
        });
        
        filterSection.appendChild(filterGrid);
        this.container.appendChild(filterSection);
        
        // Add event listeners
        setTimeout(() => this.setupFilterListeners(), 100);
    }

    setupFilterListeners() {
        const checkboxes = document.querySelectorAll('.tactic-checkbox');
        const allCheckbox = document.querySelector('[data-tactic="ALL"]');
        
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const tactic = e.target.dataset.tactic;
                
                if (tactic === 'ALL') {
                    // Toggle all
                    const isChecked = e.target.checked;
                    checkboxes.forEach(cb => {
                        cb.checked = isChecked;
                        if (cb.dataset.tactic !== 'ALL') {
                            if (isChecked) {
                                this.activeTactics.add(cb.dataset.tactic);
                            } else {
                                this.activeTactics.delete(cb.dataset.tactic);
                            }
                        }
                    });
                } else {
                    // Toggle individual tactic
                    if (e.target.checked) {
                        this.activeTactics.add(tactic);
                    } else {
                        this.activeTactics.delete(tactic);
                    }
                    
                    // Update "All" checkbox
                    const allTacticCheckboxes = Array.from(checkboxes).filter(cb => cb.dataset.tactic !== 'ALL');
                    const allChecked = allTacticCheckboxes.every(cb => cb.checked);
                    allCheckbox.checked = allChecked;
                }
                
                // Update visualization
                this.filterCards();
            });
        });
    }

    filterCards() {
        // Re-render the timeline with filtered tactics
        if (this.parser) {
            // Clear only the timeline container, keep the filters
            const timelineContainer = document.getElementById('timelineContainer');
            const controls = document.querySelector('.timeline-controls');
            
            if (timelineContainer) {
                timelineContainer.remove();
            }
            if (controls) {
                controls.remove();
            }
            
            // Re-render timeline with current filter settings
            const sequence = this.parser.getActionSequence();
            const actionsWithTime = sequence.filter(node => node.execution_start);
            
            if (actionsWithTime.length > 0) {
                this.renderHorizontalTimeline(actionsWithTime);
            }
        }
    }

    renderTimeBranch(g, actionsInBranch, xPosition, branchIndex, allGroups) {
        const timestamp = new Date(actionsInBranch[0].execution_start);
        const x = xPosition; // Use pre-calculated position instead of scale
        const baseY = this.margin.top;
        const cardHeight = 120; // More compact
        const cardWidth = 200; // More compact
        const verticalSpacing = 30; // More space between cards to prevent collision
        
        // Alternate above/below the axis
        const goesAbove = branchIndex % 2 === 0;
        
        const numCards = actionsInBranch.length;
        const branchHeight = numCards * (cardHeight + verticalSpacing);
        const branchStart = baseY;
        const branchEnd = goesAbove ? baseY - branchHeight - 50 : baseY + branchHeight + 50;

        // Draw vertical branch line (offset slightly to not overlap cards)
        g.append('line')
            .attr('x1', x)
            .attr('y1', branchStart)
            .attr('x2', x)
            .attr('y2', branchEnd)
            .attr('stroke', '#ccc')
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '4,4');

        // Draw marker on main timeline
        g.append('circle')
            .attr('cx', x)
            .attr('cy', baseY)
            .attr('r', 6)
            .attr('fill', '#0055A4')
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .style('filter', 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))');

        // Add timestamp label (positioned to avoid card collision)
        const labelY = goesAbove ? baseY - branchHeight - 70 : baseY + branchHeight + 70;
        const labelBg = g.append('rect')
            .attr('x', x - 60)
            .attr('y', labelY - 14)
            .attr('width', 120)
            .attr('height', 18)
            .attr('rx', 4)
            .attr('fill', 'white')
            .attr('stroke', '#ddd')
            .attr('stroke-width', 1);
        
        g.append('text')
            .attr('x', x)
            .attr('y', labelY)
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('font-weight', 'bold')
            .style('fill', '#333')
            .text(d3.timeFormat('%b %d, %H:%M')(timestamp));

        // Draw count indicator on marker if multiple actions
        if (numCards > 1) {
            g.append('circle')
                .attr('cx', x + 9)
                .attr('cy', baseY - 9)
                .attr('r', 7)
                .attr('fill', '#FF6347')
                .attr('stroke', 'white')
                .attr('stroke-width', 1.5);
            
            g.append('text')
                .attr('x', x + 9)
                .attr('y', baseY - 6)
                .attr('text-anchor', 'middle')
                .style('font-size', '8px')
                .style('font-weight', 'bold')
                .style('fill', 'white')
                .text(numCards);
        }

        // Draw each action in this time branch with proper spacing
        // Filter by active tactics
        const visibleActions = actionsInBranch.filter(action => 
            this.activeTactics.has(action.tactic_name)
        );
        
        visibleActions.forEach((action, actionIndex) => {
            const offset = 60 + (actionIndex * (cardHeight + verticalSpacing));
            const cardY = goesAbove ? baseY - offset - cardHeight : baseY + offset;
            this.renderTimelineCard(g, action, x, cardY, cardWidth, cardHeight, actionIndex + 1, visibleActions.length);
        });
    }

    renderTimelineCard(g, node, x, y, width, height, cardNumber, totalInBranch) {
        const tacticColor = this.tacticColors[node.tactic_name] || this.tacticColors['Unknown'];
        const confidenceKey = node.confidence || 'null';
        const confStyle = this.confidenceStyles[confidenceKey] || this.confidenceStyles['null'];

        // Increased padding to prevent text overflow
        const padding = 8;
        const contentWidth = width - (padding * 2);

        // Create card group
        const card = g.append('g')
            .attr('class', 'timeline-card')
            .attr('transform', `translate(${x - width/2}, ${y})`);

        // Card background with clean bounds
        card.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('rx', 6)
            .attr('fill', 'white')
            .attr('stroke', tacticColor)
            .attr('stroke-width', 2.5)
            .style('filter', 'drop-shadow(0 1px 3px rgba(0,0,0,0.15))');

        // Tactic color bar at top (no rx on this - sharp bottom corners)
        card.append('rect')
            .attr('width', width)
            .attr('height', 5)
            .attr('fill', tacticColor);

        let currentY = 12;

        // Technique ID badge (left side, with padding)
        if (node.technique_id) {
            const techWidth = Math.min(node.technique_id.length * 8 + 8, 70);
            card.append('rect')
                .attr('x', padding)
                .attr('y', currentY)
                .attr('width', techWidth)
                .attr('height', 16)
                .attr('rx', 3)
                .attr('fill', '#0055A4');

            card.append('text')
                .attr('x', padding + techWidth / 2)
                .attr('y', currentY + 12)
                .attr('text-anchor', 'middle')
                .style('font-size', '9px')
                .style('font-weight', 'bold')
                .style('fill', 'white')
                .text(node.technique_id);

            // Clickable area
            card.append('rect')
                .attr('x', padding)
                .attr('y', currentY)
                .attr('width', techWidth)
                .attr('height', 16)
                .attr('fill', 'transparent')
                .style('cursor', 'pointer')
                .on('click', () => {
                    window.open(`https://attack.mitre.org/techniques/${node.technique_id}/`, '_blank');
                });
        }

        // Confidence icon (right side, with padding)
        card.append('text')
            .attr('x', width - padding)
            .attr('y', currentY + 12)
            .attr('text-anchor', 'end')
            .style('font-size', '12px')
            .style('fill', confStyle.color)
            .text(confStyle.icon)
            .append('title')
            .text(confStyle.label);

        currentY += 22;

        // Action name (properly bounded, 2 lines max)
        const name = node.name || 'Unnamed Action';
        const nameLines = this.wrapTextSafe(card, name, padding, currentY, contentWidth, 10, '#222', '700', 2);
        currentY += (nameLines * 13) + 2;

        // Tactic name (compact, bounded)
        if (node.tactic_name && node.tactic_name !== 'Unknown') {
            card.append('text')
                .attr('x', padding)
                .attr('y', currentY + 9)
                .style('font-size', '8px')
                .style('font-weight', '600')
                .style('fill', tacticColor)
                .style('text-transform', 'uppercase')
                .text(this.truncateText(node.tactic_name, contentWidth, 8));
            
            currentY += 14;
        }

        // Description (compact, properly bounded, 2 lines)
        if (node.description) {
            const maxDescChars = Math.floor(contentWidth / 5.5); // Estimate chars per line
            const desc = node.description.substring(0, maxDescChars);
            const descLines = this.wrapTextSafe(card, desc + '...', padding, currentY, contentWidth, 8, '#666', '400', 2);
            currentY += (descLines * 10) + 2;
        }

        // Duration bar (if exists, bounded)
        if (node.execution_end) {
            const duration = this.calculateDuration(node.execution_start, node.execution_end);
            currentY += 2;
            
            card.append('rect')
                .attr('x', padding)
                .attr('y', currentY)
                .attr('width', contentWidth)
                .attr('height', 14)
                .attr('rx', 3)
                .attr('fill', '#e3f2fd');

            card.append('text')
                .attr('x', padding + 4)
                .attr('y', currentY + 10)
                .style('font-size', '8px')
                .style('font-weight', '600')
                .style('fill', '#1976d2')
                .text(`⏲ ${this.truncateText(duration, contentWidth - 20, 8)}`);
        }

        // Card number badge (properly positioned inside card bounds)
        if (totalInBranch > 1) {
            card.append('circle')
                .attr('cx', width - padding - 6)
                .attr('cy', height - padding - 6)
                .attr('r', 7)
                .attr('fill', '#666')
                .attr('stroke', 'white')
                .attr('stroke-width', 1.5);
            
            card.append('text')
                .attr('x', width - padding - 6)
                .attr('y', height - padding - 3)
                .attr('text-anchor', 'middle')
                .style('font-size', '8px')
                .style('font-weight', 'bold')
                .style('fill', 'white')
                .text(cardNumber);
        }

        // Add hover interaction
        card.on('mouseover', () => {
            this.showTooltip(node, x, y);
        }).on('mouseout', () => {
            this.hideTooltip();
        });
    }

    wrapTextSafe(container, text, x, y, maxWidth, fontSize, fill, fontWeight = '600', maxLines = 2) {
        if (!text) return 0;
        
        const words = text.split(/\s+/);
        let lines = [];
        let currentLine = [];
        const lineHeight = fontSize + 3;
        
        // Estimate characters per line based on font size and max width
        const avgCharWidth = fontSize * 0.55;
        const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);

        // Build lines by character count estimation (safer than measuring)
        words.forEach(word => {
            const testLine = [...currentLine, word].join(' ');
            if (testLine.length <= maxCharsPerLine) {
                currentLine.push(word);
            } else {
                if (currentLine.length > 0 && lines.length < maxLines) {
                    lines.push(currentLine.join(' '));
                    currentLine = [word];
                } else if (lines.length < maxLines) {
                    currentLine.push(word);
                }
            }
        });

        // Add remaining line
        if (currentLine.length > 0 && lines.length < maxLines) {
            lines.push(currentLine.join(' '));
        }

        // Add ellipsis to last line if needed
        if (lines.length === maxLines && words.length > currentLine.length + (lines.length * 3)) {
            lines[lines.length - 1] = this.truncateText(lines[lines.length - 1], maxWidth, fontSize) + '...';
        }

        // Render lines
        const textElement = container.append('text')
            .attr('x', x)
            .attr('y', y)
            .style('font-size', fontSize + 'px')
            .style('fill', fill)
            .style('font-weight', fontWeight);

        lines.forEach((line, i) => {
            textElement.append('tspan')
                .attr('x', x)
                .attr('dy', i === 0 ? 0 : lineHeight)
                .text(line);
        });

        return lines.length;
    }
    
    truncateText(text, maxWidth, fontSize) {
        const avgCharWidth = fontSize * 0.55;
        const maxChars = Math.floor(maxWidth / avgCharWidth);
        if (text.length > maxChars) {
            return text.substring(0, maxChars - 3);
        }
        return text;
    }

    showTooltip(node, x, y) {
        // Remove existing tooltip
        d3.select('.timeline-tooltip').remove();

        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'timeline-tooltip tooltip')
            .style('position', 'absolute')
            .style('display', 'block')
            .style('left', (x + 150) + 'px')
            .style('top', (y + 100) + 'px')
            .style('max-width', '400px')
            .style('background', 'rgba(0, 0, 0, 0.95)')
            .style('color', 'white')
            .style('padding', '15px')
            .style('border-radius', '8px')
            .style('font-size', '13px')
            .style('z-index', '10000')
            .style('pointer-events', 'none')
            .style('line-height', '1.6');

        let html = `<div style="font-size: 15px; font-weight: 700; margin-bottom: 8px;">${this.escapeHtml(node.name)}</div>`;
        
        if (node.technique_id) {
            html += `<div style="margin-bottom: 8px;">
                <span style="background: #0055A4; padding: 3px 8px; border-radius: 3px; font-weight: 600;">${node.technique_id}</span>
                ${node.tactic_name ? `<span style="margin-left: 8px; opacity: 0.9;">${node.tactic_name}</span>` : ''}
            </div>`;
        }
        
        if (node.description) {
            const desc = node.description.substring(0, 200);
            html += `<div style="margin: 12px 0; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 12px; opacity: 0.95;">
                ${this.escapeHtml(desc)}${node.description.length > 200 ? '...' : ''}
            </div>`;
        }
        
        // Temporal info
        if (node.execution_start) {
            html += `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.2);">`;
            html += `<div style="font-size: 11px;"><strong>⏱ Started:</strong> ${new Date(node.execution_start).toLocaleString()}</div>`;
            
            if (node.execution_end) {
                const duration = this.calculateDuration(node.execution_start, node.execution_end);
                html += `<div style="font-size: 11px; margin-top: 4px;"><strong>⏹ Ended:</strong> ${new Date(node.execution_end).toLocaleString()}</div>`;
                html += `<div style="font-size: 11px; margin-top: 4px; color: #4CAF50;"><strong>⏲ Duration:</strong> ${duration}</div>`;
            }
            html += '</div>';
        }
        
        // Confidence
        html += `<div style="margin-top: 8px; font-size: 11px;">
            <strong>Confidence:</strong> <span style="color: ${confStyle.color};">${confStyle.label}</span>
        </div>`;

        tooltip.html(html);
    }

    hideTooltip() {
        d3.select('.timeline-tooltip').remove();
    }

    setupZoomControls() {
        document.getElementById('zoomIn')?.addEventListener('click', () => {
            this.svg.transition().call(this.zoom.scaleBy, 1.3);
        });

        document.getElementById('zoomOut')?.addEventListener('click', () => {
            this.svg.transition().call(this.zoom.scaleBy, 0.7);
        });

        document.getElementById('zoomReset')?.addEventListener('click', () => {
            this.svg.transition().call(this.zoom.scaleTo, 1);
        });
    }

    calculateDuration(startStr, endStr) {
        const start = new Date(startStr);
        const end = new Date(endStr);
        const diffMs = end - start;
        
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHrs = Math.floor(diffMin / 60);
        const diffDays = Math.floor(diffHrs / 24);
        
        if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
        if (diffHrs > 0) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''}`;
        if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? 's' : ''}`;
        return `${diffSec} second${diffSec > 1 ? 's' : ''}`;
    }

    updateOptions(options) {
        this.options = { ...this.options, ...options };
        if (this.parser) {
            this.render(this.parser);
        }
    }

    export() {
        // Use html2canvas to export
        if (typeof html2canvas !== 'undefined') {
            return html2canvas(this.container).then(canvas => {
                return canvas.toDataURL('image/png');
            });
        } else {
            console.error('html2canvas library not loaded');
            return Promise.reject('Export library not available');
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimelineVisualization;
}
