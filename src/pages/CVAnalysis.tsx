import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, ArrowLeft, Lightbulb, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CVAnalysisResult {
  cvText: string;
  match: 'MATCH' | 'PARTIAL_MATCH' | 'NO_MATCH';
  matchPercentage: number;
  scoreBreakdown: {
    technicalSkills: number;
    experience: number;
    education: number;
    softSkills: number;
    additional: number;
    total: number;
  };
  summary: string;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  keySkillsMatch: {
    technical: string[];
    soft: string[];
    experience: string[];
  };
  riskFactors: string[];
}

const CVAnalysis = () => {
  const { toast } = useToast();
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<CVAnalysisResult | null>(null);

  // Fetch jobs for selection
  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, description, clients(name, company)')
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setAnalysisResult(null);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a PDF file",
        variant: "destructive",
      });
    }
  };

  const analyzeCV = async () => {
    if (!selectedFile || !selectedJobId) {
      toast({
        title: "Missing Information",
        description: "Please select both a CV file and a job position",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      // Upload file to storage
      const fileName = `cv-${Date.now()}-${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('cvs')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get job details
      const selectedJob = jobs.find(job => job.id === selectedJobId);
      if (!selectedJob) throw new Error('Job not found');

      // Show warning if job has no description
      if (!selectedJob.description || selectedJob.description.trim() === '') {
        toast({
          title: "Notice",
          description: "This job has no description. Analysis will be based only on the job title.",
          variant: "default",
        });
      }

      // Call analysis edge function with fileName (it will download and parse the PDF)
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-cv', {
        body: {
          fileName,
          jobDescription: selectedJob.description,
          jobTitle: selectedJob.title
        }
      });

      if (analysisError) throw analysisError;

      setAnalysisResult(analysisData.analysis);
      
      toast({
        title: "Analysis Complete",
        description: "CV analysis has been completed successfully",
      });

    } catch (error) {
      console.error('Error analyzing CV:', error);
      toast({
        title: "Analysis Failed",
        description: "There was an error analyzing the CV. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getMatchIcon = (match: string) => {
    switch (match) {
      case 'MATCH': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'PARTIAL_MATCH': return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'NO_MATCH': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return null;
    }
  };

  const getMatchColor = (match: string) => {
    switch (match) {
      case 'MATCH': return 'bg-green-600';
      case 'PARTIAL_MATCH': return 'bg-yellow-600';
      case 'NO_MATCH': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-dashboard-bg">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">CV Analysis</h1>
              <p className="text-muted-foreground">Upload and analyze candidate CVs against job requirements</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                CV Upload & Analysis
              </CardTitle>
              <CardDescription>
                Upload a candidate's CV and select a job position to analyze compatibility
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Job Selection */}
              <div className="space-y-2">
                <Label htmlFor="job-select">Select Job Position</Label>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a job position..." />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title} - {job.clients?.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="cv-upload">Upload CV (PDF)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="cv-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="flex-1"
                  />
                  {selectedFile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      {selectedFile.name}
                    </div>
                  )}
                </div>
              </div>

              {/* Analyze Button */}
              <Button 
                onClick={analyzeCV}
                disabled={!selectedFile || !selectedJobId || isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? "Analyzing..." : "Analyze CV"}
              </Button>

            </CardContent>
          </Card>

          {/* Analysis Results */}
          {analysisResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getMatchIcon(analysisResult.match)}
                  Analysis Results
                </CardTitle>
                <CardDescription>
                  AI-powered analysis of CV compatibility with job requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* CV Text Preview */}
                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Extracted CV Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-background p-4 rounded-lg max-h-48 overflow-y-auto border">
                      <p className="text-sm font-mono whitespace-pre-wrap text-muted-foreground">
                        {analysisResult.cvText}...
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Overall Match Score */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">Overall Match Score</span>
                    <Badge variant="secondary" className="text-lg px-3 py-1">{analysisResult.matchPercentage}%</Badge>
                  </div>
                  <Progress 
                    value={analysisResult.matchPercentage} 
                    className="h-3"
                    style={{ '--progress-foreground': getMatchColor(analysisResult.match) } as any}
                  />
                  <p className="text-sm text-muted-foreground">{analysisResult.summary}</p>
                </div>

                <Separator />

                {/* Detailed Score Breakdown */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Score Breakdown</h3>
                  <div className="grid gap-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Technical Skills (30 points max)</span>
                      <span className="text-sm font-semibold">{analysisResult.scoreBreakdown.technicalSkills}/30</span>
                    </div>
                    <Progress value={(analysisResult.scoreBreakdown.technicalSkills / 30) * 100} className="h-2" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Experience (25 points max)</span>
                      <span className="text-sm font-semibold">{analysisResult.scoreBreakdown.experience}/25</span>
                    </div>
                    <Progress value={(analysisResult.scoreBreakdown.experience / 25) * 100} className="h-2" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Education (15 points max)</span>
                      <span className="text-sm font-semibold">{analysisResult.scoreBreakdown.education}/15</span>
                    </div>
                    <Progress value={(analysisResult.scoreBreakdown.education / 15) * 100} className="h-2" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Soft Skills (20 points max)</span>
                      <span className="text-sm font-semibold">{analysisResult.scoreBreakdown.softSkills}/20</span>
                    </div>
                    <Progress value={(analysisResult.scoreBreakdown.softSkills / 20) * 100} className="h-2" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Additional Qualifications (10 points max)</span>
                      <span className="text-sm font-semibold">{analysisResult.scoreBreakdown.additional}/10</span>
                    </div>
                    <Progress value={(analysisResult.scoreBreakdown.additional / 10) * 100} className="h-2" />
                    
                    <Separator />
                    <div className="flex justify-between items-center font-semibold text-lg">
                      <span>Total Score</span>
                      <span>{analysisResult.scoreBreakdown.total}/100</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Strengths and Gaps in Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      Strengths
                    </h3>
                    <ul className="space-y-2">
                      {analysisResult.strengths.map((strength, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          {strength}
                        </li>
                      ))}
                      {analysisResult.strengths.length === 0 && (
                        <li className="text-sm text-muted-foreground">No specific strengths identified</li>
                      )}
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
                      <XCircle className="h-5 w-5" />
                      Areas for Improvement
                    </h3>
                    <ul className="space-y-2">
                      {analysisResult.gaps.map((gap, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          {gap}
                        </li>
                      ))}
                      {analysisResult.gaps.length === 0 && (
                        <li className="text-sm text-muted-foreground">No specific gaps identified</li>
                      )}
                    </ul>
                  </div>
                </div>

                <Separator />

                {/* Key Skills Match */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Skill Matching</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Technical Skills</h4>
                      <div className="flex flex-wrap gap-1">
                        {analysisResult.keySkillsMatch.technical.map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {analysisResult.keySkillsMatch.technical.length === 0 && (
                          <span className="text-sm text-muted-foreground">No technical skills identified</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Soft Skills</h4>
                      <div className="flex flex-wrap gap-1">
                        {analysisResult.keySkillsMatch.soft.map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {analysisResult.keySkillsMatch.soft.length === 0 && (
                          <span className="text-sm text-muted-foreground">No soft skills identified</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Experience</h4>
                      <div className="flex flex-wrap gap-1">
                        {analysisResult.keySkillsMatch.experience.map((exp, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {exp}
                          </Badge>
                        ))}
                        {analysisResult.keySkillsMatch.experience.length === 0 && (
                          <span className="text-sm text-muted-foreground">No relevant experience identified</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                {analysisResult.recommendations.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h3 className="font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                        <Lightbulb className="h-5 w-5" />
                        Recommendations
                      </h3>
                      <ul className="space-y-2">
                        {analysisResult.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {/* Risk Factors */}
                {analysisResult.riskFactors.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h3 className="font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Risk Factors
                      </h3>
                      <ul className="space-y-2">
                        {analysisResult.riskFactors.map((risk, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

              </CardContent>
            </Card>
          )}

        </div>
      </main>
    </div>
  );
};

export default CVAnalysis;