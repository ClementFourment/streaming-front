import { Component, OnInit, ViewChild, ElementRef, OnDestroy, HostListener, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { VideoService } from '../service/video.service';
import { AuthService } from '../service/auth.service';
import { interval, Subscription, timeout } from 'rxjs';
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

  sources !: {title: string, img: string, nbEpisodes: number}[];
  videoTitle: string | null = null;
  episode!: number;
  currentTime: number = 0;
  url: string = "";
  isDragging = false;
  isPlaying = false;
  showControls = false;
  volume = 1;
  isMuted = false;
  isFullscreen = false;
  progress = 0;
  duration = 0;
  currentTimeFormatted = '00:00';
  durationFormatted = '00:00';
  bufferPercent: number = 0;
  thumbnails!: { 
    start: string, 
    end: string , 
    image: string,
    crop: {
      x: number,
      y: number,
      width: number,
      height: number,
    }
   }[];
  nbEpisodes!: number | undefined;
  mouseStillTimeout: any;

  @ViewChild('video') videoElement!: ElementRef;
  @ViewChild('progressBar') progressBar!: ElementRef;

  private observer!: MutationObserver; //pour le loader

  private updateTimer!: Subscription;
  private updateTimer2!: Subscription;

  constructor(private interactionService: InteractionService, private elRef: ElementRef, private route: ActivatedRoute, private videoService: VideoService, private authService: AuthService, private router: Router) {}
  
  ngOnInit(): void {

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
    }
    console.log(this.authService.currentUser)
    console.log(this.authService.isAuthenticated())
    this.interactionService.initListenInteractions();



    this.videoTitle = this.route.snapshot.paramMap.get('title');
    if (!this.videoService.sources) {
      this.videoService.getSources().subscribe({
        next: (response: { sources: {title: string, img: string, nbEpisodes: number}[]}) => {
          this.videoService.sources = response.sources;
          this.sources = this.videoService.sources;
          this.nbEpisodes = this.sources.find(source => source.title == this.videoTitle)?.nbEpisodes;
        },
        error: (err) => {
          console.log(`Erreur : ${err?.error?.message || 'Un problème est survenu. Impossible de récupérer les sources'}`);
        }
      });
    }
    else {
      this.sources = this.videoService.sources;
      if (this.sources && this.videoTitle) {
        this.nbEpisodes = this.sources.find(source => source.title == this.videoTitle)?.nbEpisodes;
      }
    }
    
    
    console.log(this.nbEpisodes)
    if (this.sources) {
      this.checkTitle();
      this.getUrl();
      this.getWatchProgress();
    }
    if (!this.sources) {
      this.videoService.getSources().subscribe({
        next: (response: { sources: {title: string, img: string, nbEpisodes: number}[]}) => {
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
    
    this.fullScreenOnMobileLandscape();
    
    
    // document.addEventListener('fullscreenchange', (e) => {
    //   if (!this.isMobileOrTablet()) {
    //     return;
    //   }
    //   if (document.fullscreenElement && !this.isFullscreen) {
    //     // document.exitFullscreen();
    //   }
      
    // });
    
  }
  
  fullScreenOnMobileLandscape() {
    if (this.isMobileOrTablet()) {
      this.isFullscreen = false;
      this.toggleFullscreen();

      if ((screen.orientation as any).lock) {
        (screen.orientation as any).lock('landscape').catch((err: any) => {
          console.warn('Erreur lock orientation:', err);
        });
      }
    }
  }
  
  get episodesArray(): number[] {
    return Array.from({ length: this.nbEpisodes ?? 0 }, (_, i) => i + 1);
  }
  checkTitle(): void {
    if (!this.videoTitle || !this.sources.filter(source => source.title == this.videoTitle).length){
      this.router.navigate(['/dashboard']);
    }
  }

  async getEpisode(): Promise<number> {
    if (!this.videoTitle) {
      return 1;
    }
    try {
      const response = await this.videoService.getEpisode(this.videoTitle);
      return response.episode;
    } catch (err) {
      console.log(`Erreur : ${err || 'Un problème est survenu.'}`);
      return 1;
    }
  }

  async getUrl(){
    
    this.episode = await this.getEpisode();
    this.scrollToEpisode(this.episode);
    this.getThumbnails();
    if (!this.videoTitle || !this.episode) {
      return;
    }

    let savedUrl!: string | undefined;
    const item = localStorage.getItem(`ti_${this.videoTitle}_ep_${this.episode}`);
    if (item) {
      let parsed;
      try {
        parsed = JSON.parse(item);
      }
      catch(e) {
        localStorage.removeItem(`ep_${this.episode}`);
      }
      if (parsed && Date.now() < parsed.expiresAt) {
        savedUrl = parsed.value;
      } 
      else {
        localStorage.removeItem(`ep_${this.episode}`);
      }
    }
    if (savedUrl) {
      this.initVideo(savedUrl);
      return;
    }
    this.videoService.getUrl(this.videoTitle, String(this.episode)).subscribe({
      next: (response: {url: string}) => {
        console.log(response.url)
        const expiresAt = Date.now() + 5 * 60 * 60 * 1000;
        localStorage.setItem(`ti_${this.videoTitle}_ep_${this.episode}`, JSON.stringify({ value: response.url, expiresAt }));
        this.initVideo(response.url);
      },
      error: (err) => {
        console.log(`Erreur : ${err?.error?.message || 'Un problème est survenu.'}`);
      }
    }); 
  }
  async getThumbnails() {
    if (!this.videoTitle || !this.episode) {
      return;
    }
    this.videoService.getThumbnails(this.videoTitle, String(this.episode)).subscribe({
      next: (response: any) => {
        this.thumbnails = response.thumbnails;
        if (this.thumbnails.length > 0) {
          this.handleThumbnailPreload(this.thumbnails[0].image);
        }
      },
      error: (err) => {
        console.log(`Erreur : ${err?.error?.message || 'Un problème est survenu.'}`);
      }
    });
    
  }
  private async handleThumbnailPreload(imageUrl: string) {
    try {
      await this.preloadImage(imageUrl);
    } catch (err) {
      console.error('Erreur lors du préchargement de la vignette :', err);
    }
  }
  
  showThumbnail(event: MouseEvent) {

    const thumbnailDiv = document.getElementById('thumbnail')as HTMLDivElement;
    const timeDiv = document.getElementById('thumbnail-time')as HTMLDivElement;
    const rect = this.progressBar.nativeElement.getBoundingClientRect();
    let position = (event.clientX - rect.left) / rect.width;
    if (position < 0) {
      position = 0;
    }
    if (position > this.duration) {
      position = 1;
    }
    const pointedTime = this.duration * position;
    const pointedTimeFormatted = this.formatTime(pointedTime);


    thumbnailDiv.style.display = 'flex';
    timeDiv.innerHTML = String(pointedTimeFormatted)

    const img = document.getElementById('thumbnail-picture') as HTMLImageElement;
    // img.src = this.thumbnails
    
    thumbnailDiv.style.left = `${ position * rect.width - rect.left + 10 }px`;


    const thumbnail = this.thumbnails.find(c => pointedTime >= this.parseTimeString(c.start) && pointedTime < this.parseTimeString(c.end));
    
    if (thumbnail) {
      if (img.src !== thumbnail.image) {
        img.src = thumbnail.image;
      }


      



      img.style.width = 'auto';
      img.style.height = 'auto';
      img.style.objectFit = 'none';
      img.style.position = 'absolute';

      img.style.left = `-${thumbnail.crop.x * 2 / 3}px`;
      img.style.top = `-${thumbnail.crop.y * 2 / 3}px`;
      
      img.parentElement!.style.width = `${thumbnail.crop.width * 2 / 3}px`;
      img.parentElement!.style.height = `${thumbnail.crop.height * 2 / 3}px`;
      img.parentElement!.style.overflow = 'hidden';
    }
  }
  hideThumbnail() {
    const thumbnailDiv = document.getElementById('thumbnail')as HTMLDivElement;
    thumbnailDiv.style.display = 'none';
  }
  async preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve();
      img.onerror = (err) => reject(err);
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
    
    this.videoElement.nativeElement.addEventListener('loadedmetadata', this.onLoadedMetadata);
    
    this.videoElement.nativeElement.addEventListener('progress', this.onProgress);
    
    

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
    const localVolume = localStorage.getItem('volume');
    if (localVolume) {
      this.volume = +localVolume;
    }
    else {
      this.volume = this.videoElement.nativeElement.volume;
    }
    this.videoElement.nativeElement.volume = this.volume;
    this.storeNextEpisodeUrl();
  }
  storeNextEpisodeUrl(){
    if (!this.videoTitle) {
      return;
    }
    this.videoService.getUrl(this.videoTitle, String(this.episode + 1)).subscribe({
      next: (response: {url: string}) => {
        const nextEpisodeKey = `ti_${this.videoTitle}_ep_${this.episode + 1}`;
        const expiresAt = Date.now() + 5 * 60 * 60 * 1000;
        localStorage.setItem(nextEpisodeKey, JSON.stringify({ value: response.url, expiresAt }));
      },
      error: (err) => {
        console.log(`Erreur : ${err?.error?.message || 'Un problème est survenu.'}`);
      }
    }); 
  }
  updateTimes() {
    this.currentTime = this.videoElement.nativeElement.currentTime;
    this.progress = (this.currentTime / this.duration) * 100;
    this.currentTimeFormatted = this.formatTime(this.currentTime);
  }
  onLoadedMetadata = () => {
    this.duration = this.videoElement.nativeElement.duration;
    this.durationFormatted = this.formatTime(this.duration);
    this.updateTimes();
  }
  onProgress = () => {
    this.updateBufferProgress();
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
    this.videoElement.nativeElement.muted = this.isMuted;
    localStorage.setItem('volume', String(this.volume));
  }

  seekVideo(event: MouseEvent): void {
    
    const rect = this.progressBar.nativeElement.getBoundingClientRect();
    const position = (event.clientX - rect.left) / rect.width;
    this.videoElement.nativeElement.currentTime = this.duration * position;
    this.updateTimes();

  }
  isMobileOrTablet(): boolean {
    const ua = navigator.userAgent.toLowerCase();
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
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
      if (this.isMobileOrTablet()) {
        if ((screen.orientation as any).lock) {
          (screen.orientation as any).lock('landscape').catch((err: any) => {
            console.warn('Erreur lock orientation:', err);
          });
        }
      }
    } 
    else {
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
  parseTimeString(timeStr: string): number {
    const parts = timeStr.split(':').map(Number);
  
    if (parts.length === 2) {
      const [minutes, seconds] = parts;
      return minutes * 60 + seconds;
    }
  
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return hours * 3600 + minutes * 60 + seconds;
    }
  
    throw new Error('Invalid time format');
  }


  showVolume() {
    document.getElementById('volume')?.classList.add('active');
    document.getElementById('progress-bar')?.classList.add('active');
  }
  hideVolume() {
    document.getElementById('volume')?.classList.remove('active');
    document.getElementById('progress-bar')?.classList.remove('active');
  }

  showEpisodes() {
    document.getElementById('list-episodes')?.classList.add('active');
    document.getElementById('progress-bar')?.classList.add('active');
    this.scrollToEpisode(this.episode);
  }
  hideEpisodes() {
    document.getElementById('list-episodes')?.classList.remove('active');
    document.getElementById('progress-bar')?.classList.remove('active');
  }

  @HostListener('document:keydown', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent) {
      if (event.key === 'ArrowUp') {
        this.handleArrowUp();
      } else if (event.key === 'ArrowDown') {
        this.handleArrowDown();
      }
      if (event.key === 'ArrowLeft') {
        this.rewindVideo();
      } else if (event.key === 'ArrowRight') {
        this.forwardVideo();
      }
      if (event.key === 'Space' || event.code === 'Space') {
        
        this.togglePlay();
      }
      // if (event.key === 'f' || event.key === 'F') {
      //   this.toggleFullscreen();
      // }
    }
  handleArrowUp(): void {
    if (this.volume <= 0.9) {
      this.volume = this.volume + 0.10;
      localStorage.setItem('volume', String(this.volume));
    }
    else {
      this.volume = 1;
      localStorage.setItem('volume', String(this.volume));
    }
    this.videoElement.nativeElement.volume = this.volume;
  }

  handleArrowDown(): void {
    if (this.volume >= 0.1) {
      this.volume = this.volume - 0.10;
      localStorage.setItem('volume', String(this.volume));
    }
    else {
      this.volume = 0;
      localStorage.setItem('volume', String(this.volume));
    }
    this.videoElement.nativeElement.volume = this.volume;
  }
  rewindVideo() {
    if (this.videoElement.nativeElement.currentTime > 10) {
      this.videoElement.nativeElement.currentTime -= 10;
      this.updateTimes();
      if (this.videoElement.nativeElement.ended) {
        this.videoElement.nativeElement.play();
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

  scrollToEpisode(index: number): void {
    console.log('scrolle')
    const episodesContainer = document.getElementById('episodes-container') as HTMLDivElement;
    const element = episodesContainer.querySelector(`#episode-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'instant', block: 'center' });
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
  
    const rect = this.progressBar.nativeElement.getBoundingClientRect();
    const position = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1); // clamp 0-1
    this.videoElement.nativeElement.currentTime = this.duration * position;
    this.updateTimes();
  };
  stopDrag = (): void => {
    this.isDragging = false;
    window.removeEventListener('mousemove', this.onDrag);
    window.removeEventListener('mouseup', this.stopDrag);
  };

  startDragMobile(event: TouchEvent): void {
    event.preventDefault();
    this.isDragging = true;
    window.addEventListener('touchmove', this.onDragMobile);
    window.addEventListener('touchcancel', this.stopDragMobile);
    window.addEventListener('touchleave', this.stopDragMobile);
    window.addEventListener('touchend', this.stopDragMobile);
  }
  onDragMobile = (event: TouchEvent): void => {
    if (!this.isDragging) return;
    this.scheduleMouseStillReset();
    const rect = this.progressBar.nativeElement.getBoundingClientRect();
    const position = Math.min(Math.max((event.targetTouches[0].clientX - rect.left) / rect.width, 0), 1); // clamp 0-1
    this.videoElement.nativeElement.currentTime = this.duration * position;
    this.updateTimes();
  };
  stopDragMobile = (): void => {
    this.isDragging = false;
    window.removeEventListener('touchmove', this.onDragMobile);
    window.removeEventListener('touchcancel', this.stopDragMobile);
    window.removeEventListener('touchleave', this.stopDragMobile);
    window.removeEventListener('touchend', this.stopDragMobile);
  };


  toggleOverlay() {
    
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    this.scheduleMouseStillReset();
  }

  @HostListener('document:click', ['$event'])
  onMouseClick(event: MouseEvent): void {
    this.scheduleMouseStillReset();
  }
  
  scheduleMouseStillReset(): void {
    this.showVideoControls();
  
    if (this.mouseStillTimeout) {
      clearTimeout(this.mouseStillTimeout);
    }
  
    this.mouseStillTimeout = setTimeout(() => {
      this.onMouseStill();
    }, 2000);
  }

  showVideoControls(): void {
    this.showControls = true;
    document.body.classList.remove('hide-cursor');
    const overlay = document.getElementById('video-overlay');
    overlay?.classList.add('controls-visible');
    overlay?.classList.remove('hide-cursor');
  }
  
  hideVideoControls(): void {
    this.showControls = false;
    document.body.classList.add('hide-cursor');
    const overlay = document.getElementById('video-overlay');
    overlay?.classList.remove('controls-visible');
    overlay?.classList.add('hide-cursor');
  }

  onMouseStill(): void {
    if (this.isPlaying) {
      this.hideVideoControls();
    }
  }

  mobileStepTime(event: MouseEvent) {
    const clickX = event.clientX;
    const screenWidth = window.innerWidth;
    const forwardButton = document.getElementById('forward-button') as HTMLButtonElement;
    const rewindButton = document.getElementById('rewind-button') as HTMLButtonElement;
    if (clickX > screenWidth / 2 + screenWidth*0.1) {
      forwardButton.click();
    } 
    else if (clickX < screenWidth / 2 - screenWidth*0.1) {
      rewindButton.click();
    }
  }
  updateBufferProgress() {
    const video = this.videoElement.nativeElement as HTMLVideoElement;
    const buffered = video.buffered;
    const duration = video.duration;
  
    if (buffered.length && duration > 0) {
      const end = buffered.end(buffered.length - 1);
      this.bufferPercent = (end / duration) * 100;
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

  async nextEpisode(): Promise<void> {
    const nbEpisodes = this.sources.find(source => source.title == this.videoTitle)?.nbEpisodes;
    if (!nbEpisodes || nbEpisodes <= this.episode) {
      return;
    }

    this.isPlaying = false;
    this.videoElement.nativeElement.pause();
    if (this.videoTitle) {
      await this.videoService.updateWatchProgress(this.videoTitle, 0, this.episode + 1);
      this.router.navigate(['/dashboard'])
      .then(() => { this.router.navigate(['/video', this.videoTitle]); })
    }
  }

  async navigateToEpisode(episode: number): Promise<void> {
    if (episode == this.episode) {
      return;
    }
    this.isPlaying = false;
    this.videoElement.nativeElement.pause();
    if (this.videoTitle) {
      await this.videoService.updateWatchProgress(this.videoTitle, 0, episode);
      this.router.navigate(['/dashboard'])
      .then(() => { this.router.navigate(['/video', this.videoTitle]); })
    }
  }

  ngOnDestroy(): void {
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
    this.videoElement.nativeElement.removeEventListener('loadedmetadata', this.onLoadedMetadata);
    this.videoElement.nativeElement.removeEventListener('progress', this.onProgress);
    if (this.mouseStillTimeout) {
      clearTimeout(this.mouseStillTimeout);
    }
  }
}