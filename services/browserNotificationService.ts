/**
 * Browser Notification Service for Lamsa Perfume POS
 * Manages native browser and OS notifications for the store owner across laptop and mobile devices.
 */

class BrowserNotificationService {
  private isPushSupported: boolean = false;

  constructor() {
    this.isPushSupported = typeof window !== 'undefined' && 'Notification' in window;
  }

  public isSupported(): boolean {
    return this.isPushSupported;
  }

  public getPermission(): NotificationPermission {
    if (!this.isPushSupported) return 'denied';
    return Notification.permission;
  }

  public async requestPermission(): Promise<boolean> {
    if (!this.isPushSupported) return false;
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch {
      return false;
    }
  }

  public sendNotification(title: string, options?: { body?: string; tag?: string; icon?: string; vibrate?: number[] }): void {
    // Vibrate device if supported (especially on Android / mobile devices)
    if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(options?.vibrate || [150, 80, 150]);
      } catch {
        // Ignore vibration errors
      }
    }

    if (!this.isPushSupported || Notification.permission !== 'granted') return;
    try {
      const defaultIcon = 'https://l.top4top.io/p_31142jfec0.png';
      new Notification(title, {
        body: options?.body || '',
        tag: options?.tag || `notif-${Date.now()}`,
        icon: options?.icon || defaultIcon,
        badge: defaultIcon,
        dir: 'rtl',
        lang: 'ar',
      });
    } catch (e) {
      console.warn('Native notification dispatch error:', e);
    }
  }
}

export const browserNotificationService = new BrowserNotificationService();
