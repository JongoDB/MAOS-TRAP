/**
 * Main Application Logic
 * Handles file uploads, tab switching, and visualization coordination
 */

// Global state
let currentParser = null;
let visualizations = {};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Initialize visualizations
    visualizations.timeline = new TimelineVisualization('timeline-content');
    visualizations.tacticTable = new TacticTableVisualization('tactic-table-content');
    visualizations.matrix = new MatrixVisualization('matrix-content');
    visualizations.treemap = new TreemapVisualization('treemap-content');

    // Setup event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // File upload
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);

    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            switchTab(e.target.dataset.viz);
        });
    });

    // Timeline controls
    document.getElementById('showTimestamps')?.addEventListener('change', (e) => {
        visualizations.timeline.updateOptions({ showTimestamps: e.target.checked });
    });

    document.getElementById('showDescriptions')?.addEventListener('change', (e) => {
        visualizations.timeline.updateOptions({ showDescriptions: e.target.checked });
    });

    document.getElementById('exportTimeline')?.addEventListener('click', () => {
        exportVisualization('timeline', 'timeline-view.png');
    });

    // Tactic Table controls
    document.getElementById('exportTable')?.addEventListener('click', () => {
        visualizations.tacticTable.downloadCSV();
    });

    document.getElementById('exportTablePNG')?.addEventListener('click', () => {
        exportVisualization('tacticTable', 'tactic-table.png');
    });

    // Matrix controls
    document.getElementById('matrixDomain')?.addEventListener('change', (e) => {
        visualizations.matrix.updateDomain(e.target.value);
    });

    document.getElementById('exportMatrix')?.addEventListener('click', () => {
        exportVisualization('matrix', 'matrix-view.png');
    });

    // Treemap controls
    document.getElementById('treemapColorBy')?.addEventListener('change', (e) => {
        visualizations.treemap.updateColorScheme(e.target.value);
    });

    document.getElementById('exportTreemap')?.addEventListener('click', () => {
        exportVisualization('treemap', 'treemap-view.png');
    });
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const json = JSON.parse(e.target.result);
            
            // Check file format
            if (fileName.endsWith('.afb') || json.schema) {
                console.log('Detected Attack Flow Builder (.afb) format');
            } else if (fileName.endsWith('.json') && json.type === 'bundle') {
                console.log('Detected Attack Flow STIX bundle format');
            }
            
            loadAttackFlow(json);
        } catch (error) {
            showError(`Error parsing file: ${error.message}`);
            console.error(error);
        }
    };
    reader.readAsText(file);
}

function loadAttackFlow(data) {
    try {
        hideError();
        
        // Parse the attack flow (handles both STIX and .afb formats)
        currentParser = new AttackFlowParser(data);
        
        // Log statistics
        const stats = currentParser.getDetailedStats();
        console.log('Attack Flow Statistics:', stats);
        console.log('Format:', stats.format);
        console.log('Actions:', stats.totalActions);
        console.log('Unique Techniques:', stats.uniqueTechniques);
        console.log('Unique Tactics:', stats.uniqueTactics);
        
        // Render all visualizations
        visualizations.timeline.render(currentParser);
        visualizations.tacticTable.render(currentParser);
        visualizations.matrix.render(currentParser);
        visualizations.treemap.render(currentParser);

        // Show success message with stats
        const metadata = currentParser.getFlowMetadata();
        if (metadata && metadata.name) {
            showSuccess(`Loaded "${metadata.name}" - ${stats.totalActions} actions, ${stats.uniqueTechniques} techniques`);
        } else {
            showSuccess(`Loaded ${stats.totalActions} actions, ${stats.uniqueTechniques} techniques, ${stats.uniqueTactics} tactics`);
        }
        
        // Warn if no actions found
        if (stats.totalActions === 0) {
            showError('No attack actions found in file. Check console for details.');
        }
    } catch (error) {
        showError(`Error processing Attack Flow: ${error.message}`);
        console.error(error);
    }
}

function switchTab(vizName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    document.querySelector(`[data-viz="${vizName}"]`).classList.add('active');

    // Update panels
    document.querySelectorAll('.viz-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    const panelMap = {
        'timeline': 'timeline-viz',
        'tactic-table': 'tactic-table-viz',
        'matrix': 'matrix-viz',
        'treemap': 'treemap-viz'
    };
    
    document.getElementById(panelMap[vizName]).classList.add('active');
}

async function exportVisualization(vizName, filename) {
    try {
        const viz = visualizations[vizName];
        if (!viz || !viz.export) {
            showError('Export not available for this visualization');
            return;
        }

        const dataUrl = await viz.export();
        downloadImage(dataUrl, filename);
        showSuccess(`Exported ${filename} successfully!`);
    } catch (error) {
        showError(`Error exporting visualization: ${error.message}`);
    }
}

function downloadImage(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    errorDiv.style.background = '#ff4444';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 5000);
}

function showSuccess(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    errorDiv.style.background = '#4CAF50';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 3000);
}

function hideError() {
    document.getElementById('error-message').classList.add('hidden');
}

