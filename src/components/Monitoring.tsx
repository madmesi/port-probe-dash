import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface MonitoringProps {
  servers: any[];
  prometheusUrl: string;
  isConnected: boolean;
  onConnectionChange?: (connected: boolean) => void;
}

export const Monitoring = ({ 
  servers, 
  prometheusUrl, 
  isConnected, 
  onConnectionChange
}: MonitoringProps) => {
  const [selectedServerId, setSelectedServerId] = useState<string>("");
  const [prometheusTargetsMap, setPrometheusTargetsMap] = useState<Map<string, string>>(new Map());
  const [metrics, setMetrics] = useState<any>({
    cpu: [],
    ram: [],
    disk: [],
    network: []
  });
  const [currentValues, setCurrentValues] = useState<any>({
    cpu: null,
    ram: null,
    disk: null,
    network: null
  });

  // Fetch Prometheus targets and match them with database servers
  const fetchPrometheusTargets = async () => {
    if (!prometheusUrl) return;
    
    try {
      const response = await fetch(`${prometheusUrl}/api/v1/targets`);
      if (response.ok) {
        const data = await response.json();
        const activeTargets = data.data?.activeTargets || [];
        const targetsMap = new Map<string, string>();
        
        // Create a map of server ID -> Prometheus instance
        activeTargets.forEach((target: any) => {
          const instance = target.labels?.instance;
          if (!instance || instance.trim() === '') return;
          
          // Try to match by IP address
          const instanceIP = instance.split(':')[0]; // Extract IP from "IP:port" format
          const matchingServer = servers.find(server => {
            // Match by IP address (instance might be "192.168.1.1:9100" and server has "192.168.1.1")
            if (server.ip_address === instanceIP || server.ip_address === instance) {
              return true;
            }
            // Match by hostname (instance might be "hostname:9100" and server has hostname "hostname")
            const instanceHostname = instance.split(':')[0];
            if (server.hostname === instanceHostname || server.hostname === instance) {
              return true;
            }
            return false;
          });
          
          if (matchingServer) {
            targetsMap.set(matchingServer.id, instance);
          }
        });
        
        setPrometheusTargetsMap(targetsMap);
      }
    } catch (error) {
      console.error("Failed to fetch Prometheus targets:", error);
    }
  };

  const fetchMetrics = async (serverId: string) => {
    if (!isConnected || !prometheusUrl || !serverId) return;

    const selectedServer = servers.find(s => s.id === serverId);
    if (!selectedServer) return;

    // Get the Prometheus instance for this server
    // First try to use the mapped Prometheus target, otherwise construct from server data
    let prometheusInstance = prometheusTargetsMap.get(serverId);
    
    // If no mapping found, try to construct instance from server IP or hostname
    // Prometheus typically uses format "IP:port" or "hostname:port"
    if (!prometheusInstance) {
      // Default to using IP address with common node_exporter port (9100)
      prometheusInstance = `${selectedServer.ip_address}:9100`;
    }

    try {
      const nowSec = Math.floor(Date.now() / 1000);
      const startSec = nowSec - 3600; // last 1 hour

      // Escape special regex characters in instance
      const escapedInstance = prometheusInstance.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Fetch CPU metrics - only server-side metrics
      const cpuQuery = `100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle",instance="${escapedInstance}"}[5m])) * 100)`;
      const cpuResponse = await fetch(
        `${prometheusUrl}/api/v1/query_range?query=${encodeURIComponent(cpuQuery)}&start=${startSec}&end=${nowSec}&step=60`
      );
      
      // Fetch RAM metrics - only server-side metrics
      const ramQuery = `(1 - (node_memory_MemAvailable_bytes{instance="${escapedInstance}"} / node_memory_MemTotal_bytes{instance="${escapedInstance}"})) * 100`;
      const ramResponse = await fetch(
        `${prometheusUrl}/api/v1/query_range?query=${encodeURIComponent(ramQuery)}&start=${startSec}&end=${nowSec}&step=60`
      );

      // Fetch Disk metrics - aggregate by instance (worst filesystem)
      const diskPerFs = `(1 - (node_filesystem_avail_bytes{instance="${escapedInstance}",fstype!~"tmpfs|fuse.*"} / node_filesystem_size_bytes{instance="${escapedInstance}",fstype!~"tmpfs|fuse.*"})) * 100`;
      const diskQuery = `max by (instance) (${diskPerFs})`;
      const diskResponse = await fetch(
        `${prometheusUrl}/api/v1/query_range?query=${encodeURIComponent(diskQuery)}&start=${startSec}&end=${nowSec}&step=60`
      );

      // Fetch Network I/O metrics - aggregate rx+tx across devices
      const networkRx = `rate(node_network_receive_bytes_total{instance="${escapedInstance}",device!~"lo"}[5m])`;
      const networkTx = `rate(node_network_transmit_bytes_total{instance="${escapedInstance}",device!~"lo"}[5m])`;
      const networkQuery = `sum by (instance) (${networkRx} + ${networkTx})`;
      const networkResponse = await fetch(
        `${prometheusUrl}/api/v1/query_range?query=${encodeURIComponent(networkQuery)}&start=${startSec}&end=${nowSec}&step=60`
      );

      if (cpuResponse.ok && ramResponse.ok && diskResponse.ok && networkResponse.ok) {
        const cpuData = await cpuResponse.json();
        const ramData = await ramResponse.json();
        const diskData = await diskResponse.json();
        const networkData = await networkResponse.json();

        const formatData = (data: any) => {
          if (!data.data?.result?.[0]?.values) return [];
          return data.data.result[0].values.map((v: any) => ({
            time: new Date(v[0] * 1000).toLocaleTimeString(),
            value: parseFloat(v[1])
          }));
        };

        const cpuFormatted = formatData(cpuData);
        const ramFormatted = formatData(ramData);
        const diskFormatted = formatData(diskData);
        const networkFormatted = formatData(networkData);

        setMetrics({
          cpu: cpuFormatted,
          ram: ramFormatted,
          disk: diskFormatted,
          network: networkFormatted
        });

        // Set current values (most recent)
        if (cpuFormatted.length > 0) {
          setCurrentValues({
            cpu: cpuFormatted[cpuFormatted.length - 1].value,
            ram: ramFormatted[ramFormatted.length - 1].value,
            disk: diskFormatted[diskFormatted.length - 1].value,
            network: networkFormatted[networkFormatted.length - 1].value
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
      toast.error("Failed to fetch server metrics");
    }
  };

  useEffect(() => {
    const savedServerId = localStorage.getItem('prometheus_selected_server_id');
    if (savedServerId) {
      // Verify the server still exists
      const serverExists = servers.find(s => s.id === savedServerId);
      if (serverExists) {
        setSelectedServerId(savedServerId);
      }
    }
  }, [servers]);

  useEffect(() => {
    if (isConnected && prometheusUrl && servers.length > 0) {
      fetchPrometheusTargets();
    } else {
      // Clear the map if not connected or no servers
      setPrometheusTargetsMap(new Map());
    }
  }, [isConnected, prometheusUrl, servers]);

  useEffect(() => {
    if (selectedServerId && isConnected && servers.length > 0) {
      localStorage.setItem('prometheus_selected_server_id', selectedServerId);
      fetchMetrics(selectedServerId);
      const interval = setInterval(() => fetchMetrics(selectedServerId), 30000);
      return () => clearInterval(interval);
    }
  }, [selectedServerId, isConnected, prometheusUrl, servers, prometheusTargetsMap]);

  // Helper functions for formatting
  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0 || isNaN(bytes)) return "0 B";
    if (bytes < 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatBytesPerSecond = (bytesPerSec: number): string => {
    if (!bytesPerSec || isNaN(bytesPerSec)) return "0 B/s";
    return formatBytes(bytesPerSec) + "/s";
  };

  const formatPercentage = (value: number): string => {
    if (value === null || value === undefined || isNaN(value)) return "--";
    return Math.max(0, Math.min(100, value)).toFixed(2) + "%";
  };

  const getStatusColor = (value: number, type: 'cpu' | 'ram' | 'disk' | 'network'): string => {
    if (type === 'network') return "hsl(var(--primary))";
    if (value < 50) return "text-green-600";
    if (value < 75) return "text-yellow-600";
    return "text-red-600";
  };

  const chartConfig = {
    cpu: {
      label: "CPU Usage",
      color: "hsl(var(--primary))" as const,
    },
    ram: {
      label: "RAM Usage",
      color: "hsl(var(--primary))" as const,
    },
    disk: {
      label: "Disk Usage",
      color: "hsl(var(--primary))" as const,
    },
    network: {
      label: "Network I/O",
      color: "hsl(var(--primary))" as const,
    },
  } satisfies ChartConfig;

  const createCustomTooltip = (metricType: 'cpu' | 'ram' | 'disk' | 'network') => {
    return ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        const value = data.value;
        
        return (
          <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-sm font-semibold">
              {metricType === 'network' 
                ? formatBytesPerSecond(value)
                : formatPercentage(value)}
            </p>
          </div>
        );
      }
      return null;
    };
  };

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
            Monitoring
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected && (
            <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Prometheus Not Connected</p>
              <p className="text-sm">Please configure the Prometheus endpoint in the sidebar to view monitoring dashboards.</p>
            </div>
          )}

          {isConnected && servers.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium">Select Server to Monitor:</label>
              <div className="w-80">
                <Select value={selectedServerId} onValueChange={setSelectedServerId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a server to monitor" />
                  </SelectTrigger>
                  <SelectContent>
                    {servers.map((server) => {
                      const hasPrometheusTarget = prometheusTargetsMap.has(server.id);
                      return (
                        <SelectItem key={server.id} value={server.id}>
                          {server.hostname} ({server.ip_address}){hasPrometheusTarget ? ' ●' : ''}
                      </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              </div>
            )}

          {isConnected && servers.length > 0 && !selectedServerId && (
            <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No Server Selected</p>
              <p className="text-sm">Please select a server from the dropdown above to view monitoring metrics.</p>
            </div>
          )}

          {isConnected && servers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No Servers Available</p>
              <p className="text-sm">Add servers in the Servers tab to enable monitoring.</p>
            </div>
          )}

          {isConnected && selectedServerId && (
                <div className="space-y-6">
                  {/* Current Values Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">CPU Usage</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {currentValues.cpu !== null ? (
                            <span className={getStatusColor(currentValues.cpu, 'cpu')}>
                              {formatPercentage(currentValues.cpu)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Current</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">RAM Usage</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {currentValues.ram !== null ? (
                            <span className={getStatusColor(currentValues.ram, 'ram')}>
                              {formatPercentage(currentValues.ram)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Current</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Disk Usage</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {currentValues.disk !== null ? (
                            <span className={getStatusColor(currentValues.disk, 'disk')}>
                              {formatPercentage(currentValues.disk)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Current</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Network I/O</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {currentValues.network !== null ? (
                            <span className={getStatusColor(currentValues.network, 'network')}>
                              {formatBytesPerSecond(currentValues.network)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Current</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">CPU Usage</CardTitle>
                        <p className="text-xs text-muted-foreground">Processor utilization over the last hour</p>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={metrics.cpu}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis 
                                dataKey="time" 
                                stroke="hsl(var(--muted-foreground))" 
                                fontSize={11}
                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                              />
                              <YAxis 
                                stroke="hsl(var(--muted-foreground))" 
                                fontSize={11}
                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                domain={[0, 100]}
                                tickFormatter={(value) => `${value}%`}
                              />
                              <ChartTooltip content={createCustomTooltip('cpu')} />
                              <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke="hsl(var(--primary))" 
                                strokeWidth={2} 
                                dot={false}
                                activeDot={{ r: 4 }}
                              />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">RAM Usage</CardTitle>
                        <p className="text-xs text-muted-foreground">Memory utilization over the last hour</p>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={metrics.ram}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis 
                                dataKey="time" 
                                stroke="hsl(var(--muted-foreground))" 
                                fontSize={11}
                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                              />
                              <YAxis 
                                stroke="hsl(var(--muted-foreground))" 
                                fontSize={11}
                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                domain={[0, 100]}
                                tickFormatter={(value) => `${value}%`}
                              />
                              <ChartTooltip content={createCustomTooltip('ram')} />
                              <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke="hsl(var(--primary))" 
                                strokeWidth={2} 
                                dot={false}
                                activeDot={{ r: 4 }}
                              />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Disk Usage</CardTitle>
                        <p className="text-xs text-muted-foreground">Disk space utilization over the last hour</p>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={metrics.disk}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis 
                                dataKey="time" 
                                stroke="hsl(var(--muted-foreground))" 
                                fontSize={11}
                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                              />
                              <YAxis 
                                stroke="hsl(var(--muted-foreground))" 
                                fontSize={11}
                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                domain={[0, 100]}
                                tickFormatter={(value) => `${value}%`}
                              />
                              <ChartTooltip content={createCustomTooltip('disk')} />
                              <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke="hsl(var(--primary))" 
                                strokeWidth={2} 
                                dot={false}
                                activeDot={{ r: 4 }}
                              />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Network I/O</CardTitle>
                        <p className="text-xs text-muted-foreground">Network throughput over the last hour</p>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={metrics.network}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis 
                                dataKey="time" 
                                stroke="hsl(var(--muted-foreground))" 
                                fontSize={11}
                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                              />
                              <YAxis 
                                stroke="hsl(var(--muted-foreground))" 
                                fontSize={11}
                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                tickFormatter={(value) => formatBytes(value)}
                              />
                              <ChartTooltip content={createCustomTooltip('network')} />
                              <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke="hsl(var(--primary))" 
                                strokeWidth={2} 
                                dot={false}
                                activeDot={{ r: 4 }}
                              />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
