// ── State → Sector hierarchy ────────────────────────────────────────────────
// First supported state is Delhi, modelled with its 11 official revenue
// districts as "sectors". Each sector carries a geographic boundary (used to
// plot/filter issues on the map) and an assigned community/sector admin that
// reports inside the boundary are routed to.

export interface SectorAdmin {
  name: string;
  email: string;
  phone?: string;
}

export interface SectorBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface Sector {
  id: string;
  name: string;
  stateId: string;
  /** Representative centre point of the district. */
  center: { lat: number; lng: number };
  /** Axis-aligned boundary box used for "issues within this sector". */
  bounds: SectorBounds;
  admin: SectorAdmin;
}

export interface StateInfo {
  id: string;
  name: string;
  /** Whether the state is live yet (only Delhi for now). */
  available: boolean;
  sectors: Sector[];
}

// Half-extent of each district box (~0.03° ≈ 3.3 km in each direction).
const HALF = 0.03;

const adminEmail = (name: string) =>
  `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@delhi.civic.in`;

function makeSector(
  id: string,
  name: string,
  lat: number,
  lng: number,
  adminName: string
): Sector {
  return {
    id,
    name,
    stateId: "delhi",
    center: { lat, lng },
    bounds: { north: lat + HALF, south: lat - HALF, east: lng + HALF, west: lng - HALF },
    admin: { name: adminName, email: adminEmail(adminName), phone: "+91 11 2200 0000" }
  };
}

export const STATES: StateInfo[] = [
  {
    id: "delhi",
    name: "Delhi (NCT)",
    available: true,
    sectors: [
      makeSector("new-delhi", "New Delhi", 28.6139, 77.209, "Aarav Mehta"),
      makeSector("central-delhi", "Central Delhi", 28.651, 77.23, "Diya Kapoor"),
      makeSector("north-delhi", "North Delhi", 28.701, 77.202, "Kabir Singh"),
      makeSector("north-east-delhi", "North East Delhi", 28.689, 77.2767, "Saanvi Nair"),
      makeSector("north-west-delhi", "North West Delhi", 28.7186, 77.1, "Aditya Rao"),
      makeSector("east-delhi", "East Delhi", 28.628, 77.295, "Vivaan Sharma"),
      makeSector("west-delhi", "West Delhi", 28.656, 77.103, "Ishaan Gupta"),
      makeSector("south-delhi", "South Delhi", 28.5245, 77.2066, "Ananya Reddy"),
      makeSector("south-east-delhi", "South East Delhi", 28.54, 77.27, "Reyansh Iyer"),
      makeSector("south-west-delhi", "South West Delhi", 28.5823, 77.05, "Myra Joshi"),
      makeSector("shahdara", "Shahdara", 28.6735, 77.2898, "Tara Menon")
    ]
  },
  // Placeholders to show the hierarchy is extensible. Marked unavailable so the
  // UI can present them as "coming soon".
  { id: "karnataka", name: "Karnataka", available: false, sectors: [] },
  { id: "maharashtra", name: "Maharashtra", available: false, sectors: [] }
];

export function getState(stateId: string): StateInfo | undefined {
  return STATES.find((s) => s.id === stateId);
}

export function getSector(sectorId: string): Sector | undefined {
  for (const state of STATES) {
    const found = state.sectors.find((sec) => sec.id === sectorId);
    if (found) return found;
  }
  return undefined;
}

export function isWithinSector(sector: Sector, lat: number, lng: number): boolean {
  const b = sector.bounds;
  return lat <= b.north && lat >= b.south && lng <= b.east && lng >= b.west;
}

/** Resolve which sector a coordinate falls into (for routing a new report). */
export function findSectorByCoords(lat: number, lng: number): Sector | undefined {
  for (const state of STATES) {
    for (const sector of state.sectors) {
      if (isWithinSector(sector, lat, lng)) return sector;
    }
  }
  return undefined;
}
