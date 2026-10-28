import { Component } from '@angular/core';
import { LeftSide } from './components/left-side/left-side';
import { RightSide } from './components/right-side/right-side';
import { PostComposer } from './components/post-composer/post-composer';
import { RouterOutlet } from '@angular/router';
@Component({
  imports: [LeftSide, RightSide, PostComposer, RouterOutlet],
  templateUrl: './feeds.html',
  styleUrl: './feeds.css',
})
export class Feeds { }
