/**
 * Enhanced Attack Flow Parser
 * Parses both STIX 2.1 Attack Flow bundles AND .afb (Attack Flow Builder) format
 * Extracts ALL relevant fields: timestamps, tactics, techniques, confidence, etc.
 */

class AttackFlowParser {
    constructor(data) {
        this.rawData = data;
        this.format = this.detectFormat(data);
        this.objects = {};
        this.attackFlow = null;
        this.actions = [];
        this.relationships = [];
        this.assets = [];
        this.conditions = [];
        this.operators = [];
        this.graph = { nodes: [], edges: [] };
        
        // ATT&CK tactic mapping (ID to name)
        this.tacticMap = {
            'TA0043': 'Reconnaissance',
            'TA0042': 'Resource Development',
            'TA0001': 'Initial Access',
            'TA0002': 'Execution',
            'TA0003': 'Persistence',
            'TA0004': 'Privilege Escalation',
            'TA0005': 'Defense Evasion',
            'TA0006': 'Credential Access',
            'TA0007': 'Discovery',
            'TA0008': 'Lateral Movement',
            'TA0009': 'Collection',
            'TA0011': 'Command and Control',
            'TA0010': 'Exfiltration',
            'TA0040': 'Impact',
            // Mobile
            'TA0027': 'Initial Access',
            'TA0041': 'Execution',
            'TA0028': 'Persistence',
            'TA0029': 'Privilege Escalation',
            'TA0030': 'Defense Evasion',
            'TA0031': 'Credential Access',
            'TA0032': 'Discovery',
            'TA0033': 'Lateral Movement',
            'TA0035': 'Collection',
            'TA0037': 'Command and Control',
            'TA0036': 'Exfiltration',
            'TA0034': 'Impact',
            // ICS
            'TA0108': 'Initial Access',
            'TA0104': 'Execution',
            'TA0110': 'Persistence',
            'TA0111': 'Privilege Escalation',
            'TA0103': 'Evasion',
            'TA0102': 'Discovery',
            'TA0109': 'Lateral Movement',
            'TA0100': 'Collection',
            'TA0101': 'Command and Control',
            'TA0107': 'Inhibit Response Function',
            'TA0106': 'Impair Process Control',
            'TA0105': 'Impact'
        };
        
        this.parse();
    }

    detectFormat(data) {
        // Detect if this is Attack Flow STIX bundle or .afb format
        if (data.type === 'bundle' && data.objects) {
            // Must have attack-flow or attack-action objects
            const hasAttackFlow = data.objects.some(obj => obj.type === 'attack-flow');
            const hasAttackAction = data.objects.some(obj => obj.type === 'attack-action');
            
            if (hasAttackFlow || hasAttackAction) {
                return 'attack-flow'; // Attack Flow STIX format (STIX 2.0/2.1 extension)
            } else {
                throw new Error('STIX bundle does not contain Attack Flow objects (attack-flow or attack-action). Please use an Attack Flow file.');
            }
        } else if (data.schema && data.objects) {
            return 'afb'; // Attack Flow Builder format
        }
        throw new Error('Unknown format: Expected Attack Flow STIX bundle or AFB format');
    }

    parse() {
        if (this.format === 'attack-flow') {
            this.parseAttackFlow();
        } else if (this.format === 'afb') {
            this.parseAFB();
        }
        
        // Build the graph structure after parsing
        this.buildGraph();
    }

    parseAttackFlow() {
        // Parse Attack Flow (STIX extension) format
        console.log('Parsing Attack Flow with', this.rawData.objects.length, 'objects');
        
        // First, let's see what types we have
        const typeCounts = {};
        this.rawData.objects.forEach(obj => {
            typeCounts[obj.type] = (typeCounts[obj.type] || 0) + 1;
        });
        console.log('Object types in bundle:', typeCounts);
        
        this.rawData.objects.forEach(obj => {
            this.objects[obj.id] = obj;
            
            if (obj.type === 'attack-flow') {
                this.attackFlow = obj;
                console.log('Found attack-flow:', obj.name);
            } else if (obj.type === 'attack-action') {
                this.actions.push(obj);
            } else if (obj.type === 'relationship') {
                this.relationships.push(obj);
            } else if (obj.type === 'attack-asset') {
                this.assets.push(obj);
            } else if (obj.type === 'attack-condition') {
                this.conditions.push(obj);
            } else if (obj.type === 'attack-operator') {
                this.operators.push(obj);
            }
        });
        
        console.log('Parsed Attack Flow:', {
            flow: this.attackFlow ? this.attackFlow.name : 'none',
            actions: this.actions.length,
            relationships: this.relationships.length,
            conditions: this.conditions.length,
            operators: this.operators.length,
            assets: this.assets.length
        });
        
        if (this.actions.length === 0) {
            console.warn('⚠️ No attack-action objects found! This may not be an Attack Flow file.');
        }
    }


