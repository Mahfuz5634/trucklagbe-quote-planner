import { TestBed } from '@angular/core/testing';
import { DraftService } from './draft.service';

describe('DraftService (Corrupted data and sanitization)', () => {
  let service: DraftService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DraftService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should save and load valid draft correctly', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const validData = {
      pickupLocationId: 'A' as const,
      dropOffLocationIds: ['B' as const, 'C' as const],
      truckCategoryId: 'medium' as const,
      truckCount: 2,
      cargoWeightTonnes: 4.5,
      pickupDateTime: futureDate,
      loadingAssistance: true,
      unloadingAssistance: false,
    };

    service.saveDraft(validData);
    const loaded = service.loadDraft();

    expect(loaded).toBeTruthy();
    expect(loaded?.pickupLocationId).toBe('A');
    expect(loaded?.dropOffLocationIds).toEqual(['B', 'C']);
    expect(loaded?.truckCount).toBe(2);
  });

  it('should safely handle corrupted JSON in localStorage without throwing', () => {
    localStorage.setItem('tl_trip_quote_draft_v1', '{invalid-json:::');

    const loaded = service.loadDraft();
    expect(loaded).toBeNull();
  });

  it('should sanitize malformed data: remove duplicate locations and clamp truck count', () => {
    const malformed = {
      pickupLocationId: 'A',
      dropOffLocationIds: ['A', 'B', 'B', 'Z', 'C'], // 'A' duplicates pickup, 'B' duplicated, 'Z' is unknown
      truckCategoryId: 'invalid_category',
      truckCount: 99, // Out of range (> 5)
      cargoWeightTonnes: -10, // Negative weight
      pickupDateTime: '2020-01-01T00:00:00.000Z', // Past date
    };

    const sanitized = service.sanitizeDraftData(malformed);

    expect(sanitized.pickupLocationId).toBe('A');
    // Duplicates and unknown locations removed
    expect(sanitized.dropOffLocationIds).toEqual(['B', 'C']);
    // Invalid category becomes null
    expect(sanitized.truckCategoryId).toBeNull();
    // Clamped between 1 and 5
    expect(sanitized.truckCount).toBe(5);
    // Negative weight becomes null
    expect(sanitized.cargoWeightTonnes).toBeNull();
    // Past date becomes null (expired)
    expect(sanitized.pickupDateTime).toBeNull();
  });
});
