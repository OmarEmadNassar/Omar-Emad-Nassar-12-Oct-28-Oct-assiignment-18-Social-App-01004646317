import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../../features/navbar/navbar';

@Component({
  selector: 'app-mainlayout',
  imports: [RouterOutlet, Navbar],
  templateUrl: './mainlayout.html',
  styleUrl: './mainlayout.css',
})
export class Mainlayout {}
