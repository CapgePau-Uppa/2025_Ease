import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../shared/components/navbar/navbar.component';
import { UsercompComponent } from './usercomp/usercomp.component';

@Component({
  selector: 'app-userprofile',
  imports: [
    NavbarComponent,
    UsercompComponent,
    CommonModule
  ],
  templateUrl: './userprofile.component.html',
  styleUrl: './userprofile.component.css'
})
export class UserprofileComponent {

}
