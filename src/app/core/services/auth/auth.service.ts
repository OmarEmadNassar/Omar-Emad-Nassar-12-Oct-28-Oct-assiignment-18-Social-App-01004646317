import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly httpClient= inject(HttpClient)
  private readonly router = inject(Router)
  signUp(data:object):Observable<any> {
    return this.httpClient.post(environment.baseURL+ `/users/signup`, data);
  }
  signIn(data:object):Observable<any> {
    return this.httpClient.post(environment.baseURL+ `/users/signin`, data);
  }

  changePassword(password: string, newPassword: string): Observable<unknown> {
    const token = typeof localStorage === 'undefined'
      ? null
      : localStorage.getItem('socialToken')?.trim();
    if (!token) {
      return throwError(() => new Error('Sign in again before changing your password.'));
    }

    const authorization = /^Bearer\s/i.test(token) ? token : `Bearer ${token}`;
    return this.httpClient.patch(
      `${environment.baseURL}/users/change-password`,
      { password, newPassword },
      { headers: new HttpHeaders({ Authorization: authorization }) },
    );
  }

  logout(){
    localStorage.removeItem('socialToken')
    localStorage.removeItem('socialUser')
    this.router.navigate(['/login'])
  }
}
