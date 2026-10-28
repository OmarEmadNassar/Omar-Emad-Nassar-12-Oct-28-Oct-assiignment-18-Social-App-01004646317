import { Component, inject, signal, WritableSignal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth.service';
import { BTNsLogin } from '../../../shared/components/btns-login/btns-login';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, BTNsLogin],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  msgError = signal('')
  loading:WritableSignal<boolean> = signal(false)
  private readonly authService= inject(AuthService)
  private readonly router = inject(Router)
  private readonly fb = inject(FormBuilder);

  loginForm: FormGroup = this.fb.group({
      email: ['', [Validators.required, Validators.email]],

      password: [null, [
        Validators.required,
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/),
      ]],

  })
    // loginForm: FormGroup= new FormGroup({
    //         email: new FormControl(null, [Validators.required, Validators.email]),

    //   password: new FormControl(null, [
    //     Validators.required,
    //     Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/),
    //   ]),

    // })
  login(){
    if (this.loginForm.valid) {
      this.loading.set(true)
      this.authService.signIn(this.loginForm.value).subscribe({
        next:(res)=>{
          localStorage.setItem('socialToken', res.data.token)
          localStorage.setItem('socialUser', JSON.stringify(res.data.user))
          this.loading.set(false)
          this.router.navigate(['/feeds'])

        },
        error: (err) => {
        console.error(err);
        this.msgError.set(err.error?.message ?? 'Login failed. Please try again.');
        this.loading.set(false)
      }, 
      })
    }
    else{
      this.loginForm.markAllAsTouched()
    }
  }

  togglePass(pass: HTMLInputElement): void {
    if (pass.type === 'password') {
      pass.type = 'text'
    }
    else{
      pass.type = 'password'
    }
  }
}
