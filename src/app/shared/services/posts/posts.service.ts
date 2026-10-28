import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PostsService {
  private readonly httpClient = inject(HttpClient);
  private readonly postCreatedSubject = new Subject<void>();
  readonly postCreated$ = this.postCreatedSubject.asObservable();

  notifyPostCreated(): void {
    this.postCreatedSubject.next();
  }

  createPost(body: FormData): Observable<unknown> {
    const headers = this.getAuthorizationHeaders();
    return this.httpClient.post(
      `${environment.baseURL}/posts`,
      body,
      headers ? { headers } : {},
    );
  }

  getAllPosts(page = 1): Observable<any> {
    const headers = this.getAuthorizationHeaders();
    return this.httpClient.get(
      `${environment.baseURL}/posts${page > 1 ? `?page=${page}` : ''}`,
      headers ? { headers } : {},
    );
  }

  getHomeFeed(page = 1, limit = 10): Observable<any> {
    const headers = this.getAuthorizationHeaders();
    return this.httpClient.get(
      `${environment.baseURL}/posts/feed?only=following&page=${page}&limit=${limit}`,
      headers ? { headers } : {},
    );
  }

  getMyProfile(): Observable<unknown> {
    const headers = this.getAuthorizationHeaders();
    return this.httpClient.get(
      `${environment.baseURL}/users/profile-data`,
      headers ? { headers } : {},
    );
  }

  getMyBookmarks(): Observable<unknown> {
    const headers = this.getAuthorizationHeaders();
    return this.httpClient.get(
      `${environment.baseURL}/users/bookmarks`,
      headers ? { headers } : {},
    );
  }

  getUserProfile(userId: string): Observable<unknown> {
    const headers = this.getAuthorizationHeaders();
    return this.httpClient.get(
      `${environment.baseURL}/users/${encodeURIComponent(userId)}/profile`,
      headers ? { headers } : {},
    );
  }

  getSuggestedUsers(limit = 10, page = 1): Observable<unknown> {
    const headers = this.getAuthorizationHeaders();
    return this.httpClient.get(
      `${environment.baseURL}/users/suggestions?page=${page}&limit=${limit}`,
      headers ? { headers } : {},
    );
  }

  followUser(userId: string): Observable<unknown> {
    const headers = this.getAuthorizationHeaders();
    return this.httpClient.put(
      `${environment.baseURL}/users/${encodeURIComponent(userId)}/follow`,
      {},
      headers ? { headers } : {},
    );
  }

  getUserPosts(userId: string): Observable<unknown> {
    const headers = this.getAuthorizationHeaders();
    return this.httpClient.get(
      `${environment.baseURL}/users/${encodeURIComponent(userId)}/posts`,
      headers ? { headers } : {},
    );
  }

  creatPosts(body: any): Observable<any> {
    const headers = this.getAuthorizationHeaders();
    return this.httpClient.post(
      `${environment.baseURL}/posts`,
      body,
      headers ? { headers } : {},
    );
  }

  getSinglePosts(postId: string | number): Observable<any> {
    const headers = this.getAuthorizationHeaders();
    return this.httpClient.get(
      `${environment.baseURL}/posts/${encodeURIComponent(String(postId))}`,
      headers ? { headers } : {},
    );
  }

  updatePost(postId: string | number, body: { body: string }): Observable<unknown> {
    const headers = this.getAuthorizationHeaders();
    return this.httpClient.put(
      `${environment.baseURL}/posts/${encodeURIComponent(String(postId))}`,
      body,
      headers ? { headers } : {},
    );
  }

  deletePosts(postId: string | number): Observable<any> {
    const headers = this.getAuthorizationHeaders();
    return this.httpClient.delete(
      `${environment.baseURL}/posts/${encodeURIComponent(String(postId))}`,
      headers ? { headers } : {},
    );
  }

  toggleBookmark(postId: string | number): Observable<unknown> {
    const headers = this.getAuthorizationHeaders();
    return this.httpClient.put(
      `${environment.baseURL}/posts/${encodeURIComponent(String(postId))}/bookmark`,
      {},
      headers ? { headers } : {},
    );
  }

  togglePostLike(postId: string | number): Observable<unknown> {
    const headers = this.getAuthorizationHeaders();
    return this.httpClient.put(
      `${environment.baseURL}/posts/${encodeURIComponent(String(postId))}/like`,
      {},
      headers ? { headers } : {},
    );
  }

  sharePost(postId: string | number): Observable<unknown> {
    const headers = this.getAuthorizationHeaders();
    return this.httpClient.post(
      `${environment.baseURL}/posts/${encodeURIComponent(String(postId))}/share`,
      {},
      headers ? { headers } : {},
    );
  }

  private getAuthorizationHeaders(): HttpHeaders | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const token = localStorage.getItem('socialToken')?.trim();
    if (!token) {
      return null;
    }

    const authorization = /^Bearer\s/i.test(token) ? token : `Bearer ${token}`;
    return new HttpHeaders({ Authorization: authorization });
  }
}
