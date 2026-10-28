import { Component, inject, OnInit, signal } from '@angular/core';
import { initFlowbite } from 'flowbite';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit{
  private readonly authService = inject (AuthService)
  private readonly router = inject(Router);
  readonly accountOwner = signal({
    name: 'Your account',
    photo: '/Images/default-profile.png',
  });

  ngOnInit(): void {
    this.loadAccountOwner();
    initFlowbite();
  }

  private loadAccountOwner(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const storedUser = localStorage.getItem('socialUser');
    if (!storedUser) {
      return;
    }

    try {
      const user: unknown = JSON.parse(storedUser);
      if (typeof user !== 'object' || user === null) {
        return;
      }

      const userRecord = user as Record<string, unknown>;
      const name = userRecord['name'];
      const photo = userRecord['photo'];
      this.accountOwner.set({
        name: typeof name === 'string' && name.trim() ? name : 'Your account',
        photo: typeof photo === 'string' && photo.trim() ? photo : '/Images/default-profile.png',
      });
    } catch (error) {
      console.error('Failed to read the signed-in user from storage', error);
    }
  }

  isRouteActive(url: string): boolean {
    return this.router.isActive(this.router.parseUrl(url), {
      paths: 'exact',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored',
    });
  }
  navvbarLogout(){
    this.authService.logout()
  }
}
