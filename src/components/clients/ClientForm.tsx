import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id?: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  industry?: string;
  location?: string;
  contact_person?: string;
  status: string;
  notes?: string;
}

interface ClientFormProps {
  client?: Client | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ClientForm = ({ client, onSuccess, onCancel }: ClientFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Client>({
    name: client?.name || "",
    company: client?.company || "",
    email: client?.email || "",
    phone: client?.phone || "",
    industry: client?.industry || "",
    location: client?.location || "",
    contact_person: client?.contact_person || "",
    status: client?.status || "active",
    notes: client?.notes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🚀 ClientForm: Form submission started");
    console.log("📊 ClientForm: Form data:", formData);
    
    // Validate required fields
    if (!formData.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Client name is required",
        variant: "destructive",
      });
      console.log("❌ ClientForm: Validation failed - missing name");
      return;
    }
    
    if (!formData.company?.trim()) {
      toast({
        title: "Validation Error", 
        description: "Company name is required",
        variant: "destructive",
      });
      console.log("❌ ClientForm: Validation failed - missing company");
      return;
    }
    
    if (!formData.email?.trim()) {
      toast({
        title: "Validation Error",
        description: "Email is required",
        variant: "destructive", 
      });
      console.log("❌ ClientForm: Validation failed - missing email");
      return;
    }

    setLoading(true);
    console.log("⏳ ClientForm: Loading state set to true");

    try {
      console.log("🔗 ClientForm: Attempting Supabase operation");
      
      if (client?.id) {
        console.log("✏️ ClientForm: Updating existing client with ID:", client.id);
        const { error, data } = await supabase
          .from("clients")
          .update(formData)
          .eq("id", client.id)
          .select();

        console.log("📥 ClientForm: Update response:", { error, data });
        
        if (error) {
          console.error("❌ ClientForm: Update error:", error);
          throw error;
        }
        
        toast({ title: "Client updated successfully" });
        console.log("✅ ClientForm: Client updated successfully");
      } else {
        console.log("➕ ClientForm: Creating new client");
        const { error, data } = await supabase
          .from("clients")
          .insert([formData])
          .select();

        console.log("📥 ClientForm: Insert response:", { error, data });
        
        if (error) {
          console.error("❌ ClientForm: Insert error:", error);
          throw error;
        }
        
        toast({ title: "Client created successfully" });
        console.log("✅ ClientForm: Client created successfully");
      }

      console.log("🎯 ClientForm: Calling onSuccess callback");
      onSuccess();
    } catch (error: any) {
      console.error("💥 ClientForm: Error saving client:", error);
      console.error("💥 ClientForm: Error details:", {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      });
      
      toast({
        title: "Error",
        description: error?.message || "Failed to save client. Please try again.",
        variant: "destructive",
      });
    } finally {
      console.log("🏁 ClientForm: Setting loading to false");
      setLoading(false);
    }
  };

  const handleChange = (field: keyof Client, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{client ? "Edit Client" : "Add New Client"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Client Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company *</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => handleChange("company", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) => handleChange("industry", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleChange("location", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => handleChange("contact_person", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : client ? "Update Client" : "Create Client"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};