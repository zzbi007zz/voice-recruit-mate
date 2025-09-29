import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ApiStatus {
  openai: {
    configured: boolean;
    valid: boolean;
    error: string | null;
  };
  elevenlabs: {
    configured: boolean;
    valid: boolean;
    error: string | null;
  };
}

interface ApiKeyStatusProps {
  onStatusChange?: (ready: boolean) => void;
}

const ApiKeyStatus: React.FC<ApiKeyStatusProps> = ({ onStatusChange }) => {
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkApiStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('check-api-config');
      
      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (data.success) {
        setStatus(data.status);
        if (onStatusChange) {
          onStatusChange(data.ready);
        }
      } else {
        throw new Error(data.error || 'Failed to check API configuration');
      }
    } catch (err) {
      console.error('Error checking API status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkApiStatus();
  }, []);

  const getStatusBadge = (service: 'openai' | 'elevenlabs') => {
    if (loading) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Checking...
        </Badge>
      );
    }

    if (!status) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Error
        </Badge>
      );
    }

    const serviceStatus = status[service];
    
    if (!serviceStatus.configured) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Not Configured
        </Badge>
      );
    }

    if (serviceStatus.valid) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Ready
        </Badge>
      );
    }

    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        Invalid
      </Badge>
    );
  };

  const projectId = 'ubjemrvwfyglppfmxoep';
  const supabaseSecretsUrl = `https://supabase.com/dashboard/project/${projectId}/settings/functions`;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">OpenAI API</span>
          <div className="flex items-center gap-2">
            {getStatusBadge('openai')}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={checkApiStatus}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">ElevenLabs API</span>
          <div className="flex items-center gap-2">
            {getStatusBadge('elevenlabs')}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={checkApiStatus}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {status && (!status.openai.configured || !status.elevenlabs.configured) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>Setup Required:</strong> Add your API keys to enable the interview feature.</p>
              <Button 
                variant="outline" 
                size="sm" 
                asChild
                className="flex items-center gap-2"
              >
                <a href={supabaseSecretsUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open Supabase Secrets
                </a>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {status && (status.openai.configured && !status.openai.valid) && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>OpenAI API Error:</strong> {status.openai.error}
          </AlertDescription>
        </Alert>
      )}

      {status && (status.elevenlabs.configured && !status.elevenlabs.valid) && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>ElevenLabs API Error:</strong> {status.elevenlabs.error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ApiKeyStatus;