import { useState } from "react";
import { Plus, Upload, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface AddSSLCertificateDialogProps {
  servers: any[];
  onCertificateAdded: () => void;
}

export const AddSSLCertificateDialog = ({ servers, onCertificateAdded }: AddSSLCertificateDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Form state
  const [serverId, setServerId] = useState("");
  const [domain, setDomain] = useState("");
  const [issuer, setIssuer] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [autoRenew, setAutoRenew] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certContent, setCertContent] = useState("");

  const resetForm = () => {
    setServerId("");
    setDomain("");
    setIssuer("");
    setIssuedAt("");
    setExpiresAt("");
    setAutoRenew(false);
    setCertFile(null);
    setCertContent("");
  };

  const parseCertificateContent = (content: string) => {
    try {
      // Extract domain from CN= or Subject Alternative Names
      const cnMatch = content.match(/CN\s*=\s*([^,\n]+)/i);
      if (cnMatch) {
        setDomain(cnMatch[1].trim());
      }

      // Extract issuer
      const issuerMatch = content.match(/Issuer:.*?CN\s*=\s*([^,\n]+)/i);
      if (issuerMatch) {
        setIssuer(issuerMatch[1].trim());
      }

      // Extract dates
      const notBeforeMatch = content.match(/Not Before\s*:\s*(.+)/i);
      const notAfterMatch = content.match(/Not After\s*:\s*(.+)/i);
      
      if (notBeforeMatch) {
        const date = new Date(notBeforeMatch[1].trim());
        setIssuedAt(date.toISOString().split('T')[0]);
      }
      
      if (notAfterMatch) {
        const date = new Date(notAfterMatch[1].trim());
        setExpiresAt(date.toISOString().split('T')[0]);
      }

      toast({
        title: "Certificate parsed",
        description: "Certificate details extracted successfully",
      });
    } catch (error) {
      toast({
        title: "Parse failed",
        description: "Could not parse certificate. Please enter details manually.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCertFile(file);

    try {
      const text = await file.text();
      setCertContent(text);
      parseCertificateContent(text);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to read certificate file",
        variant: "destructive",
      });
    }
  };

  const handleParsePaste = () => {
    if (certContent) {
      parseCertificateContent(certContent);
    }
  };

  const handleSubmit = async () => {
    if (!serverId || !domain || !expiresAt) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await apiClient.createSSLCertificate({
        server_id: serverId,
        domain,
        issuer: issuer || null,
        issued_at: issuedAt ? new Date(issuedAt).toISOString() : new Date().toISOString(),
        expires_at: new Date(expiresAt).toISOString(),
        status: "active",
        auto_renew: autoRenew,
      });

      toast({
        title: "Success",
        description: "SSL certificate added successfully",
      });

      resetForm();
      setOpen(false);
      onCertificateAdded();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add SSL certificate",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add SSL Certificate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add SSL Certificate</DialogTitle>
          <DialogDescription>
            Upload a certificate file or enter details manually
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload / Paste
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <FileText className="h-4 w-4" />
              Manual Entry
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="cert-file">Upload Certificate File</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="cert-file"
                  type="file"
                  accept=".crt,.cer,.pem,.cert,.txt"
                  onChange={handleFileUpload}
                  className="cursor-pointer"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Supported formats: .crt, .cer, .pem, .cert
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cert-content">Or Paste Certificate Content</Label>
              <Textarea
                id="cert-content"
                value={certContent}
                onChange={(e) => setCertContent(e.target.value)}
                placeholder="-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKL0UG+mRKqdMA0GCSqGSIb3...
-----END CERTIFICATE-----"
                className="font-mono text-sm min-h-[200px]"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleParsePaste}
                disabled={!certContent}
              >
                Parse Certificate
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Enter certificate details manually
            </p>
          </TabsContent>
        </Tabs>

        {/* Common form fields */}
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="server">
              Server <span className="text-destructive">*</span>
            </Label>
            <Select value={serverId} onValueChange={setServerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select server" />
              </SelectTrigger>
              <SelectContent>
                {servers.map((server) => (
                  <SelectItem key={server.id} value={server.id}>
                    {server.hostname} ({server.ip_address})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">
              Domain <span className="text-destructive">*</span>
            </Label>
            <Input
              id="domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issuer">Certificate Issuer</Label>
            <Input
              id="issuer"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              placeholder="Let's Encrypt, DigiCert, etc."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issued-at">
                <Calendar className="h-3 w-3 inline mr-1" />
                Issued Date
              </Label>
              <Input
                id="issued-at"
                type="date"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires-at">
                <Calendar className="h-3 w-3 inline mr-1" />
                Expiration Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="expires-at"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="auto-renew"
              checked={autoRenew}
              onCheckedChange={setAutoRenew}
            />
            <Label htmlFor="auto-renew" className="cursor-pointer">
              Enable auto-renewal
            </Label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Adding..." : "Add Certificate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
