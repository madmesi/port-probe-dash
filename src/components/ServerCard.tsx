import { Server, Activity, Network, Terminal } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ServerCardProps {
  server: {
    id: string;
    hostname: string;
    ip_address: string;
    status: "online" | "offline" | "warning";
    cpu_usage?: number;
    memory_usage?: number;
    open_ports?: number;
  };
}

export const ServerCard = ({ server }: ServerCardProps) => {
  const navigate = useNavigate();

  const statusColors = {
    online: "success",
    offline: "destructive",
    warning: "warning",
  };

  return (
    <Card className="card-gradient border-border hover:border-primary/50 transition-smooth glow cursor-pointer group">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-code-bg">
            <Server className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg group-hover:text-primary transition-smooth">
              {server.hostname}
            </h3>
            <code className="text-sm text-muted-foreground font-mono">
              {server.ip_address}
            </code>
          </div>
        </div>
        <Badge variant={statusColors[server.status] as any}>
          {server.status}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {server.cpu_usage !== undefined && (
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-info" />
              <div>
                <p className="text-xs text-muted-foreground">CPU</p>
                <p className="font-mono font-semibold">{server.cpu_usage}%</p>
              </div>
            </div>
          )}
          {server.memory_usage !== undefined && (
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-accent" />
              <div>
                <p className="text-xs text-muted-foreground">Memory</p>
                <p className="font-mono font-semibold">{server.memory_usage}%</p>
              </div>
            </div>
          )}
          {server.open_ports !== undefined && (
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Ports</p>
                <p className="font-mono font-semibold">{server.open_ports}</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => navigate(`/server/${server.id}`)}
          >
            View Details
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => navigate(`/server/${server.id}/ssh`)}
          >
            <Terminal className="h-4 w-4 mr-2" />
            SSH
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
