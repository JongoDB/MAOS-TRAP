# Attack Flow Visualizations

A comprehensive visualization tool for MITRE ATT&CK Attack Flows, providing four distinct visualization types inspired by the [Center for Threat-Informed Defense](https://center-for-threat-informed-defense.github.io/attack-flow/visualization/).

## Features

### 1. Timeline View (Priority 1)
- Chronological visualization of attack flow actions
- Shows technique sequences in order of execution
- Optional timestamps and descriptions
- Clean, easy-to-read timeline format
- Export to PNG

### 2. Tactic Table (Priority 2)
- CISA-style tactic table generation
- Groups techniques by MITRE ATT&CK tactics
- Links to official ATT&CK documentation
- Export to CSV or PNG

### 3. Matrix View (Priority 3)
- ATT&CK Matrix visualization
- Highlights techniques used in the flow
- Color-coded by presence in flow
- Interactive cells linking to ATT&CK
- Export to PNG

### 4. Treemap View (Priority 4)
- Hierarchical visualization of technique distribution
- Size represents frequency of use
- Color-coded by tactic
- Interactive hover details
- Export to PNG

## Usage

### Upload Attack Flow
1. Click "Choose File" and select an Attack Flow JSON file (STIX 2.1 format)
2. Or click "Load Example Flow" to see a demo

### Switch Visualizations
Click on the tabs at the top to switch between different visualization types:
- Timeline View
- Tactic Table
- Matrix View
- Treemap View

### Export
Each visualization has export options:
- PNG format for images
- CSV format for tables (Tactic Table only)

### Controls

#### Timeline View
- **Show Timestamps**: Toggle to show/hide creation timestamps
- **Show Descriptions**: Toggle to show/hide technique descriptions

#### Tactic Table
- **Export as CSV**: Download table data as CSV
- **Export as PNG**: Download table as image

#### Matrix View
- **Domain**: Select ATT&CK domain (Enterprise, Mobile, ICS)
- **Export as PNG**: Download matrix as image

#### Treemap View
- **Color By**: Choose coloring scheme (Tactic or Frequency)
- **Export as PNG**: Download treemap as image

## File Format

Attack Flow files should be in STIX 2.1 bundle format with Attack Flow extensions:

```json
{
  "type": "bundle",
  "id": "bundle--...",
  "objects": [
    {
      "type": "attack-flow",
      "name": "...",
      "description": "...",
      ...
    },
    {
      "type": "attack-action",
      "technique_id": "T1190",
      "name": "...",
      ...
    }
  ]
}
```

## Technical Details

### Architecture
- Pure client-side JavaScript application
- D3.js for advanced visualizations (treemap)
- HTML5 Canvas for PNG export (html2canvas)
- No backend required - all processing happens in browser

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Edge, Safari)
- JavaScript ES6+ required
- SVG support required for D3.js visualizations

### Dependencies
- D3.js v7
- html2canvas v1.4.1

## Development

### File Structure
```
attack-flow-viz/
├── index.html          # Main HTML file
├── styles.css          # Styling
├── js/
│   ├── parsers/
│   │   └── attack-flow-parser.js # Combined STIX & AFB parser
│   ├── timeline.js               # Timeline visualization
│   ├── tactic-table.js           # Tactic table visualization
│   ├── matrix.js                 # Matrix visualization
│   ├── treemap.js                # Treemap visualization
│   └── main.js                   # Application logic
├── sample-data/
│   ├── afb/                      # Attack Flow Builder sample flows
│   └── stix/                     # STIX 2.1 sample bundles
├── Dockerfile          # Docker container config
└── README.md           # This file
```

### Extending
To add new visualizations:

1. Create a new visualization class in `js/yourViz.js`:
```javascript
class YourVisualization {
    constructor(containerId, options) { ... }
    render(parser) { ... }
    export() { ... }
}
```

2. Add a new tab and panel to `index.html`
3. Initialize in `main.js`:
```javascript
visualizations.yourViz = new YourVisualization('your-content');
```

## Docker Deployment

### Standalone
```bash
cd /path/to/attack-flow/src/attack-flow-viz
docker build -t attack-flow-viz .
docker run -p 8080:80 attack-flow-viz
```

### With Docker Compose (Integrated)
The visualization tool is integrated into the main docker-compose.yml:

```bash
cd /path/to/mitre-dco-apps
docker-compose up -d attack-flow-viz
```

Access at: `http://localhost/attack-flow-viz/`

## Example Flows

The tool includes access to example flows from the Attack Flow repository:
- `/stix/attack-flow-example.json` - Basic example flow
- `/corpus/*.afb` - Real-world attack flows from CISA advisories and threat reports

## Differences from Official Observable Notebooks

This implementation provides:
- **Offline capability**: Runs completely locally without internet
- **Integrated deployment**: Part of your Docker stack
- **Customizable**: Full source code for modifications
- **Unified interface**: All visualizations in one tool

The official Observable notebooks offer:
- **Interactive editing**: Modify visualization code live
- **Cloud hosting**: No local setup required
- **Community features**: Share and fork notebooks

## Credits

- Inspired by [Center for Threat-Informed Defense Attack Flow](https://center-for-threat-informed-defense.github.io/attack-flow/)
- Uses MITRE ATT&CK® framework data
- Built with D3.js and modern web technologies

## License

This tool is part of the MITRE DCO Apps project. See main repository for license information.

## Support

For issues or questions:
1. Check the main Attack Flow documentation
2. Review example flows for proper format
3. Check browser console for error messages
4. Verify JSON file is valid STIX 2.1 format

