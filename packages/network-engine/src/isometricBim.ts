import { EngineeringGraph, EngineeringComponent, EngineeringConnection } from '@omniflow/shared-types';

export interface Point3D {
  x: number;
  y: number;
  z: number; // Elevation in millimeters
}

export interface Point2D {
  x: number;
  y: number;
}

export interface BimCamera {
  orbitAngleDeg: number;  // Horizontal rotation 0 - 360° (default 45°)
  tiltAngleDeg: number;   // Vertical pitch 15 - 75° (default 32°)
  zoom: number;           // Zoom scaling factor (default 1.0)
  panX: number;           // Pan offset X
  panY: number;           // Pan offset Y
}

export interface BimCuboid {
  id: string;
  componentTag: string;
  name: string;
  domain: string;
  type: string;
  center: Point3D;
  size: { width: number; depth: number; height: number }; // In millimeters
  color: string;
  isFailed: boolean;
  powerWatts: number;
  temperatureC: number;
  heatStatus: 'COOL' | 'OPTIMAL' | 'ELEVATED' | 'HOTSPOT';
  elevationCategory: 'UNDERFLOOR' | 'EQUIPMENT' | 'POWER_BUSWAY' | 'OVERHEAD_TRAY';
}

export interface BimPipeSegment {
  id: string;
  cableId: string;
  connectionType: string;
  domain: string;
  start: Point3D;
  end: Point3D;
  radius: number;
  color: string;
  lengthMeters: number;
  isFailed: boolean;
  elevationCategory: 'UNDERFLOOR' | 'EQUIPMENT' | 'POWER_BUSWAY' | 'OVERHEAD_TRAY';
}

export interface BimParticle3D {
  id: string;
  connectionId: string;
  position: Point3D;
  screenPos: Point2D;
  color: string;
  size: number;
  progressPercent: number;
}

/**
 * Standard elevation mapping (Z-coordinates in mm) for datacenter infrastructure
 */
export function getComponentElevationMm(component: EngineeringComponent): {
  zBase: number;
  height: number;
  category: BimCuboid['elevationCategory'];
} {
  const type = component.type.toUpperCase();
  const domain = component.domain;

  if (domain === 'PLUMBING' || type.includes('PIPE') || type.includes('PUMP')) {
    // Underfloor chilled water circulation (below raised floor)
    return { zBase: -450, height: 400, category: 'UNDERFLOOR' };
  }

  if (type.includes('RACK')) {
    // Standard 42U Server Rack (600mm W x 1000mm D x 2000mm H)
    return { zBase: 0, height: 1800, category: 'EQUIPMENT' };
  }

  if (type.includes('CRAC') || type.includes('CRAH') || type.includes('CHILLER')) {
    // Heavy cooling equipment (floor mounted)
    return { zBase: 0, height: 1900, category: 'EQUIPMENT' };
  }

  if (type.includes('TRANSFORMER') || type.includes('GENERATOR') || type.includes('ATS') || type.includes('UPS')) {
    // Heavy electrical plant equipment (floor mounted)
    return { zBase: 0, height: 1600, category: 'EQUIPMENT' };
  }

  if (type.includes('CAMERA') || type.includes('CCTV')) {
    // Ceiling or wall mounted cameras
    return { zBase: 2400, height: 180, category: 'OVERHEAD_TRAY' };
  }

  // Default rack-mounted switch, router, server, or desktop equipment
  return { zBase: 200, height: 500, category: 'EQUIPMENT' };
}

/**
 * Standard conduit elevation mapping for cabling and pipe runs
 */
export function getConnectionElevationMm(
  connection: EngineeringConnection,
  srcComp?: EngineeringComponent,
  tgtComp?: EngineeringComponent
): {
  zStart: number;
  zEnd: number;
  radius: number;
  category: BimPipeSegment['elevationCategory'];
} {
  const type = connection.connectionType.toUpperCase();
  const domain = connection.domain;

  if (domain === 'PLUMBING' || type.includes('PIPE') || type.includes('CHILLED')) {
    // Chilled water supply and return under raised floor
    return { zStart: -350, zEnd: -350, radius: 24, category: 'UNDERFLOOR' };
  }

  if (domain === 'ELECTRICAL' || type.includes('POWER') || type.includes('400V') || type.includes('230V')) {
    // Overhead electrical power busway track
    return { zStart: 1800, zEnd: 1800, radius: 18, category: 'POWER_BUSWAY' };
  }

  if (type.includes('FIBER') || type.includes('CAT6') || type.includes('ETHERNET') || domain === 'NETWORK' || domain === 'CCTV') {
    // Overhead yellow fiber raceway & cable ladder
    return { zStart: 2100, zEnd: 2100, radius: 12, category: 'OVERHEAD_TRAY' };
  }

  const srcElev = srcComp ? getComponentElevationMm(srcComp).zBase + 400 : 800;
  const tgtElev = tgtComp ? getComponentElevationMm(tgtComp).zBase + 400 : 800;
  return { zStart: srcElev, zEnd: tgtElev, radius: 12, category: 'EQUIPMENT' };
}

