import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface PrometheusSettingsProps {
  prometheusUrl: string;
  isConnected: boolean;
  isChecking: boolean;
  onUrlChange: (url: string) => void;
  onTestConnection: () => void;
  hideLabel?: boolean;
}

export const PrometheusSettings = ({
  prometheusUrl,
  isConnected,
  isChecking,
  onUrlChange,
  onTestConnection,
  hideLabel = false,
}: PrometheusSettingsProps) => {
  return (
    <div className="space-y-3">
      <div>
        {!hideLabel && (
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Prometheus Endpoint
          </label>
        )}
        <Input
          placeholder="http://prometheus:9090"
          value={prometheusUrl}
          onChange={(e) => onUrlChange(e.target.value)}
          className="text-sm"
        />
      </div>
      
      <Button 
        onClick={onTestConnection} 
        disabled={isChecking || !prometheusUrl}
        variant={isConnected ? "outline" : "default"}
        className="w-full"
        size="sm"
      >
        {isChecking ? "Testing..." : isConnected ? "Connected" : "Test Connection"}
      </Button>

      {isConnected && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 text-green-600 rounded-lg border border-green-500/20 text-xs">
          <Check className="h-3 w-3" />
          Connected
        </div>
      )}
      
      {!isConnected && prometheusUrl && !isChecking && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 text-xs">
          <X className="h-3 w-3" />
          Not connected
        </div>
      )}
    </div>
  );
};
