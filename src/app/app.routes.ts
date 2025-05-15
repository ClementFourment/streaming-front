import { Routes } from '@angular/router';
import { AuthComponent } from './auth/auth.component';
import { HomeComponent } from './home/home.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { RegisterComponent } from './register/register.component';
import { VideoPlayerComponent } from './video-player/video-player.component';




export const routes: Routes = [
    
    { path: 'video/:title', component: VideoPlayerComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'login', component: AuthComponent },
    { path: 'dashboard', component: DashboardComponent },
    { path: '', component: HomeComponent },
    // { path: '**', redirectTo: '', pathMatch: 'full' }






];
