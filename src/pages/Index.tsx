
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Users, Settings, Shield, BarChart3, UserCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import StudentPanel from '@/components/StudentPanel';
import FacultyPanel from '@/components/FacultyPanel';
import AdminPanel from '@/components/AdminPanel';
import AttendanceService from '@/services/AttendanceService';

const Index = () => {
  const [isFaculty, setIsFaculty] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [attendanceWindow, setAttendanceWindow] = useState(true);

  useEffect(() => {
    // Check if attendance window is open
    const windowStatus = AttendanceService.getAttendanceWindow();
    setAttendanceWindow(windowStatus);
  }, []);

  const handleFacultyLogin = (password: string) => {
    if (password === 'admin123') {
      setIsFaculty(true);
      toast({
        title: "Faculty Login Successful",
        description: "Welcome to the faculty panel",
      });
      return true;
    }
    toast({
      title: "Login Failed",
      description: "Invalid faculty password",
      variant: "destructive",
    });
    return false;
  };

  const handleAdminLogin = (password: string) => {
    if (password === 'superadmin123') {
      setIsAdmin(true);
      toast({
        title: "Admin Login Successful",
        description: "Welcome to the admin panel",
      });
      return true;
    }
    toast({
      title: "Login Failed",
      description: "Invalid admin password",
      variant: "destructive",
    });
    return false;
  };

  const handleFacultyLogout = () => {
    setIsFaculty(false);
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully",
    });
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <MapPin className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">Geo-Fenced Attendance System</h1>
          </div>
          <p className="text-gray-600">Location-based attendance tracking for secure check-ins</p>
        </header>

        {!attendanceWindow && !isFaculty && !isAdmin && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="text-center text-orange-800">
                <Shield className="h-12 w-12 mx-auto mb-2 text-orange-500" />
                <h3 className="text-lg font-semibold">Attendance Window Closed</h3>
                <p>The attendance window is currently closed. Please contact your faculty.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="student" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="student" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Student Portal
            </TabsTrigger>
            <TabsTrigger value="faculty" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Faculty Panel
            </TabsTrigger>
            <TabsTrigger value="admin" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Admin Panel
            </TabsTrigger>
          </TabsList>

          <TabsContent value="student">
            <StudentPanel 
              attendanceWindow={attendanceWindow} 
              onWindowUpdate={setAttendanceWindow}
            />
          </TabsContent>

          <TabsContent value="faculty">
            <FacultyPanel 
              isFaculty={isFaculty}
              onLogin={handleFacultyLogin}
              onLogout={handleFacultyLogout}
              attendanceWindow={attendanceWindow}
              onWindowUpdate={setAttendanceWindow}
            />
          </TabsContent>

          <TabsContent value="admin">
            <AdminPanel 
              isAdmin={isAdmin}
              onLogin={handleAdminLogin}
              onLogout={handleAdminLogout}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
