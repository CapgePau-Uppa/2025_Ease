import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, OnInit } from '@angular/core';
import * as VANTA from 'vanta/src/vanta.birds';
import * as THREE from 'three';
// Component
import { SearchbarComponent } from './comp/searchbar/searchbar.component';
import { NavbarComponent } from './comp/navbar/navbar.component';
// Cookies
import { CookieService } from 'ngx-cookie-service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    SearchbarComponent,
    NavbarComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements AfterViewInit, OnDestroy, OnInit {
  @ViewChild('vantaBackground', { static: true }) vantaRef!: ElementRef;
  
  isVantaActive: boolean = true;
  isDarkMode: boolean = false;
  isSettingsOpen: boolean = false;
  private vantaEffect: any;
  // Test cookies
  username: string = '';
  token: string = '';

    constructor(
      private cookieService: CookieService,
    ) { }
  

  ngOnInit(): void {
    this.token = this.cookieService.get('auth_token');
    this.username = this.cookieService.get('username');

    if (this.token) {
      console.log('User is logged in with token:', this.token);
      console.log('Logged in as:', this.username);
    } else {
      console.log('No active session found.');
    }
  }



  ngAfterViewInit(): void {
    if (this.isVantaActive) {
      this.initVantaEffect();
    }
  }

  private initVantaEffect(): void {
    this.vantaEffect = (VANTA as any).default({
      el: '.container',
      THREE: THREE,
      backgroundColor: 0x023436,
      color1: 0xff0000,
      color2: 0xd1ff,
      birdSize: 1.20,
      wingSpan: 27.00,
      speedLimit: 2.00,
      separation: 62.00,
      cohesion: 79.00,
      quantity: 4.00,
    });
  }

  toggleVantaEffect(): void {
    this.isVantaActive = !this.isVantaActive;
    if (this.isVantaActive) {
      this.initVantaEffect();
    } else if (!this.isVantaActive) {
      this.vantaEffect.destroy();
      this.vantaEffect = null;
    }
  }

  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    document.body.classList.toggle('dark-mode', this.isDarkMode);
  }

  toggleSettingsPanel(): void {
    this.isSettingsOpen = !this.isSettingsOpen;
  }

  ngOnDestroy(): void {
    if (this.vantaEffect) this.vantaEffect.destroy();
  }
}
