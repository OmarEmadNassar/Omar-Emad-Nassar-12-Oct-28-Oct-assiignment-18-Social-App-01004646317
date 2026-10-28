import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RightSide } from './right-side';

describe('RightSide', () => {
  let component: RightSide;
  let fixture: ComponentFixture<RightSide>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RightSide],
    }).compileComponents();

    fixture = TestBed.createComponent(RightSide);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
