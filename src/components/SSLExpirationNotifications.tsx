import { useEffect } from "react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Shield } from "lucide-react";

export const SSLExpirationNotifications = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const checkExpiringCertificates = async () => {
      try {
        const certificates = await apiClient.getSSLCertificates();
        const list = Array.isArray(certificates) ? certificates : [];
        const now = new Date();

        // Group certificates by severity
        const expired: any[] = [];
        const critical: any[] = [];
        const warning: any[] = [];

        list.forEach((cert: any) => {
          const daysUntilExpiry = Math.ceil(
            (new Date(cert.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysUntilExpiry < 0) {
            expired.push({ ...cert, daysUntilExpiry });
          } else if (daysUntilExpiry <= 7) {
            critical.push({ ...cert, daysUntilExpiry });
          } else if (daysUntilExpiry <= 30) {
            warning.push({ ...cert, daysUntilExpiry });
          }
        });

        // Show notifications for expired certificates (highest priority)
        if (expired.length > 0) {
          expired.forEach((cert) => {
            toast({
              title: "SSL Certificate EXPIRED",
              description: `Certificate for ${cert.domain} has expired ${Math.abs(cert.daysUntilExpiry)} days ago`,
              variant: "destructive",
              duration: 10000,
            });
          });
        }

        // Show notifications for critical certificates (expiring in 7 days or less)
        if (critical.length > 0) {
          critical.forEach((cert) => {
            toast({
              title: "SSL Certificate Expiring Soon",
              description: `Certificate for ${cert.domain} expires in ${cert.daysUntilExpiry} day${cert.daysUntilExpiry !== 1 ? 's' : ''}`,
              variant: "destructive",
              duration: 8000,
            });
          });
        }

        // Show a summary notification for warning certificates (expiring in 30 days or less)
        if (warning.length > 0 && expired.length === 0 && critical.length === 0) {
          toast({
            title: `${warning.length} Certificate${warning.length !== 1 ? 's' : ''} Expiring Soon`,
            description: warning.map(cert => 
              `${cert.domain} (${cert.daysUntilExpiry} days)`
            ).join(', '),
            duration: 6000,
          });
        }
      } catch (error) {
        console.error("Failed to check SSL certificates:", error);
      }
    };

    // Skip until authenticated
    if (!user) return;

    // Check certificates when component mounts (authenticated only)
    checkExpiringCertificates();

    // Set up periodic checks (every 30 minutes)
    const interval = setInterval(checkExpiringCertificates, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [toast, user]);

  return null; // This component doesn't render anything
};
