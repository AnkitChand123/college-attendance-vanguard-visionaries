import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MapPin, User, RefreshCw, Clock, AlertCircle, CheckCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AttendanceService from '@/services/AttendanceService';
import LocationService from '@/services/LocationService';
import { useRealtimeAttendance } from '@/hooks/useRealtimeAttendance';

interface StudentPanelProps {
  attendanceWindow: boolean;
  onWindowUpdate: (status: boolean) => void;
}

interface AuthenticatedStudent {
  prn: string;
  fullName: string;
}

const StudentPanel: React.FC<StudentPanelProps> = ({ attendanceWindow, onWindowUpdate }) => {
  const [fullName, setFullName] = useState('');
  const [prn, setPrn] = useState('');
  const [password, setPassword] = useState('');
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [prnOptions, setPrnOptions] = useState<Array<{ prn: string; name: string | null }>>([]);
  const [authenticatedStudent, setAuthenticatedStudent] = useState<AuthenticatedStudent | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  
  const { allowedLocation, loading: realtimeLoading } = useRealtimeAttendance();

  useEffect(() => {
    loadPRNOptions();
    getCurrentLocation();
  }, []);

  const loadPRNOptions = async () => {
    try {
      console.log('Loading PRN options...');
      const options = await AttendanceService.getPRNOptions();
      console.log('PRN options loaded:', options);
      setPrnOptions(options);
    } catch (error) {
      console.error('Error loading PRN options:', error);
    }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      console.log('🔍 Getting current location...');
      const location = await LocationService.getCurrentLocation();
      console.log('📍 Current location received:', location);
      setCurrentLocation(location);
      
      if (allowedLocation && (allowedLocation.lat !== 0 || allowedLocation.lng !== 0)) {
        console.log('🎯 Allowed location:', allowedLocation);
        const calculatedDistance = AttendanceService.calculateDistance(
          location.lat,
          location.lng,
          allowedLocation.lat,
          allowedLocation.lng
        );
        console.log('📏 Distance calculated:', calculatedDistance, 'meters');
        setDistance(calculatedDistance);
        
        // Show location info in toast for debugging
        toast({
          title: "Location Debug Info",
          description: `Current: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)} | Allowed: ${allowedLocation.lat.toFixed(6)}, ${allowedLocation.lng.toFixed(6)} | Distance: ${calculatedDistance.toFixed(0)}m`,
        });
      } else {
        console.log('⚠️ No allowed location set');
      }
    } catch (error) {
      console.error('❌ Error getting location:', error);
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

  const authenticateStudent = async () => {
    if (!prn.trim()) {
      toast({
        title: "PRN Required",
        description: "Please select your PRN",
        variant: "destructive",
      });
      return;
    }

    if (!password.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter your password",
        variant: "destructive",
      });
      return;
    }

    setIsAuthenticating(true);
    try {
      // For now, use a simple password check. In production, this should be a proper authentication system
      const isValidPassword = password === 'student123'; // This should be replaced with proper authentication
      
      if (isValidPassword) {
        setAuthenticatedStudent({ prn, fullName });
        toast({
          title: "Authentication Successful",
          description: `Welcome, ${fullName}!`,
        });
        setPassword('');
        setShowAuthForm(false);
      } else {
        toast({
          title: "Authentication Failed",
          description: "Invalid password. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Authentication Error",
        description: "An error occurred during authentication.",
        variant: "destructive",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    setAuthenticatedStudent(null);
    setPrn('');
    setFullName('');
    setPassword('');
    setShowAuthForm(false);
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully.",
    });
  };

  const handleMarkAttendanceClick = () => {
    if (!authenticatedStudent) {
      setShowAuthForm(true);
      return;
    }
    markAttendance();
  };

  const markAttendance = async () => {
    if (!authenticatedStudent) {
      toast({
        title: "Authentication Required",
        description: "Please authenticate first to mark attendance",
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
      const result = await AttendanceService.markAttendance(
        authenticatedStudent.fullName, 
        authenticatedStudent.prn, 
        currentLocation
      );
      
      if (result.success) {
        toast({
          title: "Attendance Marked Successfully!",
          description: `Distance from attendance zone: ${result.distance?.toFixed(0)}m`,
        });
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
      {/* Authentication Status */}
      {authenticatedStudent && (
        <Card className="border-2 border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <div>
                  <p className="font-semibold">Authenticated as {authenticatedStudent.fullName}</p>
                  <p className="text-sm text-green-600">PRN: {authenticatedStudent.prn}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <User className="h-5 w-5" />
            Mark Your Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {!showAuthForm ? (
            // Main attendance interface
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <Label htmlFor="prn">Select Your PRN *</Label>
                  <Select value={prn} onValueChange={handlePRNChange} required disabled={!!authenticatedStudent}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose your PRN" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 bg-background border border-border">
                      {prnOptions.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">No PRNs available</div>
                      ) : (
                        prnOptions.map((option) => (
                          <SelectItem key={option.prn} value={option.prn}>
                            {option.prn} {option.name ? `- ${option.name}` : ''}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Auto-filled from PRN selection"
                    className="mt-1"
                    readOnly
                    disabled
                  />
                </div>
              </div>

              <div className="flex gap-3 mb-6">
                <Button 
                  onClick={handleMarkAttendanceClick} 
                  disabled={isLoading || !attendanceWindow || !currentLocation || !prn}
                  className="flex-1"
                >
                  {isLoading ? 'Marking...' : 'Mark Attendance'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={getCurrentLocation}
                  disabled={locationLoading}
                  className="flex items-center gap-2"
                >
                  <MapPin className={`h-4 w-4 ${locationLoading ? 'animate-pulse' : ''}`} />
                  {locationLoading ? 'Getting...' : 'Location'}
                </Button>
              </div>
            </div>
          ) : (
            // Authentication form
            <div className="space-y-4">
              <div className="text-center mb-4">
                <Lock className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                <h3 className="text-lg font-semibold text-blue-800">Authentication Required</h3>
                <p className="text-sm text-gray-600">Please enter your password to mark attendance</p>
              </div>

              <div>
                <Label htmlFor="auth-prn">PRN</Label>
                <Input
                  id="auth-prn"
                  value={prn}
                  placeholder="Your PRN"
                  disabled
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="mt-1 pr-10"
                    onKeyPress={(e) => e.key === 'Enter' && authenticateStudent()}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Demo password: student123</p>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={authenticateStudent}
                  disabled={isAuthenticating || !password}
                  className="flex-1"
                >
                  {isAuthenticating ? 'Authenticating...' : 'Login'}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowAuthForm(false);
                    setPassword('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
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