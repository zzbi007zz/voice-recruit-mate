import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Key, 
  ExternalLink, 
  Copy, 
  CheckCircle,
  ArrowRight,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SetupGuide: React.FC = () => {
  const { toast } = useToast();
  const projectId = 'ubjemrvwfyglppfmxoep';
  const supabaseSecretsUrl = `https://supabase.com/dashboard/project/${projectId}/settings/functions`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    });
  };

  const setupSteps = [
    {
      title: "Open Supabase Edge Functions Settings",
      description: "Navigate to your Supabase project's Edge Functions secrets page",
      action: (
        <Button asChild className="flex items-center gap-2">
          <a href={supabaseSecretsUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Open Secrets Page
          </a>
        </Button>
      )
    },
    {
      title: "Add OpenAI API Key",
      description: "Create a new secret with the name 'OPENAI_API_KEY'",
      action: (
        <Button 
          variant="outline" 
          onClick={() => copyToClipboard('OPENAI_API_KEY', 'Secret name')}
          className="flex items-center gap-2"
        >
          <Copy className="h-4 w-4" />
          Copy Secret Name
        </Button>
      )
    },
    {
      title: "Add ElevenLabs API Key",
      description: "Create a new secret with the name 'ELEVENLABS_API_KEY'",
      action: (
        <Button 
          variant="outline" 
          onClick={() => copyToClipboard('ELEVENLABS_API_KEY', 'Secret name')}
          className="flex items-center gap-2"
        >
          <Copy className="h-4 w-4" />
          Copy Secret Name
        </Button>
      )
    },
    {
      title: "Test Configuration",
      description: "Return to the settings page and refresh to verify your setup",
      action: (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">Configuration will be tested automatically</span>
        </div>
      )
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API Setup Guide
        </CardTitle>
        <CardDescription>
          Follow these steps to configure your API keys for the interview feature
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Note:</strong> Your API keys are stored securely in Supabase Edge Function secrets 
            and are never exposed to the client-side code or browser.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {setupSteps.map((step, index) => (
            <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                {index + 1}
              </div>
              <div className="flex-1 space-y-2">
                <h4 className="font-medium">{step.title}</h4>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                {step.action}
              </div>
              {index < setupSteps.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground mt-2" />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-3 pt-4 border-t">
          <h4 className="font-medium">Where to get your API keys:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button variant="outline" asChild className="justify-start">
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Get OpenAI API Key
              </a>
            </Button>
            <Button variant="outline" asChild className="justify-start">
              <a href="https://elevenlabs.io/app/speech-synthesis/api-keys" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Get ElevenLabs API Key
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SetupGuide;