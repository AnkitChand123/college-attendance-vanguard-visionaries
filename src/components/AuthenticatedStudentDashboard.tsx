import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LocationService from '@/services/LocationService';
import AttendanceService from '@/services/AttendanceService';
import { useRealtimeAttendance } from '@/hooks/useRealtimeAttendance';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

interface StudentProfile {
  prn: string;
  full_name: string;
  email: string;
}

interface AttendanceRecord {
  id: string;
  timestamp: string;
  location: any;
  distance: number;
  success: boolean;
  created_at: string;
}

interface AuthenticatedStudentDashboardProps {
  attendanceWindow: boolean;
  onWindowUpdate: (status: boolean) => void;
}

export const AuthenticatedStudentDashboard: React.FC<AuthenticatedStudentDashboardProps> = ({
  attendanceWindow,
  onWindowUpdate,
}) => {
  const { user, signOut } = useAuth();
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  
  const { allowedLocation } = useRealtimeAttendance();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadStudentProfile();
      loadAttendanceHistory();
    }
  }, [user]);

  const loadStudentProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('prn, full_name, email')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setStudentProfile(data);
    } catch (error) {
      console.error('Error loading student profile:', error);
      toast({
        title: "Error",
        description: "Failed to load your profile. Please contact admin.",
        variant: "destructive",
      });
    }
  };

  const loadAttendanceHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('id, timestamp, location, distance, success, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAttendanceHistory(data || []);
    } catch (error) {
      console.error('Error loading attendance history:', error);
    }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const location = await LocationService.getCurrentLocation();
      setCurrentLocation(location);

      if (allowedLocation) {
        const calculatedDistance = AttendanceService.calculateDistance(
          location.lat,
          location.lng,
          allowedLocation.lat,
          allowedLocation.lng
        );
        setDistance(calculatedDistance);

        toast({
          title: "Location Updated",
          description: `Distance from allowed zone: ${calculatedDistance.toFixed(2)} meters`,
        });
      }
    } catch (error) {
      toast({
        title: "Location Error",
        description: "Unable to get your current location. Please enable location services.",
        variant: "destructive",
      });
    }
    setLocationLoading(false);
  };

  const markAttendance = async () => {
    if (!studentProfile || !currentLocation || !user) {
      toast({
        title: "Missing Information",
        description: "Please get your location first and ensure your profile is loaded.",
        variant: "destructive",
      });
      return;
    }

    if (!attendanceWindow) {
      toast({
        title: "Attendance Window Closed",
        description: "Attendance marking is currently disabled by faculty.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await AttendanceService.markAttendanceForUser(
        user.id,
        studentProfile.full_name,
        studentProfile.prn,
        currentLocation
      );

      if (result.success) {
        toast({
          title: "Attendance Marked Successfully",
          description: `Distance: ${result.distance?.toFixed(2)} meters`,
        });
        // Refresh attendance history
        loadAttendanceHistory();
      } else {
        toast({
          title: "Attendance Failed",
          description: result.error || "Unable to mark attendance",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred while marking attendance.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      toast({
        title: "Logout Error",
        description: "An error occurred while logging out.",
        variant: "destructive",
      });
    }
  };

  if (!studentProfile) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const isWithinRange = distance !== null && allowedLocation && distance <= allowedLocation.radius;

  return (
    <div className="space-y-6">
      {/* Student Profile Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Welcome, {studentProfile.full_name}</CardTitle>
            <CardDescription>
              PRN: {studentProfile.prn} | Email: {studentProfile.email}
            </CardDescription>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </CardHeader>
      </Card>

      {/* Attendance Marking */}
      <Card>
        <CardHeader>
          <CardTitle>Mark Attendance</CardTitle>
          <CardDescription>
            Click "Get Location" first, then mark your attendance when within the allowed zone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!attendanceWindow && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Attendance window is currently closed. Please wait for faculty to open it.
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <Button 
              onClick={getCurrentLocation} 
              disabled={locationLoading}
              variant="outline"
            >
              {locationLoading ? 'Getting Location...' : 'Get Location'}
            </Button>

            <Button 
              onClick={markAttendance}
              disabled={!currentLocation || isLoading || !attendanceWindow}
              className="flex-1"
            >
              {isLoading ? 'Marking Attendance...' : 'Mark Attendance'}
            </Button>
          </div>

          {currentLocation && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Current Location: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
              </p>
              
              {distance !== null && (
                <div className="flex items-center gap-2">
                  <Badge variant={isWithinRange ? "default" : "destructive"}>
                    {isWithinRange ? '✓ Within Range' : '✗ Outside Range'}
                  </Badge>
                  <span className="text-sm">
                    Distance: {distance.toFixed(2)} meters
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance History */}
      <Card>
        <CardHeader>
          <CardTitle>Your Attendance History</CardTitle>
          <CardDescription>
            Recent attendance records (showing last 10 entries)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {attendanceHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Distance (m)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceHistory.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {format(new Date(record.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>{record.distance.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={record.success ? "default" : "destructive"}>
                        {record.success ? 'Success' : 'Failed'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No attendance records found.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};