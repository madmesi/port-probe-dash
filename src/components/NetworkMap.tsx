import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Server, Network } from "lucide-react";

interface NetworkMapProps {
  servers: {
    id: string;
    hostname: string;
    ip_address: string;
    status: "online" | "offline" | "warning";
    group_id?: string;
  }[];
  groups: {
    id: string;
    name: string;
    color: string;
  }[];
}

interface Node {
  id: string;
  label: string;
  ip: string;
  status: string;
  x: number;
  y: number;
  groupId?: string;
}

interface Edge {
  from: string;
  to: string;
}

export const NetworkMap = ({ servers, groups }: NetworkMapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    if (servers.length === 0) return;

    // Create nodes from servers
    const newNodes: Node[] = servers.map((server, index) => {
      const angle = (index / servers.length) * 2 * Math.PI;
      const radius = 150;
      const x = 300 + radius * Math.cos(angle);
      const y = 300 + radius * Math.sin(angle);

      return {
        id: server.id,
        label: server.hostname,
        ip: server.ip_address,
        status: server.status,
        groupId: server.group_id,
        x,
        y,
      };
    });

    setNodes(newNodes);

    // Create edges - connect servers in the same group
    const newEdges: Edge[] = [];
    const nodesByGroup = new Map<string, Node[]>();
    
    newNodes.forEach(node => {
      if (node.groupId) {
        if (!nodesByGroup.has(node.groupId)) {
          nodesByGroup.set(node.groupId, []);
        }
        nodesByGroup.get(node.groupId)!.push(node);
      }
    });

    // Connect all nodes within the same group
    nodesByGroup.forEach(groupNodes => {
      for (let i = 0; i < groupNodes.length; i++) {
        for (let j = i + 1; j < groupNodes.length; j++) {
          newEdges.push({
            from: groupNodes[i].id,
            to: groupNodes[j].id,
          });
        }
      }
    });

    // Also connect to central node if present
    if (newNodes.length > 2) {
      const centralNode = newNodes[0];
      for (let i = 1; i < newNodes.length; i++) {
        newEdges.push({
          from: centralNode.id,
          to: newNodes[i].id,
        });
      }
    }

    setEdges(newEdges);
  }, [servers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw edges first (so they're behind nodes)
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]); // Dashed lines

    edges.forEach(edge => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);

      if (fromNode && toNode) {
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.stroke();
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      const group = groups.find(g => g.id === node.groupId);
      const groupColor = group?.color || "#64748b";

      // Draw circle for node
      ctx.beginPath();
      ctx.arc(node.x, node.y, 30, 0, 2 * Math.PI);
      ctx.fillStyle = node.status === "online" ? "#22c55e" : 
                      node.status === "warning" ? "#f59e0b" : "#ef4444";
      ctx.fill();
      ctx.strokeStyle = groupColor;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw server icon
      ctx.fillStyle = "#ffffff";
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("S", node.x, node.y);

      // Draw label
      ctx.fillStyle = "#1f2937";
      ctx.font = "bold 11px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(node.label.substring(0, 15), node.x, node.y + 45);
      
      // Draw IP
      ctx.fillStyle = "#6b7280";
      ctx.font = "10px system-ui";
      ctx.fillText(node.ip, node.x, node.y + 60);
    });
  }, [nodes, edges, groups]);

  if (servers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Network Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Server className="h-16 w-16 mb-4 opacity-50" />
            <p>No servers to display</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5" />
          Network Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Online</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span>Warning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Offline</span>
            </div>
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              width={600}
              height={600}
              className="w-full"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            <p>• Dashed lines indicate server relationships (same group or communication)</p>
            <p>• Node colors indicate server status</p>
            <p>• Outer ring color indicates group membership</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

