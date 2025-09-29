import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailTemplateManager } from '@/components/email/EmailTemplateManager';
import { SalesPipeline } from '@/components/crm/SalesPipeline';
import { CVJobMatcher } from '@/components/ai/CVJobMatcher';
import { RecruitmentDashboard } from '@/components/analytics/RecruitmentDashboard';
import { 
  Mail, 
  TrendingUp, 
  Users, 
  Briefcase,
  Brain,
  BarChart3,
  Zap,
  Target
} from 'lucide-react';

export const EnhancedRecruitmentSuite = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          TalentHub Pro Suite
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Hệ thống tuyển dụng AI toàn diện với email automation, CRM, analytics và CV matching
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="crm" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Sales Pipeline
          </TabsTrigger>
          <TabsTrigger value="ai-matching" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            AI Matching
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-hover transition-all cursor-pointer" onClick={() => setActiveTab('email')}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="w-5 h-5 text-primary" />
                  Email Automation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Tạo và quản lý template email tự động với AI
                </CardDescription>
                <div className="mt-4">
                  <Button variant="outline" size="sm">
                    <Zap className="w-4 h-4 mr-1" />
                    Bắt đầu
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-hover transition-all cursor-pointer" onClick={() => setActiveTab('crm')}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="w-5 h-5 text-success" />
                  Sales CRM
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Quản lý leads và quy trình bán hàng
                </CardDescription>
                <div className="mt-4">
                  <Button variant="outline" size="sm">
                    <Users className="w-4 h-4 mr-1" />
                    Xem Pipeline
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-hover transition-all cursor-pointer" onClick={() => setActiveTab('ai-matching')}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Brain className="w-5 h-5 text-warning" />
                  AI CV Matching
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Phân tích độ phù hợp CV-Job với AI
                </CardDescription>
                <div className="mt-4">
                  <Button variant="outline" size="sm">
                    <Target className="w-4 h-4 mr-1" />
                    Phân tích
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-hover transition-all cursor-pointer" onClick={() => setActiveTab('analytics')}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="w-5 h-5 text-accent-foreground" />
                  Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Báo cáo và phân tích hiệu suất
                </CardDescription>
                <div className="mt-4">
                  <Button variant="outline" size="sm">
                    <Briefcase className="w-4 h-4 mr-1" />
                    Xem báo cáo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-card">
            <CardHeader>
              <CardTitle className="text-xl">Tính năng mới của TalentHub Pro</CardTitle>
              <CardDescription>
                Khám phá các tính năng AI và automation mới nhất
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-medium">AI Content Generation</h3>
                  <p className="text-sm text-muted-foreground">
                    Tự động tạo job posting, email template và nội dung tuyển dụng
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-success" />
                  </div>
                  <h3 className="font-medium">Smart CV Matching</h3>
                  <p className="text-sm text-muted-foreground">
                    Phân tích độ phù hợp ứng viên với thuật toán AI tiên tiến
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-warning" />
                  </div>
                  <h3 className="font-medium">Sales Automation</h3>
                  <p className="text-sm text-muted-foreground">
                    Tự động hóa quy trình sales và follow-up khách hàng
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <EmailTemplateManager />
        </TabsContent>

        <TabsContent value="crm">
          <SalesPipeline />
        </TabsContent>

        <TabsContent value="ai-matching">
          <CVJobMatcher />
        </TabsContent>

        <TabsContent value="analytics">
          <RecruitmentDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};