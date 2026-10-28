import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../navbar/navbar';

@Component({
  selector: 'app-not-found',
  imports: [Navbar, RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.css',
})
export class NotFound {}
