import { Component, OnInit } from '@angular/core';
import { AuthService } from '../service/auth.service';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { VideoService } from '../service/video.service';
import { FormTitlePipe } from '../service/form-title.pipe';

@Component({
  selector: 'app-dashboard',
  imports: [NavbarComponent, RouterLink, FormTitlePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {

  sources !: {title: string, img: string, nbEpisodes: number}[];
  test: boolean = false;

  constructor(private videoService: VideoService, private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
    }


    this.videoService.getSources().subscribe({
      next: (response: { sources: {title: string, img: string, nbEpisodes: number}[]}) => {
        this.videoService.sources = response.sources;
        this.sources = this.videoService.sources;
      },
      error: (err) => {
        
        console.log(`Erreur : ${err?.error?.message || 'Un problème est survenu. Impossible de récupérer les sources'}`);
      }
    });
  }
  activateVideo(title: string) {

  }
}
