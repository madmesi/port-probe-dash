import { Server, Activity, Network, Terminal, Trash2, Cpu, HardDrive, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

const TAG_COLORS: Record<string, string> = {
  Java: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  MQ: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Apex: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Other: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

interface ServerTableProps {
  servers: {
    id: string;
    hostname: string;
    ip_address: string;
    status: "online" | "offline" | "warning";
    cpu_usage?: number;
    memory_usage?: number;
    disk_usage?: number;
    open_ports?: number;
    tags?: string[];
  }[];
  onServerDeleted?: () => void;
}

export const ServerTable = ({ servers, onServerDeleted }: ServerTableProps) => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const statusColors = {
    online: "success",
    offline: "destructive",
    warning: "warning",
  };

  const toggleServerSelection = (serverId: string) => {
    setSelectedServers(prev =>
      prev.includes(serverId)
        ? prev.filter(id => id !== serverId)
        : [...prev, serverId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedServers.length === servers.length) {
      setSelectedServers([]);
    } else {
      setSelectedServers(servers.map(s => s.id));
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      await Promise.all(selectedServers.map(id => apiClient.deleteServer(id)));
      toast.success(`${selectedServers.length} server(s) deleted successfully`);
      setSelectedServers([]);
      setShowDeleteDialog(false);
      if (onServerDeleted) onServerDeleted();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete servers");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {isAdmin && selectedServers.length > 0 && (
        <div className="flex items-center gap-2">
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedServers.length})
            </Button>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Servers</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {selectedServers.length} server(s)? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBulkDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[200px]">Hostname</TableHead>
            <TableHead>IP Address</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">
              <Cpu className="h-3.5 w-3.5 inline mr-1" />
              CPU
            </TableHead>
            <TableHead className="text-center">
              <Activity className="h-3.5 w-3.5 inline mr-1" />
              Memory
            </TableHead>
            <TableHead className="text-center">
              <HardDrive className="h-3.5 w-3.5 inline mr-1" />
              Disk
            </TableHead>
            <TableHead className="text-center">
              <Network className="h-3.5 w-3.5 inline mr-1" />
              Ports
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
            {isAdmin && (
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedServers.length === servers.length && servers.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {servers.map((server) => (
            <TableRow
              key={server.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => navigate(`/server/${server.id}`)}
            >
              <TableCell className="font-semibold">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-code-bg">
                    <Server className="h-4 w-4 text-primary" />
                  </div>
                  {server.hostname}
                </div>
              </TableCell>
              <TableCell>
                <code className="text-sm font-mono text-muted-foreground">
                  {server.ip_address}
                </code>
              </TableCell>
              <TableCell>
                {server.tags && server.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {server.tags.map((tag) => (
                      <Badge 
                        key={tag} 
                        variant="outline" 
                        className={`text-xs px-1.5 py-0 ${TAG_COLORS[tag] || TAG_COLORS.Other}`}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">-</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={statusColors[server.status] as any}>
                  {server.status}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                {server.cpu_usage !== undefined ? (
                  <span className={`font-mono font-semibold ${server.cpu_usage > 80 ? 'text-destructive' : server.cpu_usage > 70 ? 'text-warning' : ''}`}>
                    {server.cpu_usage}%
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">-</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {server.memory_usage !== undefined ? (
                  <span className={`font-mono font-semibold ${server.memory_usage > 85 ? 'text-destructive' : server.memory_usage > 70 ? 'text-warning' : ''}`}>
                    {server.memory_usage}%
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">-</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {server.disk_usage !== undefined ? (
                  <span className={`font-mono font-semibold ${server.disk_usage > 90 ? 'text-destructive' : server.disk_usage > 80 ? 'text-warning' : ''}`}>
                    {server.disk_usage}%
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">-</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {server.open_ports !== undefined ? (
                  <span className="font-mono font-semibold">{server.open_ports}</span>
                ) : (
                  <span className="text-muted-foreground text-xs">-</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/server/${server.id}`);
                    }}
                  >
                    Details
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/server/${server.id}/ssh`);
                    }}
                  >
                    <Terminal className="h-4 w-4 mr-1" />
                    SSH
                  </Button>
                </div>
              </TableCell>
              {isAdmin && (
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedServers.includes(server.id)}
                    onCheckedChange={() => toggleServerSelection(server.id)}
                  />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  );
};
