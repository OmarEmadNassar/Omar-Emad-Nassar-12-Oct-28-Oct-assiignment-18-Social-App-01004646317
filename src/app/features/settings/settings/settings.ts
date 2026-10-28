import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth/auth.service';

@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {
  private readonly authService = inject(AuthService);
  readonly isSubmitting = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');

  readonly passwordForm = new FormGroup({
    currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    newPassword: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/),
      ],
    }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  }, { validators: this.passwordsMatch });

  submitPasswordChange(event: SubmitEvent): void {
    event.preventDefault();
    this.successMessage.set('');
    this.errorMessage.set('');

    if (this.passwordForm.invalid || this.isSubmitting()) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.isSubmitting.set(true);
    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: (response: unknown) => {
        const tokenData = this.readTokenData(response);
        if (tokenData && typeof localStorage !== 'undefined') {
          localStorage.setItem('socialToken', `${tokenData.tokenType} ${tokenData.token}`);
        }

        this.passwordForm.reset();
        this.successMessage.set('Your password has been updated successfully.');
        this.isSubmitting.set(false);
      },
      error: (error: unknown) => {
        console.error('Failed to change password', error);
        this.errorMessage.set(this.getErrorMessage(error));
        this.isSubmitting.set(false);
      },
    });
  }

  private passwordsMatch(control: AbstractControl): { mismatch: true } | null {
    const newPassword = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { mismatch: true };
  }

  private readTokenData(response: unknown): { token: string; tokenType: string } | null {
    if (
      typeof response !== 'object'
      || response === null
      || !('data' in response)
      || typeof response.data !== 'object'
      || response.data === null
      || !('token' in response.data)
      || typeof response.data.token !== 'string'
    ) {
      return null;
    }

    return {
      token: response.data.token,
      tokenType: 'tokenType' in response.data && typeof response.data.tokenType === 'string'
        ? response.data.tokenType
        : 'Bearer',
    };
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && !(error instanceof HttpErrorResponse)) {
      return error.message;
    }

    if (error instanceof HttpErrorResponse) {
      const response = error.error;
      if (
        typeof response === 'object'
        && response !== null
        && 'message' in response
        && typeof response.message === 'string'
      ) {
        return response.message;
      }

      if (error.status === 0) {
        return 'Could not reach the server. Check your connection and try again.';
      }
      if (error.status === 401 || error.status === 403) {
        return 'Your current password may be incorrect, or your session has expired.';
      }
      return `Your password could not be changed (HTTP ${error.status}). Please try again.`;
    }

    return 'Your password could not be changed. Please try again.';
  }
}
