# OmniFlow — Intelligent Engineering Design & Simulation Platform

> **Design it. Validate it. Simulate it. Optimise it.**
> 
> *Core Principle: DRAW → CONFIGURE → VALIDATE → SIMULATE → ANALYSE → OPTIMISE → DOCUMENT*

OmniFlow is an enterprise-grade visual engineering design, modeling, and simulation platform. Every visual object on the canvas represents a structured engineering component with typed ports, domain constraints, physical properties, cost data, and simulation behaviors.

---

## 1. System Architecture

```text
                    USER / DESIGNER
                          │
                          ▼
                 INTELLIGENT CANVAS
                          │
                          ▼
                  ENGINEERING GRAPH
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
        COMPONENTS      PORTS      CONNECTIONS
            │             │             │
            └─────────────┼─────────────┘
                          ▼
                    DOMAIN ENGINE
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
        VALIDATION    SIMULATION       BOQ
            │             │             │
            └─────────────┼─────────────┘
                          ▼
                 OMNIFLOW COPILOT
```

---

## 2. Monorepo Structure

```text
c:\nexflow\
├── apps/
│   └── web/                   # React 18, TypeScript, Vite, Ant Design, Zustand canvas UI
├── packages/
│   ├── shared-types/          # Canonical engineering models (Components, Ports, Edges, Graphs)
│   └── network-engine/        # Network domain engine (Catalog, Validation, Sim, BOQ, Cables)
├── docs/                      # Technical documentation
├── package.json               # Root npm workspaces
└── tsconfig.base.json         # Strict TypeScript compiler configuration
```

---

## 3. Core Capabilities Implemented (Milestone 1)

1. **Universal Engineering Graph Model:**
   - Canonical `EngineeringGraph`, `EngineeringComponent`, `ComponentPort`, and `EngineeringConnection`.
   - The graph is the sole source of truth; the visual canvas is a projection.

2. **Network Component Catalog & Port Model:**
   - Pre-configured components: ISP Demarcation, Enterprise L3 Router, Perimeter Firewall, L3 Core Switch, 24-Port PoE+ Access Switch, WiFi 6 AP, App Server, Workstation PC, VoIP Phone, and Network Printer.
   - Typed ports: RJ45, Fiber LC, Console Serial, PoE+ with power delivery budgets and physical compatibility enforcement.

3. **Intelligent Port Snapping & Compatibility Validation:**
   - Live compatibility checker prevents illegal connections (e.g. Serial Console to Ethernet RJ45).
   - Distance calculation and cable physics latency models ($t = \frac{D}{c} + \frac{S}{B}$).

4. **Automated Engineering Validation Engine:**
   - Detection of duplicate IP addresses (`CRITICAL`).
   - Missing default gateways on endpoints (`WARNING`).
   - Copper cable run length limit violations exceeding standard TIA-568 (> 100m) (`ERROR`).
   - PoE power budget over-allocation (`CRITICAL`).
   - Disconnected / isolated devices (`INFO`).

5. **Discrete Packet Simulation & Flow Visualisation:**
   - Physics-informed packet travel time and queue delay modeling.
   - Shortest path graph traversal (BFS/Dijkstra).
   - Animated SVG particle streams travelling along active paths.
   - Interactive fault injection: disconnect cables or power off devices and witness instantaneous packet drop cascades.

6. **Bill of Quantities (BOQ) & Structured Cabling Schedule:**
   - Automatic bill of materials generation with equipment unit costs, installation labour, contingency, and tax calculations.
   - Enterprise-grade interactive data tables adhering strictly to **Rule 24** (pagination, page size selector, sortable headers, column visibility toggle, search filter, and CSV export).

---

## 4. Verification & Testing

To compile and verify all packages and applications:

```bash
# Typecheck all workspaces
npm run check --workspaces

# Run network engine automated test suite
npx tsx packages/network-engine/test/engine.test.ts

# Build production bundles
npm run build --workspaces
```

---

## 5. Development Server

To launch the local interactive design canvas:

```bash
npm run dev --workspace=@omniflow/web
```
*(Runs on `http://localhost:5173`)*
