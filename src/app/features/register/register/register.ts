import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { initFlowbite } from 'flowbite';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth/auth.service';
import { Router } from '@angular/router';
import { BTNsLogin } from '../../../shared/components/btns-login/btns-login';


@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, BTNsLogin],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnInit {
  loading:WritableSignal<boolean> = signal(false)
  msgError = signal('')
  private readonly router = inject(Router)
private readonly authService= inject(AuthService)
  constructor() { }

  ngOnInit(): void {
    initFlowbite();
  }
  registerForm: FormGroup = new FormGroup ({
      name: new FormControl(null, [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(20),
        Validators.pattern(/^[A-Z][a-z]{2,}(?:\s[A-Z][a-z]{2,}){0,3}$/),
      ]),
      username: new FormControl(null, [
        Validators.minLength(3),
        Validators.maxLength(15),
        Validators.pattern(/^[a-z0-9_]{3,15}$/),
      ]),
      email: new FormControl(null, [Validators.required, Validators.email]),
      dateOfBirth: new FormControl(null, [Validators.required]),
      gender: new FormControl(null, [Validators.required, Validators.pattern(/^(?:male|female)$/)]),
      password: new FormControl(null, [
        Validators.required,
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/),
      ]),
      rePassword: new FormControl(null, [
        Validators.required,
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/),
      ]),
  },
  {validators: this.confirmPassword}
  //  {updateOn:'submit'}
  )
  confirmPassword(x:AbstractControl){
    return x.get('password')?.value === x.get('rePassword')?.value ? null : { mismatch: true };
  }
  register(){
    if (this.registerForm.valid) {
      this.loading.set(true)
      this.authService.signUp(this.registerForm.value).subscribe({
        next:(res)=>{
          this.loading.set(false)
          this.router.navigate(['/login'])
        },
        error: (err) => {
        console.error(err);
        this.msgError.set(err.error?.message ?? 'Registration failed. Please try again.');
        this.loading.set(false)
      }, 
      })
    }
    else{
      this.registerForm.markAllAsTouched()
    }
  }
}
