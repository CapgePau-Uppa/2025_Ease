import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../shared/components/navbar/navbar.component';
import { FormsModule, NgForm } from '@angular/forms';

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})
export class ContactComponent implements OnInit {
  contactForm: ContactForm = {
    name: '',
    email: '',
    subject: '',
    message: ''
  };

  formSubmitted = false;
  formSuccess = false;
  formError = false;
  errorMessage = '';
  loading = false;

  // Informations de contact de l'entreprise
  companyInfo = {
    name: 'Ease-2025',
    address: 'Pau, France',
    email: 'easeprojectcap@gmail.com',
  };

  // Équipe de contact
  teamMembers = [
    { name: 'Matéo GARCIA', role: 'Développeur Full-Stack' },
    { name: 'Tommy CHOUANGMALA', role: 'Développeur Full-Stack' },
    { name: 'Baptiste MINET', role: 'Développeur Full-Stack' }
  ];

  // Questions fréquentes
  faqs = [
    {
      question: 'Comment puis-je proposer un nouveau produit ?',
      answer: 'Vous pouvez ajouter un nouveau produit en vous connectant à votre compte et en cliquant sur "Add Product" dans le menu principal.'
    },
    {
      question: 'Comment fonctionne la recherche d\'alternatives ?',
      answer: 'Notre algorithme analyse les caractéristiques des produits importés et propose des alternatives européennes similaires en termes de qualité et de fonctionnalités.'
    },
    {
      question: 'Puis-je contribuer au projet ?',
      answer: 'Absolument ! Nous accueillons les contributions de la communauté. Contactez-nous via ce formulaire pour en savoir plus sur les possibilités de collaboration.'
    }
  ];

  constructor() { }

  ngOnInit(): void {
    // Initialisation du composant
  }

  /**
   * Gère la soumission du formulaire de contact
   * @param form Le formulaire soumis
   */
  onSubmit(form: NgForm): void {
    if (form.invalid) {
      return;
    }

    this.loading = true;
    this.formSubmitted = true;

    // Simulation d'un appel API (à remplacer par un vrai appel API)
    setTimeout(() => {
      // Simulation de succès (à remplacer par la logique réelle)
      if (this.contactForm.email.includes('@')) {
        this.formSuccess = true;
        this.formError = false;
        // Réinitialiser le formulaire après succès
        this.contactForm = {
          name: '',
          email: '',
          subject: '',
          message: ''
        };
        form.resetForm();
      } else {
        // Simulation d'erreur
        this.formSuccess = false;
        this.formError = true;
        this.errorMessage = 'Une erreur est survenue lors de l\'envoi du message. Veuillez réessayer.';
      }
      this.loading = false;
    }, 1500);
  }

  /**
   * Réinitialise l'état du formulaire
   */
  resetFormState(): void {
    this.formSubmitted = false;
    this.formSuccess = false;
    this.formError = false;
    this.errorMessage = '';
  }
}