    parseAFB() {
        // Parse .afb (Attack Flow Builder) format
        console.log('Parsing AFB format with', this.rawData.objects.length, 'objects');
        
        const flowObj = this.rawData.objects.find(o => o.id === 'flow');
        
        if (flowObj) {
            // Convert .afb flow to our internal format
            this.attackFlow = {
                name: this.getProperty(flowObj.properties, 'name'),
                description: this.getProperty(flowObj.properties, 'description'),
                scope: this.getProperty(flowObj.properties, 'scope'),
                created: this.getProperty(flowObj.properties, 'created'),
                modified: this.getProperty(flowObj.properties, 'modified'),
                author: this.getProperty(flowObj.properties, 'author'),
                external_references: this.getProperty(flowObj.properties, 'external_references') || []
            };
            console.log('Flow metadata:', this.attackFlow.name);
        }

        // First pass: Parse all action objects
        this.rawData.objects.forEach(obj => {
            if (obj.id === 'action') {
                const action = {
                    id: obj.instance,
                    type: 'attack-action',
                    name: this.getProperty(obj.properties, 'name'),
                    description: this.getProperty(obj.properties, 'description'),
                    technique_id: this.getProperty(obj.properties, 'technique_id'),
                    technique_ref: this.getProperty(obj.properties, 'technique_ref'),
                    tactic_id: this.getProperty(obj.properties, 'tactic_id'),
                    tactic_ref: this.getProperty(obj.properties, 'tactic_ref'),
                    confidence: this.getProperty(obj.properties, 'confidence'),
                    execution_start: this.getProperty(obj.properties, 'execution_start'),
                    execution_end: this.getProperty(obj.properties, 'execution_end'),
                    ttp: this.getProperty(obj.properties, 'ttp'),
                    instance: obj.instance
                };
                this.actions.push(action);
                this.objects[obj.instance] = action;
            } else if (obj.id === 'asset') {
                const asset = {
                    id: obj.instance,
                    type: 'attack-asset',
                    name: this.getProperty(obj.properties, 'name'),
                    description: this.getProperty(obj.properties, 'description')
                };
                this.assets.push(asset);
                this.objects[obj.instance] = asset;
            }
        });

        // Second pass: Parse relationships/edges
        this.rawData.objects.forEach(obj => {
            if (obj.id === 'dynamic_line' || obj.id === 'line') {
                // These represent relationships/edges between actions
                if (obj.source && obj.target) {
                    const relationship = {
                        source: obj.source,
                        target: obj.target,
                        type: obj.id
                    };
                    this.relationships.push(relationship);
                }
            }
        });

        console.log('Parsed AFB:', {
            actions: this.actions.length,
            relationships: this.relationships.length,
            assets: this.assets.length
        });
    }

    getProperty(properties, key) {
        if (!properties || !Array.isArray(properties)) return null;
        const prop = properties.find(p => Array.isArray(p) && p[0] === key);
        if (!prop) return null;
        
        // Handle nested property arrays (like author)
        const value = prop[1];
        if (Array.isArray(value) && value.length > 0 && Array.isArray(value[0])) {
            // This is a nested property object, convert to simple object
            const obj = {};
            value.forEach(nestedProp => {
                if (Array.isArray(nestedProp) && nestedProp.length >= 2) {
                    obj[nestedProp[0]] = nestedProp[1];
                }
            });
            return obj;
        }
        
        return value;
    }

