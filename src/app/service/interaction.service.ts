import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class InteractionService {
  private hasInteracted = false;

  // stocke les handlers pour pouvoir les retirer proprement
  private interactionHandler = () => this.handleInteraction();

  private handleInteraction(): void {
    this.hasInteracted = true;
    this.removeListeners();
  }

  public initListenInteractions(): void {
    window.addEventListener('click', this.interactionHandler);
    window.addEventListener('keydown', this.interactionHandler);
    window.addEventListener('touchstart', this.interactionHandler);
    window.addEventListener('pointerdown', this.interactionHandler);
  }

  public removeListeners(): void {
    window.removeEventListener('click', this.interactionHandler);
    window.removeEventListener('keydown', this.interactionHandler);
    window.removeEventListener('touchstart', this.interactionHandler);
    window.removeEventListener('pointerdown', this.interactionHandler);
  }

  public userHasInteracted(): boolean {
    return this.hasInteracted;
  }
}
