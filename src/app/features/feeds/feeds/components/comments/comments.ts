import { Component, inject, input, InputSignal, OnInit, signal, WritableSignal } from '@angular/core';
import { CommentsService } from '../../../../../shared/services/comments/comments.service';
import { Icomments } from '../../../../../core/models/icomments.interface';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

interface CommentReply {
  _id: string;
  content: string;
  commentCreator: Icomments['commentCreator'];
  createdAt: string;
  likes: unknown[];
}

@Component({
  selector: 'app-comments',
  imports: [ReactiveFormsModule],
  templateUrl: './comments.html',
  styleUrl: './comments.css',
})
export class Comments implements OnInit{
  private readonly commentsService = inject(CommentsService)
  postId:InputSignal<string>= input.required()
  comments:WritableSignal<Icomments[]> = signal([])
  isLoading = signal(false)
  hasLoadError = signal(false)
  isSubmitting = signal(false)
  submitError = signal('')
  editError = signal('')
  editingCommentId = signal<string | null>(null)
  isUpdating = signal(false)
  deletingCommentId = signal<string | null>(null)
  likingCommentId = signal<string | null>(null)
  likeError = signal('')
  loadingRepliesCommentId = signal<string | null>(null)
  replyingToCommentId = signal<string | null>(null)
  repliesByComment = signal<Record<string, CommentReply[]>>({})
  expandedReplies = signal<string[]>([])
  replyError = signal('')
  replyContent = new FormControl('', { nonNullable: true })
  commentContent = new FormControl('', { nonNullable: true })
  editContent = new FormControl('', { nonNullable: true })
  private readonly currentUserId = this.readCurrentUserId()

  ngOnInit(): void {
    this.getPostComment()
  }

  getPostComment(){
    this.isLoading.set(true)
    this.hasLoadError.set(false)

    this.commentsService.getPostComments(this.postId()).subscribe({
      next:(res)=>{
        const response: unknown = res
        const data = this.isRecord(response) && this.isRecord(response['data'])
          ? response['data']
          : null
        const comments = data
          ? data['comments'] ?? data['Comments']
          : null

        if (!this.isCommentArray(comments)) {
          console.error('Failed to load comments: unexpected response format', res)
          this.hasLoadError.set(true)
          this.isLoading.set(false)
          return
        }

        this.comments.set(comments)
        this.isLoading.set(false)
      },
      error:(err)=>{
        console.error('Failed to load comments', err)
        this.hasLoadError.set(true)
        this.isLoading.set(false)
      }
    })
  }

