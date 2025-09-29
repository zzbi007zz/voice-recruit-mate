import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Target, 
  Users, 
  Briefcase, 
  TrendingUp, 
  Star, 
  User, 
  Mail, 
  Phone,
  FileText,
  Brain,
  Zap,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MatchResult {
  id: string;
  candidate_id: string;
  job_id: string;
  overall_score: number;
  skill_match_score: number;
  experience_match_score: number;
  culture_fit_score: number;
  salary_match_score: number;
  detailed_analysis: any;
  created_at: string;
  candidate: any;
  job: any;
}

interface CVJobMatcherProps {
  selectedJob?: string;
  selectedCandidate?: string;
}

export const CVJobMatcher = ({ selectedJob, selectedCandidate }: CVJobMatcherProps) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [selectedJobId, setSelectedJobId] = useState(selectedJob || '');
  const [selectedCandidateId, setSelectedCandidateId] = useState(selectedCandidate || 'all');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [jobsResult, candidatesResult, matchesResult] = await Promise.all([
        supabase.from('jobs').select('*').eq('status', 'open'),
        supabase.from('candidates').select('*'),
        supabase.from('cv_job_matches').select(`
          *,
          candidate:candidates(*),
          job:jobs(*)
        `).order('overall_score', { ascending: false })
      ]);

      if (jobsResult.error) throw jobsResult.error;
      if (candidatesResult.error) throw candidatesResult.error;
      if (matchesResult.error) throw matchesResult.error;

      setJobs(jobsResult.data || []);
      setCandidates(candidatesResult.data || []);
      setMatches(matchesResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const analyzeMatch = async (jobId?: string, candidateId?: string) => {
    const targetJobId = jobId || selectedJobId;
    const targetCandidateId = candidateId || selectedCandidateId;

    if (!targetJobId) {
      toast({
        title: "Chọn vị trí",
        description: "Vui lòng chọn vị trí công việc để phân tích",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      let candidatesToAnalyze = targetCandidateId && targetCandidateId !== 'all' 
        ? [targetCandidateId] 
        : candidates.map(c => c.id);

      for (const candidateId of candidatesToAnalyze) {
        const { data, error } = await supabase.functions.invoke('analyze-cv-job-match', {
          body: {
            job_id: targetJobId,
            candidate_id: candidateId,
          }
        });

        if (error) {
          console.error('Error analyzing match:', error);
          continue;
        }

        // Save match result
        await supabase.from('cv_job_matches').upsert({
          job_id: targetJobId,
          candidate_id: candidateId,
          ...data
        });
      }

      await loadData();
      toast({
        title: "Phân tích hoàn thành",
        description: "Kết quả matching đã được cập nhật",
      });
    } catch (error) {
      console.error('Error analyzing matches:', error);
      toast({
        title: "Lỗi phân tích",
        description: "Không thể thực hiện phân tích matching",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return CheckCircle;
    if (score >= 60) return AlertCircle;
    return XCircle;
  };

  const getBestMatches = () => {
    return matches
      .filter(match => selectedJobId ? match.job_id === selectedJobId : true)
      .sort((a, b) => b.overall_score - a.overall_score)
      .slice(0, 10);
  };

  const getJobMatches = (jobId: string) => {
    return matches
      .filter(match => match.job_id === jobId)
      .sort((a, b) => b.overall_score - a.overall_score);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground">CV-Job Matching</h2>
          <p className="text-muted-foreground">Phân tích độ phù hợp giữa ứng viên và vị trí công việc</p>
        </div>
        <Button 
          onClick={() => analyzeMatch()} 
          disabled={isAnalyzing}
          className="bg-gradient-primary"
        >
          {isAnalyzing ? (
            <>
              <Brain className="w-4 h-4 mr-2 animate-pulse" />
              Đang phân tích...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Phân tích AI
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Chọn vị trí
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn vị trí công việc" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title} - {job.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Chọn ứng viên (Tùy chọn)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedCandidateId} onValueChange={setSelectedCandidateId}>
              <SelectTrigger>
                <SelectValue placeholder="Tất cả ứng viên" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả ứng viên</SelectItem>
                {candidates.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.name} - {candidate.position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="best_matches">
        <TabsList>
          <TabsTrigger value="best_matches">Top Matches</TabsTrigger>
          <TabsTrigger value="by_job">Theo vị trí</TabsTrigger>
          <TabsTrigger value="analytics">Phân tích</TabsTrigger>
        </TabsList>

        <TabsContent value="best_matches" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getBestMatches().map((match) => {
              const ScoreIcon = getScoreIcon(match.overall_score);
              
              return (
                <Dialog key={match.id}>
                  <DialogTrigger asChild>
                    <Card className="cursor-pointer hover:shadow-hover transition-all">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {match.candidate?.name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-lg">{match.candidate?.name}</CardTitle>
                              <CardDescription>{match.candidate?.position}</CardDescription>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${getScoreColor(match.overall_score)}`}>
                              {match.overall_score}%
                            </div>
                            <ScoreIcon className={`w-5 h-5 ${getScoreColor(match.overall_score)}`} />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Kỹ năng</span>
                            <span className="text-sm font-medium">{match.skill_match_score}%</span>
                          </div>
                          <Progress value={match.skill_match_score} className="h-2" />
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Kinh nghiệm</span>
                            <span className="text-sm font-medium">{match.experience_match_score}%</span>
                          </div>
                          <Progress value={match.experience_match_score} className="h-2" />
                          
                          <div className="mt-3">
                            <Badge variant="outline" className="text-xs">
                              {match.job?.title}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {match.candidate?.name?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div>{match.candidate?.name}</div>
                          <div className="text-sm text-muted-foreground">{match.job?.title}</div>
                        </div>
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      {/* Overall Score */}
                      <div className="text-center">
                        <div className={`text-4xl font-bold ${getScoreColor(match.overall_score)}`}>
                          {match.overall_score}%
                        </div>
                        <p className="text-muted-foreground">Độ phù hợp tổng thể</p>
                      </div>

                      {/* Detailed Scores */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Kỹ năng</span>
                            <span className="text-sm font-medium">{match.skill_match_score}%</span>
                          </div>
                          <Progress value={match.skill_match_score} />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Kinh nghiệm</span>
                            <span className="text-sm font-medium">{match.experience_match_score}%</span>
                          </div>
                          <Progress value={match.experience_match_score} />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Văn hóa</span>
                            <span className="text-sm font-medium">{match.culture_fit_score}%</span>
                          </div>
                          <Progress value={match.culture_fit_score} />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Lương</span>
                            <span className="text-sm font-medium">{match.salary_match_score}%</span>
                          </div>
                          <Progress value={match.salary_match_score} />
                        </div>
                      </div>

                      {/* Analysis Details */}
                      {match.detailed_analysis && (
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2 text-success">Điểm mạnh</h4>
                            <div className="flex flex-wrap gap-1">
                              {match.detailed_analysis.matching_skills?.map((skill, index) => (
                                <Badge key={index} className="bg-success text-success-foreground">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-2 text-warning">Kỹ năng cần bổ sung</h4>
                            <div className="flex flex-wrap gap-1">
                              {match.detailed_analysis.missing_skills?.map((skill, index) => (
                                <Badge key={index} variant="outline" className="text-warning">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Khuyến nghị</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {match.detailed_analysis.recommendations?.map((rec, index) => (
                                <li key={index}>• {rec}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Contact Actions */}
                      <div className="flex gap-2 pt-4 border-t">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Mail className="w-4 h-4 mr-1" />
                          Email
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Phone className="w-4 h-4 mr-1" />
                          Gọi
                        </Button>
                        <Button size="sm" className="flex-1 bg-gradient-primary">
                          <Target className="w-4 h-4 mr-1" />
                          Mời phỏng vấn
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              );
            })}
          </div>

          {getBestMatches().length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Chưa có kết quả phân tích</h3>
                <p className="text-muted-foreground mb-4">
                  Chọn vị trí và nhấn "Phân tích AI" để bắt đầu
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="by_job" className="space-y-4">
          {jobs.map((job) => {
            const jobMatches = getJobMatches(job.id);
            
            return (
              <Card key={job.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div>
                      {job.title}
                      <CardDescription>{job.location} • {job.salary_range}</CardDescription>
                    </div>
                    <Badge>{jobMatches.length} ứng viên</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {jobMatches.slice(0, 6).map((match) => (
                      <div key={match.id} className="flex items-center gap-3 p-3 bg-card-hover rounded-lg">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">
                            {match.candidate?.name?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{match.candidate?.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{match.candidate?.position}</div>
                        </div>
                        <div className={`font-bold text-sm ${getScoreColor(match.overall_score)}`}>
                          {match.overall_score}%
                        </div>
                      </div>
                    ))}
                  </div>
                  {jobMatches.length > 6 && (
                    <div className="mt-3 text-center">
                      <Button variant="outline" size="sm">
                        Xem thêm {jobMatches.length - 6} ứng viên
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tổng số phân tích</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{matches.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Điểm trung bình</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {matches.length > 0 
                    ? Math.round(matches.reduce((sum, m) => sum + m.overall_score, 0) / matches.length)
                    : 0}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Ứng viên phù hợp</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {matches.filter(m => m.overall_score >= 70).length}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};