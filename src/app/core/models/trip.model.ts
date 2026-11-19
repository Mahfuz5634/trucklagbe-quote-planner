// Location definition
export type LocationId = 'A' | 'B' | 'C' | 'D' | 'E';

export interface LocationItem {
  id: LocationId;
  name: string;
}

// Available 5 locations according to assessment PDF
export const AVAILABLE_LOCATIONS: readonly LocationItem[] = [
  { id: 'A', name: 'Baily Road' },
  { id: 'B', name: 'Shahbagh' },
  { id: 'C', name: 'Bijoy Sarani' },
  { id: 'D', name: 'Banani' },
  { id: 'E', name: 'Uttara' },
] as const;

// Fictional symmetric road distances (in km)
// A-B: 12, A-C: 18, A-D: 26, A-E: 30
// B-C: 15, B-D: 29, B-E: 24
// C-D: 22, C-E: 28
// D-E: 17
const DISTANCE_MATRIX: Record<string, number> = {
  'A-B': 12, 'B-A': 12,
  'A-C': 18, 'C-A': 18,
  'A-D': 26, 'D-A': 26,
  'A-E': 30, 'E-A': 30,
  'B-C': 15, 'C-B': 15,
  'B-D': 29, 'D-B': 29,
  'B-E': 24, 'E-B': 24,
  'C-D': 22, 'D-C': 22,
  'C-E': 28, 'E-C': 28,
  'D-E': 17, 'E-D': 17,
};

export function getDistanceBetween(from: LocationId, to: LocationId): number {
  if (from === to) return 0;
  const key = `${from}-${to}`;
  const distance = DISTANCE_MATRIX[key];
  if (distance === undefined) {
    throw new Error(`Distance not defined between ${from} and ${to}`);
  }
  return distance;
}

// Truck categories
export type TruckCategoryId = 'mini' | 'medium' | 'large';

export interface TruckCategory {
  id: TruckCategoryId;
  name: string;
  capacityTonnes: number;
  ratePerKm: number;
  minimumFare: number;
}

export const TRUCK_CATEGORIES: Record<TruckCategoryId, TruckCategory> = {
  mini: {
    id: 'mini',
    name: 'Mini (1.5 tonnes)',
    capacityTonnes: 1.5,
    ratePerKm: 50,
    minimumFare: 1200,
  },
  medium: {
    id: 'medium',
    name: 'Medium (3 tonnes)',
    capacityTonnes: 3,
    ratePerKm: 85,
    minimumFare: 2000,
  },
  large: {
    id: 'large',
    name: 'Large (7 tonnes)',
    capacityTonnes: 7,
    ratePerKm: 145,
    minimumFare: 3500,
  },
} as const;

// Optional services per truck
export const SERVICE_RATES = {
  loadingAssistancePerTruck: 600,
  unloadingAssistancePerTruck: 400,
} as const;

// Trip configuration inputs
export interface TripConfig {
  pickupLocationId: LocationId;
  dropOffLocationIds: LocationId[]; // 1 to 3 ordered drops
  truckCategoryId: TruckCategoryId;
  truckCount: number; // 1 to 5
  cargoWeightTonnes: number; // positive number <= truck capacity * truckCount
  pickupDateTime: string; // ISO string or format, strictly later than current local date/time
  loadingAssistance: boolean;
  unloadingAssistance: boolean;
}

// Result quote calculation breakdown
export interface QuoteEstimate {
  distanceKm: number;
  ratePerKm: number;
  minimumFarePerTruck: number;
  farePerTruck: number;
  truckCount: number;
  transportCost: number;
  loadingCost: number;
  unloadingCost: number;
  serviceCost: number;
  totalQuote: number;
  routeLocations: LocationItem[];
  calculatedForTrip: TripConfig;
  calculatedAt: string;
}

// Quote UI State
export type QuoteStatus = 'idle' | 'loading' | 'success' | 'error';

export interface QuoteState {
  status: QuoteStatus;
  estimate: QuoteEstimate | null;
  errorMessage: string | null;
  activeRequestId: number | null;
}
