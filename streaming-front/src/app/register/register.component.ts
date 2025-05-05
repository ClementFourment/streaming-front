import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../service/auth.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-register',
  imports: [NgClass, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {

  registerForm: FormGroup;
  message: string = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  // Méthode pour soumettre le formulaire d'inscription
  onSubmit(): void {
    if (this.registerForm.invalid) {
      return;
    }

    this.isLoading = true;
    const { username, password } = this.registerForm.value;

    // Appel à la méthode d'inscription du service d'authentification
    this.authService.register(username, password).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.message = 'Inscription réussie ! Vous pouvez vous connecter maintenant.';
        this.router.navigate(['/login']); // Rediriger l'utilisateur vers la page de connexion
      },
      error: (err) => {
        this.isLoading = false;
        this.message = `Erreur : ${err?.error?.message || 'Un problème est survenu.'}`;
      }
    });
  }

  activateLabel(label: string) {
    document.getElementById(label)?.classList.add('active')
  }
  desactivateLabel($event: Event, label: string) {
    if (!($event.target as HTMLInputElement).value) {
      document.getElementById(label)?.classList.remove('active')
    }
  }
}
