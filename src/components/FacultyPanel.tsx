
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Shield, Users, Settings, Download, Clock, MapPin, LogOut, Navigation } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AttendanceService from '@/services/AttendanceService';
import LocationService from '@/services/LocationService';

interface FacultyPanelProps {
  isFaculty: boolean;
  onLogin: (password: string) => boolean;
  onLogout: () => void;
  attendanceWindow: boolean;
  onWindowUpdate: (status: boolean) => void;
}

const FacultyPanel: React.FC<FacultyPanelProps> = ({ 
  isFaculty, 
  onLogin, 
  onLogout, 
  attendanceWindow, 
  onWindowUpdate 
}) => {
  const [password, setPassword] = useState('');
  const [allowedLocation, setAllowedLocation] = useState({ lat: 0, lng: 0, radius: 100 });
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  useEffect(() => {
    if (isFaculty) {
      const loadData = async () => {
        const location = await AttendanceService.getAllowedLocation();
        setAllowedLocation(location);
        await loadAttendanceRecords();
      };
      loadData();
    }
  }, [isFaculty]);

  const loadAttendanceRecords = async () => {
    const records = await AttendanceService.getAttendanceRecords();
    setAttendanceRecords(records);
  };

  const handleLogin = () => {
    const success = onLogin(password);
    if (success) {
      setPassword('');
    }
  };

  const fetchCurrentLocation = async () => {
    setFetchingLocation(true);
    try {
      const location = await LocationService.getCurrentLocation();
      setAllowedLocation({
        ...allowedLocation,
        lat: location.lat,
        lng: location.lng
      });
      toast({
        title: "Location Fetched",
        description: "Current location has been set as allowed location",
      });
    } catch (error) {
      toast({
        title: "Location Error",
        description: error instanceof Error ? error.message : "Failed to get location",
        variant: "destructive",
      });
    } finally {
      setFetchingLocation(false);
    }
  };

  const updateLocation = () => {
    AttendanceService.setAllowedLocation(allowedLocation.lat, allowedLocation.lng, allowedLocation.radius);
    toast({
      title: "Location Updated",
      description: "Allowed location has been updated successfully",
    });
  };

  const toggleAttendanceWindow = (checked: boolean) => {
    AttendanceService.setAttendanceWindow(checked);
    onWindowUpdate(checked);
    toast({
      title: checked ? "Attendance Window Opened" : "Attendance Window Closed",
      description: checked ? "Students can now mark attendance" : "Students can no longer mark attendance",
    });
  };

  const exportToCSV = () => {
    if (attendanceRecords.length === 0) {
      toast({
        title: "No Data",
        description: "No attendance records to export",
        variant: "destructive",
      });
      return;
    }

    const headers = ['Full Name', 'PRN', 'Timestamp', 'Latitude', 'Longitude', 'Distance (m)', 'Status'];
    const csvContent = [
      headers.join(','),
      ...attendanceRecords.map(record => [
        record.fullName,
        record.prn,
        record.timestamp,
        record.location.lat.toFixed(6),
        record.location.lng.toFixed(6),
        record.distance.toFixed(0),
        record.success ? 'Success' : 'Failed'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_records_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Attendance records exported to CSV",
    });
  };

  const clearAllRecords = () => {
    if (window.confirm('Are you sure you want to clear all attendance records? This action cannot be undone.')) {
      AttendanceService.clearAllRecords();
      setAttendanceRecords([]);
      toast({
        title: "Records Cleared",
        description: "All attendance records have been cleared",
      });
    }
  };

  if (!isFaculty) {
    return (
      <Card className="border-2 border-orange-200">
        <CardHeader className="bg-orange-50">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Shield className="h-5 w-5" />
            Faculty Login Required
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="max-w-md mx-auto space-y-4">
            <div>
              <Label htmlFor="password">Faculty Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter faculty password"
                className="mt-1"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <Button onClick={handleLogin} className="w-full">
              <Shield className="h-4 w-4 mr-2" />
              Login as Faculty
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-green-200">
        <CardHeader className="bg-green-50 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Settings className="h-5 w-5" />
            Faculty Control Panel
          </CardTitle>
          <Button onClick={onLogout} variant="outline" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Attendance Window Control
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      {attendanceWindow ? 'Attendance is currently open' : 'Attendance is currently closed'}
                    </p>
                  </div>
                  <Switch
                    checked={attendanceWindow}
                    onCheckedChange={toggleAttendanceWindow}
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Allowed Location Settings
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button 
                      onClick={fetchCurrentLocation} 
                      disabled={fetchingLocation}
                      variant="outline"
                      className="flex-1"
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      {fetchingLocation ? 'Fetching...' : 'Use My Location'}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        value={allowedLocation.lat}
                        onChange={(e) => setAllowedLocation({
                          ...allowedLocation,
                          lat: parseFloat(e.target.value) || 0
                        })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        value={allowedLocation.lng}
                        onChange={(e) => setAllowedLocation({
                          ...allowedLocation,
                          lng: parseFloat(e.target.value) || 0
                        })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="radius">Allowed Radius (meters)</Label>
                    <Input
                      id="radius"
                      type="number"
                      value={allowedLocation.radius}
                      onChange={(e) => setAllowedLocation({
                        ...allowedLocation,
                        radius: parseInt(e.target.value) || 100
                      })}
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={updateLocation} className="w-full">
                    Update Location Settings
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Attendance Summary
                </h3>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {attendanceRecords.filter(r => r.success).length}
                    </p>
                    <p className="text-sm text-gray-600">Successful</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">
                      {attendanceRecords.filter(r => !r.success).length}
                    </p>
                    <p className="text-sm text-gray-600">Failed</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={exportToCSV} variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button onClick={clearAllRecords} variant="destructive" className="flex-1">
                  Clear All
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Recent Attendance Records ({attendanceRecords.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>PRN</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      No attendance records found
                    </TableCell>
                  </TableRow>
                ) : (
                  attendanceRecords.slice(-10).reverse().map((record, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{record.fullName}</TableCell>
                      <TableCell>{record.prn}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(record.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.location.lat.toFixed(4)}, {record.location.lng.toFixed(4)}
                      </TableCell>
                      <TableCell>{record.distance.toFixed(0)}m</TableCell>
                      <TableCell>
                        <Badge variant={record.success ? "default" : "destructive"}>
                          {record.success ? "Success" : "Failed"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FacultyPanel;
