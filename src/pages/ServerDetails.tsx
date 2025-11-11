import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Server, Network, Terminal, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ServerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock data - will be replaced with API call to your Go backend
  const server = {
    id,
    hostname: "web-server-01",
    ip_address: "192.168.1.100",
    status: "online",
    ports: [
      { port: 22, protocol: "TCP", service: "SSH", status: "open" },
      { port: 80, protocol: "TCP", service: "HTTP", status: "open" },
      { port: 443, protocol: "TCP", service: "HTTPS", status: "open" },
      { port: 3000, protocol: "TCP", service: "Node.js", status: "open" },
    ],
    interfaces: [
      {
        name: "eth0",
        ip: "192.168.1.100",
        mac: "00:1B:44:11:3A:B7",
      },
      {
        name: "lo",
        ip: "127.0.0.1",
        mac: "00:00:00:00:00:00",
      },
    ],
    services: [
      { name: "nginx", status: "running", pid: 1234 },
      { name: "postgresql", status: "running", pid: 5678 },
      { name: "docker", status: "running", pid: 9012 },
    ],
    destinations: [
      { ip: "8.8.8.8", port: 53, protocol: "UDP" },
      { ip: "1.1.1.1", port: 443, protocol: "TCP" },
      { ip: "192.168.1.1", port: 22, protocol: "TCP" },
    ],
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Servers
          </Button>
          <Button onClick={() => navigate(`/server/${id}/ssh`)}>
            <Terminal className="h-4 w-4 mr-2" />
            SSH Connect
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-code-bg">
            <Server className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{server.hostname}</h1>
            <code className="text-muted-foreground font-mono">
              {server.ip_address}
            </code>
          </div>
          <Badge variant="success" className="ml-auto">
            {server.status}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="card-gradient border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary" />
                Open Ports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Port</TableHead>
                    <TableHead>Protocol</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {server.ports.map((port) => (
                    <TableRow key={port.port}>
                      <TableCell className="font-mono">{port.port}</TableCell>
                      <TableCell>{port.protocol}</TableCell>
                      <TableCell>{port.service}</TableCell>
                      <TableCell>
                        <Badge variant="success">{port.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="card-gradient border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5 text-accent" />
                Network Interfaces
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Interface</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>MAC Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {server.interfaces.map((iface) => (
                    <TableRow key={iface.name}>
                      <TableCell className="font-semibold">
                        {iface.name}
                      </TableCell>
                      <TableCell className="font-mono">{iface.ip}</TableCell>
                      <TableCell className="font-mono">{iface.mac}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="card-gradient border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-info" />
                Running Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>PID</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {server.services.map((service) => (
                    <TableRow key={service.name}>
                      <TableCell className="font-mono">
                        {service.name}
                      </TableCell>
                      <TableCell className="font-mono">{service.pid}</TableCell>
                      <TableCell>
                        <Badge variant="success">{service.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="card-gradient border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5 text-primary" />
                Network Destinations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Destination IP</TableHead>
                    <TableHead>Port</TableHead>
                    <TableHead>Protocol</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {server.destinations.map((dest, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono">{dest.ip}</TableCell>
                      <TableCell className="font-mono">{dest.port}</TableCell>
                      <TableCell>{dest.protocol}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ServerDetails;
