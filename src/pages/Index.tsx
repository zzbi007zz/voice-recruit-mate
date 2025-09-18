import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CandidateList } from '@/components/candidates/CandidateList';
import { CandidateForm } from '@/components/candidates/CandidateForm';
import { InterviewScheduler } from '@/components/interviews/InterviewScheduler';
import { VoiceCallPanel } from '@/components/voice/VoiceCallPanel';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { Users, Calendar, Phone, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const Index = () => {
  const [activeTab, setActiveTab] = useState('candidates');
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  return (
    <div className="min-h-screen bg-dashboard-bg">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">TalentHub</h1>
              <p className="text-muted-foreground">Candidate Management System</p>
            </div>
            <Dialog open={isAddCandidateOpen} onOpenChange={setIsAddCandidateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Candidate
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Candidate</DialogTitle>
                </DialogHeader>
                <CandidateForm onSuccess={() => setIsAddCandidateOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Dashboard Stats */}
        <DashboardStats />

        {/* Main Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <TabsList className="grid w-full grid-cols-4 bg-card">
            <TabsTrigger value="candidates" className="gap-2">
              <Users className="h-4 w-4" />
              Candidates
            </TabsTrigger>
            <TabsTrigger value="interviews" className="gap-2">
              <Calendar className="h-4 w-4" />
              Interviews
            </TabsTrigger>
            <TabsTrigger value="voice-calls" className="gap-2">
              <Phone className="h-4 w-4" />
              Voice Calls
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="candidates" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Candidate Database</CardTitle>
                <CardDescription>
                  Manage all your candidates in one place
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CandidateList 
                  onEditCandidate={setSelectedCandidate}
                  onScheduleInterview={() => setActiveTab('interviews')}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="interviews" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Interview Scheduler</CardTitle>
                <CardDescription>
                  Schedule and manage candidate interviews
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InterviewScheduler selectedCandidate={selectedCandidate} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="voice-calls" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Voice Calls</CardTitle>
                <CardDescription>
                  Conduct AI-powered candidate interviews
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VoiceCallPanel />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Analytics & Reports</CardTitle>
                <CardDescription>
                  Track your recruitment metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  Analytics dashboard coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;