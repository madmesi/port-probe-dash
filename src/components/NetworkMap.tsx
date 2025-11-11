import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Server, Network } from "lucide-react";
import { NetworkMapUpload } from "./NetworkMapUpload";

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
  onRefresh?: () => void;
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
  protocol?: string;
  role?: "client" | "server";
  port?: string;
  service?: string;
}

export const NetworkMap = ({ servers, groups, onRefresh }: NetworkMapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [analysisEdges, setAnalysisEdges] = useState<Edge[]>([]);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (servers.length === 0) return;

    // Layout nodes on a larger circle based on count
    const canvasWidth = 900;
    const canvasHeight = 700;
    const radius = Math.min(canvasWidth, canvasHeight) / 2 - 80;

    const newNodes: Node[] = servers.map((server, index) => {
      const angle = (index / servers.length) * 2 * Math.PI;
      const x = canvasWidth / 2 + radius * Math.cos(angle);
      const y = canvasHeight / 2 + radius * Math.sin(angle);
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

    // Default edges: group-based only if no analysis yet
    if (analysisEdges.length === 0) {
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
      nodesByGroup.forEach(groupNodes => {
        for (let i = 0; i < groupNodes.length; i++) {
          for (let j = i + 1; j < groupNodes.length; j++) {
            newEdges.push({ from: groupNodes[i].id, to: groupNodes[j].id });
          }
        }
      });
      setEdges(newEdges);
    }
  }, [servers, analysisEdges.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Draw edges first (so they're behind nodes)
    const drawEdges = (edgesToDraw: Edge[], dashed: boolean) => {
      edgesToDraw.forEach(edge => {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);
        if (!fromNode || !toNode) return;

        const color = edge.protocol === "udp" ? "#8b5cf6" : edge.protocol === "tcp" ? "#3b82f6" : "#64748b";
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.setLineDash(dashed ? [6, 6] : []);
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.stroke();

        // Edge label
        const midX = (fromNode.x + toNode.x) / 2;
        const midY = (fromNode.y + toNode.y) / 2;
        const labelParts = [] as string[];
        if (edge.role) labelParts.push(edge.role);
        if (edge.protocol) labelParts.push(edge.protocol);
        if (edge.service) labelParts.push(edge.service);
        else if (edge.port) labelParts.push(edge.port);
        const label = labelParts.join("/");
        if (label) {
          ctx.fillStyle = "#0f172a";
          ctx.font = "11px system-ui";
          ctx.textAlign = "center";
          ctx.fillText(label, midX, midY);
        }
      });
    };

    if (analysisEdges.length > 0) {
      drawEdges(analysisEdges, false);
    } else {
      drawEdges(edges, true);
    }

    // Draw nodes
    nodes.forEach(node => {
      const group = groups.find(g => g.id === node.groupId);
      const groupColor = group?.color || "#64748b";

      // Draw circle for node
      ctx.beginPath();
      ctx.arc(node.x, node.y, 32, 0, 2 * Math.PI);
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
      ctx.font = "bold 12px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(node.label.substring(0, 15), node.x, node.y + 45);
      
      // Draw IP
      ctx.fillStyle = "#6b7280";
      ctx.font = "11px system-ui";
      ctx.fillText(node.ip, node.x, node.y + 60);
    });

    ctx.restore();
  }, [nodes, edges, groups, scale, offset]);

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prevScale => Math.min(Math.max(0.5, prevScale * delta), 3));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleAnalysisComplete = (result: { connections: Array<{ source: string; target: string; protocol?: string; role?: "client" | "server"; port?: string; service?: string }>; discoveredIPs: string[] }) => {
    // Map IP-based edges to server node IDs when possible; keep IP fallback
    const ipToNodeId = new Map<string, string>();
    nodes.forEach(n => ipToNodeId.set(n.ip, n.id));

    const dedup: Edge[] = [];
    const seen = new Set<string>();
    result.connections.forEach(c => {
      const fromId = ipToNodeId.get(c.source) || c.source;
      const toId = ipToNodeId.get(c.target) || c.target;
      const key = `${fromId}|${toId}|${c.protocol || ''}|${c.port || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        dedup.push({ from: fromId, to: toId, protocol: c.protocol, role: c.role, port: c.port, service: c.service });
      }
    });
    setAnalysisEdges(dedup);
  };

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
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Network Map
          </CardTitle>
          <NetworkMapUpload servers={servers} groups={groups} onServerCreated={onRefresh} onAnalysisComplete={handleAnalysisComplete} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div><span>Online</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span>Warning</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span>Offline</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-blue-500"></div><span>TCP</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-purple-500"></div><span>UDP</span></div>
                <div className="text-muted-foreground">Labels: role/protocol/service-or-port</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Zoom: {Math.round(scale * 100)}%</span>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Reset View
              </Button>
            </div>
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              width={900}
              height={700}
              className="w-full cursor-move"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            <p>• Edge labels show connection type: client/tcp/ssh or server/udp/53</p>
            <p>• Dashed lines indicate inferred group relationships when no analysis is present</p>
            <p>• Node colors indicate server status; outer ring indicates group membership</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

