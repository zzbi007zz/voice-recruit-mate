import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Job {
  id: string;
  title: string;
  salary_range: string | null;
  status: string;
  clients: {
    name: string;
    company: string;
  };
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  position: string | null;
  experience: string | null;
}

interface CandidateJobAssignerProps {
  selectedCandidateId?: string;
  onAssignmentComplete: (jobId: string, candidateId: string) => void;
  onCancel: () => void;
}

export const CandidateJobAssigner = ({ 
  selectedCandidateId, 
  onAssignmentComplete, 
  onCancel 
}: CandidateJobAssignerProps) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(selectedCandidateId || '');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch open jobs
        const { data: jobsData, error: jobsError } = await supabase
          .from('jobs')
          .select(`
            id,
            title,
            salary_range,
            status,
            clients (
              name,
              company
            )
          `)
          .eq('status', 'open')
          .order('created_at', { ascending: false });

        if (jobsError) throw jobsError;

        // Fetch candidates
        const { data: candidatesData, error: candidatesError } = await supabase
          .from('candidates')
          .select('id, name, email, position, experience')
          .order('name');

        if (candidatesError) throw candidatesError;

        setJobs(jobsData || []);
        setCandidates(candidatesData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch jobs and candidates',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const handleAssign = () => {
    if (!selectedJobId || !selectedCandidate) {
      toast({
        title: 'Missing Selection',
        description: 'Please select both a job and a candidate',
        variant: 'destructive',
      });
      return;
    }

    onAssignmentComplete(selectedJobId, selectedCandidate);
  };

  const selectedCandidateData = candidates.find(c => c.id === selectedCandidate);
  const selectedJobData = jobs.find(j => j.id === selectedJobId);

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Assign Candidate to Job</CardTitle>
        <CardDescription>
          Select a job and candidate to create a job application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="candidate-select">Select Candidate</Label>
          <Select 
            value={selectedCandidate} 
            onValueChange={setSelectedCandidate}
            disabled={!!selectedCandidateId}
          >
            <SelectTrigger id="candidate-select">
              <SelectValue placeholder="Choose a candidate..." />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((candidate) => (
                <SelectItem key={candidate.id} value={candidate.id}>
                  <div>
                    <div className="font-medium">{candidate.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {candidate.position} • {candidate.experience}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="job-select">Select Job</Label>
          <Select value={selectedJobId} onValueChange={setSelectedJobId}>
            <SelectTrigger id="job-select">
              <SelectValue placeholder="Choose a job..." />
            </SelectTrigger>
            <SelectContent>
              {jobs.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  <div>
                    <div className="font-medium">{job.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {job.clients.company} • {job.salary_range || 'Salary not specified'}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCandidateData && selectedJobData && (
          <div className="p-4 bg-muted/10 rounded-lg border">
            <h4 className="font-semibold mb-2">Assignment Preview</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Candidate:</span> {selectedCandidateData.name}
                <Badge variant="outline" className="ml-2">
                  {selectedCandidateData.position}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Job:</span> {selectedJobData.title}
              </div>
              <div>
                <span className="font-medium">Client:</span> {selectedJobData.clients.company}
              </div>
              <div>
                <span className="font-medium">Salary Range:</span> {selectedJobData.salary_range || 'Not specified'}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign}
            disabled={!selectedJobId || !selectedCandidate}
          >
            Proceed to Assignment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};