  submitComment(event: SubmitEvent): void {
    event.preventDefault();
    const content = this.commentContent.value.trim();
    if (!content || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set('');
    this.commentsService.createComment(this.postId(), content).subscribe({
      next: () => {
        this.commentContent.reset('');
        this.isSubmitting.set(false);
        this.getPostComment();
      },
      error: (error: unknown) => {
        console.error('Failed to post comment', error);
        this.submitError.set(this.getActionErrorMessage(error));
        this.isSubmitting.set(false);
      },
    });
  }

  isOwnComment(comment: Icomments): boolean {
    return this.currentUserId !== null && comment.commentCreator._id === this.currentUserId
  }

  hasLikedComment(comment: Icomments): boolean {
    if (!this.currentUserId) {
      return false;
    }
    return comment.likes.some((like) => this.getLikeUserId(like) === this.currentUserId);
  }

  toggleCommentLike(comment: Icomments): void {
    if (this.likingCommentId()) {
      return;
    }

    this.likingCommentId.set(comment._id);
    this.likeError.set('');
    this.commentsService.toggleCommentLike(this.postId(), comment._id).subscribe({
      next: (response: unknown) => {
        const updatedComment = this.readCommentFromResponse(response);
        if (!updatedComment && !this.currentUserId) {
          this.likingCommentId.set(null);
          this.getPostComment();
          return;
        }
        const liked = updatedComment
          ? this.hasLikedComment(updatedComment)
          : !this.hasLikedComment(comment);
        this.comments.update((comments) => comments.map((currentComment) => {
          if (currentComment._id !== comment._id) {
            return currentComment;
          }

          const likes = updatedComment?.likes ?? currentComment.likes;
          if (updatedComment) {
            return updatedComment;
          }

          const nextLikes = liked
            ? [...likes, this.currentUserId]
            : likes.filter((like) => this.getLikeUserId(like) !== this.currentUserId);
          return { ...currentComment, likes: nextLikes };
        }));
        this.likingCommentId.set(null);
      },
      error: (error: unknown) => {
        console.error('Failed to toggle comment like', error);
        this.likeError.set(this.getActionErrorMessage(
          error,
          'Your comment could not be liked. Please try again.',
        ));
        this.likingCommentId.set(null);
      },
    });
  }

  toggleReplies(comment: Icomments): void {
    if (this.loadingRepliesCommentId() === comment._id) {
      return;
    }

    if (this.repliesByComment()[comment._id]) {
      this.expandedReplies.update((expanded) =>
        expanded.includes(comment._id)
          ? expanded.filter((id) => id !== comment._id)
          : [...expanded, comment._id],
      );
      return;
    }

    this.loadingRepliesCommentId.set(comment._id);
    this.replyError.set('');
    this.commentsService.getCommentReplies(this.postId(), comment._id, 1, 10).subscribe({
      next: (response: unknown) => {
        const replies = this.readReplies(response);
        if (!replies) {
          console.error('Replies API returned an unexpected response', response);
          this.replyError.set('Replies could not be loaded.');
          this.loadingRepliesCommentId.set(null);
          return;
        }

        this.repliesByComment.update((allReplies) => ({
          ...allReplies,
          [comment._id]: replies,
        }));
        this.expandedReplies.update((expanded) =>
          expanded.includes(comment._id) ? expanded : [...expanded, comment._id],
        );
        this.loadingRepliesCommentId.set(null);
      },
      error: (error: unknown) => {
        console.error('Failed to load comment replies', error);
        this.replyError.set(this.getActionErrorMessage(error));
        this.loadingRepliesCommentId.set(null);
      },
    });
  }

  startReply(comment: Icomments): void {
    if (!this.repliesByComment()[comment._id]) {
      this.toggleReplies(comment);
    }
    this.replyingToCommentId.set(comment._id);
    this.replyContent.reset('');
    this.replyError.set('');
  }

  submitReply(event: SubmitEvent, comment: Icomments): void {
    event.preventDefault();
    const content = this.replyContent.value.trim();
    if (!content || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.replyError.set('');
    this.commentsService.createCommentReply(this.postId(), comment._id, content).subscribe({
      next: (response: unknown) => {
        const reply = this.readReplyFromResponse(response);
        if (reply) {
          this.repliesByComment.update((allReplies) => ({
            ...allReplies,
            [comment._id]: [...(allReplies[comment._id] ?? []), reply],
          }));
        } else {
          this.repliesByComment.update((allReplies) => {
            const { [comment._id]: _removed, ...remainingReplies } = allReplies;
            return remainingReplies;
          });
          this.toggleReplies(comment);
        }
        this.comments.update((comments) => comments.map((currentComment) =>
          currentComment._id === comment._id
            ? { ...currentComment, repliesCount: (currentComment.repliesCount ?? 0) + 1 }
            : currentComment,
        ));
        this.replyContent.reset('');
        this.isSubmitting.set(false);
      },
      error: (error: unknown) => {
        console.error('Failed to post comment reply', error);
        this.replyError.set(this.getActionErrorMessage(
          error,
          'Your reply could not be posted. Please try again.',
        ));
        this.isSubmitting.set(false);
      },
    });
  }

  private getLikeUserId(like: unknown): string | null {
    if (typeof like === 'string') {
      return like;
    }
    if (this.isRecord(like)) {
      const id = like['_id'] ?? like['id'];
      return typeof id === 'string' ? id : null;
    }
    return null;
  }

  private readReplies(response: unknown): CommentReply[] | null {
    if (!this.isRecord(response) || !this.isRecord(response['data'])) {
      return null;
    }

    const data = response['data'];
    const replies = data['replies'] ?? data['comments'] ?? data['Replies'];
    return Array.isArray(replies) && replies.every((reply) => this.isCommentReply(reply))
      ? replies
      : null;
  }

  private readReplyFromResponse(response: unknown): CommentReply | null {
    if (!this.isRecord(response) || !this.isRecord(response['data'])) {
      return null;
    }

    const data = response['data'];
    const reply = data['reply'] ?? data['comment'];
    return this.isCommentReply(reply) ? reply : null;
  }

  private readCommentFromResponse(response: unknown): Icomments | null {
    if (!this.isRecord(response) || !this.isRecord(response['data'])) {
      return null;
    }

    const data = response['data'];
    const comment = data['comment'];
    return this.isComment(comment) ? comment : null;
  }

  private isCommentReply(value: unknown): value is CommentReply {
    return this.isRecord(value)
      && typeof value['_id'] === 'string'
      && typeof value['content'] === 'string'
      && typeof value['createdAt'] === 'string'
      && Array.isArray(value['likes'])
      && this.isRecord(value['commentCreator'])
      && typeof value['commentCreator']['_id'] === 'string'
      && typeof value['commentCreator']['name'] === 'string'
      && typeof value['commentCreator']['username'] === 'string'
      && typeof value['commentCreator']['photo'] === 'string';
  }

  startEditing(comment: Icomments): void {
    this.editingCommentId.set(comment._id)
    this.editContent.setValue(comment.content)
    this.editError.set('')
  }

  cancelEditing(): void {
    this.editingCommentId.set(null)
    this.editContent.reset('')
    this.editError.set('')
  }

  updateComment(event: SubmitEvent, comment: Icomments): void {
    event.preventDefault()
    const content = this.editContent.value.trim()
    if (!content || this.isUpdating()) {
      return
    }

    this.isUpdating.set(true)
    this.editError.set('')
    this.commentsService.updateComment(this.postId(), comment._id, content).subscribe({
      next: () => {
        this.cancelEditing()
        this.isUpdating.set(false)
        this.getPostComment()
      },
      error: (error: unknown) => {
        console.error('Failed to update comment', error)
        this.editError.set(this.getActionErrorMessage(error))
        this.isUpdating.set(false)
      },
    })
  }

  deleteComment(comment: Icomments): void {
    if (
      this.deletingCommentId() !== null
      || (typeof window !== 'undefined' && !window.confirm('Delete this comment?'))
    ) {
      return
    }

    this.submitError.set('')
    this.deletingCommentId.set(comment._id)
    this.commentsService.deleteComment(this.postId(), comment._id).subscribe({
      next: () => {
        this.deletingCommentId.set(null)
        this.getPostComment()
      },
      error: (error: unknown) => {
        console.error('Failed to delete comment', error)
        this.submitError.set(this.getActionErrorMessage(error))
        this.deletingCommentId.set(null)
      },
    })
  }

  private getActionErrorMessage(
    error: unknown,
    fallback = 'Your comment could not be posted. Please try again.',
  ): string {
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
        return 'Could not reach the comments server. Check your connection and try again.';
      }
      if (error.status === 401 || error.status === 403) {
        return 'Your session may have expired. Sign in again and retry.';
      }
      return `${fallback.replace(/ Please try again\.$/, '')} (HTTP ${error.status}). Please try again.`;
    }

    return fallback;
  }

