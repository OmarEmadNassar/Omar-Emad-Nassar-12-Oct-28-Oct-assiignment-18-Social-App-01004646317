import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PostsService } from '../../../shared/services/posts/posts.service';
import { MainSide } from '../../feeds/feeds/components/main-side/main-side';

interface ProfileUser {
  _id: string;
  name: string;
  username: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  photo: string;
  cover?: string;
  followersCount: number;
  followingCount: number;
  bookmarksCount: number;
}

@Component({
  selector: 'app-profile',
  imports: [RouterLink, MainSide],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly postsService = inject(PostsService);
  private readonly destroyRef = inject(DestroyRef);
  readonly user = signal<ProfileUser | null>(null);
  readonly profileUserId = signal<string | null>(null);
  readonly isLoading = signal(true);
  readonly isFollowing = signal(false);
  readonly isUpdatingFollow = signal(false);
  readonly errorMessage = signal('');
  readonly isOwnProfile = signal(true);
  readonly isCoverPreviewOpen = signal(false);

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const targetUserId = params.get('userId');
        const currentUserId = this.readCurrentUserId();
        this.isOwnProfile.set(!targetUserId || targetUserId === currentUserId);
        this.profileUserId.set(targetUserId);
        this.loadProfile(targetUserId);
      });
  }

  loadProfile(userId: string | null): void {
    this.profileUserId.set(userId);
    this.isLoading.set(true);
    this.errorMessage.set('');
    const request = userId
      ? this.postsService.getUserProfile(userId)
      : this.postsService.getMyProfile();

    request.subscribe({
      next: (response: unknown) => {
        const profile = this.readProfile(response);
        if (!profile) {
          console.error('Profile API returned an unexpected response', response);
          this.errorMessage.set('Profile data could not be loaded.');
          this.isLoading.set(false);
          return;
        }

        this.user.set(profile.user);
        this.isFollowing.set(profile.isFollowing);
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        console.error('Failed to load profile', error);
        this.errorMessage.set(this.getErrorMessage(error));
        this.isLoading.set(false);
      },
    });
  }

  toggleFollow(): void {
    const user = this.user();
    if (!user || this.isOwnProfile() || this.isUpdatingFollow()) {
      return;
    }

    this.isUpdatingFollow.set(true);
    this.errorMessage.set('');
    this.postsService.followUser(user._id).subscribe({
      next: () => {
        const wasFollowing = this.isFollowing();
        this.isFollowing.set(!wasFollowing);
        this.user.update((profile) => profile
          ? {
              ...profile,
              followersCount: Math.max(0, profile.followersCount + (wasFollowing ? -1 : 1)),
            }
          : null);
        this.isUpdatingFollow.set(false);
      },
      error: (error: unknown) => {
        console.error('Failed to update profile follow state', error);
        this.errorMessage.set(this.getErrorMessage(error));
        this.isUpdatingFollow.set(false);
      },
    });
  }

  formatDate(date: string | undefined): string {
    if (!date) {
      return '';
    }

    const parsedDate = new Date(date);
    return Number.isNaN(parsedDate.getTime())
      ? ''
      : new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).format(parsedDate);
  }

  private readProfile(response: unknown): { user: ProfileUser; isFollowing: boolean } | null {
    if (
      typeof response !== 'object'
      || response === null
      || !('data' in response)
      || typeof response.data !== 'object'
      || response.data === null
      || !('user' in response.data)
      || typeof response.data.user !== 'object'
      || response.data.user === null
    ) {
      return null;
    }

    const candidate = response.data.user;
    if (
      !('_id' in candidate)
      || typeof candidate._id !== 'string'
      || !('name' in candidate)
      || typeof candidate.name !== 'string'
      || !('username' in candidate)
      || typeof candidate.username !== 'string'
    ) {
      return null;
    }

    return {
      user: {
        _id: candidate._id,
        name: candidate.name,
        username: candidate.username,
        email: 'email' in candidate && typeof candidate.email === 'string' ? candidate.email : undefined,
        dateOfBirth: 'dateOfBirth' in candidate && typeof candidate.dateOfBirth === 'string'
          ? candidate.dateOfBirth
          : undefined,
        gender: 'gender' in candidate && typeof candidate.gender === 'string' ? candidate.gender : undefined,
        photo: 'photo' in candidate && typeof candidate.photo === 'string'
          ? candidate.photo
          : '/Images/default-profile.png',
        cover: 'cover' in candidate && typeof candidate.cover === 'string' ? candidate.cover : undefined,
        followersCount: 'followersCount' in candidate && typeof candidate.followersCount === 'number'
          ? candidate.followersCount
          : 0,
        followingCount: 'followingCount' in candidate && typeof candidate.followingCount === 'number'
          ? candidate.followingCount
          : 0,
        bookmarksCount: 'bookmarksCount' in candidate && typeof candidate.bookmarksCount === 'number'
          ? candidate.bookmarksCount
          : 0,
      },
      isFollowing: 'isFollowing' in response.data && Boolean(response.data.isFollowing),
    };
  }

  private readCurrentUserId(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const storedUser = localStorage.getItem('socialUser');
    if (!storedUser) {
      return null;
    }

    try {
      const currentUser: unknown = JSON.parse(storedUser);
      if (typeof currentUser !== 'object' || currentUser === null) {
        return null;
      }

      const record = currentUser as Record<string, unknown>;
      const id = record['_id'] ?? record['id'];
      return typeof id === 'string' ? id : null;
    } catch (error) {
      console.error('Failed to read the signed-in user from storage', error);
      return null;
    }
  }

  private getErrorMessage(error: unknown): string {
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
        return 'Your session may have expired. Sign in again and retry.';
      }
      return `The request failed (HTTP ${error.status}). Please try again.`;
    }

    return 'The request could not be completed. Please try again.';
  }
}
