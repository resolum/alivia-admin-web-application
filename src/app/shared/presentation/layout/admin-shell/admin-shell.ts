import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({ selector: 'app-admin-shell', imports: [RouterOutlet, RouterLink, RouterLinkActive], templateUrl: './admin-shell.html', styleUrl: './admin-shell.css' })
export class AdminShell { protected readonly mobileMenuOpen = signal(false); }
