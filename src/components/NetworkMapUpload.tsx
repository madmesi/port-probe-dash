import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface NetworkMapUploadProps {
  servers: { id: string; hostname: string; ip_address: string }[];
}

export const NetworkMapUpload = ({ servers }: NetworkMapUploadProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<"tcpdump" | "lsof" | "netstat" | "">("");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Try to auto-detect file type from name
      const fileName = file.name.toLowerCase();
      if (fileName.includes("tcpdump") || fileName.includes(".pcap")) {
        setFileType("tcpdump");
      } else if (fileName.includes("lsof")) {
        setFileType("lsof");
      } else if (fileName.includes("netstat")) {
        setFileType("netstat");
      }
    }
  };

  const validateFileContent = async (file: File, type: string): Promise<boolean> => {
    const content = await file.text();
    const lines = content.split("\n").slice(0, 20); // Check first 20 lines

    switch (type) {
      case "tcpdump":
        // tcpdump output typically contains timestamps and IP addresses
        return lines.some(line => 
          /\d{2}:\d{2}:\d{2}\.\d+/.test(line) && // timestamp
          /\d+\.\d+\.\d+\.\d+/.test(line) // IP address
        );
      
      case "lsof":
        // lsof output contains COMMAND, PID, USER headers
        return lines.some(line => 
          line.includes("COMMAND") && 
          line.includes("PID") && 
          line.includes("USER")
        );
      
      case "netstat":
        // netstat output contains Proto, Local Address, Foreign Address
        return lines.some(line => 
          (line.includes("Proto") || line.includes("Active")) ||
          /tcp|udp/i.test(line)
        );
      
      default:
        return false;
    }
  };

  const handleUpload = async () => {
    if (!selectedServer || !selectedFile || !fileType) {
      toast.error("Please select a server, file type, and file");
      return;
    }

    setIsUploading(true);
    try {
      // Validate file content
      const isValid = await validateFileContent(selectedFile, fileType);
      if (!isValid) {
        toast.error(`The uploaded file does not match the expected ${fileType} format. Please check your file and try again.`);
        setIsUploading(false);
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Read file content
      const content = await selectedFile.text();
      
      // Parse data based on type (simplified parsing)
      let parsedData: any = { raw: content };
      
      if (fileType === "netstat") {
        // Simple netstat parsing
        const lines = content.split("\n");
        const connections = lines
          .filter(line => /tcp|udp/i.test(line))
          .map(line => {
            const parts = line.trim().split(/\s+/);
            return {
              protocol: parts[0],
              local_address: parts[1] || parts[3],
              foreign_address: parts[2] || parts[4],
              state: parts[3] || parts[5]
            };
          });
        parsedData = { connections, total: connections.length };
      }

      // Insert upload record
      const { error } = await supabase
        .from("network_data_uploads")
        .insert({
          server_id: selectedServer,
          uploaded_by: user.id,
          file_type: fileType,
          file_size: selectedFile.size,
          parsed_data: parsedData,
          processed: true,
          processed_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success("Network data uploaded and processed successfully");
      setIsOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload network data");
    }
    setIsUploading(false);
  };

  const resetForm = () => {
    setSelectedServer("");
    setSelectedFile(null);
    setFileType("");
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
          <DialogTitle>Upload Network Data</DialogTitle>
          <DialogDescription>
            Upload tcpdump, lsof, or netstat data for network analysis
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="server">Select Server</Label>
            <Select value={selectedServer} onValueChange={setSelectedServer}>
              <SelectTrigger id="server">
                <SelectValue placeholder="Choose a server" />
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

          <div className="rounded-lg bg-muted p-4 text-sm">
            <p className="font-medium mb-2">File Format Requirements:</p>
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
          <Button onClick={handleUpload} disabled={isUploading || !selectedServer || !selectedFile || !fileType}>
            {isUploading ? "Uploading..." : "Upload & Process"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
