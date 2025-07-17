
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield, BarChart3, Calendar, Users, TrendingUp, Filter } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AttendanceService from '@/services/AttendanceService';

interface AnalyticsPanelProps {
  isFaculty: boolean;
}

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ isFaculty }) => {
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [analytics, setAnalytics] = useState<any>({});

  useEffect(() => {
    if (isFaculty) {
      loadAttendanceRecords();
    }
  }, [isFaculty]);

  useEffect(() => {
    if (attendanceRecords.length > 0) {
      generateAnalytics();
    }
  }, [attendanceRecords, selectedDate]);

  const loadAttendanceRecords = () => {
    const records = AttendanceService.getAttendanceRecords();
    setAttendanceRecords(records);
  };

  const generateAnalytics = () => {
    const filteredRecords = attendanceRecords.filter(record => {
      const recordDate = new Date(record.timestamp).toISOString().split('T')[0];
      return recordDate === selectedDate;
    });

    const studentStats = {};
    const dailyStats = {};
    
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
          uniqueStudents: new Set()
        };
      }
      
      dailyStats[date].totalAttempts++;
      if (record.success) {
        dailyStats[date].successfulAttempts++;
      } else {
        dailyStats[date].failedAttempts++;
      }
      dailyStats[date].uniqueStudents.add(prn);
    });

    // Convert sets to counts
    Object.keys(dailyStats).forEach(date => {
      dailyStats[date].uniqueStudents = dailyStats[date].uniqueStudents.size;
    });

    setAnalytics({
      studentStats: Object.values(studentStats),
      dailyStats: Object.values(dailyStats).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      selectedDayStats: filteredRecords
    });
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
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Please login as faculty to view analytics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
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
                  {analytics.dailyStats?.slice(0, 10).map((day, index) => (
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
                  {analytics.studentStats?.slice(0, 10).map((student, index) => (
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
                {analytics.selectedDayStats?.map((record, index) => (
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
    </div>
  );
};

export default AnalyticsPanel;
