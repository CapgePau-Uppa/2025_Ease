/**
 * @file auth.component.ts
 * @brief Component for handling user authentication.
 * 
 * This component manages user authentication, including login and registration.
 * It provides UI functionalities such as dark mode, input styling, password visibility,
 * and form submission handling.
 */

import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AuthService } from '../../services/auth/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';

@Component({
  selector: 'app-auth',
  standalone: true,
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css'],
  imports: [
    CommonModule,
    FormsModule,
  ],
  providers: []
})
export class AuthComponent implements AfterViewInit {
  isLoginMode: boolean = true;
  isDarkMode: boolean = false;
  showPassword: boolean = false;

  username: string = '';
  email: string = '';
  password: string = '';

  // Messages d'erreur
  errorMessage: string = '';
  usernameError: string = '';
  emailError: string = '';
  passwordError: string = '';

  // Validation en temps réel
  isUsernameValid: boolean = true;
  isEmailValid: boolean = true;
  isPasswordValid: boolean = true;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) { }

  @ViewChild('usernameInput', { static: false }) usernameInput!: ElementRef;
  @ViewChild('passwordInput', { static: false }) passwordInput!: ElementRef;
  @ViewChild('emailInput', { static: false }) emailInput!: ElementRef;

  /**
   * @brief Initializes event listeners after the view is rendered.
   * 
   * This method ensures input fields have appropriate styling
   * for focus and blur events.
   */
  ngAfterViewInit() {
    this.setupFocusBlurListeners();
    this.setupValidationListeners();
  }

  /**
   * @brief Switches between login and registration mode.
   * 
   * This function toggles between login and registration states
   * and resets input fields to avoid UI glitches.
   * 
   * @param {boolean} isLogin - `true` for login mode, `false` for registration mode.
   */
  setLoginMode(isLogin: boolean): void {
    if (this.isLoginMode !== isLogin) {
      this.isLoginMode = isLogin;

      // Reset fields to prevent input lag on mode switch
      this.email = '';
      this.password = '';
      this.username = '';

      // Reset error messages
      this.resetErrors();

      // Reset validation states
      this.isUsernameValid = true;
      this.isEmailValid = true;
      this.isPasswordValid = true;

      setTimeout(() => {
        this.setupFocusBlurListeners();
        this.setupValidationListeners();
      }, 10);
    }
  }

  /**
   * @brief Resets all error messages.
   */
  resetErrors(): void {
    this.errorMessage = '';
    this.usernameError = '';
    this.emailError = '';
    this.passwordError = '';
  }

  /**
   * @brief Toggles the application's dark mode.
   * 
   * This function switches between light and dark themes.
   */
  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
  }

  /**
   * @brief Navigate to the home page.
   */
  navigateToHome(): void {
    this.router.navigate(['/']);
  }

  /**
   * @brief Adds event listeners to input fields to handle focus and blur styling.
   * 
   * This function ensures that input fields receive appropriate styling
   * when focused and lose styling when blurred if left empty.
   */
  setupFocusBlurListeners() {
    const inputs = [this.usernameInput?.nativeElement, this.passwordInput?.nativeElement, this.emailInput?.nativeElement].filter(Boolean);

    inputs.forEach(input => {
      const parentDiv = input.closest('.input-container');

      input.addEventListener('focus', () => {
        parentDiv?.classList.add('focus');
      });

      input.addEventListener('blur', () => {
        if (input.value.trim() === '') {
          parentDiv?.classList.remove('focus');
        }

        // Valider le champ lors de la perte de focus
        if (input.name === 'username' || input.name === 'usernameLogin') {
          this.validateUsername();
        } else if (input.name === 'email') {
          this.validateEmail();
        } else if (input.name === 'password') {
          this.validatePassword();
        }
      });
    });
  }

  /**
   * @brief Configure les écouteurs d'événements pour la validation en temps réel.
   */
  setupValidationListeners() {
    const inputs = [this.usernameInput?.nativeElement, this.passwordInput?.nativeElement, this.emailInput?.nativeElement].filter(Boolean);

    inputs.forEach(input => {
      input.addEventListener('input', () => {
        if (input.name === 'username' || input.name === 'usernameLogin') {
          this.validateUsername();
        } else if (input.name === 'email') {
          this.validateEmail();
        } else if (input.name === 'password') {
          this.validatePassword();
        }
      });
    });
  }

  /**
   * @brief Valide le nom d'utilisateur en temps réel.
   */
  validateUsername(): void {
    const parentDiv = this.usernameInput?.nativeElement.closest('.input-container');

    if (!this.username || this.username.trim() === '') {
      this.usernameError = this.isLoginMode ? 'Email requis' : 'Nom d\'utilisateur requis';
      this.isUsernameValid = false;
      parentDiv?.classList.add('error-input');
    } else if (this.isLoginMode) {
      // En mode login, le champ username est utilisé pour l'email
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(this.username)) {
        this.usernameError = 'Format d\'email invalide';
        this.isUsernameValid = false;
        parentDiv?.classList.add('error-input');
      } else {
        this.usernameError = '';
        this.isUsernameValid = true;
        parentDiv?.classList.remove('error-input');
      }
    } else {
      this.usernameError = '';
      this.isUsernameValid = true;
      parentDiv?.classList.remove('error-input');
    }
  }

  /**
   * @brief Valide l'email en temps réel.
   */
  validateEmail(): void {
    const parentDiv = this.emailInput?.nativeElement.closest('.input-container');

    if (!this.isLoginMode) {
      if (!this.email || this.email.trim() === '') {
        this.emailError = 'Email requis';
        this.isEmailValid = false;
        parentDiv?.classList.add('error-input');
      } else {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(this.email)) {
          this.emailError = 'Format d\'email invalide';
          this.isEmailValid = false;
          parentDiv?.classList.add('error-input');
        } else {
          this.emailError = '';
          this.isEmailValid = true;
          parentDiv?.classList.remove('error-input');
        }
      }
    }
  }

  /**
   * @brief Valide le mot de passe en temps réel.
   */
  validatePassword(): void {
    const parentDiv = this.passwordInput?.nativeElement.closest('.input-container');

    if (!this.password || this.password.trim() === '') {
      this.passwordError = 'Mot de passe requis';
      this.isPasswordValid = false;
      parentDiv?.classList.add('error-input');
    } else if (this.password.length < 6) {
      this.passwordError = 'Le mot de passe doit contenir au moins 6 caractères';
      this.isPasswordValid = false;
      parentDiv?.classList.add('error-input');
    } else {
      this.passwordError = '';
      this.isPasswordValid = true;
      parentDiv?.classList.remove('error-input');
    }
  }

  /**
   * @brief Toggles password visibility.
   * 
   * This function allows users to show or hide their password
   * in the input field.
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * @brief Validates the form inputs.
   * 
   * This method checks each input field and sets appropriate error messages.
   * 
   * @param {NgForm} form - The form to validate.
   * @returns {boolean} - Whether the form is valid.
   */
  validateForm(form: NgForm): boolean {
    this.resetErrors();

    // Valider tous les champs
    this.validateUsername();
    if (!this.isLoginMode) {
      this.validateEmail();
    }
    this.validatePassword();

    return this.isUsernameValid && (this.isLoginMode || this.isEmailValid) && this.isPasswordValid;
  }

  /**
   * @brief Handles form submission for login or registration.
   * 
   * This method validates the form, sends authentication data to the API,
   * and navigates the user upon successful login.
   * 
   * @param {NgForm} form - The submitted form object containing user inputs.
   */
  async onSubmit(form: NgForm): Promise<void> {
    // Validate form inputs
    if (!this.validateForm(form)) {
      return;
    }

    // If the user wants to log in
    if (this.isLoginMode) {
      this.authService.login(this.username, this.password).subscribe({
        next: (response: any) => {
          console.log("Server response:", response);
          this.router.navigate(['/home']);
        },
        error: (err: any) => {
          console.log("Login error:", err);
          this.errorMessage = 'Email ou mot de passe invalide.';
        },
      });
    }

    // If the user wants to create an account
    if (!this.isLoginMode) {
      // Call register with the hashed password
      this.authService.register(this.username, this.email, this.password).subscribe({
        next: (response) => {
          console.log("Server response:", response);
          // Navigate to the login page
          this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
            this.router.navigate(['/login']);
          });
        },
        error: (err) => {
          console.log("Register error:", err);
          if (err.error && err.error.message) {
            if (err.error.message.includes('email')) {
              this.emailError = 'Cet email est déjà utilisé';
            } else if (err.error.message.includes('username')) {
              this.usernameError = 'Ce nom d\'utilisateur est déjà utilisé';
            } else {
              this.errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
            }
          } else {
            this.errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
          }
        },
      });
    };
  }
}
