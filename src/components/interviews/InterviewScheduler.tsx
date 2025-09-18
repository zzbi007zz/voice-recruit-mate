import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, MapPin, Users, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Interview {
  id: string;
  candidateName: string;
  candidateEmail: string;
  position: string;
  date: Date;
  time: string;
  duration: number;
  type: 'in-person' | 'video' | 'phone';
  interviewer: string;
  location?: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface InterviewSchedulerProps {
  selectedCandidate?: any;
}

export const InterviewScheduler = ({ selectedCandidate }: InterviewSchedulerProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [newInterview, setNewInterview] = useState({
    candidateName: selectedCandidate?.name || '',
    candidateEmail: selectedCandidate?.email || '',
    position: selectedCandidate?.position || '',
    time: '',
    duration: 60,
    type: 'video',
    interviewer: '',
    location: '',
    notes: '',
  });

  // Mock interviews data
  const [interviews] = useState<Interview[]>([
    {
      id: '1',
      candidateName: 'Sarah Johnson',
      candidateEmail: 'sarah@example.com',
      position: 'Frontend Developer',
      date: new Date(2024, 2, 15),
      time: '10:00 AM',
      duration: 60,
      type: 'video',
      interviewer: 'John Smith',
      notes: 'Technical interview focusing on React and TypeScript',
      status: 'scheduled',
    },
    {
      id: '2',
      candidateName: 'Michael Chen',
      candidateEmail: 'michael@example.com',
      position: 'Backend Developer',
      date: new Date(2024, 2, 16),
      time: '2:00 PM',
      duration: 90,
      type: 'in-person',
      interviewer: 'Jane Doe',
      location: 'Conference Room A',
      status: 'scheduled',
    },
  ]);

  const handleScheduleInterview = () => {
    if (!selectedDate || !newInterview.time || !newInterview.interviewer) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Here you would save to your database
    console.log('Scheduling interview:', {
      ...newInterview,
      date: selectedDate,
    });

    toast.success('Interview scheduled successfully!');
    setIsScheduleDialogOpen(false);
    setNewInterview({
      candidateName: '',
      candidateEmail: '',
      position: '',
      time: '',
      duration: 60,
      type: 'video',
      interviewer: '',
      location: '',
      notes: '',
    });
  };

  const getTypeIcon = (type: Interview['type']) => {
    switch (type) {
      case 'video':
        return '📹';
      case 'phone':
        return '📞';
      case 'in-person':
        return '🏢';
      default:
        return '📅';
    }
  };

  const getStatusColor = (status: Interview['status']) => {
    switch (status) {
      case 'scheduled':
        return 'bg-primary-light text-primary';
      case 'completed':
        return 'bg-success-light text-success';
      case 'cancelled':
        return 'bg-destructive-light text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const todaysInterviews = interviews.filter(
    interview => selectedDate && 
    interview.date.toDateString() === selectedDate.toDateString()
  );

  return (
    <div className="space-y-6">
      {/* Schedule New Interview Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Interview Calendar</h3>
          <p className="text-muted-foreground">Schedule and manage candidate interviews</p>
        </div>
        <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Schedule Interview
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Schedule New Interview</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Candidate Name</Label>
                <Input
                  value={newInterview.candidateName}
                  onChange={(e) => setNewInterview(prev => ({ ...prev, candidateName: e.target.value }))}
                  placeholder="Enter candidate name"
                />
              </div>
              <div className="space-y-2">
                <Label>Position</Label>
                <Input
                  value={newInterview.position}
                  onChange={(e) => setNewInterview(prev => ({ ...prev, position: e.target.value }))}
                  placeholder="Enter position"
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={newInterview.time}
                  onChange={(e) => setNewInterview(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Select value={newInterview.duration.toString()} onValueChange={(value) => setNewInterview(prev => ({ ...prev, duration: parseInt(value) }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Interview Type</Label>
                <Select value={newInterview.type} onValueChange={(value: any) => setNewInterview(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video Call</SelectItem>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="in-person">In Person</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Interviewer</Label>
                <Input
                  value={newInterview.interviewer}
                  onChange={(e) => setNewInterview(prev => ({ ...prev, interviewer: e.target.value }))}
                  placeholder="Enter interviewer name"
                />
              </div>
              {newInterview.type === 'in-person' && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Location</Label>
                  <Input
                    value={newInterview.location}
                    onChange={(e) => setNewInterview(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Conference Room A"
                  />
                </div>
              )}
              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={newInterview.notes}
                  onChange={(e) => setNewInterview(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Interview agenda, topics to cover..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleScheduleInterview}>
                Schedule Interview
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Scheduled Interviews for Selected Date */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
            </CardTitle>
            <CardDescription>
              {todaysInterviews.length} interview{todaysInterviews.length !== 1 ? 's' : ''} scheduled
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todaysInterviews.length > 0 ? (
              <div className="space-y-4">
                {todaysInterviews.map((interview) => (
                  <div key={interview.id} className="flex items-center space-x-4 p-4 rounded-lg border bg-card hover:bg-card-hover transition-colors">
                    <div className="text-2xl">{getTypeIcon(interview.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{interview.candidateName}</h4>
                        <Badge className={getStatusColor(interview.status)}>
                          {interview.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{interview.position}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {interview.time} ({interview.duration}min)
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {interview.interviewer}
                        </span>
                        {interview.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {interview.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No interviews scheduled for this date
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};