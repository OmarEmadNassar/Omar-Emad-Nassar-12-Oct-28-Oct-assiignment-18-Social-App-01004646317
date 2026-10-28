import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Autlayout } from './autlayout';

describe('Autlayout', () => {
  let component: Autlayout;
  let fixture: ComponentFixture<Autlayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Autlayout],
    }).compileComponents();

    fixture = TestBed.createComponent(Autlayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
