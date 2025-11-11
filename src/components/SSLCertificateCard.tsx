import { Shield, Calendar, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SSLCertificateCardProps {
  certificate: {
    id: string;
    domain: string;
    issuer?: string;
    issued_at: string;
    expires_at: string;
    status: string;
    auto_renew: boolean;
    server: {
      hostname: string;
      ip_address: string;
    };
  };
}

const getExpirationStatus = (expiresAt: string) => {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return {
      status: "expired",
      color: "bg-destructive/10 border-destructive text-destructive",
      icon: AlertTriangle,
      badge: "Expired",
      badgeVariant: "destructive" as const,
      days: daysUntilExpiry,
    };
  } else if (daysUntilExpiry <= 7) {
    return {
      status: "critical",
      color: "bg-destructive/10 border-destructive/50 text-destructive",
      icon: AlertTriangle,
      badge: `${daysUntilExpiry}d left`,
      badgeVariant: "destructive" as const,
      days: daysUntilExpiry,
    };
  } else if (daysUntilExpiry <= 30) {
    return {
      status: "warning",
      color: "bg-warning/10 border-warning/50 text-warning",
      icon: Clock,
      badge: `${daysUntilExpiry}d left`,
      badgeVariant: "outline" as const,
      days: daysUntilExpiry,
    };
  } else if (daysUntilExpiry <= 60) {
    return {
      status: "good",
      color: "bg-info/10 border-info/50 text-info",
      icon: CheckCircle2,
      badge: `${daysUntilExpiry}d left`,
      badgeVariant: "outline" as const,
      days: daysUntilExpiry,
    };
  } else {
    return {
      status: "valid",
      color: "bg-success/10 border-success/50 text-success",
      icon: CheckCircle2,
      badge: `${daysUntilExpiry}d left`,
      badgeVariant: "outline" as const,
      days: daysUntilExpiry,
    };
  }
};

export const SSLCertificateCard = ({ certificate }: SSLCertificateCardProps) => {
  const expirationInfo = getExpirationStatus(certificate.expires_at);
  const Icon = expirationInfo.icon;

  return (
    <Card className={cn("transition-smooth hover:glow", expirationInfo.color)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-card/50">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{certificate.domain}</h3>
            <p className="text-sm text-muted-foreground">
              {certificate.server.hostname} ({certificate.server.ip_address})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <Badge variant={expirationInfo.badgeVariant}>{expirationInfo.badge}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">Issuer</p>
            <p className="font-medium">{certificate.issuer || "Unknown"}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Status</p>
            <div className="flex items-center gap-2">
              <p className="font-medium capitalize">{certificate.status}</p>
              {certificate.auto_renew && (
                <Badge variant="outline" className="text-xs">
                  Auto-renew
                </Badge>
              )}
            </div>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">
              <Calendar className="h-3 w-3 inline mr-1" />
              Issued
            </p>
            <p className="font-medium">
              {new Date(certificate.issued_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">
              <Calendar className="h-3 w-3 inline mr-1" />
              Expires
            </p>
            <p className="font-medium">
              {new Date(certificate.expires_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
