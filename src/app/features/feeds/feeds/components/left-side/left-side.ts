import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-left-side',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './left-side.html',
  styleUrl: './left-side.css',
})
export class LeftSide {}
