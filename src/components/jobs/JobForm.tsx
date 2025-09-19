import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

interface Job {
  id?: string;
  client_id: string;
  title: string;
  description?: string;
  requirements?: string[];
  salary_range?: string;
  location?: string;
  status: string;
  priority?: string;
  job_type?: string;
}

interface Client {
  id: string;
  name: string;
  company: string;
}

interface JobFormProps {
  job?: Job | null;
  clientId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const JobForm = ({ job, clientId, onSuccess, onCancel }: JobFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [requirementInput, setRequirementInput] = useState("");
  const [formData, setFormData] = useState<Job>({
    client_id: job?.client_id || clientId || "",
    title: job?.title || "",
    description: job?.description || "",
    requirements: job?.requirements || [],
    salary_range: job?.salary_range || "",
    location: job?.location || "",
    status: job?.status || "open",
    priority: job?.priority || "medium",
    job_type: job?.job_type || "full-time",
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, company")
        .eq("status", "active");

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (job?.id) {
        const { error } = await supabase
          .from("jobs")
          .update(formData)
          .eq("id", job.id);

        if (error) throw error;
        toast({ title: "Job updated successfully" });
      } else {
        const { error } = await supabase
          .from("jobs")
          .insert([formData]);

        if (error) throw error;
        toast({ title: "Job created successfully" });
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving job:", error);
      toast({
        title: "Error",
        description: "Failed to save job. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof Job, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addRequirement = () => {
    if (requirementInput.trim()) {
      const newRequirements = [...(formData.requirements || []), requirementInput.trim()];
      handleChange("requirements", newRequirements);
      setRequirementInput("");
    }
  };

  const removeRequirement = (index: number) => {
    const newRequirements = formData.requirements?.filter((_, i) => i !== index) || [];
    handleChange("requirements", newRequirements);
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>{job ? "Edit Job" : "Create New Job"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">Client *</Label>
              <Select 
                value={formData.client_id} 
                onValueChange={(value) => handleChange("client_id", value)}
                disabled={!!clientId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} - {client.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Frontend Developer"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleChange("location", e.target.value)}
                placeholder="San Francisco, CA"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary_range">Salary Range</Label>
              <Input
                id="salary_range"
                value={formData.salary_range}
                onChange={(e) => handleChange("salary_range", e.target.value)}
                placeholder="$80,000 - $120,000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job_type">Job Type</Label>
              <Select value={formData.job_type} onValueChange={(value) => handleChange("job_type", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select job type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-time">Full Time</SelectItem>
                  <SelectItem value="part-time">Part Time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => handleChange("priority", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="filled">Filled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Job Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Describe the role, responsibilities, and what you're looking for..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Requirements</Label>
            <div className="flex gap-2">
              <Input
                value={requirementInput}
                onChange={(e) => setRequirementInput(e.target.value)}
                placeholder="Add a requirement"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
              />
              <Button type="button" onClick={addRequirement} variant="outline">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.requirements?.map((requirement, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {requirement}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeRequirement(index)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : job ? "Update Job" : "Create Job"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};