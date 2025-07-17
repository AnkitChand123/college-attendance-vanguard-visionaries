
import { supabase } from '@/integrations/supabase/client';

interface AttendanceRecord {
  id: string;
  prn: string;
  full_name: string;
  timestamp: string;
  location: { lat: number; lng: number };
  distance: number;
  success: boolean;
  created_at: string;
}

interface AllowedLocation {
  lat: number;
  lng: number;
  radius: number;
}

class AttendanceService {
  static async markAttendance(
    fullName: string, 
    prn: string, 
    currentLocation: { lat: number; lng: number }
  ): Promise<{ success: boolean; distance?: number; error?: string }> {
    try {
      const allowedLocation = await this.getAllowedLocation();
      console.log('Marking attendance - Allowed location:', allowedLocation);
      console.log('Current location:', currentLocation);
      
      // Check if PRN exists in database
      const { data: prnData, error: prnError } = await supabase
        .from('PRNs')
        .select('*')
        .eq('PRN', parseInt(prn))
        .maybeSingle();
      
      if (prnError) {
        console.error('Error checking PRN:', prnError);
        return { success: false, error: 'Database error' };
      }
      
      if (!prnData) {
        return { success: false, error: 'Invalid PRN number' };
      }
      
      const distance = this.calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        allowedLocation.lat,
        allowedLocation.lng
      );

      const success = distance <= allowedLocation.radius;
      console.log('Attendance result:', { success, distance, radius: allowedLocation.radius });
      
      const { error } = await supabase
        .from('attendance_records')
        .insert({
          prn,
          full_name: fullName,
          location: currentLocation,
          distance,
          success
        });

      if (error) {
        console.error('Error saving attendance:', error);
        return { success: false, error: 'Failed to save attendance' };
      }
      
      return { success, distance };
    } catch (error) {
      console.error('Error in markAttendance:', error);
      return { success: false, error: 'Unexpected error' };
    }
  }

  static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  static async getAttendanceRecords(): Promise<AttendanceRecord[]> {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching attendance records:', error);
        return [];
      }

      return (data || []).map(record => ({
        ...record,
        location: record.location as { lat: number; lng: number }
      }));
    } catch (error) {
      console.error('Error in getAttendanceRecords:', error);
      return [];
    }
  }

  static async clearAllRecords(): Promise<void> {
    try {
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        console.error('Error clearing records:', error);
      }
    } catch (error) {
      console.error('Error in clearAllRecords:', error);
    }
  }

  static async setAllowedLocation(lat: number, lng: number, radius: number): Promise<void> {
    try {
      const location = { lat, lng, radius };
      
      const { error } = await supabase
        .from('attendance_settings')
        .upsert({
          setting_key: 'allowed_location',
          setting_value: location as any
        }, {
          onConflict: 'setting_key'
        });

      if (error) {
        console.error('Error updating allowed location:', error);
      } else {
        console.log('Allowed location updated:', location);
      }
    } catch (error) {
      console.error('Error in setAllowedLocation:', error);
    }
  }

  static async getAllowedLocation(): Promise<AllowedLocation> {
    try {
      const { data, error } = await supabase
        .from('attendance_settings')
        .select('setting_value')
        .eq('setting_key', 'allowed_location')
        .maybeSingle();

      if (error) {
        console.error('Error fetching allowed location:', error);
        return { lat: 0, lng: 0, radius: 100 };
      }

      if (data && data.setting_value) {
        return data.setting_value as unknown as AllowedLocation;
      }

      return { lat: 0, lng: 0, radius: 100 };
    } catch (error) {
      console.error('Error in getAllowedLocation:', error);
      return { lat: 0, lng: 0, radius: 100 };
    }
  }

  static async hasAllowedLocationBeenSet(): Promise<boolean> {
    try {
      const location = await this.getAllowedLocation();
      return location.lat !== 0 || location.lng !== 0;
    } catch (error) {
      return false;
    }
  }

  static async setAttendanceWindow(isOpen: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('attendance_settings')
        .upsert({
          setting_key: 'attendance_window',
          setting_value: isOpen as any
        }, {
          onConflict: 'setting_key'
        });

      if (error) {
        console.error('Error updating attendance window:', error);
      }
    } catch (error) {
      console.error('Error in setAttendanceWindow:', error);
    }
  }

  static async getAttendanceWindow(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('attendance_settings')
        .select('setting_value')
        .eq('setting_key', 'attendance_window')
        .maybeSingle();

      if (error) {
        console.error('Error fetching attendance window:', error);
        return true;
      }

      if (data && data.setting_value !== null) {
        return data.setting_value as boolean;
      }

      return true;
    } catch (error) {
      console.error('Error in getAttendanceWindow:', error);
      return true;
    }
  }

  static async getAttendanceStats(): Promise<{ total: number; successful: number; failed: number }> {
    try {
      const records = await this.getAttendanceRecords();
      return {
        total: records.length,
        successful: records.filter(r => r.success).length,
        failed: records.filter(r => !r.success).length
      };
    } catch (error) {
      console.error('Error in getAttendanceStats:', error);
      return { total: 0, successful: 0, failed: 0 };
    }
  }

  static async getPRNOptions(): Promise<Array<{ prn: string; name: string | null }>> {
    try {
      console.log('Fetching PRN options from database...');
      const { data, error } = await supabase
        .from('PRNs')
        .select('PRN, Name')
        .order('PRN', { ascending: true });

      if (error) {
        console.error('Error fetching PRNs:', error);
        return [];
      }

      console.log('Raw data from database:', data);
      
      const mappedData = data?.map(item => ({ 
        prn: item.PRN.toString(), 
        name: item.Name 
      })) || [];
      
      console.log('Mapped PRN data:', mappedData);
      return mappedData;
    } catch (error) {
      console.error('Error in getPRNOptions:', error);
      return [];
    }
  }
}

export default AttendanceService;
