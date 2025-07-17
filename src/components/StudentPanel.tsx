import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MapPin, User, RefreshCw, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AttendanceService from '@/services/AttendanceService';
import LocationService from '@/services/LocationService';
import { useRealtimeAttendance } from '@/hooks/useRealtimeAttendance';

interface StudentPanelProps {
  attendanceWindow: boolean;
  onWindowUpdate: (status: boolean) => void;
}

const StudentPanel: React.FC<StudentPanelProps> = ({ attendanceWindow, onWindowUpdate }) => {
  const [fullName, setFullName] = useState('');
  const [prn, setPrn] = useState('');
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [prnOptions, setPrnOptions] = useState<Array<{ prn: string; name: string | null }>>([]);
  
  const { allowedLocation, loading: realtimeLoading } = useRealtimeAttendance();

  useEffect(() => {
    loadPRNOptions();
    getCurrentLocation();
  }, []);

  const loadPRNOptions = async () => {
    try {
      const options = await AttendanceService.getPRNOptions();
      setPrnOptions(options);
    } catch (error) {
      console.error('Error loading PRN options:', error);
    }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const location = await LocationService.getCurrentLocation();
      setCurrentLocation(location);
      
      if (allowedLocation && (allowedLocation.lat !== 0 || allowedLocation.lng !== 0)) {
        const calculatedDistance = AttendanceService.calculateDistance(
          location.lat,
          location.lng,
          allowedLocation.lat,
          allowedLocation.lng
        );
        setDistance(calculatedDistance);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      toast({
        title: "Location Error",
        description: "Failed to get your current location. Please enable location access.",
        variant: "destructive",
      });
    } finally {
      setLocationLoading(false);
    }
  };

  const handlePRNChange = (selectedPRN: string) => {
    setPrn(selectedPRN);
    const selectedStudent = prnOptions.find(option => option.prn === selectedPRN);
    if (selectedStudent && selectedStudent.name) {
      setFullName(selectedStudent.name);
    }
  };

  const markAttendance = async () => {
    if (!fullName.trim() || !prn.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both name and PRN",
        variant: "destructive",
      });
      return;
    }

    if (!currentLocation) {
      toast({
        title: "Location Required",
        description: "Please allow location access and try again",
        variant: "destructive",
      });
      return;
    }

    if (!attendanceWindow) {
      toast({
        title: "Attendance Closed",
        description: "Attendance window is currently closed",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await AttendanceService.markAttendance(fullName, prn, currentLocation);
      
      if (result.success) {
        toast({
          title: "Attendance Marked Successfully!",
          description: `Distance from attendance zone: ${result.distance?.toFixed(0)}m`,
        });
        setFullName('');
        setPrn('');
        setDistance(null);
      } else {
        toast({
          title: "Attendance Failed",
          description: result.error || "You are outside the allowed attendance zone",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isLocationSet = allowedLocation && (allowedLocation.lat !== 0 || allowedLocation.lng !== 0);
  const isWithinRange = distance !== null && isLocationSet && distance <= allowedLocation.radius;

  return (
    <div className="space-y-6">
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <User className="h-5 w-5" />
            Mark Your Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="prn">Select Your PRN</Label>
              <Select value={prn} onValueChange={handlePRNChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose your PRN" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {prnOptions.map((option) => (
                    <SelectItem key={option.prn} value={option.prn}>
                      {option.prn} {option.name ? `- ${option.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex gap-3 mb-6">
            <Button 
              onClick={markAttendance} 
              disabled={isLoading || !attendanceWindow || !currentLocation}
              className="flex-1"
            >
              {isLoading ? 'Marking...' : 'Mark Attendance'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={getCurrentLocation}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {!attendanceWindow && (
        <Card className="border-2 border-red-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 text-red-700">
              <Clock className="h-5 w-5" />
              <div>
                <p className="font-semibold">Attendance Window Closed</p>
                <p className="text-sm text-red-600">Please wait for faculty to open attendance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentLocation && isLocationSet && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center gap-3 p-4 rounded-lg ${
              isWithinRange ? 'bg-green-50' : 'bg-red-50'
            }`}>
              {isWithinRange ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <div>
                <p className={`font-semibold ${
                  isWithinRange ? 'text-green-800' : 'text-red-800'
                }`}>
                  {isWithinRange ? 'Within Attendance Zone' : 'Outside Attendance Zone'}
                </p>
                <p className="text-sm text-gray-600">
                  Distance: {distance?.toFixed(0)}m | Allowed: {allowedLocation?.radius}m
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentPanel;