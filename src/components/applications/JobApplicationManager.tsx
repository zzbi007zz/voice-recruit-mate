import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Download, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface JobApplication {
  id: string;
  job_id: string;
  candidate_id: string | null;
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string | null;
  status: string;
  notes: string | null;
  interview_date: string | null;
  salary_offered: string | null;
  interview_feedback: string | null;
  final_status: string;
  application_date: string;
  jobs: {
    title: string;
    salary_range: string | null;
    clients: {
      name: string;
      company: string;
    };
  };
  candidates?: {
    name: string;
    email: string;
    phone: string | null;
    position: string | null;
    experience: string | null;
    skills: string | null;
  };
}

interface AssignCandidateFormProps {
  jobId: string;
  candidateId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const AssignCandidateForm = ({ jobId, candidateId, onSuccess, onCancel }: AssignCandidateFormProps) => {
  const [formData, setFormData] = useState({
    salary_offered: '',
    notes: '',
    interview_feedback: '',
    final_status: 'pending'
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get candidate details
      const { data: candidate, error: candidateError } = await supabase
        .from('candidates')
        .select('*')
        .eq('id', candidateId)
        .single();

      if (candidateError) throw candidateError;

      // Create job application
      const { error } = await supabase
        .from('job_applications')
        .insert([{
          job_id: jobId,
          candidate_id: candidateId,
          candidate_name: candidate.name,
          candidate_email: candidate.email,
          candidate_phone: candidate.phone,
          ...formData
        }]);

      if (error) throw error;

      toast({ title: 'Candidate assigned to job successfully!' });
      onSuccess();
    } catch (error) {
      console.error('Error assigning candidate:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign candidate to job',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="salary_offered">Salary Offered</Label>
        <Input
          id="salary_offered"
          value={formData.salary_offered}
          onChange={(e) => setFormData(prev => ({ ...prev, salary_offered: e.target.value }))}
          placeholder="$80,000 - $100,000"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="final_status">Application Status</Label>
        <Select 
          value={formData.final_status} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, final_status: value }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewing">Reviewing</SelectItem>
            <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
            <SelectItem value="passed">Passed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="hired">Hired</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Additional notes about this application..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="interview_feedback">Interview Feedback</Label>
        <Textarea
          id="interview_feedback"
          value={formData.interview_feedback}
          onChange={(e) => setFormData(prev => ({ ...prev, interview_feedback: e.target.value }))}
          placeholder="Interview feedback and evaluation..."
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Assigning...' : 'Assign Candidate'}
        </Button>
      </div>
    </form>
  );
};

interface JobApplicationManagerProps {
  selectedJobId?: string;
  selectedCandidateId?: string;
  onAssignmentComplete?: () => void;
}

export const JobApplicationManager = ({ 
  selectedJobId, 
  selectedCandidateId, 
  onAssignmentComplete 
}: JobApplicationManagerProps) => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAssignForm, setShowAssignForm] = useState(false);
  const { toast } = useToast();

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select(`
          *,
          jobs (
            title,
            salary_range,
            clients (
              name,
              company
            )
          ),
          candidates (
            name,
            email,
            phone,
            position,
            experience,
            skills
          )
        `)
        .order('application_date', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch job applications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // Auto-open assign form if both IDs are provided
  useEffect(() => {
    if (selectedJobId && selectedCandidateId) {
      setShowAssignForm(true);
    }
  }, [selectedJobId, selectedCandidateId]);

  const exportToExcel = () => {
    const exportData = applications.map(app => ({
      'Candidate Name': app.candidate_name,
      'Candidate Email': app.candidate_email,
      'Candidate Phone': app.candidate_phone || '',
      'Position Applied': app.candidates?.position || '',
      'Experience': app.candidates?.experience || '',
      'Skills': app.candidates?.skills || '',
      'Job Title': app.jobs.title,
      'Client Company': app.jobs.clients.company,
      'Client Contact': app.jobs.clients.name,
      'Job Salary Range': app.jobs.salary_range || '',
      'Salary Offered': app.salary_offered || '',
      'Application Status': app.final_status,
      'Application Date': new Date(app.application_date).toLocaleDateString(),
      'Interview Date': app.interview_date ? new Date(app.interview_date).toLocaleDateString() : '',
      'Interview Feedback': app.interview_feedback || '',
      'Notes': app.notes || '',
      'Status Result': app.final_status === 'passed' || app.final_status === 'hired' ? 'PASS' : 
                      app.final_status === 'failed' || app.final_status === 'rejected' ? 'FAIL' : 'PENDING'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Job Applications');
    
    // Auto-fit column widths
    const maxWidth = exportData.reduce((w, r) => Math.max(w, Object.keys(r).length), 10);
    worksheet['!cols'] = Array(maxWidth).fill({ wch: 15 });
    
    XLSX.writeFile(workbook, `job_applications_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: 'Excel file exported successfully!' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-muted/10 text-muted-foreground border-muted/20';
      case 'reviewing':
        return 'bg-primary/10 text-primary-foreground border-primary/20';
      case 'interview_scheduled':
        return 'bg-warning/10 text-warning-foreground border-warning/20';
      case 'passed':
      case 'hired':
        return 'bg-success/10 text-success-foreground border-success/20';
      case 'failed':
      case 'rejected':
        return 'bg-destructive/10 text-destructive-foreground border-destructive/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const filteredApplications = applications.filter(app =>
    app.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.jobs.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.jobs.clients.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssignmentSuccess = () => {
    setShowAssignForm(false);
    fetchApplications();
    onAssignmentComplete?.();
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading applications...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Job Applications Management</CardTitle>
              <CardDescription>
                Manage candidate assignments to jobs and track application status
              </CardDescription>
            </div>
            <Button onClick={exportToExcel} className="gap-2">
              <Download className="h-4 w-4" />
              Export to Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Salary Offered</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Application Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {searchTerm ? "No applications found matching your search." : "No job applications found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredApplications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{application.candidate_name}</div>
                          <div className="text-sm text-muted-foreground">{application.candidate_email}</div>
                          <div className="text-sm text-muted-foreground">{application.candidates?.position}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{application.jobs.title}</div>
                        <div className="text-sm text-muted-foreground">{application.jobs.salary_range}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{application.jobs.clients.company}</div>
                          <div className="text-sm text-muted-foreground">{application.jobs.clients.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>{application.salary_offered || '-'}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(application.final_status)}>
                          {application.final_status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(application.application_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Assign Candidate Dialog */}
      <Dialog open={showAssignForm} onOpenChange={setShowAssignForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Candidate to Job</DialogTitle>
          </DialogHeader>
          {selectedJobId && selectedCandidateId && (
            <AssignCandidateForm
              jobId={selectedJobId}
              candidateId={selectedCandidateId}
              onSuccess={handleAssignmentSuccess}
              onCancel={() => setShowAssignForm(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};