    buildGraph() {
        const nodes = [];
        const edges = [];
        const nodeMap = new Map();

        // Add all attack-action nodes with enhanced fields
        this.actions.forEach((action, index) => {
            // Infer tactic from kill_chain_phases if not present
            let tacticName = this.tacticMap[action.tactic_id] || 'Unknown';
            let tacticId = action.tactic_id;
            
            if (action.kill_chain_phases && action.kill_chain_phases.length > 0) {
                const phaseName = action.kill_chain_phases[0].phase_name;
                tacticName = phaseName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                // Try to find tactic ID from phase name
                for (const [tid, tname] of Object.entries(this.tacticMap)) {
                    if (tname.toLowerCase() === tacticName.toLowerCase()) {
                        tacticId = tid;
                        break;
                    }
                }
            }
            
            const node = {
                id: action.id || action.instance,
                type: 'attack-action',
                technique_id: action.technique_id,
                technique_ref: action.technique_ref,
                tactic_id: tacticId,
                tactic_ref: action.tactic_ref,
                tactic_name: tacticName,
                name: action.name,
                description: action.description,
                created: action.created,
                modified: action.modified,
                confidence: action.confidence || 'certain',
                execution_start: action.execution_start,
                execution_end: action.execution_end,
                ttp: action.ttp,
                sequence: index,
                children: [],
                stix_type: action.stix_type,
                kill_chain_phases: action.kill_chain_phases
            };
            nodes.push(node);
            nodeMap.set(node.id, node);
        });

        // Build edges based on format
        if (this.format === 'attack-flow') {
            this.buildAttackFlowEdges(nodeMap, edges);
        } else if (this.format === 'afb') {
            this.buildAFBEdges(nodeMap, edges);
        }

        this.graph = { nodes, edges };
    }

    buildAttackFlowEdges(nodeMap, edges) {
        console.log('Building Attack Flow edges from', this.actions.length, 'actions');
        
        // Build edges from effect_refs - follow the chain through conditions/operators
        this.actions.forEach(action => {
            if (action.effect_refs) {
                action.effect_refs.forEach(effectRef => {
                    const effectNode = this.objects[effectRef];
                    if (effectNode) {
                        this.followEffectChain(action.id, effectNode, edges, nodeMap);
                    }
                });
            }
        });

        // Add edges from relationships (connects actions to other STIX objects)
        this.relationships.forEach(rel => {
            const source = nodeMap.get(rel.source_ref);
            const target = nodeMap.get(rel.target_ref);
            if (source && target) {
                edges.push({ source: source.id, target: target.id });
                if (!source.children.includes(target.id)) {
                    source.children.push(target.id);
                }
            }
        });
        
        console.log('Built', edges.length, 'edges');
    }
    

    buildAFBEdges(nodeMap, edges) {
        // Build edges from .afb relationships
        this.relationships.forEach(rel => {
            const source = nodeMap.get(rel.source);
            const target = nodeMap.get(rel.target);
            if (source && target) {
                edges.push({ source: source.id, target: target.id });
                if (!source.children.includes(target.id)) {
                    source.children.push(target.id);
                }
            }
        });
    }

    followEffectChain(sourceId, effectNode, edges, nodeMap) {
        // Follow conditions and operators to find the next action
        if (!effectNode) {
            console.warn('Missing effect node for source:', sourceId);
            return;
        }
        
        if (effectNode.type === 'attack-condition') {
            // Conditions have on_true_refs pointing to next step
            if (effectNode.on_true_refs) {
                effectNode.on_true_refs.forEach(ref => {
                    const nextNode = this.objects[ref];
                    if (nextNode) {
                        this.followEffectChain(sourceId, nextNode, edges, nodeMap);
                    }
                });
            }
            // Some conditions may have on_false_refs too
            if (effectNode.on_false_refs) {
                effectNode.on_false_refs.forEach(ref => {
                    const nextNode = this.objects[ref];
                    if (nextNode) {
                        this.followEffectChain(sourceId, nextNode, edges, nodeMap);
                    }
                });
            }
        } else if (effectNode.type === 'attack-operator') {
            // Operators (AND/OR) have effect_refs pointing to next actions
            if (effectNode.effect_refs) {
                effectNode.effect_refs.forEach(ref => {
                    const nextNode = this.objects[ref];
                    if (nextNode) {
                        this.followEffectChain(sourceId, nextNode, edges, nodeMap);
                    }
                });
            }
        } else if (effectNode.type === 'attack-action') {
            // Found a target action - create the edge
            const source = nodeMap.get(sourceId);
            const target = nodeMap.get(effectNode.id);
            if (source && target) {
                edges.push({ source: sourceId, target: effectNode.id });
                if (!source.children.includes(effectNode.id)) {
                    source.children.push(effectNode.id);
                }
            }
        }
    }

