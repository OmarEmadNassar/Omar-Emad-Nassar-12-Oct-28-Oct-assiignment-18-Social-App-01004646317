import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { alredyLoggedGuard } from './alredy-logged-guard';

describe('alredyLoggedGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => alredyLoggedGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