/**
 * 3D Isometric World-to-Screen Projection Matrix
 * Transforms 3D coordinates (X, Y, Z mm) into 2D Screen coordinates with orbit and tilt
 */
export function project3DToScreen(
  point: Point3D,
  camera: BimCamera,
  centerOrigin: Point2D = { x: 500, y: 400 }
): Point2D & { depth: number } {
  const radOrbit = (camera.orbitAngleDeg * Math.PI) / 180;
  const radTilt = (camera.tiltAngleDeg * Math.PI) / 180;

  // Scale down millimeters for screen display (1 schematic unit = ~10mm)
  const xWorld = point.x * 0.12;
  const yWorld = point.y * 0.12;
  const zWorld = point.z * 0.12;

  // Horizontal rotation around center (orbit)
  const cosO = Math.cos(radOrbit);
  const sinO = Math.sin(radOrbit);
  const xRot = xWorld * cosO - yWorld * sinO;
  const yRot = xWorld * sinO + yWorld * cosO;

  // Vertical tilt (isometric axonometric projection)
  const cosT = Math.cos(radTilt);
  const sinT = Math.sin(radTilt);

  // Screen coordinates
  const screenX = centerOrigin.x + (xRot * camera.zoom) + camera.panX;
  const screenY = centerOrigin.y + ((yRot * sinT - zWorld * cosT) * camera.zoom) + camera.panY;

  // Depth for painter's algorithm sorting (greater = further away)
  const depth = yRot * cosT + zWorld * sinT;

  return { x: screenX, y: screenY, depth };
}

/**
 * Build 3D spatial models from EngineeringGraph
 */
export function buildBimModelFromGraph(graph: EngineeringGraph): {
  cuboids: BimCuboid[];
  pipes: BimPipeSegment[];
} {
  const cuboids: BimCuboid[] = [];
  const pipes: BimPipeSegment[] = [];

  for (const node of Object.values(graph.nodes)) {
    const elev = getComponentElevationMm(node);
    const powerWatts = Number(node.properties.ratedWatts || 500);

    // Thermal simulation estimate
    let tempC = 20.0 + (powerWatts / 1500) * 4.5;
    if (node.type.includes('CHILLER')) tempC = 7.0;
    if (node.simulationState.isFailed) tempC = 36.5;

    let heatStatus: BimCuboid['heatStatus'] = 'OPTIMAL';
    if (tempC < 18) heatStatus = 'COOL';
    else if (tempC >= 25 && tempC < 30) heatStatus = 'ELEVATED';
    else if (tempC >= 30) heatStatus = 'HOTSPOT';

    let color = '#38bdf8'; // Blue network
    if (node.domain === 'ELECTRICAL') color = '#eab308';
    else if (node.domain === 'PLUMBING') color = '#0284c7';
    else if (node.domain === 'CCTV') color = '#a855f7';
    else if (node.domain === 'SOLAR') color = '#f97316';

    const width = node.type.includes('RACK') ? 1200 : 1000;
    const depth = node.type.includes('RACK') ? 1400 : 1000;

    cuboids.push({
      id: node.id,
      componentTag: node.tag,
      name: node.name,
      domain: node.domain,
      type: node.type,
      center: {
        x: node.position.x * 10,
        y: node.position.y * 10,
        z: elev.zBase + elev.height / 2
      },
      size: { width, depth, height: elev.height },
      color,
      isFailed: !!node.simulationState.isFailed,
      powerWatts,
      temperatureC: Number(tempC.toFixed(1)),
      heatStatus,
      elevationCategory: elev.category
    });
  }

  for (const conn of Object.values(graph.connections)) {
    const srcNode = graph.nodes[conn.sourceComponentId];
    const tgtNode = graph.nodes[conn.targetComponentId];
    if (!srcNode || !tgtNode) continue;

    const elev = getConnectionElevationMm(conn, srcNode, tgtNode);
    let color = '#38bdf8';
    if (conn.domain === 'ELECTRICAL') color = '#eab308';
    else if (conn.domain === 'PLUMBING') color = '#0284c7';
    else if (conn.domain === 'CCTV') color = '#a855f7';

    pipes.push({
      id: conn.id,
      cableId: conn.id,
      connectionType: conn.connectionType,
      domain: conn.domain,
      start: {
        x: srcNode.position.x * 10,
        y: srcNode.position.y * 10,
        z: elev.zStart
      },
      end: {
        x: tgtNode.position.x * 10,
        y: tgtNode.position.y * 10,
        z: elev.zEnd
      },
      radius: elev.radius,
      color,
      lengthMeters: conn.lengthMeters,
      isFailed: !!conn.simulationState.isFailed,
      elevationCategory: elev.category
    });
  }

  return { cuboids, pipes };
}
