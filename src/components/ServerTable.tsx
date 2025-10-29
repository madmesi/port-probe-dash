import { Server, Activity, Network, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";

interface ServerTableProps {
  servers: {
    id: string;
    hostname: string;
    ip_address: string;
    status: "online" | "offline" | "warning";
    cpu_usage?: number;
    memory_usage?: number;
    open_ports?: number;
  }[];
}

export const ServerTable = ({ servers }: ServerTableProps) => {
  const navigate = useNavigate();

  const statusColors = {
    online: "success",
    offline: "destructive",
    warning: "warning",
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Hostname</TableHead>
            <TableHead>IP Address</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">
              <Activity className="h-4 w-4 inline mr-1" />
              CPU
            </TableHead>
            <TableHead className="text-center">
              <Network className="h-4 w-4 inline mr-1" />
              Memory
            </TableHead>
            <TableHead className="text-center">
              <Terminal className="h-4 w-4 inline mr-1" />
              Ports
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
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
                <Badge variant={statusColors[server.status] as any}>
                  {server.status}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                {server.cpu_usage !== undefined ? (
                  <span className="font-mono font-semibold">{server.cpu_usage}%</span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {server.memory_usage !== undefined ? (
                  <span className="font-mono font-semibold">{server.memory_usage}%</span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {server.open_ports !== undefined ? (
                  <span className="font-mono font-semibold">{server.open_ports}</span>
                ) : (
                  <span className="text-muted-foreground">-</span>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
