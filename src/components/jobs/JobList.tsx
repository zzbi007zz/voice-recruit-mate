import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, Edit, Trash2, Users, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Job {
  id: string;
  client_id: string;
  title: string;
  description?: string;
  requirements?: string[];
  salary_range?: string;
  location?: string;
  status: string;
  priority?: string;
  job_type?: string;
  created_at: string;
  clients: {
    name: string;
    company: string;
  };
}

interface JobListProps {
  onEditJob: (job: Job) => void;
  onViewApplications: (jobId: string) => void;
  refresh?: boolean;
}

export const JobList = ({ onEditJob, onViewApplications, refresh }: JobListProps) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          clients(name, company)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast({
        title: "Error",
        description: "Failed to fetch jobs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [refresh]);

  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.clients?.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.clients?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (job.location && job.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-success/10 text-success-foreground border-success/20";
      case "closed":
        return "bg-muted/10 text-muted-foreground border-muted/20";
      case "on-hold":
        return "bg-warning/10 text-warning-foreground border-warning/20";
      case "filled":
        return "bg-primary/10 text-primary-foreground border-primary/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-destructive/10 text-destructive-foreground border-destructive/20";
      case "high":
        return "bg-warning/10 text-warning-foreground border-warning/20";
      case "medium":
        return "bg-primary/10 text-primary-foreground border-primary/20";
      case "low":
        return "bg-muted/10 text-muted-foreground border-muted/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("jobs")
        .delete()
        .eq("id", jobId);

      if (error) throw error;
      
      toast({ title: "Job deleted successfully" });
      fetchJobs();
    } catch (error) {
      console.error("Error deleting job:", error);
      toast({
        title: "Error",
        description: "Failed to delete job",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading jobs...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search jobs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job Title</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  {searchTerm ? "No jobs found matching your search." : "No jobs found. Create your first job to get started."}
                </TableCell>
              </TableRow>
            ) : (
              filteredJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{job.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {job.requirements?.slice(0, 2).join(", ")}
                        {(job.requirements?.length || 0) > 2 && "..."}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{job.clients?.company}</div>
                      <div className="text-sm text-muted-foreground">{job.clients?.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>{job.location || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{job.job_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(job.priority || "medium")}>
                      {job.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(job.status)}>
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{job.salary_range || "-"}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewApplications(job.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Applications
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditJob(job)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(job.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};