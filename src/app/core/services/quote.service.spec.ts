import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { QuoteService } from './quote.service';
import { TripConfig } from '../models/trip.model';

describe('QuoteService (Asynchronous & Race Conditions)', () => {
  let service: QuoteService;

  const sampleTrip1: TripConfig = {
    pickupLocationId: 'A',
    dropOffLocationIds: ['B'],
    truckCategoryId: 'mini',
    truckCount: 1,
    cargoWeightTonnes: 1,
    pickupDateTime: new Date(Date.now() + 86400000).toISOString(),
    loadingAssistance: false,
    unloadingAssistance: false,
  };

  const sampleTrip2: TripConfig = {
    pickupLocationId: 'A',
    dropOffLocationIds: ['B', 'C'],
    truckCategoryId: 'medium',
    truckCount: 2,
    cargoWeightTonnes: 5,
    pickupDateTime: new Date(Date.now() + 86400000).toISOString(),
    loadingAssistance: true,
    unloadingAssistance: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QuoteService);
  });

  it('should be created and start in idle state', () => {
    expect(service).toBeTruthy();
    expect(service.state().status).toBe('idle');
    expect(service.state().estimate).toBeNull();
  });

  it('should switch to loading immediately when quote requested and then success', fakeAsync(() => {
    service.requestQuote(sampleTrip1, 100);

    // Immediately in loading state
    expect(service.state().status).toBe('loading');

    // Advance time by 100ms
    tick(100);

    expect(service.state().status).toBe('success');
    expect(service.state().estimate).toBeTruthy();
    expect(service.state().estimate?.totalQuote).toBe(1200);
  }));

  it('should cancel an earlier slower request when a new request arrives (Race Condition Scenario)', fakeAsync(() => {
    // Request 1: Takes 500ms
    const req1Id = service.requestQuote(sampleTrip1, 500);
    expect(service.state().activeRequestId).toBe(req1Id);
    expect(service.state().status).toBe('loading');

    // After 100ms (Req 1 still in-flight), User sends Request 2 which is faster (takes 100ms)
    tick(100);
    const req2Id = service.requestQuote(sampleTrip2, 100);
    expect(service.state().activeRequestId).toBe(req2Id);

    // Advance time by 100ms (Req 2 completes!)
    tick(100);

    expect(service.state().status).toBe('success');
    expect(service.state().activeRequestId).toBe(req2Id);
    // Verified that estimate is for trip 2 (Medium truck, 27km, total 5790 BDT)
    expect(service.state().estimate?.totalQuote).toBe(5790);

    // Now advance remaining 400ms (where Req 1 would have completed if not cancelled)
    tick(400);

    // Stale Request 1 MUST NOT overwrite Request 2!
    expect(service.state().activeRequestId).toBe(req2Id);
    expect(service.state().estimate?.totalQuote).toBe(5790);
  }));

  it('should invalidate quote when requested', () => {
    service.invalidateQuote();
    expect(service.state().status).toBe('idle');
    expect(service.state().estimate).toBeNull();
  });
});
