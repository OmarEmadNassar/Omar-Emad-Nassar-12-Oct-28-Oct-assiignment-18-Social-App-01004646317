import { Routes } from '@angular/router';
import { Autlayout } from './layout/autlayout/autlayout';
import { Login } from './features/login/login/login';
import { Register } from './features/register/register/register';
import { Mainlayout } from './layout/mainlayout/mainlayout';
import { NotFound } from './features/not-found/not-found/not-found';
import { authGuardGuard } from './core/guards/auth-guard-guard';
import { alredyLoggedGuard } from './core/guards/alredy-logged-guard';

export const routes: Routes = [
    {path: '', redirectTo: 'login', pathMatch: 'full'},
    {path: '',canActivate: [alredyLoggedGuard], component: Autlayout, children: [
        {path: 'login', component: Login, title: 'Login'},
        {path: 'register', component: Register, title: 'Register'},
    ]},
    {path: '', canActivate: [authGuardGuard] ,component: Mainlayout, children: [
        {
          path: '',
          loadComponent: () => import('./features/feeds/feeds/feeds').then((c) => c.Feeds),
          children: [
            {path: 'feeds', loadComponent: () => import('./features/feeds/feeds/pages/feed/feed').then((c) => c.Feed), title: 'Feeds'},
            {path: 'myPosts', loadComponent: () => import('./features/feeds/feeds/pages/my-posts/my-posts').then((c) => c.MyPosts), title: 'My Posts'},
            {path: 'community', loadComponent: () => import('./features/feeds/feeds/pages/community/community').then((c) => c.Community), title: 'Community'},
            {path: 'saved', loadComponent: () => import('./features/feeds/feeds/pages/saved/saved').then((c) => c.Saved), title: 'Saved Posts'},
          ],
        },
        {path: 'notification', loadComponent: () => import('./features/notufication/notufication/notufication').then((c) => c.Notufication), title: 'Notification'},
        {path: 'profile', loadComponent: () => import('./features/profile/profile/profile').then((c) => c.Profile), title: 'Profile'},
        {path: 'profile/:userId', loadComponent: () => import('./features/profile/profile/profile').then((c) => c.Profile), title: 'Profile'},
        {path: 'setting', loadComponent: () => import('./features/settings/settings/settings').then((c) => c.Settings), title: 'Settings'},
    ]},
    {path: '**', component: NotFound, title: 'Not Found'}
];
