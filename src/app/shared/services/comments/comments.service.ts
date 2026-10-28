import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CommentsService {
  private readonly httpClient = inject(HttpClient);

  getPostComments(postId: string, page = 1, limit = 10): Observable<unknown> {
    const headers = this.getAuthorizationHeaders();
    if (!headers) {
      return throwError(() => new Error('Sign in to view comments.'));
    }

    return this.httpClient.get<unknown>(
      `${environment.baseURL}/posts/${encodeURIComponent(postId)}/comments?page=${page}&limit=${limit}`,
      { headers },
    );
  }

  createComment(postId: string, content: string): Observable<unknown> {
    const headers = this.getAuthorizationHeaders();
    if (!headers) {
      return throwError(() => new Error('Sign in to post a comment.'));
    }

    return this.httpClient.post<unknown>(
      `${environment.baseURL}/posts/${encodeURIComponent(postId)}/comments`,
      { content },
      { headers },
    );
  }

  getCommentReplies(postId: string, commentId: string, page = 1, limit = 10): Observable<unknown> {
    const headers = this.getAuthorizationHeaders();
    if (!headers) {
      return throwError(() => new Error('Sign in to view replies.'));
    }

    return this.httpClient.get<unknown>(
      `${environment.baseURL}/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/replies?page=${page}&limit=${limit}`,
      { headers },
    );
  }

  createCommentReply(postId: string, commentId: string, content: string): Observable<unknown> {
    const headers = this.getAuthorizationHeaders();
    if (!headers) {
      return throwError(() => new Error('Sign in to reply to a comment.'));
    }

    return this.httpClient.post<unknown>(
      `${environment.baseURL}/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/replies`,
      { content },
      { headers },
    );
  }

  updateComment(postId: string, commentId: string, content: string): Observable<unknown> {
    const headers = this.getAuthorizationHeaders();
    if (!headers) {
      return throwError(() => new Error('Sign in to update a comment.'));
    }

    return this.httpClient.put<unknown>(
      `${environment.baseURL}/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
      { content },
      { headers },
    );
  }

  deleteComment(postId: string, commentId: string): Observable<unknown> {
    const headers = this.getAuthorizationHeaders();
    if (!headers) {
      return throwError(() => new Error('Sign in to delete a comment.'));
    }

    return this.httpClient.delete<unknown>(
      `${environment.baseURL}/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
      { headers },
    );
  }

  toggleCommentLike(postId: string, commentId: string): Observable<unknown> {
    const headers = this.getAuthorizationHeaders();
    if (!headers) {
      return throwError(() => new Error('Sign in to like a comment.'));
    }

    return this.httpClient.put<unknown>(
      `${environment.baseURL}/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/like`,
      {},
      { headers },
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
