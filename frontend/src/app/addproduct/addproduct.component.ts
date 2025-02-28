import { Component, OnInit } from '@angular/core';
import { NavbarComponent } from '../homepage/home/comp/navbar/navbar.component';
import { FormComponent } from './form/form.component';
import { AuthService } from '../../services/auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-addproduct',
  standalone: true,
  imports: [NavbarComponent, FormComponent],
  templateUrl: './addproduct.component.html',
  styleUrl: './addproduct.component.css'
})
export class AddproductComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    // Vérification supplémentaire des permissions
    this.authService.getUserRole().subscribe((role: string | null) => {
      if (!role || !['Admin', 'User'].includes(role)) {
        this.router.navigate(['/']); // Redirection si pas le bon rôle
      }
    });
  }
}
