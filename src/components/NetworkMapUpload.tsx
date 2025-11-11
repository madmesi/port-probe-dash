import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";

interface AnnotatedConnection {
  source: string;
  target: string;
  protocol?: string; // tcp | udp
  role?: "client" | "server";
  port?: string; // numeric string
  service?: string; // e.g., ssh, http
}

interface NetworkMapUploadProps {
  servers: { id: string; hostname: string; ip_address: string; group_id?: string }[];
  groups?: { id: string; name: string }[];
  onServerCreated?: () => void;
  onAnalysisComplete?: (result: { connections: AnnotatedConnection[]; discoveredIPs: string[] }) => void;
}

export const NetworkMapUpload = ({ servers, groups = [], onServerCreated, onAnalysisComplete }: NetworkMapUploadProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState("none");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<"tcpdump" | "lsof" | "netstat" | "">("");
  const [isUploading, setIsUploading] = useState(false);
  const [autoCreateServers, setAutoCreateServers] = useState(true);

  const wellKnownPorts: Record<string, string> = {
    "22": "ssh",
    "25": "smtp",
    "53": "dns",
    "80": "http",
    "110": "pop3",
    "143": "imap",
    "443": "https",
    "3306": "mysql",
    "5432": "postgres",
    "6379": "redis",
    "8080": "http-alt",
    "27017": "mongodb",
    "9100": "node-exporter", // Common Prometheus exporter port
  };

  const inferService = (port?: string) => (port && wellKnownPorts[port]) || undefined;
  const isValidIP = (ip: string) => /^\d+\.\d+\.\d+\.\d+$/.test(ip) && !ip.startsWith("127.") && !ip.startsWith("0.");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      const fileName = file.name.toLowerCase();
      if (fileName.includes("tcpdump") || fileName.includes(".pcap")) {
        setFileType("tcpdump");
      } else if (fileName.includes("lsof")) {
        setFileType("lsof");
      } else if (fileName.includes("netstat")) {
        setFileType("netstat");
      } else {
        setFileType(""); // Reset if no clear type
      }
    }
  };

  const validateFileContent = async (file: File, type: string): Promise<boolean> => {
    const content = await file.text();
    const lines = content.split("\n").slice(0, 20); // Check first 20 lines

    switch (type) {
      case "tcpdump":
        return lines.some(line => 
          /\d{2}:\d{2}:\d{2}\.\d+/.test(line) && // timestamp
          /\d+\.\d+\.\d+\.\d+/.test(line) // IP address
        );
      
      case "lsof":
        return lines.some(line => 
          line.includes("COMMAND") && 
          line.includes("PID") && 
          line.includes("USER") &&
          (line.includes("TCP") || line.includes("UDP"))
        );
      
      case "netstat":
        return lines.some(line => 
          (line.includes("Proto") || line.includes("Active")) ||
          /tcp|udp/i.test(line)
        );
      
      default:
        return false;
    }
  };

  const parseIPPort = (address: string): { ip: string; port: string } | null => {
    const match = address.match(/(\d+\.\d+\.\d+\.\d+):(\d+)/);
    if (match) {
      return { ip: match[1], port: match[2] };
    }
    // Handle cases like 0.0.0.0:80 or :::80
    const wildcardMatch = address.match(/(?:0\.0\.0\.0|::):(\d+)/);
    if (wildcardMatch) {
      return { ip: "0.0.0.0", port: wildcardMatch[1] }; // Use 0.0.0.0 as a placeholder for listening on all interfaces
    }
    return null;
  };

  const handleUpload = async () => {
    if (!selectedFile || !fileType) {
      toast.error("Please select a file type and file");
      return;
    }

    setIsUploading(true);
    try {
      const isValid = await validateFileContent(selectedFile, fileType);
      if (!isValid) {
        toast.error(`The uploaded file does not match the expected ${fileType} format. Please check your file and try again.`);
        setIsUploading(false);
        return;
      }

      const content = await selectedFile.text();
      const discoveredIPs = new Set<string>();
      const connections: Array<AnnotatedConnection> = [];
      
      if (fileType === "netstat") {
        const lines = content.split("\n");
        lines
          .filter(line => /^(tcp|udp)/i.test(line.trim())) // Filter for TCP/UDP lines
          .forEach(line => {
            const parts = line.trim().split(/\s+/);
            const proto = parts[0].toLowerCase();
            const localAddr = parts[3]; // Local Address column
            const foreignAddr = parts[4]; // Foreign Address column

            const local = parseIPPort(localAddr);
            const foreign = parseIPPort(foreignAddr);

            if (local && foreign) {
              if (isValidIP(local.ip)) discoveredIPs.add(local.ip);
              if (isValidIP(foreign.ip)) discoveredIPs.add(foreign.ip);

              if (isValidIP(local.ip) && isValidIP(foreign.ip)) {
                const role: "client" | "server" | undefined = wellKnownPorts[local.port]
                  ? "server" // If local port is well-known, likely a server listening
                  : wellKnownPorts[foreign.port]
                  ? "client" // If foreign port is well-known, likely a client connecting to a server
                  : undefined;
                
                const port = wellKnownPorts[foreign.port] ? foreign.port : local.port;
                const service = inferService(port);

                connections.push({ source: local.ip, target: foreign.ip, protocol: proto, role, port, service });
              }
            }
          });
      } else if (fileType === "lsof") {
        const lines = content.split("\n");
        lines.forEach(line => {
          // Example: COMMAND    PID     USER   FD      TYPE DEVICE SIZE/OFF NODE NAME
          // java      1234    user   10u  IPv4 123456      0t0  TCP 192.168.1.10:8080->192.168.1.1:54321 (ESTABLISHED)
          // java      5678    user   12u  IPv4 789012      0t0  TCP *:8080 (LISTEN)
          const connMatch = line.match(/TCP|UDP\s+(\d+\.\d+\.\d+\.\d+):(\d+)(?:->(\d+\.\d+\.\d+\.\d+):(\d+))?/);
          const listenMatch = line.match(/TCP|UDP\s+\*?:(\d+)\s+\(LISTEN\)/); // For listening on all interfaces

          if (connMatch) {
            const proto = line.includes("TCP") ? "tcp" : "udp";
            const srcIP = connMatch[1];
            const srcPort = connMatch[2];
            const dstIP = connMatch[3];
            const dstPort = connMatch[4];

            if (isValidIP(srcIP)) discoveredIPs.add(srcIP);
            if (dstIP && isValidIP(dstIP)) discoveredIPs.add(dstIP);

            if (isValidIP(srcIP) && isValidIP(dstIP)) {
              const role: "client" | "server" | undefined = wellKnownPorts[dstPort]
                ? "client"
                : wellKnownPorts[srcPort]
                ? "server"
                : undefined;
              const port = wellKnownPorts[dstPort] ? dstPort : srcPort;
              const service = inferService(port);
              connections.push({ source: srcIP, target: dstIP, protocol: proto, role, port, service });
            }
          } else if (listenMatch) {
            // For listening ports, we only discover the IP if it's not 0.0.0.0 or ::
            // The actual IP will be discovered from other connections or server list
          }
        });
      } else if (fileType === "tcpdump") {
        const lines = content.split("\n");
        lines.forEach(line => {
          // Example: IP 10.0.0.5.54321 > 10.0.0.10.22: Flags [S], ...
          const m = line.match(/IP\s+(\d+\.\d+\.\d+\.\d+)\.(\d+)\s+>\s+(\d+\.\d+\.\d+\.\d+)\.(\d+)/);
          const udp = /UDP/i.test(line);
          if (m) {
            const [, sIP, sPort, dIP, dPort] = m;
            if (isValidIP(sIP)) discoveredIPs.add(sIP);
            if (isValidIP(dIP)) discoveredIPs.add(dIP);

            if (isValidIP(sIP) && isValidIP(dIP)) {
              const proto = udp ? "udp" : "tcp";
              const role: "client" | "server" | undefined = wellKnownPorts[dPort]
                ? "client"
                : wellKnownPorts[sPort]
                ? "server"
                : undefined;
              const port = wellKnownPorts[dPort] ? dPort : sPort;
              const service = inferService(port);
              connections.push({ source: sIP, target: dIP, protocol: proto, role, port, service });
            }
          }
        });
      }

      const existingIPs = servers.map(s => s.ip_address);
      const newIPs = Array.from(discoveredIPs).filter(ip => !existingIPs.includes(ip));
      
      let createdCount = 0;
      if (autoCreateServers && newIPs.length > 0) {
        for (const ip of newIPs) {
          try {
            await apiClient.createServer({
              hostname: `server-${ip.replace(/\./g, "-")}`,
              ip_address: ip,
              description: `Auto-discovered from ${fileType} analysis`,
              group_id: selectedServer && selectedServer !== "none" ? selectedServer : null,
            });
            createdCount++;
          } catch (error) {
            console.error(`Failed to create server for IP ${ip}:`, error);
          }
        }
      }

      const dedupedConnections: AnnotatedConnection[] = [];
      const seen = new Set<string>();
      for (const c of connections) {
        const key = `${c.source}|${c.target}|${c.protocol || ''}|${c.port || ''}`;
        if (!seen.has(key)) {
          seen.add(key);
          dedupedConnections.push(c);
        }
      }

      const message = createdCount > 0
        ? `Successfully analyzed network data! Created ${createdCount} new server(s) and discovered ${dedupedConnections.length} connection(s).`
        : `Network data analyzed! Discovered ${discoveredIPs.size} IP(s) and ${dedupedConnections.length} connection(s). ${newIPs.length > 0 ? `${newIPs.length} new IP(s) found.` : ''}`;
      
      toast.success(message, { duration: 5000 });

      if (onServerCreated) onServerCreated();
      if (typeof onAnalysisComplete === 'function') {
        onAnalysisComplete({ connections: dedupedConnections, discoveredIPs: Array.from(discoveredIPs) });
      }
      setIsOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload network data");
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedServer("none");
    setSelectedFile(null);
    setFileType("");
    setAutoCreateServers(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Network Data
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload & Analyze Network Data</DialogTitle>
          <DialogDescription>
            Upload tcpdump, lsof, or netstat data to automatically discover servers and network connections
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="server">Assign to Group (Optional)</Label>
            <Select value={selectedServer} onValueChange={setSelectedServer}>
              <SelectTrigger id="server">
                <SelectValue placeholder="No group (default)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No group</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="file-type">Data Type</Label>
            <Select value={fileType} onValueChange={(value: any) => setFileType(value)}>
              <SelectTrigger id="file-type">
                <SelectValue placeholder="Choose data type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tcpdump">tcpdump / pcap</SelectItem>
                <SelectItem value="lsof">lsof output</SelectItem>
                <SelectItem value="netstat">netstat output</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="file-upload">Upload File</Label>
            <div className="mt-2">
              <input
                id="file-upload"
                type="file"
                onChange={handleFileSelect}
                className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                accept=".txt,.pcap,.cap,.log"
              />
            </div>
            {selectedFile && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="auto-create"
              checked={autoCreateServers}
              onChange={(e) => setAutoCreateServers(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="auto-create" className="text-sm cursor-pointer">
              Automatically create servers for discovered IPs
            </Label>
          </div>

          <div className="rounded-lg bg-muted p-4 text-sm">
            <p className="font-medium mb-2">What this tool does:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Analyzes network data to discover IP addresses and connections</li>
              <li>Automatically creates new servers for discovered IPs</li>
              <li>Maps network connections between servers</li>
              <li>Assigns discovered servers to selected group</li>
            </ul>
            <p className="font-medium mt-3 mb-2">File Format Requirements:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong>tcpdump:</strong> Should contain timestamps and IP addresses</li>
              <li><strong>lsof:</strong> Should contain COMMAND, PID, USER columns</li>
              <li><strong>netstat:</strong> Should contain protocol and address information</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={isUploading || !selectedFile || !fileType}>
            {isUploading ? "Analyzing..." : "Analyze & Create Servers"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};