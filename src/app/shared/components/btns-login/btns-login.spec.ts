import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BTNsLogin } from './btns-login';

describe('BTNsLogin', () => {
  let component: BTNsLogin;
  let fixture: ComponentFixture<BTNsLogin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BTNsLogin],
    }).compileComponents();

    fixture = TestBed.createComponent(BTNsLogin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
