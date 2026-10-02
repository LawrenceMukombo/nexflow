import { EngineeringGraph, BOQItem, BOQSummary } from '@omniflow/shared-types';
import { CABLE_CATALOG } from './ports';

export function generateNetworkBOQ(
  graph: EngineeringGraph,
  options: {
    currency?: string;
    taxRatePercent?: number;
    contingencyPercent?: number;
  } = {}
): BOQSummary {
  const currency = options.currency || 'USD';
  const taxRatePercent = options.taxRatePercent ?? 15;
  const contingencyPercent = options.contingencyPercent ?? 10;

  const items: BOQItem[] = [];

  // Group components by type & part number
  const componentCounts = new Map<string, { count: number; sampleNode: typeof graph.nodes[string] }>();
  for (const node of Object.values(graph.nodes)) {
    const key = `${node.type}_${node.costData?.partNumber || 'GENERIC'}`;
    const existing = componentCounts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      componentCounts.set(key, { count: 1, sampleNode: node });
    }
  }

  for (const [key, { count, sampleNode }] of componentCounts.entries()) {
    const cost = sampleNode.costData;
    const unitCost = cost ? cost.unitCost : 100;
    const unitLabour = cost ? cost.labourCost : 30;
    const totalMat = unitCost * count;
    const totalLab = unitLabour * count;

    items.push({
      id: `boq_node_${key}`,
      itemType: 'COMPONENT',
      description: sampleNode.description || sampleNode.name,
      partNumber: cost?.partNumber || sampleNode.type,
      category: sampleNode.domain,
      quantity: count,
      unit: 'EA',
      unitCost,
      unitLabour,
      totalMaterialCost: totalMat,
      totalLabourCost: totalLab,
      totalCost: totalMat + totalLab
    });
  }

  // Group cables by type
  const cableGroup = new Map<string, { totalMeters: number; runCount: number }>();
  for (const conn of Object.values(graph.connections)) {
    const spec = CABLE_CATALOG[conn.connectionType] || CABLE_CATALOG.CAT6;
    const existing = cableGroup.get(spec.type) || { totalMeters: 0, runCount: 0 };
    existing.totalMeters += Math.max(1, conn.lengthMeters);
    existing.runCount += 1;
    cableGroup.set(spec.type, existing);
  }

  for (const [cableType, { totalMeters, runCount }] of cableGroup.entries()) {
    const spec = CABLE_CATALOG[cableType] || CABLE_CATALOG.CAT6;
    const unitCost = spec.costPerMeter;
    const unitLabour = spec.labourPerMeter;
    const totalMat = Number((unitCost * totalMeters).toFixed(2));
    const totalLab = Number((unitLabour * totalMeters).toFixed(2));

    items.push({
      id: `boq_cable_${cableType}`,
      itemType: 'CABLE',
      description: `${spec.name} (${runCount} structural runs)`,
      partNumber: cableType,
      category: 'CABLING',
      quantity: Math.ceil(totalMeters),
      unit: 'METER',
      unitCost,
      unitLabour,
      totalMaterialCost: totalMat,
      totalLabourCost: totalLab,
      totalCost: totalMat + totalLab
    });
  }

  // Calculate totals
  const totalMaterials = items.reduce((sum, it) => sum + it.totalMaterialCost, 0);
  const totalLabour = items.reduce((sum, it) => sum + it.totalLabourCost, 0);
  const subtotal = totalMaterials + totalLabour;
  const contingencyAmount = Number(((subtotal * contingencyPercent) / 100).toFixed(2));
  const taxableBase = subtotal + contingencyAmount;
  const taxAmount = Number(((taxableBase * taxRatePercent) / 100).toFixed(2));
  const grandTotal = Number((taxableBase + taxAmount).toFixed(2));

  return {
    items,
    currency,
    totalMaterials: Number(totalMaterials.toFixed(2)),
    totalLabour: Number(totalLabour.toFixed(2)),
    subtotal: Number(subtotal.toFixed(2)),
    taxRatePercent,
    taxAmount,
    contingencyPercent,
    contingencyAmount,
    grandTotal
  };
}

export interface CableScheduleEntry {
  id: string;
  cableId: string;
  cableType: string;
  sourceDevice: string;
  sourcePort: string;
  targetDevice: string;
  targetPort: string;
  lengthMeters: number;
}

export function generateCableSchedule(graph: EngineeringGraph): CableScheduleEntry[] {
  return Object.values(graph.connections).map(conn => {
    const srcNode = graph.nodes[conn.sourceComponentId];
    const tgtNode = graph.nodes[conn.targetComponentId];
    const srcPort = srcNode?.ports.find(p => p.id === conn.sourcePortId);
    const tgtPort = tgtNode?.ports.find(p => p.id === conn.targetPortId);

    return {
      id: conn.id,
      cableId: conn.id,
      cableType: conn.connectionType,
      sourceDevice: srcNode ? `${srcNode.tag} (${srcNode.name})` : conn.sourceComponentId,
      sourcePort: srcPort ? srcPort.name : conn.sourcePortId,
      targetDevice: tgtNode ? `${tgtNode.tag} (${tgtNode.name})` : conn.targetComponentId,
      targetPort: tgtPort ? tgtPort.name : conn.targetPortId,
      lengthMeters: conn.lengthMeters
    };
  });
}
