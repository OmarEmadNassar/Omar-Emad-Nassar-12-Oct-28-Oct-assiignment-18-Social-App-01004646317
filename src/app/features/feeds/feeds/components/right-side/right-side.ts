import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PostsService } from '../../../../../shared/services/posts/posts.service';

interface SuggestedUser {
  _id: string;
  name: string;
  username: string;
  photo: string;
  followersCount: number;
  isFollowing: boolean;
}

@Component({
  selector: 'app-right-side',
  imports: [RouterLink],
  templateUrl: './right-side.html',
  styleUrl: './right-side.css',
})
export class RightSide implements OnInit {
  private readonly suggestionsPageSize = 10;
  private readonly postsService = inject(PostsService);
  isExpanded = true;
  isLoading = signal(true);
  isLoadingMore = signal(false);
  hasMoreSuggestions = signal(true);
  errorMessage = signal('');
  loadMoreError = signal('');
  searchTerm = signal('');
  followingUserId = signal<string | null>(null);
  suggestions = signal<SuggestedUser[]>([]);
  private currentSuggestionsPage = 0;
  visibleSuggestions = () => {
    const search = this.searchTerm().trim().toLowerCase();
    return this.suggestions().filter((user) =>
      !search || user.name.toLowerCase().includes(search) || user.username.toLowerCase().includes(search),
    );
  };

  ngOnInit(): void {
    this.loadSuggestions();
  }

  loadSuggestions(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.currentSuggestionsPage = 0;
    this.hasMoreSuggestions.set(true);
    this.postsService.getSuggestedUsers(this.suggestionsPageSize, 1).subscribe({
      next: (response: unknown) => {
        const result = this.readSuggestionPage(response);
        if (!result) {
          console.error('Suggested users API returned an unexpected response', response);
          this.errorMessage.set('Suggested friends could not be loaded.');
          this.isLoading.set(false);
          return;
        }

        this.suggestions.set(result.users);
        this.currentSuggestionsPage = result.currentPage;
        this.hasMoreSuggestions.set(result.hasMore);
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        console.error('Failed to load suggested users', error);
        this.errorMessage.set('Suggested friends could not be loaded. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  loadMoreSuggestions(): void {
    if (this.isLoadingMore() || !this.hasMoreSuggestions()) {
      return;
    }

    const nextPage = this.currentSuggestionsPage + 1;
    this.isLoadingMore.set(true);
    this.loadMoreError.set('');
    this.postsService.getSuggestedUsers(this.suggestionsPageSize, nextPage).subscribe({
      next: (response: unknown) => {
        const result = this.readSuggestionPage(response);
        if (!result) {
          console.error('Suggested users API returned an unexpected response', response);
          this.loadMoreError.set('More suggested friends could not be loaded.');
          this.isLoadingMore.set(false);
          return;
        }

        this.suggestions.update((currentUsers) => {
          const knownUserIds = new Set(currentUsers.map((user) => user._id));
          return [
            ...currentUsers,
            ...result.users.filter((user) => !knownUserIds.has(user._id)),
          ];
        });
        this.currentSuggestionsPage = result.currentPage;
        this.hasMoreSuggestions.set(result.hasMore);
        this.isLoadingMore.set(false);
      },
      error: (error: unknown) => {
        console.error('Failed to load more suggested users', error);
        this.loadMoreError.set('More suggested friends could not be loaded. Please try again.');
        this.isLoadingMore.set(false);
      },
    });
  }

  follow(user: SuggestedUser): void {
    if (this.followingUserId()) {
      return;
    }

    this.followingUserId.set(user._id);
    this.errorMessage.set('');
    this.postsService.followUser(user._id).subscribe({
      next: () => {
        this.suggestions.update((users) => users.map((suggestion) =>
          suggestion._id === user._id
            ? {
                ...suggestion,
                isFollowing: !suggestion.isFollowing,
                followersCount: suggestion.followersCount + (suggestion.isFollowing ? -1 : 1),
              }
            : suggestion,
        ));
        this.followingUserId.set(null);
      },
      error: (error: unknown) => {
        console.error('Failed to follow suggested user', error);
        this.errorMessage.set('Could not update this follow. Please try again.');
        this.followingUserId.set(null);
      },
    });
  }

  private readSuggestionPage(
    response: unknown,
  ): { users: SuggestedUser[]; currentPage: number; hasMore: boolean } | null {
    if (typeof response !== 'object' || response === null || !('data' in response)) {
      return null;
    }

    const data = response.data;
    const candidates = Array.isArray(data)
      ? data
      : typeof data === 'object' && data !== null
        ? ('suggestions' in data ? data.suggestions : 'users' in data ? data.users : null)
        : null;
    if (!Array.isArray(candidates)) {
      return null;
    }

    const users = candidates.filter((candidate): candidate is SuggestedUser =>
      typeof candidate === 'object'
      && candidate !== null
      && '_id' in candidate
      && typeof candidate._id === 'string'
      && 'name' in candidate
      && typeof candidate.name === 'string',
    ).map((candidate) => {
      const user = candidate as SuggestedUser & Record<string, unknown>;
      return {
        _id: user._id,
        name: user.name,
        username: typeof user.username === 'string' ? user.username : '',
        photo: typeof user.photo === 'string' ? user.photo : '/Images/default-profile.png',
        followersCount: typeof user.followersCount === 'number' ? user.followersCount : 0,
        isFollowing: Boolean(user.isFollowing),
      };
    });

    const pagination = 'meta' in response
      && typeof response.meta === 'object'
      && response.meta !== null
      && 'pagination' in response.meta
      && typeof response.meta.pagination === 'object'
      && response.meta.pagination !== null
      ? response.meta.pagination
      : null;
    const currentPage = pagination && 'currentPage' in pagination
      && typeof pagination.currentPage === 'number'
      ? pagination.currentPage
      : this.currentSuggestionsPage + 1;
    const totalPages = pagination && 'numberOfPages' in pagination
      && typeof pagination.numberOfPages === 'number'
      ? pagination.numberOfPages
      : null;

    return {
      users,
      currentPage,
      hasMore: totalPages !== null
        ? currentPage < totalPages
        : candidates.length >= this.suggestionsPageSize,
    };
  }
}
