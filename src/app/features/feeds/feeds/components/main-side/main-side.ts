import { Component, DestroyRef, HostListener, computed, inject, input, OnChanges, OnInit, signal, WritableSignal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { PostsService } from '../../../../../shared/services/posts/posts.service';
import { Iposts } from '../../../../../core/models/iposts.interface';
import { Comments } from '../comments/comments';
import { ReactiveFormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { firstValueFrom } from 'rxjs';

export type FeedSection = 'feed' | 'myPosts' | 'community' | 'saved';

@Component({
  selector: 'app-main-side',
  imports: [RouterLink, Comments, ReactiveFormsModule],
  templateUrl: './main-side.html',
  styleUrl: './main-side.css',
})
export class MainSide implements OnChanges, OnInit {
  private readonly postsService = inject(PostsService);
  private readonly destroyRef = inject(DestroyRef);
  readonly section = input<FeedSection>('feed');
  readonly profileUserId = input<string | null>(null);
  currentPage = signal(1);
  totalPage = signal(1);
  pageNumbers = computed(() => {
    const totalPages = this.totalPage();
    const currentPage = this.currentPage();
    const firstPage = Math.max(1, Math.min(currentPage - 4, totalPages - 8));
    const lastPage = Math.min(totalPages, firstPage + 8);

    return Array.from({ length: lastPage - firstPage + 1 }, (_, index) => firstPage + index);
  });
  allPosts: WritableSignal<Iposts[]> = signal([]);
  savedPosts = signal<Iposts[]>([]);
  visiblePosts = computed(() => {
    const posts = this.allPosts();

    switch (this.section()) {
      case 'myPosts': {
        const userId = this.profileUserId() ?? this.currentUserId;
        return userId ? posts.filter((post) => post.user._id === userId) : [];
      }
      case 'community':
        return posts.filter((post) => post.privacy.toLowerCase() === 'public');
      case 'saved':
        return posts.filter((post) => post.bookmarked);
      default:
        return posts;
    }
  });
  sectionTitle = computed(() => {
    switch (this.section()) {
      case 'myPosts':
        return 'My Posts';
      case 'community':
        return 'Community';
      case 'saved':
        return 'Saved Posts';
      default:
        return 'Your Feed';
    }
  });
  isLoading = signal(true);
  hasLoadError = signal(false);
  loadErrorMessage = signal('Posts could not be loaded. Please try again.');
  selectedImage = signal<string | null>(null);
  openPostMenuId = signal<string | null>(null);
  editingPostId = signal<string | null>(null);
  editingPostBody = signal('');
  postActionError = signal('');
  isSavingPost = signal(false);
  isDeletingPost = signal(false);
  bookmarkingPostId = signal<string | null>(null);
  likingPostId = signal<string | null>(null);
  sharingPostId = signal<string | null>(null);
  readonly currentUserId = this.readCurrentUserId();

  ngOnInit(): void {
    this.savedPosts.set(this.readSavedPosts());
    if (this.section() !== 'myPosts') {
      this.getAllPosts();
    }
    this.postsService.postCreated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.getAllPosts(this.currentPage()));
  }

  ngOnChanges(): void {
    if (this.section() === 'myPosts') {
      this.getAllPosts();
    }
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
      const user: unknown = JSON.parse(storedUser);
      if (typeof user !== 'object' || user === null) {
        return null;
      }

      const userRecord = user as Record<string, unknown>;
      const id = userRecord['_id'] ?? userRecord['id'];
      return typeof id === 'string' ? id : null;
    } catch (error) {
      console.error('Failed to read the signed-in user from storage', error);
      return null;
    }
  }

  getAllPosts(page:number=1) {
    this.isLoading.set(true);
    this.hasLoadError.set(false);
    this.loadErrorMessage.set('Posts could not be loaded. Please try again.');

    if (this.section() === 'saved') {
      this.loadSavedPosts();
      return;
    }

    const profileUserId = this.profileUserId() ?? this.currentUserId;
    const request = this.section() === 'feed'
      ? this.postsService.getHomeFeed(page, 10)
      : this.section() === 'myPosts' && profileUserId
        ? this.postsService.getUserPosts(profileUserId)
        : this.postsService.getAllPosts(page);

    request.subscribe({
      next: (res) => {
        const posts = this.readPostsResponse(res);
        if (!posts) {
          console.error('Posts API returned an unexpected response', res);
          this.loadErrorMessage.set('The posts server returned an unexpected response.');
          this.hasLoadError.set(true);
          this.isLoading.set(false);
          return;
        }

        const cachedSavedPosts = this.savedPosts();
        const cachedSavedIds = new Set(cachedSavedPosts.map((post) => post._id));
        const currentPosts = posts.map((post) => ({
          ...post,
          bookmarked: post.bookmarked || cachedSavedIds.has(post._id),
        }));
        const currentPostIds = new Set(currentPosts.map((post) => post._id));
        const savedPosts = [
          ...currentPosts.filter((post) => post.bookmarked),
          ...cachedSavedPosts.filter((post) => !currentPostIds.has(post._id)),
        ];
        this.savedPosts.set(savedPosts);
        this.persistSavedPosts(savedPosts);
        this.allPosts.set(currentPosts);
        const pagination = res?.meta?.pagination;
        this.currentPage.set(pagination?.currentPage ?? page);
        this.totalPage.set(pagination?.numberOfPages ?? 1);
        this.isLoading.set(false);
      },
      error: (err: unknown) => {
        console.error('Failed to load posts', err);
        this.loadErrorMessage.set(this.getPostsErrorMessage(err));
        this.hasLoadError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  private loadSavedPosts(): void {
    this.postsService.getMyBookmarks().subscribe({
      next: (response: unknown) => {
        const posts = this.readBookmarkedPosts(response);
        if (!posts) {
          console.error('Bookmarks API returned an unexpected response', response);
          this.loadErrorMessage.set('The saved posts server returned an unexpected response.');
          this.hasLoadError.set(true);
          this.isLoading.set(false);
          return;
        }

        const savedPosts = posts.map((post) => ({ ...post, bookmarked: true }));
        this.savedPosts.set(savedPosts);
        this.persistSavedPosts(savedPosts);
        this.allPosts.set(savedPosts);
        this.currentPage.set(1);
        this.totalPage.set(1);
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        console.error('Failed to load saved posts', error);
        this.loadErrorMessage.set(this.getPostsErrorMessage(error));
        this.hasLoadError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  private readBookmarkedPosts(response: unknown): Iposts[] | null {
    if (
      typeof response !== 'object'
      || response === null
      || !('data' in response)
      || typeof response.data !== 'object'
      || response.data === null
      || !('bookmarks' in response.data)
      || !Array.isArray(response.data.bookmarks)
    ) {
      return null;
    }

    return response.data.bookmarks.filter((post): post is Iposts =>
      typeof post === 'object'
      && post !== null
      && '_id' in post
      && typeof post._id === 'string'
      && 'user' in post
      && typeof post.user === 'object'
      && post.user !== null
      && 'name' in post.user
      && typeof post.user.name === 'string',
    );
  }

  private readPostsResponse(response: unknown): Iposts[] | null {
    if (typeof response !== 'object' || response === null || !('data' in response)) {
      return null;
    }

    const data = response.data;
    const posts = Array.isArray(data)
      ? data
      : typeof data === 'object' && data !== null && 'posts' in data
        ? data.posts
        : null;
    if (!Array.isArray(posts)) {
      return null;
    }

    return posts.filter((post): post is Iposts =>
      typeof post === 'object'
      && post !== null
      && '_id' in post
      && typeof post._id === 'string'
      && 'user' in post
      && typeof post.user === 'object'
      && post.user !== null
      && 'name' in post.user
      && typeof post.user.name === 'string',
    );
  }

  private readSinglePost(response: unknown): Iposts | null {
    if (typeof response !== 'object' || response === null || !('data' in response)) {
      return null;
    }

    const data = response.data;
    const post = typeof data === 'object' && data !== null && 'post' in data
      ? data.post
      : data;
    if (
      typeof post !== 'object'
      || post === null
      || !('_id' in post)
      || typeof post._id !== 'string'
      || !('user' in post)
      || typeof post.user !== 'object'
      || post.user === null
      || !('name' in post.user)
      || typeof post.user.name !== 'string'
    ) {
      return null;
    }

    return post as Iposts;
  }

  private getPostsErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Posts could not be loaded. Please try again.';
    }

    const responseBody: unknown = error.error;
    if (
      typeof responseBody === 'object'
      && responseBody !== null
      && 'message' in responseBody
      && typeof responseBody.message === 'string'
    ) {
      return responseBody.message;
    }

    if (error.status === 0) {
      return 'Could not reach the posts server. Check your connection and try again.';
    }
    if (error.status === 401) {
      return 'Your session is missing or expired. Sign in again, then reload the posts.';
    }
    if (error.status === 403) {
      return 'You do not have permission to view these posts.';
    }

    return `Posts could not be loaded (HTTP ${error.status}). Please try again.`;
  }

  startEditingPost(post: Iposts): void {
    this.openPostMenuId.set(null);
    this.editingPostId.set(post._id);
    this.editingPostBody.set(post.body ?? '');
    this.postActionError.set('');
  }

  togglePostMenu(event: MouseEvent, postId: string): void {
    event.stopPropagation();
    this.openPostMenuId.update((openId) => openId === postId ? null : postId);
  }

  closePostMenu(): void {
    this.openPostMenuId.set(null);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closePostMenu();
  }

  cancelEditingPost(): void {
    this.editingPostId.set(null);
    this.editingPostBody.set('');
    this.postActionError.set('');
  }

  updateEditingPostBody(event: Event): void {
    const textarea = event.target;
    if (textarea instanceof HTMLTextAreaElement) {
      this.editingPostBody.set(textarea.value);
    }
  }

  savePost(post: Iposts): void {
    const body = this.editingPostBody().trim();
    if (!body || this.isSavingPost()) {
      return;
    }

    this.isSavingPost.set(true);
    this.postActionError.set('');
    this.postsService.updatePost(post._id, { body }).subscribe({
      next: () => {
        this.allPosts.update((posts) =>
          posts.map((currentPost) => currentPost._id === post._id
            ? { ...currentPost, body }
            : currentPost),
        );
        this.cancelEditingPost();
        this.isSavingPost.set(false);
      },
      error: (error: unknown) => {
        console.error('Failed to update post', error);
        this.postActionError.set('This post could not be updated. Please try again.');
        this.isSavingPost.set(false);
      },
    });
  }

  async deletePost(post: Iposts): Promise<void> {
    this.closePostMenu();
    if (this.isDeletingPost()) {
      return;
    }

    this.isDeletingPost.set(true);
    this.postActionError.set('');
    try {
      const confirmation = await Swal.fire({
        title: 'Delete this post?',
        text: 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it',
        cancelButtonText: 'Keep post',
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#64748b',
        reverseButtons: true,
      });
      if (!confirmation.isConfirmed) {
        return;
      }

      await firstValueFrom(this.postsService.deletePosts(post._id));
      this.allPosts.update((posts) => posts.filter((currentPost) => currentPost._id !== post._id));
      await Swal.fire({
        title: 'Post deleted',
        icon: 'success',
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (error: unknown) {
      console.error('Failed to delete post', error);
      this.postActionError.set('This post could not be deleted. Please try again.');
      await Swal.fire({
        title: 'Could not delete post',
        text: 'Please try again.',
        icon: 'error',
        confirmButtonColor: '#2563eb',
      });
    } finally {
      this.isDeletingPost.set(false);
    }
  }

  toggleBookmark(post: Iposts): void {
    if (this.bookmarkingPostId()) {
      return;
    }

    this.closePostMenu();
    this.postActionError.set('');
    this.bookmarkingPostId.set(post._id);
    this.postsService.toggleBookmark(post._id).subscribe({
      next: () => {
        const isBookmarked = !this.savedPosts().some((savedPost) => savedPost._id === post._id);
        const updatedPost = { ...post, bookmarked: isBookmarked };
        this.allPosts.update((posts) =>
          posts.map((currentPost) => currentPost._id === post._id
            ? updatedPost
            : currentPost),
        );
        const savedPosts = isBookmarked
          ? [...this.savedPosts().filter((savedPost) => savedPost._id !== post._id), updatedPost]
          : this.savedPosts().filter((savedPost) => savedPost._id !== post._id);
        this.savedPosts.set(savedPosts);
        if (!this.persistSavedPosts(savedPosts)) {
          this.postActionError.set('The bookmark changed, but Saved Posts could not be synchronized in this browser.');
        }
        this.bookmarkingPostId.set(null);
      },
      error: (error: unknown) => {
        console.error('Failed to update post bookmark', error);
        this.postActionError.set(this.getBookmarkErrorMessage(error));
        this.bookmarkingPostId.set(null);
      },
    });
  }

  hasLikedPost(post: Iposts): boolean {
    return Boolean(this.currentUserId && post.likes?.includes(this.currentUserId));
  }

  togglePostLike(post: Iposts): void {
    if (this.likingPostId()) {
      return;
    }

    this.likingPostId.set(post._id);
    this.postsService.togglePostLike(post._id).subscribe({
      next: () => {
        const alreadyLiked = this.hasLikedPost(post);
        this.allPosts.update((posts) =>
          posts.map((currentPost) => {
            if (currentPost._id !== post._id) {
              return currentPost;
            }

            const likes = currentPost.likes ?? [];
            return {
              ...currentPost,
              likes: alreadyLiked
                ? likes.filter((userId) => userId !== this.currentUserId)
                : this.currentUserId
                  ? [...likes, this.currentUserId]
                  : likes,
              likesCount: Math.max(0, currentPost.likesCount + (alreadyLiked ? -1 : 1)),
            };
          }),
        );
        this.likingPostId.set(null);
      },
      error: (error: unknown) => {
        console.error('Failed to toggle post like', error);
        this.postActionError.set(this.getBookmarkErrorMessage(error));
        this.likingPostId.set(null);
      },
    });
  }

  sharePost(post: Iposts): void {
    if (this.sharingPostId()) {
      return;
    }

    this.sharingPostId.set(post._id);
    this.postActionError.set('');
    this.postsService.sharePost(post._id).subscribe({
      next: () => {
        this.sharingPostId.set(null);
        this.postsService.notifyPostCreated();
        void Swal.fire({
          title: 'Post shared',
          text: 'This post was added to your feed.',
          icon: 'success',
          timer: 1600,
          showConfirmButton: false,
        });
      },
      error: (error: unknown) => {
        console.error('Failed to share post', error);
        this.postActionError.set(this.getBookmarkErrorMessage(error));
        this.sharingPostId.set(null);
      },
    });
  }

  private readSavedPosts(): Iposts[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    const savedPostsKey = this.getSavedPostsStorageKey();
    if (!savedPostsKey) {
      return [];
    }

    const storedPosts = localStorage.getItem(savedPostsKey);
    if (!storedPosts) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(storedPosts);
      if (!Array.isArray(parsed)) {
        throw new Error('Saved posts storage is not an array.');
      }

      return parsed.filter((post): post is Iposts =>
        typeof post === 'object'
        && post !== null
        && '_id' in post
        && typeof post._id === 'string'
        && 'user' in post
        && typeof post.user === 'object'
        && post.user !== null
        && 'name' in post.user
        && typeof post.user.name === 'string',
      );
    } catch (error) {
      console.error('Failed to read saved posts from storage', error);
      return [];
    }
  }

  private persistSavedPosts(posts: Iposts[]): boolean {
    if (typeof localStorage === 'undefined') {
      return false;
    }

    const savedPostsKey = this.getSavedPostsStorageKey();
    if (!savedPostsKey) {
      return false;
    }

    try {
      localStorage.setItem(savedPostsKey, JSON.stringify(posts));
      return true;
    } catch (error) {
      console.error('Failed to persist saved posts', error);
      return false;
    }
  }

  private getSavedPostsStorageKey(): string | null {
    return this.currentUserId ? `socialSavedPosts:${this.currentUserId}` : null;
  }

  private getBookmarkErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const responseBody: unknown = error.error;
      if (
        typeof responseBody === 'object'
        && responseBody !== null
        && 'message' in responseBody
        && typeof responseBody.message === 'string'
      ) {
        return responseBody.message;
      }

      if (error.status === 0) {
        return 'Could not reach the posts server. Check your connection and try again.';
      }
      if (error.status === 401 || error.status === 403) {
        return 'Your session may have expired. Sign in again and retry.';
      }

      return `This post could not be saved (HTTP ${error.status}). Please try again.`;
    }

    return 'This post could not be saved. Please try again.';
  }


  nextPage(){
    if(this.currentPage() < this.totalPage()){
          this.getAllPosts(this.currentPage()+1)
    }
  }
  previousPage(){
    if(this.currentPage() >1){
          this.getAllPosts(this.currentPage()-1)
    }
  }

  formatPostAge(createdAt: string): string {
    const postDate = new Date(createdAt);
    const elapsedMilliseconds = Date.now() - postDate.getTime();

    if (Number.isNaN(postDate.getTime())) {
      return 'Unknown date';
    }

    if (elapsedMilliseconds < 0) {
      return 'now';
    }

    const elapsedMinutes = Math.floor(elapsedMilliseconds / 60_000);
    if (elapsedMinutes < 1) {
      return 'now';
    }
    if (elapsedMinutes < 60) {
      return `${elapsedMinutes}m`;
    }

    const elapsedHours = Math.floor(elapsedMinutes / 60);
    if (elapsedHours < 24) {
      return `${elapsedHours}h`;
    }

    const elapsedDays = Math.floor(elapsedHours / 24);
    if (elapsedDays < 30) {
      return `${elapsedDays}d`;
    }

    const elapsedMonths = Math.floor(elapsedDays / 30);
    if (elapsedMonths < 12) {
      return `${elapsedMonths}mo`;
    }

    return `${Math.floor(elapsedMonths / 12)}y`;
  }

  getOriginalPostId(sharedPost: Iposts['sharedPost']): string | null {
    if (typeof sharedPost === 'string') {
      return sharedPost || null;
    }

    if (sharedPost && typeof sharedPost === 'object') {
      return sharedPost._id ?? sharedPost.id ?? null;
    }

    return null;
  }

  getSharedPostDetails(
    sharedPost: Iposts['sharedPost'],
  ): Exclude<Iposts['sharedPost'], string | null> | null {
    return typeof sharedPost === 'object' ? sharedPost : null;
  }

  scrollToPost(event: MouseEvent, postId: string): void {
    event.preventDefault();
    const originalPost = document.getElementById(`post-${postId}`);
    originalPost?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  openImage(event: MouseEvent, imageUrl: string | undefined): void {
    event.preventDefault();
    if (imageUrl) {
      this.selectedImage.set(imageUrl);
    }
  }

  closeImage(): void {
    this.selectedImage.set(null);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeImage();
    this.closePostMenu();
  }
}
