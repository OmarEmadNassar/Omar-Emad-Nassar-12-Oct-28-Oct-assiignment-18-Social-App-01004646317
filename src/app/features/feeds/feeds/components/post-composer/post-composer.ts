import { Component, ElementRef, inject, OnDestroy, signal, viewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import type { EmojiMartData } from '@emoji-mart/data';
import { PostsService } from '../../../../../shared/services/posts/posts.service';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

interface AccountOwner {
  name: string;
  photo: string;
}

@Component({
  selector: 'app-post-composer',
  imports: [ReactiveFormsModule],
  templateUrl: './post-composer.html',
  styleUrl: './post-composer.css',
})
export class PostComposer implements OnDestroy {
  private readonly postsService = inject(PostsService);
  readonly accountOwner = signal<AccountOwner>({
    name: 'Your name',
    photo: '/Images/default-profile.png',
  });
  readonly selectedMedia = signal<File | null>(null);
  readonly selectedMediaPreview = signal<string | null>(null);
  readonly selectedFeeling = signal('');
  readonly showFeelingOptions = signal(false);
  readonly mediaError = signal('');
  readonly postError = signal('');
  readonly postSuccess = signal('');
  readonly isPosting = signal(false);
  readonly emojiPickerError = signal('');
  readonly postText = signal('');
  private readonly emojiPickerHost = viewChild<ElementRef<HTMLDivElement>>('emojiPickerHost');
  private readonly feelingButton = viewChild<ElementRef<HTMLButtonElement>>('feelingButton');
  private pickerElement: Node | null = null;
  private emojiPickerDependencies:
    | Promise<[EmojiMartData, typeof import('emoji-mart')]>
    | null = null;

  postBody = new FormControl('', { nonNullable: true });
  postPrivacy = new FormControl('public', { nonNullable: true });

  constructor() {
    this.loadAccountOwner();
  }

  ngOnDestroy(): void {
    this.releaseMediaPreview();
  }

  postPlaceholder(): string {
    return `What's on your mind, ${this.accountOwner().name.split(" ")[0]}?`;
  }

  onMediaSelected(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const file = input.files?.[0] ?? null;
    this.mediaError.set('');
    if (file && !file.type.startsWith('image/')) {
      this.selectedMedia.set(null);
      this.releaseMediaPreview();
      this.mediaError.set('Choose an image file.');
      input.value = '';
      return;
    }

    this.selectedMedia.set(file);
    this.releaseMediaPreview();
    if (file) {
      this.selectedMediaPreview.set(URL.createObjectURL(file));
    }
  }

  updatePostText(event: Event): void {
    const textarea = event.target;
    if (textarea instanceof HTMLTextAreaElement) {
      this.postText.set(textarea.value);
      this.postBody.setValue(textarea.value);
      this.postError.set('');
    }
  }

  submitPost(
    event: SubmitEvent,
    textarea: HTMLTextAreaElement,
    mediaInput: HTMLInputElement,
  ): void {
    event.preventDefault();
    const body = textarea.value.trim();
    const image = this.selectedMedia();
    if (this.isPosting()) {
      return;
    }
    if (!body && !image) {
      this.postError.set('Write something or add a photo before posting.');
      return;
    }

    const formData = new FormData();
    formData.append('body', body);
    if (image) {
      formData.append('image', image);
    }
    formData.append('privacy', this.postPrivacy.value);

    this.isPosting.set(true);
    this.postError.set('');
    this.postSuccess.set('');
    this.postsService.createPost(formData).subscribe({
      next: (res) => {
        this.postsService.notifyPostCreated();
        this.postText.set('');
        this.postBody.reset('');
        this.postPrivacy.reset('public');
        textarea.value = '';
        this.selectedMedia.set(null);
        this.releaseMediaPreview();
        mediaInput.value = '';
        this.selectedFeeling.set('');
        this.postSuccess.set('Your post was published.');
        this.isPosting.set(false);
      },
      error: (error: unknown) => {
        console.error('Failed to publish post', error);
        this.postError.set(this.getPostErrorMessage(error));
        this.isPosting.set(false);
      },
    });
  }

  private getPostErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Your post could not be published. Please try again.';
    }

    const responseBody: unknown = error.error;
    if (typeof responseBody === 'object' && responseBody !== null) {
      if ('message' in responseBody && typeof responseBody.message === 'string') {
        return responseBody.message;
      }
      if ('errors' in responseBody && typeof responseBody.errors === 'string') {
        return responseBody.errors;
      }
    }

    if (error.status === 0) {
      return 'Could not reach the posts server. Check your connection and try again.';
    }
    if (error.status === 401 || error.status === 403) {
      return 'Your session may have expired. Sign in again and retry.';
    }

    return `Your post could not be published (HTTP ${error.status}). Please try again.`;
  }

  toggleEmojiPicker(textarea: HTMLTextAreaElement): void {
    const shouldOpen = !this.showFeelingOptions();
    this.showFeelingOptions.set(shouldOpen);
    this.emojiPickerError.set('');

    if (shouldOpen) {
      void this.loadEmojiPicker(textarea);
    }
  }

  preloadEmojiPicker(): void {
    void this.loadEmojiPickerDependencies().catch((error: unknown) => {
      console.error('Failed to preload the emoji picker', error);
    });
  }

  private async loadEmojiPicker(textarea: HTMLTextAreaElement): Promise<void> {
    if (this.pickerElement) {
      return;
    }

    const host = this.emojiPickerHost()?.nativeElement;
    if (!host) {
      this.emojiPickerError.set('The emoji picker could not be opened.');
      console.error('Emoji picker host element is not available');
      return;
    }

    try {
      const [data, { Picker }] = await this.loadEmojiPickerDependencies();
      const picker = new Picker({
        data,
        set: 'native',
        theme: 'light',
        perLine: 8,
        previewPosition: 'none',
        onEmojiSelect: (selection: unknown) => this.insertEmoji(selection, textarea),
        onClickOutside: (event: unknown) => this.closeEmojiPickerOnOutsideClick(event),
      });
      if (!(picker instanceof Node)) {
        throw new Error('Emoji picker did not create a DOM node');
      }

      this.pickerElement = picker;
      host.replaceChildren(picker);
    } catch (error) {
      console.error('Failed to initialize the emoji picker', error);
      this.emojiPickerError.set('The emoji picker could not be loaded. Please try again.');
    }
  }

  private closeEmojiPickerOnOutsideClick(event: unknown): void {
    const target = event instanceof Event ? event.target : null;
    const trigger = this.feelingButton()?.nativeElement;

    if (target instanceof Node && trigger?.contains(target)) {
      return;
    }

    this.showFeelingOptions.set(false);
  }

  private loadEmojiPickerDependencies():
    Promise<[EmojiMartData, typeof import('emoji-mart')]> {
    if (!this.emojiPickerDependencies) {
      this.emojiPickerDependencies = Promise.all([
        import('@emoji-mart/data').then((module) => {
          const dataModule = module as typeof module & { default: EmojiMartData };
          return dataModule.default;
        }),
        import('emoji-mart'),
      ]);
    }

    return this.emojiPickerDependencies;
  }

  private insertEmoji(selection: unknown, textarea: HTMLTextAreaElement): void {
    if (
      typeof selection !== 'object'
      || selection === null
      || !('native' in selection)
      || typeof selection.native !== 'string'
      || !selection.native
    ) {
      console.error('Emoji picker returned an unexpected selection', selection);
      return;
    }

    const native = selection.native;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = this.postText().slice(0, start);
    const after = this.postText().slice(end);
    const separator = before && !/\s$/.test(before) ? ' ' : '';
    const insertion = `${separator}${native}`;
    const trailingSpace = after && !/^\s/.test(after) ? ' ' : '';
    const updatedText = `${before}${insertion}${trailingSpace}${after}`;
    const cursorPosition = before.length + insertion.length + trailingSpace.length;

    this.postText.set(updatedText);
    this.postBody.setValue(updatedText);
    this.selectedFeeling.set(native);
    textarea.value = updatedText;
    const pickerSearch = this.emojiPickerHost()?.nativeElement.querySelector('input[type="search"]');
    if (pickerSearch instanceof HTMLInputElement) {
      pickerSearch.focus();
    }
    textarea.setSelectionRange(cursorPosition, cursorPosition);
  }

  clearSelectedMedia(input: HTMLInputElement): void {
    this.selectedMedia.set(null);
    this.releaseMediaPreview();
    this.mediaError.set('');
    input.value = '';
  }

  private releaseMediaPreview(): void {
    const previewUrl = this.selectedMediaPreview();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      this.selectedMediaPreview.set(null);
    }
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
        name: typeof name === 'string' && name.trim() ? name : 'Your name',
        photo: typeof photo === 'string' && photo.trim() ? photo : '/Images/default-profile.png',
      });
    } catch (error) {
      console.error('Failed to read the signed-in user from storage', error);
    }
  }
}
