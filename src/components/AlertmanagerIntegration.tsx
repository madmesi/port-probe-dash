import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";

export const AlertmanagerIntegration = () => {
  const [alertmanagerUrl, setAlertmanagerUrl] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSendAlerts = async () => {
    if (!alertmanagerUrl) {
      toast({
        title: "Error",
        description: "Please enter an Alertmanager URL",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || '/api';
      const token = localStorage.getItem("auth_token");
      
      const response = await fetch(`${API_BASE_URL}/ssl-certificates/send-alerts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ alertmanager_url: alertmanagerUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send alerts");
      }

      toast({
        title: "Alerts Sent",
        description: `Successfully sent ${data.sent} alert(s) to Alertmanager`,
      });
      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send alerts",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Bell className="h-4 w-4" />
          Send Alerts to Alertmanager
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send SSL Alerts to Alertmanager</DialogTitle>
          <DialogDescription>
            Configure your Alertmanager URL to receive SSL certificate expiration alerts.
            This will send notifications for all certificates expiring within 30 days.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="alertmanager-url">Alertmanager URL</Label>
            <Input
              id="alertmanager-url"
              placeholder="http://alertmanager:9093"
              value={alertmanagerUrl}
              onChange={(e) => setAlertmanagerUrl(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Example: http://alertmanager:9093 or https://alertmanager.example.com
            </p>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Prometheus Metrics</h4>
            <p className="text-sm text-muted-foreground mb-2">
              You can also scrape SSL certificate metrics from:
            </p>
            <code className="text-xs bg-background p-2 rounded block">
              {window.location.origin}/metrics
            </code>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSendAlerts} disabled={isSending}>
            {isSending ? "Sending..." : "Send Alerts"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
