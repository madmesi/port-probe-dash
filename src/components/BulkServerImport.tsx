import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import * as XLSX from 'xlsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSafeErrorMessage } from "@/lib/errorUtils";

const SERVER_TAGS = ["Java", "MQ", "Apex", "Other"] as const;

interface BulkServerImportProps {
  onServersAdded: () => void;
  groups: any[];
}

export const BulkServerImport = ({ onServersAdded, groups }: BulkServerImportProps) => {
  const [open, setOpen] = useState(false);
  const [serverList, setServerList] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);

  const normalizeTag = (tag: string): string | null => {
    const lowerTag = tag.toLowerCase();
    if (lowerTag.includes('java')) return 'Java';
    if (lowerTag.includes('apex')) return 'Apex';
    if (lowerTag.includes('mq')) return 'MQ';
    // Add more mappings if needed
    return null;
  };

  const handleTextImport = async () => {
    if (!serverList.trim()) {
      toast.error("Please enter server list");
      return;
    }

    setIsImporting(true);
    try {
      const lines = serverList.split('\n').filter(line => line.trim());
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Fetch existing servers to check for duplicates. Defensively handle
      // unexpected API responses (null/undefined/non-array) to avoid runtime
      // exceptions like "Cannot read properties of null (reading 'map')".
      let existingServers: any[] = [];
      try {
        const resp = await apiClient.getServers();
        existingServers = Array.isArray(resp) ? resp : [];
        if (!Array.isArray(resp)) {
          console.warn('apiClient.getServers() returned a non-array response:', resp);
        }
      } catch (err) {
        console.error('Failed to fetch existing servers:', err);
        toast.error('Failed to fetch existing servers. Import may produce duplicates or fail.');
      }

      const existingIPs = new Set(existingServers.map((s: any) => s?.ip_address));
      const existingHostnames = new Set(existingServers.map((s: any) => s?.hostname));

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 2) {
          errorCount++;
          errors.push(`Skipped row due to invalid format: "${line}"`);
          continue;
        }

        const hostname = parts[0];
        const ipAddress = parts[1];
        const tags = parts.slice(2).filter(tag => SERVER_TAGS.includes(tag as any));

        if (existingIPs.has(ipAddress) || existingHostnames.has(hostname)) {
          errorCount++;
          errors.push(`Skipped ${hostname} (${ipAddress}): A server with this IP or hostname already exists.`);
          continue;
        }
        
        try {
          await apiClient.createServer({
            hostname,
            ip_address: ipAddress,
            ssh_port: 22,
            ssh_username: "root",
            prometheus_url: null,
            status: "unknown",
            group_id: groups[0]?.id || null,
            tags: tags.length > 0 ? tags : [],
          });
          successCount++;
        } catch (error: any) {
          console.error(`Failed to add ${hostname}:`, error);
          errorCount++;
          const errorMessage = error.message?.includes('duplicate key value violates unique constraint') 
            ? `A server with this IP or hostname already exists.` 
            : getSafeErrorMessage(error);
          errors.push(`Failed to add ${hostname} (${ipAddress}): ${errorMessage}`);
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} server(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`, {
          description: errors.length > 0 ? errors.join('\n') : undefined,
          duration: errors.length > 0 ? 10000 : 3000,
        });
        onServersAdded();
        setServerList("");
        setOpen(false);
      } else {
        toast.error("Failed to import any servers.", {
          description: errors.length > 0 ? errors.join('\n') : "Please check your text file format and ensure all required columns (hostname, ip_address) are present.",
          duration: 10000,
        });
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to import servers");
    } finally {
      setIsImporting(false);
    }
  };

  const handleExcelImport = async () => {
    if (!excelFile) {
      toast.error("Please select an Excel file");
      return;
    }

    setIsImporting(true);
    try {
      const data = await excelFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      // Read raw data without assuming first row as header, to handle complex structures
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }) as any[][];

      if (rawData.length === 0) {
        toast.error("Excel file is empty or could not be parsed.");
        setIsImporting(false);
        return;
      }

      let hostnameRowIndex: number | undefined;
      let ipAddressRowIndex: number | undefined;
      let tagsRowIndex: number | undefined;
      
      // Find the relevant rows by looking for specific header strings
      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (!Array.isArray(row)) continue;

        if (row.some(cell => typeof cell === 'string' && cell.toLowerCase().includes('hostname'))) {
          hostnameRowIndex = i;
        }
        if (row.some(cell => typeof cell === 'string' && (cell.toLowerCase().includes('ip addr') || cell.toLowerCase().includes('ip address') || cell.toLowerCase() === 'ip'))) {
          ipAddressRowIndex = i;
        }
        // Be more flexible when detecting the "type" / tags header row.
        // Some spreadsheets may have slightly different spacing or capitalization
        // (for example: "Type (Apex, Web Logic,  java)"). Detect the row if it
        // contains the word "type" and at least one of the expected tag keywords.
        if (row.some(cell => {
          if (typeof cell !== 'string') return false;
          const v = cell.toLowerCase();
          if (!v.includes('type')) return false;
          return v.includes('apex') || v.includes('web logic') || v.includes('weblogic') || v.includes('java');
        })) {
          tagsRowIndex = i;
        }
      }

      if (hostnameRowIndex === undefined || ipAddressRowIndex === undefined) {
        toast.error("Could not find 'Hostname' or 'IP addr' rows in the Excel file. Please ensure these headers exist.");
        setIsImporting(false);
        return;
      }

      // Based on the provided data, actual server data columns consistently start from the 5th column (index 4)
      const startColIndex = 4; 

      const hostnames = rawData[hostnameRowIndex];
      const ipAddresses = rawData[ipAddressRowIndex];
      const tagsData = tagsRowIndex !== undefined ? rawData[tagsRowIndex] : [];

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Fetch existing servers to check for duplicates. Defensively handle
      // unexpected API responses as above.
      let existingServers: any[] = [];
      try {
        const resp = await apiClient.getServers();
        existingServers = Array.isArray(resp) ? resp : [];
        if (!Array.isArray(resp)) {
          console.warn('apiClient.getServers() returned a non-array response:', resp);
        }
      } catch (err) {
        console.error('Failed to fetch existing servers:', err);
        toast.error('Failed to fetch existing servers. Import may produce duplicates or fail.');
      }

      const existingIPs = new Set(existingServers.map((s: any) => s?.ip_address));
      const existingHostnames = new Set(existingServers.map((s: any) => s?.hostname));

      // Determine the maximum number of columns to iterate through, based on the shortest relevant row
      const maxCols = Math.min(
        hostnames.length, 
        ipAddresses.length, 
        tagsData.length > 0 ? tagsData.length : Infinity
      );

      // Iterate through columns starting from startColIndex to extract server data
      for (let colIndex = startColIndex; colIndex < maxCols; colIndex++) {
        const hostname = String(hostnames[colIndex] || '').trim();
        const ipAddress = String(ipAddresses[colIndex] || '').trim();
        const typeTags = String(tagsData[colIndex] || '').trim();

        // Skip if hostname or IP is empty for this specific server column
        if (!hostname || hostname === '' || !ipAddress || ipAddress === '') {
          // Only log an error if one of them is present but the other is missing,
          // or if it's not just an empty column at the end of the data.
          if (hostname !== '' || ipAddress !== '') { 
             errorCount++;
             errors.push(`Skipped server in column ${colIndex + 1} due to missing or empty hostname/IP address: Hostname='${hostname}', IP='${ipAddress}'`);
          }
          continue;
        }

        if (existingIPs.has(ipAddress) || existingHostnames.has(hostname)) {
          errorCount++;
          errors.push(`Skipped ${hostname} (${ipAddress}): A server with this IP or hostname already exists.`);
          continue;
        }

        const tags = typeTags.split(',').map(t => normalizeTag(t)).filter(Boolean) as string[];
        if (tags.length === 0 && typeTags.trim() !== '') {
            tags.push('Other'); // Add 'Other' if typeTags was present but didn't map to specific tags
        }
        const uniqueTags = Array.from(new Set(tags));
        
        try {
          await apiClient.createServer({
            hostname: hostname,
            ip_address: ipAddress,
            ssh_port: 22, // Default, as not explicitly found in this structure
            ssh_username: "root", // Default
            prometheus_url: null, // Default
            status: "unknown",
            group_id: groups[0]?.id || null,
            tags: uniqueTags,
          });
          successCount++;
        } catch (error: any) {
          console.error(`Failed to add server ${hostname} (${ipAddress}):`, error);
          errorCount++;
          const errorMessage = error.message?.includes('duplicate key value violates unique constraint') 
            ? `A server with this IP or hostname already exists.` 
            : getSafeErrorMessage(error);
          errors.push(`Failed to add ${hostname} (${ipAddress}): ${errorMessage}`);
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} server(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`, {
          description: errors.length > 0 ? errors.join('\n') : undefined,
          duration: errors.length > 0 ? 10000 : 3000,
        });
        onServersAdded();
        setExcelFile(null);
        setOpen(false);
      } else {
        toast.error("Failed to import any servers.", {
          description: errors.length > 0 ? errors.join('\n') : "Please check your Excel file format and ensure 'Hostname' and 'IP addr' rows are present and contain data.",
          duration: 10000,
        });
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to read or parse Excel file. Please ensure it's a valid .xlsx or .xls file.", { duration: 10000 });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Bulk Import Servers</DialogTitle>
          <DialogDescription>
            Import multiple servers at once using text or Excel file
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text">Text Input</TabsTrigger>
            <TabsTrigger value="excel">Excel File</TabsTrigger>
          </TabsList>
          
          <TabsContent value="text" className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Server List</label>
              <Textarea
                placeholder={`web-server-01 192.168.1.100 Java\ndb-server-01 192.168.1.101 MQ\napp-server-01 192.168.1.102 Apex Other`}
                value={serverList}
                onChange={(e) => setServerList(e.target.value)}
                className="font-mono text-sm min-h-[200px]"
              />
              <p className="text-xs text-muted-foreground">
                Format: hostname ip_address [tags...] (one per line)
                <br />
                Available tags: Java, MQ, Apex, Other
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isImporting}>
                Cancel
              </Button>
              <Button onClick={handleTextImport} disabled={isImporting}>
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Import Servers"
                )}
              </Button>
            </DialogFooter>
          </TabsContent>
          
          <TabsContent value="excel" className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Excel File</label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                  className="max-w-xs mx-auto"
                />
                {excelFile && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Selected: {excelFile.name}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Excel columns: `hostname`, `ip_address`, `ssh_port` (optional, default 22), `ssh_username` (optional, default root), `prometheus_url` (optional), `tags` (comma-separated, optional)
                <br />
                Available tags: Java, MQ, Apex, Other
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isImporting}>
                Cancel
              </Button>
              <Button onClick={handleExcelImport} disabled={isImporting}>
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Import from Excel"
                )}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};