    getActionSequence() {
        // Perform a topological sort to get the sequence
        const visited = new Set();
        const sequence = [];
        const nodeMap = new Map(this.graph.nodes.map(n => [n.id, n]));

        const visit = (nodeId) => {
            if (visited.has(nodeId)) return;
            visited.add(nodeId);

            const node = nodeMap.get(nodeId);
            if (node && node.children) {
                node.children.forEach(childId => visit(childId));
            }

            sequence.unshift(node);
        };

        // Start from the start_refs in the attack flow if available
        if (this.attackFlow && this.attackFlow.start_refs) {
            this.attackFlow.start_refs.forEach(startRef => {
                const startNode = this.objects[startRef];
                if (startNode && startNode.type === 'attack-action') {
                    visit(startRef);
                }
            });
        }

        // For .afb format, find nodes without incoming edges
        if (this.format === 'afb' || sequence.length === 0) {
            const nodesWithIncoming = new Set();
            this.graph.edges.forEach(edge => nodesWithIncoming.add(edge.target));
            
            const startNodes = this.graph.nodes.filter(n => !nodesWithIncoming.has(n.id));
            startNodes.forEach(node => visit(node.id));
        }

        // Visit any remaining unvisited nodes
        this.graph.nodes.forEach(node => {
            if (!visited.has(node.id)) {
                visit(node.id);
            }
        });

        return sequence.filter(n => n !== undefined);
    }

    getTactics() {
        // Extract unique tactics from actions with full details
        const tactics = new Map();
        
        this.graph.nodes.forEach(node => {
            if (node.technique_id) {
                const tacticName = node.tactic_name || this.inferTactic(node.technique_id);
                if (!tactics.has(tacticName)) {
                    tactics.set(tacticName, []);
                }
                tactics.get(tacticName).push(node);
            }
        });

        return tactics;
    }

    inferTactic(techniqueId) {
        // Fallback tactic inference when tactic_id is not provided
        if (!techniqueId) return 'Unknown';
        
        // Try to infer from technique ID pattern
        const firstChar = techniqueId.charAt(1);
        const tacticMap = {
            '0': 'Initial Access',
            '1': 'Execution',
            '2': 'Persistence',
            '3': 'Privilege Escalation',
            '4': 'Defense Evasion',
            '5': 'Credential Access',
            '6': 'Discovery',
            '7': 'Lateral Movement',
            '8': 'Collection',
            '9': 'Exfiltration'
        };
        return tacticMap[firstChar] || 'Unknown';
    }

    getTechniqueCounts() {
        // Count occurrences of each technique
        const counts = new Map();
        
        this.graph.nodes.forEach(node => {
            if (node.technique_id) {
                const current = counts.get(node.technique_id) || 0;
                counts.set(node.technique_id, current + 1);
            }
        });

        return counts;
    }

    getFlowMetadata() {
        if (!this.attackFlow) return null;

        return {
            name: this.attackFlow.name,
            description: this.attackFlow.description,
            scope: this.attackFlow.scope,
            created: this.attackFlow.created,
            modified: this.attackFlow.modified,
            author: this.attackFlow.author,
            externalReferences: this.attackFlow.external_references || [],
            format: this.format,
            actionCount: this.actions.length,
            relationshipCount: this.relationships.length
        };
    }

    getDetailedStats() {
        // Return comprehensive statistics
        const techniques = new Set();
        const tactics = new Set();
        const confidenceLevels = {};
        
        this.graph.nodes.forEach(node => {
            if (node.technique_id) techniques.add(node.technique_id);
            if (node.tactic_name) tactics.add(node.tactic_name);
            if (node.confidence) {
                confidenceLevels[node.confidence] = (confidenceLevels[node.confidence] || 0) + 1;
            }
        });

        return {
            totalActions: this.actions.length,
            uniqueTechniques: techniques.size,
            uniqueTactics: tactics.size,
            confidenceLevels: confidenceLevels,
            hasTimestamps: this.graph.nodes.some(n => n.execution_start || n.created),
            format: this.format
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AttackFlowParser;
}
