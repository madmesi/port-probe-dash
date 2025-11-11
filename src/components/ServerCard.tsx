import { Server, Activity, HardDrive, Network, Terminal, Cpu, Tag } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

const TAG_COLORS: Record<string, string> = {
  Java: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  MQ: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Apex: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Other: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

interface ServerCardProps {
  server: {
    id: string;
    hostname: string;
    ip_address: string;
    status: "online" | "offline" | "warning";
    cpu_usage?: number;
    memory_usage?: number;
    disk_usage?: number;
    open_ports?: number;
    tags?: string[];
  };
}

export const ServerCard = ({ server }: ServerCardProps) => {
  const navigate = useNavigate();

  const statusColors = {
    online: "success",
    offline: "destructive",
    warning: "warning",
  };

  const getProgressColor = (value: number) => {
    if (value >= 85) return "bg-destructive";
    if (value >= 70) return "bg-warning";
    return "bg-success";
  };

  return (
    <Card className="border-border hover:shadow-lg transition-smooth cursor-pointer group bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Server className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base group-hover:text-primary transition-smooth truncate">
              {server.hostname}
            </h3>
            <code className="text-xs text-muted-foreground font-mono">
              {server.ip_address}
            </code>
          </div>
        </div>
        <Badge variant={statusColors[server.status] as any} className="text-xs px-2 py-1 flex-shrink-0">
          {server.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Tags */}
        {server.tags && server.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {server.tags.map((tag) => (
              <Badge 
                key={tag} 
                variant="outline" 
                className={`text-xs px-2 py-0.5 ${TAG_COLORS[tag] || TAG_COLORS.Other}`}
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Hardware Resources */}
        <div className="space-y-2">
          {server.cpu_usage !== undefined && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Cpu className="h-3.5 w-3.5" />
                  <span>CPU</span>
                </div>
                <span className="font-mono font-semibold text-foreground">{server.cpu_usage}%</span>
              </div>
              <Progress value={server.cpu_usage} className="h-1.5" />
            </div>
          )}
          {server.memory_usage !== undefined && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Activity className="h-3.5 w-3.5" />
                  <span>Memory</span>
                </div>
                <span className="font-mono font-semibold text-foreground">{server.memory_usage}%</span>
              </div>
              <Progress value={server.memory_usage} className="h-1.5" />
            </div>
          )}
          {server.disk_usage !== undefined && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <HardDrive className="h-3.5 w-3.5" />
                  <span>Disk</span>
                </div>
                <span className="font-mono font-semibold text-foreground">{server.disk_usage}%</span>
              </div>
              <Progress value={server.disk_usage} className="h-1.5" />
            </div>
          )}
          {server.open_ports !== undefined && (
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Network className="h-3.5 w-3.5" />
                <span>Open Ports</span>
              </div>
              <span className="font-mono font-semibold text-foreground">{server.open_ports}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
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
            className="flex-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/server/${server.id}/ssh`);
            }}
          >
            <Terminal className="h-3.5 w-3.5 mr-1.5" />
            SSH
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
