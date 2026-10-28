import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MainSide } from './main-side';

describe('MainSide', () => {
  let component: MainSide;
  let fixture: ComponentFixture<MainSide>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainSide],
    }).compileComponents();

    fixture = TestBed.createComponent(MainSide);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
