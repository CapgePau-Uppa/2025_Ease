import { Component, OnInit } from '@angular/core';
import { NavbarComponent } from '../shared/components/navbar/navbar.component';
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
    // Additional verification of permissions
    this.authService.getUserRole().subscribe((role: string | null) => {
      if (!role || !['Admin', 'User', 'SuperAdmin'].includes(role)) {
        this.router.navigate(['/']); // Redirect if wrong role
      }
    });
  }
}
