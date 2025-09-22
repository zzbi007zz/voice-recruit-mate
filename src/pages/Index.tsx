import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CandidateList } from '@/components/candidates/CandidateList';
import { CandidateForm } from '@/components/candidates/CandidateForm';
import { ClientList } from '@/components/clients/ClientList';
import { ClientForm } from '@/components/clients/ClientForm';
import { ClientStats } from '@/components/clients/ClientStats';
import { JobForm } from '@/components/jobs/JobForm';
import { JobList } from '@/components/jobs/JobList';
import { InterviewScheduler } from '@/components/interviews/InterviewScheduler';
import { VoiceCallPanel } from '@/components/voice/VoiceCallPanel';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { JobApplicationManager } from '@/components/applications/JobApplicationManager';
import { CandidateJobAssigner } from '@/components/applications/CandidateJobAssigner';
import { Users, Calendar, Phone, Plus, Building2, Briefcase, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';

const Index = () => {
  const [activeTab, setActiveTab] = useState('candidates');
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [selectedClientForJob, setSelectedClientForJob] = useState<string | null>(null);
  const [clientsRefresh, setClientsRefresh] = useState(false);
  const [jobsRefresh, setJobsRefresh] = useState(false);
  const [candidatesRefresh, setCandidatesRefresh] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignmentData, setAssignmentData] = useState<{jobId?: string, candidateId?: string}>({});

  const handleEditCandidate = (candidate: any) => {
    setEditingCandidate(candidate);
    setIsAddCandidateOpen(true);
  };

  const handleScheduleInterview = (candidate: any) => {
    setSelectedCandidate(candidate);
    setActiveTab('interviews');
  };

  const handleCandidateFormSuccess = () => {
    setIsAddCandidateOpen(false);
    setEditingCandidate(null);
    setCandidatesRefresh(prev => !prev);
  };

  const handleAssignToJob = (candidate: any) => {
    setAssignmentData({ candidateId: candidate.id });
    setShowAssignForm(true);
  };

  const handleCallCandidate = (candidate: any) => {
    setSelectedCandidate(candidate);
    setActiveTab('voice-calls');
  };

  const handleEditClient = (client: any) => {
    setEditingClient(client);
    setIsAddClientOpen(true);
  };

  const handleCreateJob = (clientId: string) => {
    setSelectedClientForJob(clientId);
    setIsAddJobOpen(true);
  };

  const handleEditJob = (job: any) => {
    setEditingJob(job);
    setSelectedClientForJob(null);
    setIsAddJobOpen(true);
  };

  const handleViewApplications = (jobId: string) => {
    setActiveTab('applications');
  };

  const handleAssignmentSelection = (jobId: string, candidateId: string) => {
    setAssignmentData({ jobId, candidateId });
    setActiveTab('applications');
    setShowAssignForm(false);
  };

  const handleAssignmentComplete = () => {
    setAssignmentData({});
  };

  const handleJobFormSuccess = () => {
    setIsAddJobOpen(false);
    setEditingJob(null);
    setSelectedClientForJob(null);
    setJobsRefresh(prev => !prev);
  };

  const handleClientFormSuccess = () => {
    setIsAddClientOpen(false);
    setEditingClient(null);
    setClientsRefresh(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-dashboard-bg">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">TalentHub</h1>
              <p className="text-muted-foreground">Complete Talent Management System</p>
            </div>
            <div className="flex gap-2">
              <Link to="/cv-analysis">
                <Button variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  CV Analysis
                </Button>
              </Link>
              <Dialog open={isAddJobOpen} onOpenChange={setIsAddJobOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Briefcase className="h-4 w-4" />
                    Add Job
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingJob ? 'Edit Job' : 'Create New Job'}</DialogTitle>
                  </DialogHeader>
                  <JobForm 
                    job={editingJob}
                    clientId={selectedClientForJob}
                    onSuccess={handleJobFormSuccess}
                    onCancel={() => setIsAddJobOpen(false)}
                  />
                </DialogContent>
              </Dialog>
              <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Building2 className="h-4 w-4" />
                    Add Client
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
                  </DialogHeader>
                  <ClientForm 
                    client={editingClient}
                    onSuccess={handleClientFormSuccess}
                    onCancel={() => setIsAddClientOpen(false)}
                  />
                </DialogContent>
              </Dialog>
              <Dialog open={isAddCandidateOpen} onOpenChange={setIsAddCandidateOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Candidate
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>{editingCandidate ? 'Edit Candidate' : 'Add New Candidate'}</DialogTitle>
                  </DialogHeader>
                  <CandidateForm 
                    initialData={editingCandidate}
                    onSuccess={handleCandidateFormSuccess}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Dashboard Stats */}
        <DashboardStats />

        {/* Main Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <TabsList className="grid w-full grid-cols-7 bg-card">
            <TabsTrigger value="candidates" className="gap-2">
              <Users className="h-4 w-4" />
              Candidates
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2">
              <Building2 className="h-4 w-4" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Jobs
            </TabsTrigger>
            <TabsTrigger value="applications" className="gap-2">
              <Users className="h-4 w-4" />
              Applications
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
                  onEditCandidate={handleEditCandidate}
                  onScheduleInterview={handleScheduleInterview}
                  onAssignToJob={handleAssignToJob}
                  onCallCandidate={handleCallCandidate}
                  refresh={candidatesRefresh}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients" className="mt-6">
            <div className="space-y-6">
              <ClientStats />
              <Card>
                <CardHeader>
                  <CardTitle>Client Management</CardTitle>
                  <CardDescription>
                    Manage all your clients and track job success rates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ClientList 
                    onEditClient={handleEditClient}
                    onCreateJob={handleCreateJob}
                    refresh={clientsRefresh}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="jobs" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Job Management</CardTitle>
                <CardDescription>
                  Manage job postings and track applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <JobList 
                  onEditJob={handleEditJob}
                  onViewApplications={handleViewApplications}
                  refresh={jobsRefresh}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications" className="mt-6">
            <JobApplicationManager 
              selectedJobId={assignmentData.jobId}
              selectedCandidateId={assignmentData.candidateId}
              onAssignmentComplete={handleAssignmentComplete}
            />
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
                <VoiceCallPanel selectedCandidate={selectedCandidate} />
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

      {/* Candidate Job Assigner Dialog */}
      <Dialog open={showAssignForm} onOpenChange={setShowAssignForm}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Assign Candidate to Job</DialogTitle>
          </DialogHeader>
          <CandidateJobAssigner
            selectedCandidateId={assignmentData.candidateId}
            onAssignmentComplete={handleAssignmentSelection}
            onCancel={() => setShowAssignForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;