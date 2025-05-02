// auth.component.ts
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../service/auth.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss'
})
export class AuthComponent implements OnInit {


  loginForm!: FormGroup;
  loading = false;
  error = '';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {

    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);  
    }

    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }
  
  

  


 

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    const { username, password } = this.loginForm.value;

    this.authService.login(username, password).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.error = 'Identifiants incorrects';
        this.loading = false;
      }
    });
  }

  activateLabel(label: string) {
    // document.getElementById(label)?.classList.add('active')
  }
  desactivateLabel($event: Event, label: string) {
    // if (!($event.target as HTMLInputElement).value) {
    //   document.getElementById(label)?.classList.remove('active')
    // }
  }
}
