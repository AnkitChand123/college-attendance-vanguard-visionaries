
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, BarChart3, Calendar, Users, TrendingUp, Filter, User, UserCheck, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AttendanceService from '@/services/AttendanceService';

interface AdminPanelProps {
  isAdmin: boolean;
  onLogin: (password: string) => boolean;
  onLogout: () => void;
}

interface DailyStats {
  date: string;
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  uniqueStudents: number;
}

interface StudentStats {
  fullName: string;
  prn: string;
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  lastAttempt: string;
  attendanceRate: number;
}

interface MonthlyStats {
  total: number;
  successful: number;
  failed: number;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ isAdmin, onLogin, onLogout }) => {
  const [password, setPassword] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [analytics, setAnalytics] = useState<any>({});
  const [selectedPRN, setSelectedPRN] = useState('');
  const [studentData, setStudentData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Generate PRN options from 24020542001 to 24020542182
  const prnOptions = Array.from({ length: 182 }, (_, i) => {
    return `24020542${String(i + 1).padStart(3, '0')}`;
  });

  useEffect(() => {
    if (isAdmin) {
      loadAttendanceRecords();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (attendanceRecords.length > 0) {
      generateAnalytics();
    }
  }, [attendanceRecords, selectedDate]);

  useEffect(() => {
    if (selectedPRN && attendanceRecords.length > 0) {
      generateStudentReport();
    }
  }, [selectedPRN, attendanceRecords]);

  const loadAttendanceRecords = () => {
    const records = AttendanceService.getAttendanceRecords();
    setAttendanceRecords(records);
  };

  const generateAnalytics = () => {
    const filteredRecords = attendanceRecords.filter(record => {
      const recordDate = new Date(record.timestamp).toISOString().split('T')[0];
      return recordDate === selectedDate;
    });

    const studentStats: { [key: string]: StudentStats } = {};
    const dailyStats: { [key: string]: DailyStats } = {};
    
    // Process records
    attendanceRecords.forEach(record => {
      const date = new Date(record.timestamp).toISOString().split('T')[0];
      const prn = record.prn;
      
      // Student-wise stats
      if (!studentStats[prn]) {
        studentStats[prn] = {
          fullName: record.fullName,
          prn: prn,
          totalAttempts: 0,
          successfulAttempts: 0,
          failedAttempts: 0,
          lastAttempt: record.timestamp,
          attendanceRate: 0
        };
      }
      
      studentStats[prn].totalAttempts++;
      if (record.success) {
        studentStats[prn].successfulAttempts++;
      } else {
        studentStats[prn].failedAttempts++;
      }
      
      if (new Date(record.timestamp) > new Date(studentStats[prn].lastAttempt)) {
        studentStats[prn].lastAttempt = record.timestamp;
      }
      
      studentStats[prn].attendanceRate = 
        (studentStats[prn].successfulAttempts / studentStats[prn].totalAttempts) * 100;
      
      // Daily stats
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date: date,
          totalAttempts: 0,
          successfulAttempts: 0,
          failedAttempts: 0,
          uniqueStudents: 0
        };
      }
      
      dailyStats[date].totalAttempts++;
      if (record.success) {
        dailyStats[date].successfulAttempts++;
      } else {
        dailyStats[date].failedAttempts++;
      }
    });

    // Count unique students per day
    Object.keys(dailyStats).forEach(date => {
      const uniqueStudents = new Set(
        attendanceRecords
          .filter(record => new Date(record.timestamp).toISOString().split('T')[0] === date)
          .map(record => record.prn)
      );
      dailyStats[date].uniqueStudents = uniqueStudents.size;
    });

    setAnalytics({
      studentStats: Object.values(studentStats),
      dailyStats: Object.values(dailyStats).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      selectedDayStats: filteredRecords
    });
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
    
    // Get monthly stats
    const monthlyStats: { [key: string]: MonthlyStats } = {};
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

  const handleLogin = () => {
    const success = onLogin(password);
    if (success) {
      setPassword('');
    }
  };

  if (!isAdmin) {
    return (
      <Card className="border-2 border-orange-200">
        <CardHeader className="bg-orange-50">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Shield className="h-5 w-5" />
            Admin Login Required
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="max-w-md mx-auto space-y-4">
            <div>
              <Label htmlFor="admin-password">Admin Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="mt-1"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <Button onClick={handleLogin} className="w-full">
              <Shield className="h-4 w-4 mr-2" />
              Login as Admin
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-purple-200">
        <CardHeader className="bg-purple-50 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <Shield className="h-5 w-5" />
            Admin Control Panel
          </CardTitle>
          <Button onClick={onLogout} variant="outline" size="sm">
            Logout
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="analytics" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="student-dashboard">Student Dashboard</TabsTrigger>
            </TabsList>

            <TabsContent value="analytics" className="space-y-6">
              <Card className="border-2 border-blue-200">
                <CardHeader className="bg-blue-50">
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <BarChart3 className="h-5 w-5" />
                    Attendance Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Students</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                          {analytics.studentStats?.length || 0}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Attempts</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {attendanceRecords.length}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600">Success Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-purple-600">
                          {attendanceRecords.length > 0 
                            ? Math.round((attendanceRecords.filter(r => r.success).length / attendanceRecords.length) * 100)
                            : 0}%
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Daily Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Students</TableHead>
                            <TableHead>Success</TableHead>
                            <TableHead>Failed</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analytics.dailyStats?.slice(0, 10).map((day: DailyStats, index: number) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {new Date(day.date).toLocaleDateString()}
                              </TableCell>
                              <TableCell>{day.uniqueStudents}</TableCell>
                              <TableCell>
                                <Badge variant="default">{day.successfulAttempts}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="destructive">{day.failedAttempts}</Badge>
                              </TableCell>
                            </TableRow>
                          )) || (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                                No data available
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Student Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>PRN</TableHead>
                            <TableHead>Rate</TableHead>
                            <TableHead>Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analytics.studentStats?.slice(0, 10).map((student: StudentStats, index: number) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {student.fullName}
                              </TableCell>
                              <TableCell className="text-sm">{student.prn}</TableCell>
                              <TableCell>
                                <Badge 
                                  variant={student.attendanceRate >= 75 ? "default" : "destructive"}
                                >
                                  {student.attendanceRate.toFixed(1)}%
                                </Badge>
                              </TableCell>
                              <TableCell>{student.totalAttempts}</TableCell>
                            </TableRow>
                          )) || (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                                No data available
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filter by Date
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 items-end mb-4">
                    <div className="flex-1">
                      <Label htmlFor="date-filter">Select Date</Label>
                      <Input
                        id="date-filter"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <Button onClick={generateAnalytics}>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Update Analytics
                    </Button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student Name</TableHead>
                          <TableHead>PRN</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.selectedDayStats?.map((record: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{record.fullName}</TableCell>
                            <TableCell>{record.prn}</TableCell>
                            <TableCell className="text-sm">
                              {new Date(record.timestamp).toLocaleTimeString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={record.success ? "default" : "destructive"}>
                                {record.success ? "Present" : "Failed"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )) || (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                              No records for selected date
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="student-dashboard" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Student Search
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                            .map(([month, stats]) => (
                            <div key={month} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <span className="font-medium">
                                {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                              </span>
                              <div className="flex gap-2">
                                <Badge variant="default">{(stats as MonthlyStats).successful}</Badge>
                                <Badge variant="destructive">{(stats as MonthlyStats).failed}</Badge>
                              </div>
                            </div>
                          ))}
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
                            {studentData.records.slice(0, 20).map((record: any, index: number) => (
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;
