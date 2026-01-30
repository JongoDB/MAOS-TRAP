# Attack Flow Visualizations - Quick Start

## 🚀 Access Now

**URL**: http://localhost/attack-flow-viz/

## 📊 What You Get

### ✅ Timeline View (Priority 1)
Shows attack actions in chronological order with optional timestamps and descriptions.

### ✅ Tactic Table (Priority 2)
CISA-style table grouping techniques by ATT&CK tactics. Export as CSV or PNG.

### ✅ Matrix View (Priority 3)
ATT&CK Matrix highlighting techniques used in your flow. Interactive and exportable.

### ✅ Treemap View (Priority 4)
Visual distribution of techniques by frequency, color-coded by tactic.

## 🎯 Quick Usage

1. **Open**: Navigate to http://localhost/attack-flow-viz/
2. **Upload**: Click "Choose File" → Select Attack Flow JSON
   - OR click "Load Example Flow" for demo
3. **View**: Click tabs to switch visualizations
4. **Export**: Use export buttons to save as PNG/CSV

## 📁 Where to Find Attack Flows

### Example Flows Available:
- `/attack-flow/stix/attack-flow-example.json` - Basic example
- `/attack-flow/corpus/` - 40+ real-world flows including:
  - SolarWinds.afb
  - NotPetya.afb
  - Conti Ransomware.afb
  - CISA advisories
  - APT campaigns

### Create Your Own:
Use the Attack Flow Builder at http://localhost/attack-flow/

## 🎨 Features

- **Offline**: No internet required
- **Local**: All data stays in your environment
- **Fast**: Client-side processing
- **Customizable**: Full source code access
- **Export**: PNG and CSV formats

## 🛠️ Docker Commands

```bash
# Start service
docker-compose up -d attack-flow-viz

# Restart service
docker-compose restart attack-flow-viz

# View logs
docker-compose logs -f attack-flow-viz

# Stop service
docker-compose stop attack-flow-viz

# Rebuild after changes
docker-compose build attack-flow-viz
docker-compose up -d attack-flow-viz
```

## 📂 File Locations

```
/attack-flow/src/attack-flow-viz/
├── index.html              # Main app
├── styles.css              # Styling
├── js/                     # Visualization code
│   ├── parser.js
│   ├── timeline.js
│   ├── tactic-table.js
│   ├── matrix.js
│   └── treemap.js
└── README.md               # Full documentation
```

## 🔧 Customization

Edit files in `/attack-flow/src/attack-flow-viz/` then rebuild:
```bash
docker-compose build attack-flow-viz
docker-compose up -d attack-flow-viz
```

## ❓ Troubleshooting

### Page won't load
```bash
docker-compose ps attack-flow-viz  # Check if running
docker-compose logs nginx | grep attack-flow-viz
```

### JSON parse error
- Verify file is valid STIX 2.1 bundle format
- Check browser console (F12) for details

### Export not working
- Try different browser
- Check for popup blocker
- Verify html2canvas loaded (console)

## 📖 Full Documentation

See: `/home/test/mitre-dco-apps/ATTACK_FLOW_VISUALIZATIONS.md`

## ✨ Quick Wins

### Create Timeline Report:
1. Load attack flow
2. Timeline View tab
3. Toggle options as needed
4. Click "Export as PNG"
5. Use in reports/presentations

### Generate Tactic Table:
1. Load attack flow
2. Tactic Table tab
3. Click "Export as CSV"
4. Open in Excel/Google Sheets
5. Customize as needed

### Show ATT&CK Coverage:
1. Load attack flow
2. Matrix View tab
3. Red cells = techniques used
4. Click cell → ATT&CK docs
5. Export for stakeholder briefing

## 🎯 Next Steps

1. **Try It**: Open http://localhost/attack-flow-viz/
2. **Load Example**: Click "Load Example Flow"
3. **Explore**: Switch between all 4 visualizations
4. **Export**: Save your favorites as PNG
5. **Customize**: Edit code to match your needs

---

**Need Help?** Check the full documentation or review the source code in `/attack-flow/src/attack-flow-viz/`

