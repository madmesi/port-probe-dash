import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api";
import { Search, Server as ServerIcon, Layers, Lock, Network, BookOpen, Menu, X, HelpCircle, Activity } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ServerTable } from "@/components/ServerTable";
import { AddServerDialog } from "@/components/AddServerDialog";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SSLManagement } from "@/components/SSLManagement";
import { NetworkMap } from "@/components/NetworkMap";
import { WebLogicDocs } from "@/pages/WebLogicDocs";
import { FAQ } from "@/pages/FAQ";
import { Monitoring } from "@/components/Monitoring";
import { PrometheusSettings } from "@/components/PrometheusSettings";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BulkServerImport } from "@/components/BulkServerImport";
import { usePrometheusMetrics } from "@/hooks/usePrometheusMetrics";

const Index = () => {
  const { user, isLoading: authLoading, isAdmin, isApproved } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [servers, setServers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<"servers" | "ssl" | "mappings" | "weblogic" | "faq" | "monitoring">("servers");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [prometheusUrl, setPrometheusUrl] = useState("");
  const [isPrometheusConnected, setIsPrometheusConnected] = useState(false);
  const [isCheckingPrometheus, setIsCheckingPrometheus] = useState(false);
  const { metrics, fetchMetrics } = usePrometheusMetrics(prometheusUrl, isPrometheusConnected);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchGroups();
      fetchServers();
    }
    const savedUrl = localStorage.getItem('prometheus_url');
    if (savedUrl) {
      setPrometheusUrl(savedUrl);
      testPrometheusConnection(savedUrl, true);
    }
  }, [user]);

  useEffect(() => {
    if (isPrometheusConnected && servers.length > 0) {
      const instances = servers.map(s => `${s.ip_address}:9100`);
      fetchMetrics(instances);
      const interval = setInterval(() => fetchMetrics(instances), 30000);
      return () => clearInterval(interval);
    }
  }, [isPrometheusConnected, servers, fetchMetrics]);

  const fetchGroups = async () => {
    try {
      const data = await apiClient.getGroups();
      setGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch groups:", error);
    }
  };

  const fetchServers = async () => {
    try {
      const data = await apiClient.getServers();
      setServers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch servers:", error);
    }
    setIsLoading(false);
  };

  const testPrometheusConnection = async (url: string, silent: boolean = false) => {
    if (!url) {
      if (!silent) toast.error("Please enter a Prometheus endpoint URL");
      return;
    }

    setIsCheckingPrometheus(true);
    try {
      const response = await fetch(`${url}/api/v1/status/config`, {
        method: 'GET',
        mode: 'cors'
      });

      if (response.ok) {
        setIsPrometheusConnected(true);
        if (!silent) toast.success("Connected to Prometheus successfully!");
        localStorage.setItem('prometheus_url', url);
      } else {
        setIsPrometheusConnected(false);
        if (!silent) toast.error("Failed to connect to Prometheus");
      }
    } catch (error) {
      setIsPrometheusConnected(false);
      if (!silent) toast.error("Connection failed. Please check the URL and CORS settings.");
    } finally {
      setIsCheckingPrometheus(false);
    }
  };

  if (authLoading || !user) {
    return null;
  }

  if (!isApproved && !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-border text-center">
          <CardHeader>
            <CardTitle>Account Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your account is awaiting admin approval. You will be able to access the system once an administrator approves your account.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mock data - will be replaced with API calls
  const mockServers = [
    {
      id: "1",
      hostname: "web-server-01",
      ip_address: "192.168.1.100",
      status: "online" as const,
      cpu_usage: 45,
      memory_usage: 67,
      open_ports: 4,
    },
    {
      id: "2",
      hostname: "db-server-01",
      ip_address: "192.168.1.101",
      status: "online" as const,
      cpu_usage: 23,
      memory_usage: 89,
      open_ports: 2,
    },
    {
      id: "3",
      hostname: "app-server-01",
      ip_address: "192.168.1.102",
      status: "warning" as const,
      cpu_usage: 78,
      memory_usage: 92,
      open_ports: 6,
    },
    {
      id: "4",
      hostname: "backup-server-01",
      ip_address: "192.168.1.103",
      status: "offline" as const,
      cpu_usage: 0,
      memory_usage: 0,
      open_ports: 0,
    },
  ];

  // Ensure servers and groups are always arrays before further processing
  const safeServers = Array.isArray(servers) ? servers : [];
  const safeGroups = Array.isArray(groups) ? groups : [];
  
  const displayServers = safeServers.length > 0 ? safeServers : mockServers;
  
  const enrichedServers = displayServers.map(server => {
    const instance = `${server.ip_address}:9100`;
    const serverMetrics = metrics[instance];
    return {
      ...server,
      ...serverMetrics,
      status: serverMetrics?.status || server.status,
      tags: server.tags || [],
    };
  });

  const filteredServers = enrichedServers.filter((server) => {
    const matchesSearch =
      server.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.ip_address.includes(searchQuery);
    
    const matchesGroup = selectedGroup ? server.group_id === selectedGroup : true;
    const matchesTag = selectedTag ? server.tags?.includes(selectedTag) : true;
    
    return matchesSearch && matchesGroup && matchesTag;
  });

  const menuItems = [
    { id: "servers" as const, label: "Servers", icon: Layers },
    { id: "ssl" as const, label: "SSL Certificates", icon: Lock },
    { id: "mappings" as const, label: "Mappings", icon: Network },
    { id: "weblogic" as const, label: "WebLogic", icon: BookOpen },
    { id: "faq" as const, label: "FAQ", icon: HelpCircle },
    { id: "monitoring" as const, label: "Monitoring", icon: ServerIcon },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 border-b">
            <Header />
          </div>
          
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto">{activeView === "servers" && (
                <div className="space-y-6">
                  <Card className="border-border">
                    <CardContent className="pt-6 space-y-6">
                      {isAdmin && safeGroups.length > 0 && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">Filter by Group</label>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => setSelectedGroup(null)}
                                className={`px-3 py-1.5 rounded-md border transition-colors text-sm ${
                                  !selectedGroup
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "border-border hover:border-primary"
                                }`}
                              >
                                All Servers
                              </button>
                              {safeGroups.map((group) => (
                                <button
                                  key={group.id}
                                  onClick={() => setSelectedGroup(group.id)}
                                  className={`px-3 py-1.5 rounded-md border transition-colors text-sm ${
                                    selectedGroup === group.id
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "border-border hover:border-primary"
                                  }`}
                                  style={{
                                    borderColor: selectedGroup === group.id ? group.color : undefined,
                                  }}
                                >
                                  <span
                                    className="inline-block w-2 h-2 rounded-full mr-2"
                                    style={{ backgroundColor: group.color }}
                                  />
                                  {group.name}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">Filter by Tag</label>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => setSelectedTag(null)}
                                className={`px-3 py-1.5 rounded-md border transition-colors text-sm ${
                                  !selectedTag
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "border-border hover:border-primary"
                                }`}
                              >
                                All Tags
                              </button>
                              {["Java", "MQ", "Apex", "Other"].map((tag) => (
                                <button
                                  key={tag}
                                  onClick={() => setSelectedTag(tag)}
                                  className={`px-3 py-1.5 rounded-md border transition-colors text-sm ${
                                    selectedTag === tag
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "border-border hover:border-primary"
                                  }`}
                                >
                                  {tag}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {isAdmin && <AddServerDialog onServerAdded={fetchServers} groups={safeGroups} />}
                      {isAdmin && <BulkServerImport onServersAdded={fetchServers} groups={safeGroups} />}

                      <div className="flex items-center gap-4 bg-muted/50 border border-border rounded-lg p-4">
                        <Search className="h-5 w-5 text-muted-foreground" />
                        <Input
                          placeholder="Search servers by hostname or IP..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </div>

                      {filteredServers.length > 0 ? (
                        <ServerTable servers={filteredServers} onServerDeleted={fetchServers} />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                          <ServerIcon className="h-16 w-16 mb-4 opacity-50" />
                          <p>No servers found</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeView === "ssl" && <SSLManagement />}

              {activeView === "mappings" && (
                <NetworkMap 
                  servers={displayServers} 
                  groups={safeGroups} 
                  onRefresh={fetchServers}
                />
              )}

              {activeView === "weblogic" && <WebLogicDocs />}

              {activeView === "faq" && <FAQ />}

              {activeView === "monitoring" && (
                <Monitoring 
                  servers={displayServers} 
                  prometheusUrl={prometheusUrl}
                  isConnected={isPrometheusConnected}
                  onConnectionChange={setIsPrometheusConnected}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div
          className={`border-l bg-card transition-all duration-300 ${
            sidebarOpen ? "w-64" : "w-16"
          }`}
        >
          <div className="h-full flex flex-col">
            {/* Toggle Button */}
            <div className="p-4 border-b flex items-center justify-between">
              {sidebarOpen && <span className="text-sm font-medium text-muted-foreground">Navigation</span>}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="ml-auto"
              >
                {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 p-2 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? "" : ""}`} />
                    {sidebarOpen && (
                      <span className="text-sm font-medium truncate">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Footer Info / Settings */}
            {sidebarOpen && (
              <div className="p-4 border-t space-y-4">
                {activeView === "monitoring" ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Prometheus Endpoint</h3>
                    </div>
                    <PrometheusSettings
                      prometheusUrl={prometheusUrl}
                      isConnected={isPrometheusConnected}
                      isChecking={isCheckingPrometheus}
                      onUrlChange={setPrometheusUrl}
                      onTestConnection={() => testPrometheusConnection(prometheusUrl, false)}
                      hideLabel={true}
                    />
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    <p>Total Servers: {safeServers.length}</p>
                    <p className="mt-1">Groups: {safeGroups.length}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;