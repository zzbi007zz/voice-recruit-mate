import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { 
  Users, 
  Briefcase, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle,
  Calendar,
  DollarSign,
  Target,
  Award,
  Phone,
  Mail
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardData {
  totalCandidates: number;
  totalJobs: number;
  totalApplications: number;
  totalInterviews: number;
  successRate: number;
  avgTimeToHire: number;
  recentActivity: any[];
  performanceMetrics: any[];
  pipelineData: any[];
  salaryTrends: any[];
}

export const RecruitmentDashboard = () => {
  const [data, setData] = useState<DashboardData>({
    totalCandidates: 0,
    totalJobs: 0,
    totalApplications: 0,
    totalInterviews: 0,
    successRate: 0,
    avgTimeToHire: 0,
    recentActivity: [],
    performanceMetrics: [],
    pipelineData: [],
    salaryTrends: [],
  });
  const [timeRange, setTimeRange] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeRange));

      // Load basic metrics
      const [candidatesResult, jobsResult, applicationsResult, interviewsResult] = await Promise.all([
        supabase.from('candidates').select('*'),
        supabase.from('jobs').select('*'),
        supabase.from('job_applications').select('*'),
        supabase.from('interviews').select('*'),
      ]);

      // Calculate performance metrics
      const totalCandidates = candidatesResult.data?.length || 0;
      const totalJobs = jobsResult.data?.length || 0;
      const totalApplications = applicationsResult.data?.length || 0;
      const totalInterviews = interviewsResult.data?.length || 0;
      
      const successfulHires = applicationsResult.data?.filter(app => app.final_status === 'hired').length || 0;
      const successRate = totalApplications > 0 ? (successfulHires / totalApplications) * 100 : 0;

      // Calculate average time to hire
      const hiredApplications = applicationsResult.data?.filter(app => app.final_status === 'hired') || [];
      const avgTimeToHire = hiredApplications.length > 0 
        ? hiredApplications.reduce((sum, app) => {
            const applicationDate = new Date(app.application_date);
            const hireDate = new Date(app.updated_at);
            return sum + Math.ceil((hireDate.getTime() - applicationDate.getTime()) / (1000 * 60 * 60 * 24));
          }, 0) / hiredApplications.length
        : 0;

      // Generate performance metrics over time
      const performanceMetrics = generateTimeSeriesData(startDate, endDate, applicationsResult.data || []);
      
      // Generate pipeline data
      const statusCounts = {
        applied: 0,
        screening: 0,
        interviewing: 0,
        offer: 0,
        hired: 0,
        rejected: 0,
      };

      applicationsResult.data?.forEach(app => {
        if (statusCounts.hasOwnProperty(app.status)) {
          statusCounts[app.status as keyof typeof statusCounts]++;
        }
      });

      const pipelineData = Object.entries(statusCounts).map(([status, count]) => ({
        name: getStatusLabel(status),
        value: count,
        color: getStatusColor(status),
      }));

      // Generate salary trends
      const salaryTrends = generateSalaryTrends(jobsResult.data || []);

      // Recent activity
      const recentActivity = await generateRecentActivity();

      setData({
        totalCandidates,
        totalJobs,
        totalApplications,
        totalInterviews,
        successRate: Math.round(successRate),
        avgTimeToHire: Math.round(avgTimeToHire),
        performanceMetrics,
        pipelineData,
        salaryTrends,
        recentActivity,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSeriesData = (startDate: Date, endDate: Date, applications: any[]) => {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const data = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      const dayApplications = applications.filter(app => {
        const appDate = new Date(app.application_date);
        return appDate.toDateString() === date.toDateString();
      });

      const dayInterviews = dayApplications.filter(app => app.interview_date).length;
      const dayHires = dayApplications.filter(app => app.final_status === 'hired').length;

      data.push({
        date: date.toISOString().split('T')[0],
        applications: dayApplications.length,
        interviews: dayInterviews,
        hires: dayHires,
      });
    }

    return data;
  };

  const generateSalaryTrends = (jobs: any[]) => {
    const salaryRanges = jobs
      .filter(job => job.salary_range)
      .map(job => {
        const range = job.salary_range.toLowerCase();
        // Extract numbers from salary range strings
        const numbers = range.match(/\d+/g);
        if (numbers && numbers.length >= 2) {
          return {
            title: job.title,
            min: parseInt(numbers[0]) * (range.includes('triệu') ? 1000000 : 1000),
            max: parseInt(numbers[1]) * (range.includes('triệu') ? 1000000 : 1000),
          };
        }
        return null;
      })
      .filter(Boolean);

    // Group by job titles and calculate average
    const titleGroups = salaryRanges.reduce((acc: any, curr: any) => {
      if (!acc[curr.title]) {
        acc[curr.title] = [];
      }
      acc[curr.title].push((curr.min + curr.max) / 2);
      return acc;
    }, {});

    return Object.entries(titleGroups).map(([title, salaries]: [string, any]) => ({
      title,
      avgSalary: Math.round(salaries.reduce((sum: number, sal: number) => sum + sal, 0) / salaries.length / 1000000),
    }));
  };

  const generateRecentActivity = async () => {
    try {
      const { data: applications } = await supabase
        .from('job_applications')
        .select('*, candidates(name), jobs(title)')
        .order('created_at', { ascending: false })
        .limit(10);

      return applications?.map(app => ({
        id: app.id,
        type: 'application',
        description: `${app.candidates?.name} ứng tuyển vào vị trí ${app.jobs?.title}`,
        time: app.created_at,
        status: app.status,
      })) || [];
    } catch (error) {
      console.error('Error loading recent activity:', error);
      return [];
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      applied: 'Đã ứng tuyển',
      screening: 'Sàng lọc',
      interviewing: 'Phỏng vấn',
      offer: 'Đề nghị',
      hired: 'Đã tuyển',
      rejected: 'Từ chối',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      applied: '#6b7280',
      screening: '#f59e0b',
      interviewing: '#3b82f6',
      offer: '#10b981',
      hired: '#059669',
      rejected: '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  const formatCurrency = (value: number) => {
    return `${value} triệu`;
  };

  const StatCard = ({ title, value, icon: Icon, trend, color = 'text-card-foreground' }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <div className="flex items-center text-xs text-muted-foreground">
            <TrendingUp className="mr-1 h-3 w-3" />
            {trend}% từ tháng trước
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Báo cáo và phân tích quy trình tuyển dụng</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 ngày</SelectItem>
            <SelectItem value="30">30 ngày</SelectItem>
            <SelectItem value="90">3 tháng</SelectItem>
            <SelectItem value="365">1 năm</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Tổng ứng viên"
          value={data.totalCandidates}
          icon={Users}
          trend={12}
          color="text-primary"
        />
        <StatCard
          title="Vị trí tuyển dụng"
          value={data.totalJobs}
          icon={Briefcase}
          trend={8}
          color="text-success"
        />
        <StatCard
          title="Đơn ứng tuyển"
          value={data.totalApplications}
          icon={Target}
          trend={15}
          color="text-warning"
        />
        <StatCard
          title="Tỷ lệ thành công"
          value={`${data.successRate}%`}
          icon={Award}
          trend={5}
          color="text-success"
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="performance">Hiệu suất</TabsTrigger>
          <TabsTrigger value="salary">Lương</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Xu hướng ứng tuyển</CardTitle>
                <CardDescription>Số lượng ứng tuyển theo thời gian</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.performanceMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="applications" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Ứng tuyển"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="interviews" 
                      stroke="hsl(var(--success))" 
                      strokeWidth={2}
                      name="Phỏng vấn"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="hires" 
                      stroke="hsl(var(--warning))" 
                      strokeWidth={2}
                      name="Tuyển dụng"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hoạt động gần đây</CardTitle>
                <CardDescription>Các hoạt động tuyển dụng mới nhất</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {data.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg bg-card-hover">
                      <div className="w-2 h-2 mt-2 rounded-full bg-primary"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.time).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {getStatusLabel(activity.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Thời gian tuyển dụng TB</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.avgTimeToHire} ngày</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="mr-1 h-3 w-3" />
                  Từ ứng tuyển đến tuyển dụng
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Phỏng vấn</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.totalInterviews}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Phone className="mr-1 h-3 w-3" />
                  Tổng số buổi phỏng vấn
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {Math.round((data.totalInterviews / Math.max(data.totalApplications, 1)) * 100)}%
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  Ứng tuyển → Phỏng vấn
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Phân bổ pipeline</CardTitle>
                <CardDescription>Số lượng ứng viên theo từng giai đoạn</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.pipelineData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {data.pipelineData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Funnel chuyển đổi</CardTitle>
                <CardDescription>Tỷ lệ chuyển đổi giữa các giai đoạn</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.pipelineData.map((stage, index) => {
                    const total = data.pipelineData.reduce((sum, s) => sum + s.value, 0);
                    const percentage = total > 0 ? Math.round((stage.value / total) * 100) : 0;
                    
                    return (
                      <div key={stage.name} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{stage.name}</span>
                          <span className="text-sm text-muted-foreground">{stage.value} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all" 
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: stage.color
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hiệu suất tuyển dụng</CardTitle>
              <CardDescription>Theo dõi các chỉ số hiệu suất theo thời gian</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.performanceMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar 
                    dataKey="applications" 
                    fill="hsl(var(--primary))" 
                    name="Ứng tuyển"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="interviews" 
                    fill="hsl(var(--success))" 
                    name="Phỏng vấn"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="hires" 
                    fill="hsl(var(--warning))" 
                    name="Tuyển dụng"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Xu hướng lương theo vị trí</CardTitle>
              <CardDescription>Mức lương trung bình của các vị trí tuyển dụng</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.salaryTrends} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={formatCurrency} />
                  <YAxis dataKey="title" type="category" width={150} />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Lương TB']} />
                  <Bar 
                    dataKey="avgSalary" 
                    fill="hsl(var(--success))" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};