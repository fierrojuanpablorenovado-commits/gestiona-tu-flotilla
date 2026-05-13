import * as Location from 'expo-location';
import { api } from './api';

const LOCATION_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const LOCATION_DISTANCE_METERS = 100; // minimum distance change

/**
 * Location tracking service for driver app.
 * Captures GPS on login and runs background tracking every 5 minutes.
 */
export class LocationService {
  private static watchSubscription: Location.LocationSubscription | null = null;

  /**
   * Request location permissions (must be called before any tracking)
   */
  static async requestPermissions(): Promise<boolean> {
    const { status: foreground } = await Location.requestForegroundPermissionsAsync();
    if (foreground !== 'granted') return false;

    const { status: background } = await Location.requestBackgroundPermissionsAsync();
    return background === 'granted';
  }

  /**
   * Capture current location (used on login)
   */
  static async captureCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      await this.sendToServer(location, 'app_login');
      return location;
    } catch {
      return null;
    }
  }

  /**
   * Start background location tracking
   */
  static async startBackgroundTracking(): Promise<void> {
    if (this.watchSubscription) return;

    this.watchSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: LOCATION_INTERVAL_MS,
        distanceInterval: LOCATION_DISTANCE_METERS,
      },
      async (location) => {
        await this.sendToServer(location, 'app_background');
      },
    );
  }

  /**
   * Stop background tracking
   */
  static stopTracking(): void {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }
  }

  /**
   * Send location to backend
   */
  private static async sendToServer(
    location: Location.LocationObject,
    source: string,
  ): Promise<void> {
    try {
      await api.post('/location/log', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy_meters: location.coords.accuracy,
        altitude: location.coords.altitude,
        speed_kmh: location.coords.speed
          ? location.coords.speed * 3.6 // m/s to km/h
          : null,
        heading: location.coords.heading,
        source,
        recorded_at: new Date(location.timestamp).toISOString(),
      });
    } catch {
      // Silently fail - don't disrupt the app for location logging
      // TODO: Queue failed locations for retry
    }
  }
}