  private readCurrentUserId(): string | null {
    if (typeof localStorage === 'undefined') {
      return null
    }

    const storedUser = localStorage.getItem('socialUser')
    if (!storedUser) {
      return null
    }

    try {
      const user: unknown = JSON.parse(storedUser)
      if (!this.isRecord(user)) {
        return null
      }

      const id = user['_id'] ?? user['id']
      return typeof id === 'string' ? id : null
    } catch (error) {
      console.error('Failed to read the signed-in user from storage', error)
      return null
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
  }

  private isCommentArray(value: unknown): value is Icomments[] {
    return Array.isArray(value) && value.every((comment) => this.isComment(comment))
  }

  private isComment(value: unknown): value is Icomments {
    if (!this.isRecord(value) || !this.isRecord(value['commentCreator'])) {
      return false
    }

    const creator = value['commentCreator']
    return typeof value['_id'] === 'string'
      && typeof value['content'] === 'string'
      && (value['image'] === undefined || typeof value['image'] === 'string')
      && Array.isArray(value['likes'])
      && typeof value['createdAt'] === 'string'
      && typeof creator['_id'] === 'string'
      && typeof creator['name'] === 'string'
      && typeof creator['username'] === 'string'
      && typeof creator['photo'] === 'string'
  }

  formatCommentAge(createdAt: string): string {
    const date = new Date(createdAt)
    const elapsedMilliseconds = Date.now() - date.getTime()

    if (Number.isNaN(date.getTime())) {
      return 'Unknown date'
    }
    if (elapsedMilliseconds < 60_000) {
      return 'now'
    }

    const elapsedMinutes = Math.floor(elapsedMilliseconds / 60_000)
    if (elapsedMinutes < 60) {
      return `${elapsedMinutes}m`
    }

    const elapsedHours = Math.floor(elapsedMinutes / 60)
    if (elapsedHours < 24) {
      return `${elapsedHours}h`
    }

    const elapsedDays = Math.floor(elapsedHours / 24)
    return elapsedDays < 30 ? `${elapsedDays}d` : date.toLocaleDateString()
  }
}
