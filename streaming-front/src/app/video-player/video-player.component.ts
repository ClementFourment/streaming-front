import { Component, OnInit, ViewChild, ElementRef, OnDestroy, HostListener, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { VideoService } from '../service/video.service';
import { AuthService } from '../service/auth.service';
import { interval, Subscription } from 'rxjs';
import { formatDate, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormTitlePipe } from '../service/form-title.pipe';
import { InteractionService } from '../service/interaction.service';

@Component({
  selector: 'app-video-player',
  imports: [FormsModule, NgClass, FormTitlePipe],
  templateUrl: './video-player.component.html',
  styleUrl: './video-player.component.scss',
  encapsulation: ViewEncapsulation.None
})


export class VideoPlayerComponent implements OnInit, OnDestroy {

  sources !: {title: string, img: string}[];
  videoTitle: string | null = null;
  episode: number = 1;
  currentTime: number = 0;
  url: string = "";
  isDragging = false;
  isPlaying = false;
  showControls = false;
  volume = 0.5;
  isMuted = false;
  isFullscreen = false;
  progress = 0;
  duration = 0;
  currentTimeFormatted = '00:00';
  durationFormatted = '00:00';

  mouseStillTimeout: any;

  @ViewChild('video') videoElement!: ElementRef;
  private observer!: MutationObserver; //pour le loader

  private updateTimer!: Subscription;
  private updateTimer2!: Subscription;

  constructor(private interactionService: InteractionService, private elRef: ElementRef, private route: ActivatedRoute, private videoService: VideoService, private authService: AuthService, private router: Router) {}
  
  ngOnInit(): void {

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
    }

    this.interactionService.initListenInteractions();



    this.videoTitle = this.route.snapshot.paramMap.get('title');
    this.sources = this.videoService.sources;
    
    if (this.sources) {
      this.checkTitle();
      this.getUrl();
      this.getWatchProgress();
    }
    if (!this.sources) {
      this.videoService.getSources().subscribe({
        next: (response: { sources: {title: string, img: string}[]}) => {

          this.videoService.sources = response.sources;
          this.sources = this.videoService.sources;
          this.checkTitle();
          this.getUrl();
          this.getWatchProgress();
        },
        error: (err) => {
          console.log(`Erreur : ${err?.error?.message || 'Un problème est survenu.'}`);
        }
      });
    }

    this.episode = this.getEpisode();
    
    
    
  }
  

  checkTitle(): void {
    if (!this.videoTitle || !this.sources.filter(source => source.title == this.videoTitle).length){
      this.router.navigate(['/dashboard']);
    }
  }

  getEpisode(): number {

    return 1;
  }
  getUrl(){
    if (!this.videoTitle || !this.episode) {
      return;
    }
    this.videoService.getUrl(this.videoTitle, String(this.episode)).subscribe({
      next: (response: {url: string}) => {
        this.initVideo(response.url);
      },
      error: (err) => {
        console.log(`Erreur : ${err?.error?.message || 'Un problème est survenu.'}`);
      }
    }); 
  }
  getWatchProgress() {
    if (!this.videoTitle) {
      return;
    }
    this.videoService.getWatchProgress(this.videoTitle).subscribe({
      next: (response: {createdAt: Date, currentTime: number, episodeNumber: number, id: number, title: string, updatedAt: Date, userId: Number}[]) => {
        if (!response.length) {
          if (!this.videoTitle) {
            return;
          }
          this.videoService.addWatchProgress(this.videoTitle);
          console.log('ep0')
          this.episode = 0;
          this.currentTime = 0;
          return;
        }
        this.episode = response[0].episodeNumber;
        this.currentTime = response[0].currentTime;
        this.videoElement.nativeElement.currentTime = this.currentTime;

      },
      error: (err) => {
        console.log(`Erreur : ${err?.error?.message || 'Un problème est survenu.'}`);
      }
    });
  }
  onVideoEnded() {
    this.isPlaying = false;
    if (this.videoTitle) {
      
      this.nextEpisode();
      

      
    }
  }
  initVideo(url: string) {
    this.url = url;
    if(this.interactionService.userHasInteracted()) {
      this.isPlaying = true;
    }
    this.videoElement.nativeElement.addEventListener('ended', this.onVideoEnded.bind(this));

    this.observer = new MutationObserver(() => {
      document.getElementById('video-overlay')?.classList.add('active');
      document.getElementById('video')?.classList.add('active');
      document.getElementById('loader')?.classList.remove('active');
      
      
    });
    this.observer.observe(this.videoElement.nativeElement, {
      attributes: true,
      attributeFilter: ['src']
    });
    
    this.videoElement.nativeElement.addEventListener('loadedmetadata', () => {
      this.duration = this.videoElement.nativeElement.duration;
      this.durationFormatted = this.formatTime(this.duration);
      this.updateTimes();
    });

    this.updateTimer = interval(100).subscribe(() => {
      if (this.isPlaying) {
        this.updateTimes();
      }
    });
    this.updateTimer2 = interval(3000).subscribe(() => {
      // update BDD
      if (this.videoTitle && this.isPlaying) {
        this.videoService.updateWatchProgress(this.videoTitle, this.currentTime, this.episode);
      }
    });

    this.volume = this.videoElement.nativeElement.volume;
    this.volume = this.volume;
  }
  updateTimes() {
    this.currentTime = this.videoElement.nativeElement.currentTime;
    this.progress = (this.currentTime / this.duration) * 100;
    this.currentTimeFormatted = this.formatTime(this.currentTime);
  }
  

  togglePlay(): void {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      this.videoElement.nativeElement.play();
    } else {
      this.videoElement.nativeElement.pause();
    }
  }

  toggleMute(): void {
    this.isMuted = !this.isMuted;
    this.videoElement.nativeElement.muted = this.isMuted;
  }

  changeVolume(event: Event): void {
    this.videoElement.nativeElement.volume = this.volume;
    this.volume = this.videoElement.nativeElement.volume;
    this.isMuted = this.volume === 0;
  }

  seekVideo(event: MouseEvent): void {
    
    const progressBar = document.getElementById('progress-bar-background') as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const position = (event.clientX - rect.left) / rect.width;
    this.videoElement.nativeElement.currentTime = this.duration * position;
    this.updateTimes();

  }

  toggleFullscreen(): void {
    const elem = this.elRef.nativeElement;
    this.isFullscreen = !this.isFullscreen;
    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if ((<any>elem).webkitRequestFullscreen) { // Safari
        (<any>elem).webkitRequestFullscreen();
      } else if ((<any>elem).msRequestFullscreen) { // IE11
        (<any>elem).msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((<any>document).webkitExitFullscreen) {
        (<any>document).webkitExitFullscreen();
      } else if ((<any>document).msExitFullscreen) {
        (<any>document).msExitFullscreen();
      }
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
  formatTime(time: number): string {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }


  showVolume() {
    document.getElementById('volume')?.classList.add('active');
    document.getElementById('progress-bar')?.classList.add('active');
  }
  hideVolume() {
    document.getElementById('volume')?.classList.remove('active');
    document.getElementById('progress-bar')?.classList.remove('active');
  }

  @HostListener('document:keydown', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent) {
      if (event.key === 'ArrowUp') {
        this.handleArrowUp();
      } else if (event.key === 'ArrowDown') {
        this.handleArrowDown();
      }
      if (event.key === 'Space' || event.code === 'Space') {
        this.togglePlay();
      }
      if (event.key === 'f' || event.key === 'F') {
        this.toggleFullscreen();
      }
    }
  handleArrowUp(): void {
    if (this.volume <= 0.9) {
      this.volume = this.volume + 0.10;
      
    }
    else {
      this.volume = 1;
    }
    this.videoElement.nativeElement.volume = this.volume;
    this.videoElement.nativeElement.volume = this.volume;
  }

  handleArrowDown(): void {
    if (this.volume >= 0.1) {
      this.volume = this.volume - 0.10;
      
    }
    else {
      this.volume = 0;
    }
    this.videoElement.nativeElement.volume = this.volume;
    this.videoElement.nativeElement.volume = this.volume;
  }
  rewindVideo() {
    if (this.videoElement.nativeElement.currentTime > 10) {
      this.videoElement.nativeElement.currentTime -= 10;
      this.updateTimes();
      if (this.videoElement.nativeElement.ended) {
        this.videoElement.nativeElement.play;
        this.isPlaying = true;
      }
    }
    else {
      this.videoElement.nativeElement.currentTime = 0;
      this.updateTimes();
    }
  }
  forwardVideo() {
    if (this.videoElement.nativeElement.currentTime < this.duration - 10) {
      this.videoElement.nativeElement.currentTime += 10;
      this.updateTimes();
    }
    else {
      this.videoElement.nativeElement.currentTime = this.duration;
      this.updateTimes();
    }
  }

  startDrag(event: MouseEvent): void {
    event.preventDefault();
    this.isDragging = true;
    window.addEventListener('mousemove', this.onDrag);
    window.addEventListener('mouseup', this.stopDrag);
  }
  onDrag = (event: MouseEvent): void => {
    if (!this.isDragging) return;
  
    const progressBar = document.getElementById('progress-bar-background') as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const position = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1); // clamp 0-1
    this.videoElement.nativeElement.currentTime = this.duration * position;
    this.updateTimes();
  };
  stopDrag = (): void => {
    this.isDragging = false;
    window.removeEventListener('mousemove', this.onDrag);
    window.removeEventListener('mouseup', this.stopDrag);
  };

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    this.resetMouseStillTimer();
  }
  @HostListener('document:click', ['$event'])
  onMouseClick(event: MouseEvent): void {
    this.resetMouseStillTimer();
  }

  resetMouseStillTimer(): void {
    if (this.mouseStillTimeout) {
      this.showControls = true;
      document.getElementById('video-overlay')?.classList.add('controls-visible')
      document.body.classList.remove('hide-cursor');
      document.getElementById('video-overlay')?.classList.remove('hide-cursor');
      clearTimeout(this.mouseStillTimeout);
    }

    this.mouseStillTimeout = setTimeout(() => {
      this.onMouseStill();
    }, 2000);
  }

  onMouseStill(): void {
    if (this.isPlaying) {
      document.getElementById('video-overlay')?.classList.remove('controls-visible')
      document.body.classList.add('hide-cursor');
      document.getElementById('video-overlay')?.classList.add('hide-cursor');
      this.showControls = false;
    }
  }


  @HostListener('window:beforeunload', ['$event'])
  handleBeforeUnload(event: BeforeUnloadEvent) {
    if (this.videoTitle) {
      const data = {
        title: this.videoTitle,
        episodeNumber: this.episode,
        currentTime: Math.floor(this.currentTime)
      };

      fetch('http://localhost:3000/update-watchprogress', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }).catch(err => {
        console.error("Erreur lors de l'envoi de la progression : ", err);
      });
    }
  }

  nextEpisode():void {
    if (this.videoTitle) {
      this.videoService.updateWatchProgress(this.videoTitle, 0, this.episode + 1);
      this.router.navigate(['/dashboard'])
      .then(() => { this.router.navigate(['/video', this.videoTitle]); })
    }
  }
  ngOnDestroy(): void {
    console.log('ngOnDestroy called');
    if (this.updateTimer) {
      this.updateTimer.unsubscribe();
    }
    if (this.updateTimer2) {
      this.updateTimer2.unsubscribe();
    }
    if (this.observer) {
      this.observer.disconnect();
    }
    this.interactionService.removeListeners();
    this.videoElement.nativeElement.removeEventListener('ended', this.onVideoEnded);
   
    if (this.mouseStillTimeout) {
      clearTimeout(this.mouseStillTimeout);
    }

    // update BDD
    if (this.videoTitle) {
      this.videoService.updateWatchProgress(this.videoTitle, this.currentTime, this.episode);
    }
  }
}
