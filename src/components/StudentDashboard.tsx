
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield, UserCheck, Search, Calendar, User, TrendingUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AttendanceService from '@/services/AttendanceService';

interface StudentDashboardProps {
  isFaculty: boolean;
}

interface MonthlyStats {
  total: number;
  successful: number;
  failed: number;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ isFaculty }) => {
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [selectedPRN, setSelectedPRN] = useState('');
  const [studentData, setStudentData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Generate PRN options from 24020542001 to 24020542182
  const prnOptions = Array.from({ length: 182 }, (_, i) => {
    return `24020542${String(i + 1).padStart(3, '0')}`;
  });

  useEffect(() => {
    if (isFaculty) {
      loadAttendanceRecords();
    }
  }, [isFaculty]);

  useEffect(() => {
    if (selectedPRN && attendanceRecords.length > 0) {
      generateStudentReport();
    }
  }, [selectedPRN, attendanceRecords]);

  const loadAttendanceRecords = async () => {
    const records = await AttendanceService.getAttendanceRecords();
    setAttendanceRecords(records);
  };

  const generateStudentReport = () => {
    const studentRecords = attendanceRecords.filter(record => record.prn === selectedPRN);
    
    if (studentRecords.length === 0) {
      setStudentData(null);
      return;
    }

    const totalAttempts = studentRecords.length;
    const successfulAttempts = studentRecords.filter(r => r.success).length;
    const failedAttempts = totalAttempts - successfulAttempts;
    const attendanceRate = (successfulAttempts / totalAttempts) * 100;
    
    // Group by date
    const dailyAttendance = {};
    studentRecords.forEach(record => {
      const date = new Date(record.timestamp).toISOString().split('T')[0];
      if (!dailyAttendance[date]) {
        dailyAttendance[date] = [];
      }
      dailyAttendance[date].push(record);
    });

    // Get monthly stats
    const monthlyStats = {};
    studentRecords.forEach(record => {
      const month = new Date(record.timestamp).toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyStats[month]) {
        monthlyStats[month] = {
          total: 0,
          successful: 0,
          failed: 0
        };
      }
      monthlyStats[month].total++;
      if (record.success) {
        monthlyStats[month].successful++;
      } else {
        monthlyStats[month].failed++;
      }
    });

    setStudentData({
      fullName: studentRecords[0].fullName,
      prn: selectedPRN,
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      attendanceRate,
      records: studentRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      dailyAttendance,
      monthlyStats,
      firstAttendance: studentRecords[studentRecords.length - 1].timestamp,
      lastAttendance: studentRecords[0].timestamp
    });
  };

  const searchStudent = () => {
    if (!searchTerm) {
      toast({
        title: "Search Term Required",
        description: "Please enter a PRN to search",
        variant: "destructive",
      });
      return;
    }
    
    if (prnOptions.includes(searchTerm)) {
      setSelectedPRN(searchTerm);
    } else {
      toast({
        title: "Student Not Found",
        description: "Invalid PRN number",
        variant: "destructive",
      });
    }
  };

  if (!isFaculty) {
    return (
      <Card className="border-2 border-orange-200">
        <CardHeader className="bg-orange-50">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Shield className="h-5 w-5" />
            Faculty Access Required
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center text-gray-600">
            <UserCheck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Please login as faculty to view student dashboard</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-purple-200">
        <CardHeader className="bg-purple-50">
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <UserCheck className="h-5 w-5" />
            Student Attendance Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="prn-select">Select Student PRN</Label>
              <Select value={selectedPRN} onValueChange={setSelectedPRN}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a PRN" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {prnOptions.map((prn) => (
                    <SelectItem key={prn} value={prn}>
                      {prn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="search-prn">Or Search PRN</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="search-prn"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Enter PRN number"
                />
                <Button onClick={searchStudent}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {studentData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Student Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800">Student Name</h3>
                  <p className="text-lg font-bold">{studentData.fullName}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800">PRN</h3>
                  <p className="text-lg font-bold">{studentData.prn}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-purple-800">Attendance Rate</h3>
                  <p className="text-lg font-bold">{studentData.attendanceRate.toFixed(1)}%</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-orange-800">Total Attempts</h3>
                  <p className="text-lg font-bold">{studentData.totalAttempts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Successful Attempts</span>
                    <Badge variant="default">{studentData.successfulAttempts}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Failed Attempts</span>
                    <Badge variant="destructive">{studentData.failedAttempts}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>First Attendance</span>
                    <span className="text-sm text-gray-600">
                      {new Date(studentData.firstAttendance).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Last Attendance</span>
                    <span className="text-sm text-gray-600">
                      {new Date(studentData.lastAttendance).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Monthly Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(studentData.monthlyStats)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .slice(0, 6)
                    .map(([month, stats]) => {
                      const monthlyStats = stats as MonthlyStats;
                      return (
                        <div key={month} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="font-medium">
                            {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </span>
                          <div className="flex gap-2">
                            <Badge variant="default">{monthlyStats.successful}</Badge>
                            <Badge variant="destructive">{monthlyStats.failed}</Badge>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Attendance History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Distance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentData.records.slice(0, 20).map((record, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {new Date(record.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {record.location.lat.toFixed(4)}, {record.location.lng.toFixed(4)}
                        </TableCell>
                        <TableCell>{record.distance.toFixed(0)}m</TableCell>
                        <TableCell>
                          <Badge variant={record.success ? "default" : "destructive"}>
                            {record.success ? "Present" : "Failed"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {selectedPRN && !studentData && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500 py-8">
              <UserCheck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No attendance records found for PRN: {selectedPRN}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentDashboard;
