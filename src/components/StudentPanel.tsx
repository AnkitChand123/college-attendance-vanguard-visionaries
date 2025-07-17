
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, CheckCircle, XCircle, RefreshCw, Clock, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AttendanceService from '@/services/AttendanceService';
import LocationService from '@/services/LocationService';

interface StudentPanelProps {
  attendanceWindow: boolean;
  onWindowUpdate: (status: boolean) => void;
}

const StudentPanel: React.FC<StudentPanelProps> = ({ attendanceWindow, onWindowUpdate }) => {
  const [fullName, setFullName] = useState('');
  const [prn, setPrn] = useState('');
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [allowedLocation, setAllowedLocation] = useState<{lat: number, lng: number, radius: number} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [isInRange, setIsInRange] = useState(false);

  // Generate PRN options
  const generatePRNOptions = () => {
    const options = [];
    for (let i = 1; i <= 182; i++) {
      const prn = `24020542${i.toString().padStart(3, '0')}`;
      options.push(prn);
    }
    return options;
  };

  const refreshStudentInfo = () => {
    setFullName('');
    setPrn('');
    setCurrentLocation(null);
    setDistance(null);
    setIsInRange(false);
    toast({
      title: "Student Information Refreshed",
      description: "All fields have been cleared",
    });
  };

  const loadAllowedLocation = () => {
    const location = AttendanceService.getAllowedLocation();
    setAllowedLocation(location);
    console.log('Loaded allowed location in student panel:', location);
  };

  const getCurrentLocation = async () => {
    setIsLoading(true);
    try {
      const location = await LocationService.getCurrentLocation();
      setCurrentLocation(location);
      console.log('Got current location in student panel:', location);
      
      const allowedLoc = AttendanceService.getAllowedLocation();
      if (allowedLoc.lat !== 0 || allowedLoc.lng !== 0) {
        const calculatedDistance = LocationService.calculateDistance(
          location.lat,
          location.lng,
          allowedLoc.lat,
          allowedLoc.lng
        );
        
        setDistance(calculatedDistance);
        setIsInRange(calculatedDistance <= allowedLoc.radius);
        
        toast({
          title: "Location Updated",
          description: `Distance from attendance zone: ${calculatedDistance.toFixed(0)}m`,
        });
      } else {
        toast({
          title: "No Attendance Zone Set",
          description: "Admin hasn't configured the attendance zone yet",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Location error:', error);
      toast({
        title: "Location Error",
        description: "Unable to get your current location. Please check your browser permissions.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const markAttendance = async () => {
    if (!fullName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your full name",
        variant: "destructive",
      });
      return;
    }

    if (!prn) {
      toast({
        title: "Missing Information",
        description: "Please select your PRN",
        variant: "destructive",
      });
      return;
    }

    if (!attendanceWindow) {
      toast({
        title: "Attendance Closed",
        description: "The attendance window is currently closed",
        variant: "destructive",
      });
      return;
    }

    const allowedLoc = AttendanceService.getAllowedLocation();
    if (allowedLoc.lat === 0 && allowedLoc.lng === 0) {
      toast({
        title: "Attendance Zone Not Set",
        description: "Admin hasn't configured the attendance zone yet",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const location = await LocationService.getCurrentLocation();
      const result = await AttendanceService.markAttendance(fullName, prn, location);
      
      if (result.success) {
        toast({
          title: "✅ Attendance Marked Successfully",
          description: `Welcome ${fullName}! You are ${result.distance?.toFixed(0)}m from the attendance zone.`,
        });
        setCurrentLocation(location);
        setDistance(result.distance || 0);
        setIsInRange(true);
      } else {
        toast({
          title: "❌ You are not inside the attendance zone",
          description: `You are ${result.distance?.toFixed(0)}m away from the allowed location.`,
          variant: "destructive",
        });
        setCurrentLocation(location);
        setDistance(result.distance || 0);
        setIsInRange(false);
      }
    } catch (error) {
      console.error('Attendance marking error:', error);
      toast({
        title: "Error",
        description: "Failed to mark attendance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllowedLocation();
    getCurrentLocation();
  }, []);

  // Check if admin has set location
  const hasAttendanceZone = allowedLocation && (allowedLocation.lat !== 0 || allowedLocation.lng !== 0);

  return (
    <div className="space-y-6">
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <MapPin className="h-5 w-5" />
            Student Attendance Portal
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="prn">PRN (Personal Registration Number) *</Label>
                <Select value={prn} onValueChange={setPrn}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select your PRN" />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    {generatePRNOptions().map((prnOption) => (
                      <SelectItem key={prnOption} value={prnOption}>
                        {prnOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={refreshStudentInfo}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Info
                </Button>
                <Button 
                  onClick={getCurrentLocation}
                  variant="outline"
                  disabled={isLoading}
                  className="flex-1"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Get Location
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Attendance Zone Information */}
              {hasAttendanceZone ? (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Attendance Zone
                  </h4>
                  <p className="text-sm text-green-600">
                    Lat: {allowedLocation!.lat.toFixed(6)}<br />
                    Lng: {allowedLocation!.lng.toFixed(6)}<br />
                    Radius: {allowedLocation!.radius}m
                  </p>
                </div>
              ) : (
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-700 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    No Attendance Zone Set
                  </h4>
                  <p className="text-sm text-orange-600">
                    Admin hasn't configured the attendance zone yet
                  </p>
                </div>
              )}

              {/* Current Location Information */}
              {currentLocation ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-2">Current Location</h4>
                  <p className="text-sm text-gray-600">
                    Lat: {currentLocation.lat.toFixed(6)}<br />
                    Lng: {currentLocation.lng.toFixed(6)}
                  </p>
                  {distance !== null && hasAttendanceZone && (
                    <div className={`mt-2 flex items-center gap-2 ${isInRange ? 'text-green-600' : 'text-red-600'}`}>
                      {isInRange ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      <span className="text-sm font-medium">
                        Distance: {distance.toFixed(0)}m from attendance zone
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-2">Current Location</h4>
                  <p className="text-sm text-gray-600">
                    Click "Get Location" to fetch your current coordinates
                  </p>
                </div>
              )}

              {!attendanceWindow && (
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-700">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Attendance Window Closed</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <Button 
              onClick={markAttendance}
              disabled={isLoading || !attendanceWindow || !hasAttendanceZone}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Marking Attendance...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Mark My Attendance
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentPanel;
