
import LocationService from './LocationService';

interface AttendanceRecord {
  fullName: string;
  prn: string;
  timestamp: string;
  location: { lat: number; lng: number };
  distance: number;
  success: boolean;
}

interface AllowedLocation {
  lat: number;
  lng: number;
  radius: number;
}

class AttendanceService {
  private static readonly STORAGE_KEYS = {
    ATTENDANCE_RECORDS: 'geoAttendance_records',
    ALLOWED_LOCATION: 'geoAttendance_allowedLocation',
    ATTENDANCE_WINDOW: 'geoAttendance_window'
  };

  private static readonly DEFAULT_LOCATION: AllowedLocation = {
    lat: 19.0760, // Mumbai coordinates as default
    lng: 72.8777,
    radius: 100
  };

  static async markAttendance(
    fullName: string, 
    prn: string, 
    currentLocation: { lat: number; lng: number }
  ): Promise<{ success: boolean; distance?: number }> {
    const allowedLocation = this.getAllowedLocation();
    const distance = LocationService.calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      allowedLocation.lat,
      allowedLocation.lng
    );

    const success = distance <= allowedLocation.radius;
    
    const record: AttendanceRecord = {
      fullName,
      prn,
      timestamp: new Date().toISOString(),
      location: currentLocation,
      distance,
      success
    };

    this.saveAttendanceRecord(record);
    
    return { success, distance };
  }

  static saveAttendanceRecord(record: AttendanceRecord): void {
    const records = this.getAttendanceRecords();
    records.push(record);
    localStorage.setItem(this.STORAGE_KEYS.ATTENDANCE_RECORDS, JSON.stringify(records));
  }

  static getAttendanceRecords(): AttendanceRecord[] {
    const stored = localStorage.getItem(this.STORAGE_KEYS.ATTENDANCE_RECORDS);
    return stored ? JSON.parse(stored) : [];
  }

  static clearAllRecords(): void {
    localStorage.removeItem(this.STORAGE_KEYS.ATTENDANCE_RECORDS);
  }

  static setAllowedLocation(lat: number, lng: number, radius: number): void {
    const location: AllowedLocation = { lat, lng, radius };
    localStorage.setItem(this.STORAGE_KEYS.ALLOWED_LOCATION, JSON.stringify(location));
  }

  static getAllowedLocation(): AllowedLocation {
    const stored = localStorage.getItem(this.STORAGE_KEYS.ALLOWED_LOCATION);
    return stored ? JSON.parse(stored) : this.DEFAULT_LOCATION;
  }

  static setAttendanceWindow(isOpen: boolean): void {
    localStorage.setItem(this.STORAGE_KEYS.ATTENDANCE_WINDOW, JSON.stringify(isOpen));
  }

  static getAttendanceWindow(): boolean {
    const stored = localStorage.getItem(this.STORAGE_KEYS.ATTENDANCE_WINDOW);
    return stored ? JSON.parse(stored) : true; // Default to open
  }

  static getAttendanceStats(): { total: number; successful: number; failed: number } {
    const records = this.getAttendanceRecords();
    return {
      total: records.length,
      successful: records.filter(r => r.success).length,
      failed: records.filter(r => !r.success).length
    };
  }
}

export default AttendanceService;
