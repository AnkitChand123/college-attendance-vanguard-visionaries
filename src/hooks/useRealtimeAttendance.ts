import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AttendanceService from '@/services/AttendanceService';

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

export const useRealtimeAttendance = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceWindow, setAttendanceWindow] = useState<boolean>(true);
  const [allowedLocation, setAllowedLocation] = useState<AllowedLocation>({ lat: 0, lng: 0, radius: 100 });
  const [loading, setLoading] = useState<boolean>(true);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [records, window, location] = await Promise.all([
          AttendanceService.getAttendanceRecords(),
          AttendanceService.getAttendanceWindow(),
          AttendanceService.getAllowedLocation(),
        ]);

        setAttendanceRecords(records);
        setAttendanceWindow(window);
        setAllowedLocation(location);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    // Subscribe to attendance records changes
    const recordsChannel = supabase
      .channel('attendance-records-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_records'
        },
        async (payload) => {
          console.log('Attendance records changed:', payload);
          // Refresh records
          const records = await AttendanceService.getAttendanceRecords();
          setAttendanceRecords(records);
        }
      )
      .subscribe();

    // Subscribe to settings changes
    const settingsChannel = supabase
      .channel('attendance-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_settings'
        },
        async (payload) => {
          console.log('Settings changed:', payload);
          
          if (payload.new && typeof payload.new === 'object' && 'setting_key' in payload.new) {
            const record = payload.new as { setting_key: string; setting_value: any };
            
            if (record.setting_key === 'attendance_window') {
              setAttendanceWindow(record.setting_value as boolean);
            } else if (record.setting_key === 'allowed_location') {
              setAllowedLocation(record.setting_value as AllowedLocation);
            }
          }
        }
      )
      .subscribe();

    // Subscribe to session changes
    const sessionsChannel = supabase
      .channel('attendance-sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_sessions'
        },
        async (payload) => {
          console.log('Session changed:', payload);
          // Refresh attendance window status
          const window = await AttendanceService.getAttendanceWindow();
          setAttendanceWindow(window);
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      recordsChannel.unsubscribe();
      settingsChannel.unsubscribe();
      sessionsChannel.unsubscribe();
    };
  }, []);

  const refreshData = async () => {
    try {
      setLoading(true);
      const [records, window, location] = await Promise.all([
        AttendanceService.getAttendanceRecords(),
        AttendanceService.getAttendanceWindow(),
        AttendanceService.getAllowedLocation(),
      ]);

      setAttendanceRecords(records);
      setAttendanceWindow(window);
      setAllowedLocation(location);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    attendanceRecords,
    attendanceWindow,
    allowedLocation,
    loading,
    refreshData,
  };
};