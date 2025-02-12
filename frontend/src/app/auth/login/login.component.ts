/**
 * @file login.component.ts
 * @brief Component for handling user login and registration.
 *
 * This component provides functionality for toggling between login and registration,
 * managing form input states, and handling dark mode.
 */

import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewChecked,
  Renderer2,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements AfterViewChecked {
  username: string = '';
  password: string = '';
  email: string = '';
  showPassword: boolean = false;
  isDarkMode: boolean = false;
  isLoginMode: boolean = true;

  @ViewChild('usernameInput', { static: false }) usernameInput!: ElementRef;
  @ViewChild('passwordInput', { static: false }) passwordInput!: ElementRef;
  @ViewChild('emailInput', { static: false }) emailInput!: ElementRef;

  constructor(
    private renderer: Renderer2,
    private authService: AuthService,
    private router: Router
  ) {} // ✅ Inject AuthService et Router

  /**
   * Called after Angular has checked the view. Sets up focus and blur listeners on input fields.
   */
  ngAfterViewChecked() {
    if (this.usernameInput?.nativeElement) {
      this.setupFocusBlurListeners(this.usernameInput.nativeElement);
    }
    if (this.passwordInput?.nativeElement) {
      this.setupFocusBlurListeners(this.passwordInput.nativeElement);
    }
    if (!this.isLoginMode && this.emailInput?.nativeElement) {
      this.setupFocusBlurListeners(this.emailInput.nativeElement);
    }
  }

  /**
   * Toggles password visibility.
   */
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  /**
   * Sets up event listeners for focus and blur on an input field.
   * @param inputElement The input field to attach listeners to.
   */
  setupFocusBlurListeners(inputElement: HTMLInputElement) {
    const parentDiv = inputElement.closest('.input-container');

    inputElement.addEventListener('focus', () => {
      parentDiv?.classList.add('focus');
    });

    inputElement.addEventListener('blur', () => {
      if (inputElement.value.trim() === '') {
        parentDiv?.classList.remove('focus');
      }
    });
  }

  /**
   * Toggles dark mode by adding or removing the 'dark-mode' class on the body.
   */
  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      this.renderer.addClass(document.body, 'dark-mode');
    } else {
      this.renderer.removeClass(document.body, 'dark-mode');
    }
  }

  /**
   * Toggles between login and registration modes.
   */
  toggleLoginRegister(): void {
    this.isLoginMode = !this.isLoginMode;

    // Wait for Angular to update the DOM before applying effects to the Email field
    setTimeout(() => {
      if (!this.isLoginMode && this.emailInput?.nativeElement) {
        this.setupFocusBlurListeners(this.emailInput.nativeElement);
      }
    });
  }

  /**
   * Sets the login mode.
   * @param isLogin A boolean indicating whether the mode should be login or register.
   */
  setLoginMode(isLogin: boolean): void {
    this.isLoginMode = isLogin;
  }

  /**
   * Handles form submission and sends data to the backend.
   * @param form The form object containing user input values.
   */
  onSubmit(form: NgForm): void {
    if (form.invalid) {
      alert('Please fill all required fields correctly.');
      return;
    }

    if (this.isLoginMode) {
      // 🔥 Mode Connexion
      this.authService.login(this.email, this.password).subscribe(
        (response: any) => {
          // ✅ Correction du typage de `response`
          localStorage.setItem('access_token', response.access_token); // ✅ Stocker le token JWT
          this.router.navigate(['/home']); // ✅ Redirection après connexion
        },
        (error: any) => {
          // ✅ Correction du typage de `error`
          alert('Identifiants incorrects !');
        }
      );
    } else {
      // 🔥 Mode Inscription
      this.authService
        .register(this.username, this.email, this.password)
        .subscribe(
          (response: any) => {
            // ✅ Correction du typage de `response`
            alert('Inscription réussie ! Connectez-vous.');
            this.setLoginMode(true); // ✅ Retour en mode Login
          },
          (error: any) => {
            // ✅ Correction du typage de `error`
            alert('Erreur lors de l’inscription.');
          }
        );
    }
  }
}
