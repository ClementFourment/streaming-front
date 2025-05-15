import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private isLocal = false;
  private apiUrls = [
    'https://d4d8-2a04-cec2-b-9e25-7439-f02c-ed0c-a7ae.ngrok-free.app',
    'http://localhost:3000'
  ];
  public apiUrl = this.apiUrls[+this.isLocal];
}
