import { TestBed } from '@angular/core/testing';
import { PricingService } from './pricing.service';
import { TripConfig } from '../models/trip.model';

describe('PricingService', () => {
  let service: PricingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PricingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should correctly calculate distance for Pickup A -> Drop B -> Drop C (12 + 15 = 27 km)', () => {
    const distance = service.calculateRouteDistance('A', ['B', 'C']);
    expect(distance).toBe(27);
  });

  it('should correctly match the official verification example from assessment', () => {
    // Official test case from PDF page 2:
    // Pickup A -> Drop B -> Drop C
    // 2 Medium trucks, 5 tonnes of cargo
    // Loading assistance only
    // Expected: distance 27 km, transport 4,590 BDT, services 1,200 BDT, total 5,790 BDT
    const testTrip: TripConfig = {
      pickupLocationId: 'A',
      dropOffLocationIds: ['B', 'C'],
      truckCategoryId: 'medium',
      truckCount: 2,
      cargoWeightTonnes: 5,
      pickupDateTime: new Date(Date.now() + 86400000).toISOString(),
      loadingAssistance: true,
      unloadingAssistance: false,
    };

    const quote = service.calculateQuote(testTrip);

    expect(quote.distanceKm).toBe(27);
    expect(quote.transportCost).toBe(4590); // 27 * 85 = 2295 * 2 = 4590
    expect(quote.loadingCost).toBe(1200);   // 600 * 2 = 1200
    expect(quote.unloadingCost).toBe(0);
    expect(quote.serviceCost).toBe(1200);
    expect(quote.totalQuote).toBe(5790);
  });

  it('should enforce minimum fare per truck if distance * rate is lower than minimum', () => {
    // Mini truck: rate = 50, minimumFare = 1200
    // A -> B = 12 km. 12 * 50 = 600, which is below minimumFare (1200).
    const testTrip: TripConfig = {
      pickupLocationId: 'A',
      dropOffLocationIds: ['B'],
      truckCategoryId: 'mini',
      truckCount: 1,
      cargoWeightTonnes: 1,
      pickupDateTime: new Date(Date.now() + 86400000).toISOString(),
      loadingAssistance: false,
      unloadingAssistance: false,
    };

    const quote = service.calculateQuote(testTrip);

    expect(quote.distanceKm).toBe(12);
    expect(quote.farePerTruck).toBe(1200); // Enforced minimum fare
    expect(quote.transportCost).toBe(1200);
    expect(quote.totalQuote).toBe(1200);
  });
});
