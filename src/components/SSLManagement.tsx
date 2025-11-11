import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { SSLCertificateCard } from "./SSLCertificateCard";
import { AddSSLCertificateDialog } from "./AddSSLCertificateDialog";
import { AlertmanagerIntegration } from "./AlertmanagerIntegration";
import { Shield, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

export const SSLManagement = () => {
  const { isAdmin } = useAuth();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [certsDataRaw, serversDataRaw] = await Promise.all([
        apiClient.getSSLCertificates(),
        apiClient.getServers(),
      ]);

      // Ensure data is an array before processing
      const certsData = Array.isArray(certsDataRaw) ? certsDataRaw : [];
      const serversData = Array.isArray(serversDataRaw) ? serversDataRaw : [];

      // Merge server data with certificates
      const certsWithServers = certsData.map((cert: any) => ({
        ...cert,
        server: serversData.find((s: any) => s.id === cert.server_id) || {
          hostname: "Unknown",
          ip_address: "N/A",
        },
      }));

      setCertificates(certsWithServers);
      setServers(serversData);
    } catch (error) {
      console.error("Failed to fetch SSL certificates:", error);
      toast({
        title: "Error",
        description: "Failed to load SSL certificates",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const getStatusCounts = () => {
    const now = new Date();
    let expired = 0;
    let critical = 0;
    let warning = 0;
    let valid = 0;

    certificates.forEach((cert) => {
      const daysUntilExpiry = Math.ceil(
        (new Date(cert.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry < 0) expired++;
      else if (daysUntilExpiry <= 7) critical++;
      else if (daysUntilExpiry <= 30) warning++;
      else valid++;
    });

    return { expired, critical, warning, valid };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-6">
      {/* Add Certificate Button and Alertmanager Integration */}
      {isAdmin && (
        <div className="flex justify-end gap-2">
          <AlertmanagerIntegration />
          <AddSSLCertificateDialog 
            servers={servers} 
            onCertificateAdded={fetchData} 
          />
        </div>
      )}

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-success/10 border-success/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valid</p>
                <p className="text-3xl font-bold text-success">{statusCounts.valid}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-warning/10 border-warning/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
                <p className="text-3xl font-bold text-warning">{statusCounts.warning}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-destructive/10 border-destructive/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-3xl font-bold text-destructive">{statusCounts.critical}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-destructive/10 border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="text-3xl font-bold text-destructive">{statusCounts.expired}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Certificates List */}
      {certificates.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {certificates
            .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime())
            .map((cert) => (
              <SSLCertificateCard key={cert.id} certificate={cert} />
            ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-border rounded-lg">
          <Shield className="h-16 w-16 mb-4 opacity-50" />
          <p>No SSL certificates found</p>
          <p className="text-sm mt-2">Add SSL certificates to monitor their expiration status</p>
        </div>
      )}
    </div>
  );
};