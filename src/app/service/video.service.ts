import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VideoService {

    sources !: {title: string, img: string}[];

    constructor(private http: HttpClient, private router: Router, private api: ApiService) { }

    getSources(): Observable<any> {
        return this.http.get<any>(`${this.api.apiUrl}/get-sources`);
    }

    getUrl(title: string, episode: string): Observable<any> {
        return this.http.get<any>(`${this.api.apiUrl}/get-temporary-url?title=${title}&episode=${episode}`);
    }

    getWatchProgress(title: string): Observable<any> {
        const token = localStorage.getItem('auth_token');
        const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
        return this.http.get<any>(`${this.api.apiUrl}/get-watchprogress?title=${title}`, {
            headers
        });
    }
    addWatchProgress(title: string) {
        console.log('addWatchProgress')
        const token = localStorage.getItem('auth_token');
        const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
        this.http.post<any>(
            `${this.api.apiUrl}/add-watchprogress`, 
            {title},
            {headers}
        ).subscribe({
            next: (res) => {
              // console.log('Progress ajouté avec succès :', res);
            },
            error: (err) => {
              console.error('Erreur lors de l\'ajout du progress :', err);
            }
          });
    }

    updateWatchProgress(title: string, time: number, episode: number) {
      const token = localStorage.getItem('auth_token');
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      this.http.put<any>(
          `${this.api.apiUrl}/update-watchprogress`, 
          {title: title, episodeNumber: episode, currentTime: time},
          {headers}
      ).subscribe({
          next: (res) => {
            // console.log('Progress ajouté avec succès :', res);
          },
          error: (err) => {
            console.error('Erreur lors de l\'ajout du progress :', err);
          }
        });
  }

}
