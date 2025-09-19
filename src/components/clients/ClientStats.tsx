import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2, Users, TrendingUp, TrendingDown, Target, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ClientStatsData {
  totalClients: number;
  activeClients: number;
  totalJobs: number;
  totalApplications: number;
  successfulHires: number;
  failedApplications: number;
  successRate: number;
  topIndustries: Array<{ industry: string; count: number }>;
}

export const ClientStats = () => {
  const [stats, setStats] = useState<ClientStatsData>({
    totalClients: 0,
    activeClients: 0,
    totalJobs: 0,
    totalApplications: 0,
    successfulHires: 0,
    failedApplications: 0,
    successRate: 0,
    topIndustries: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch client stats
        const { data: clients } = await supabase
          .from("clients")
          .select("status, industry");

        // Fetch job stats
        const { data: jobs } = await supabase
          .from("jobs")
          .select("id, status");

        // Fetch application stats
        const { data: applications } = await supabase
          .from("job_applications")
          .select("status");

        const totalClients = clients?.length || 0;
        const activeClients = clients?.filter(c => c.status === 'active').length || 0;
        const totalJobs = jobs?.length || 0;
        const totalApplications = applications?.length || 0;
        const successfulHires = applications?.filter(a => a.status === 'hired').length || 0;
        const failedApplications = applications?.filter(a => a.status === 'rejected').length || 0;
        const successRate = totalApplications > 0 ? (successfulHires / totalApplications) * 100 : 0;

        // Calculate top industries
        const industryCount = clients?.reduce((acc, client) => {
          if (client.industry) {
            acc[client.industry] = (acc[client.industry] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>) || {};

        const topIndustries = Object.entries(industryCount)
          .map(([industry, count]) => ({ industry, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setStats({
          totalClients,
          activeClients,
          totalJobs,
          totalApplications,
          successfulHires,
          failedApplications,
          successRate,
          topIndustries,
        });
      } catch (error) {
        console.error("Error fetching client stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-20 bg-muted rounded" />
          </CardContent>
        </Card>
      ))}
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeClients} active clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalJobs}</div>
            <p className="text-xs text-muted-foreground">
              Open positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalApplications}</div>
            <p className="text-xs text-muted-foreground">
              Total received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
            <Progress value={stats.successRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Hiring Success vs Failure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="text-sm">Successful Hires</span>
              </div>
              <Badge className="bg-success/10 text-success-foreground border-success/20">
                {stats.successfulHires}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                <span className="text-sm">Failed Applications</span>
              </div>
              <Badge className="bg-destructive/10 text-destructive-foreground border-destructive/20">
                {stats.failedApplications}
              </Badge>
            </div>
            <div className="pt-2">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>Success Rate</span>
                <span>{stats.successRate.toFixed(1)}%</span>
              </div>
              <Progress value={stats.successRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Industries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.topIndustries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No industry data available</p>
            ) : (
              stats.topIndustries.map((item, index) => (
                <div key={item.industry} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-sm">{item.industry}</span>
                  </div>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};