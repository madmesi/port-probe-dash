import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api";
import { Search, Server as ServerIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ServerTable } from "@/components/ServerTable";
import { AddServerDialog } from "@/components/AddServerDialog";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SSLManagement } from "@/components/SSLManagement";
import { NetworkMap } from "@/components/NetworkMap";

const Index = () => {
  const { user, isLoading: authLoading, isAdmin, isApproved } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [servers, setServers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
  }, [user]);

  const fetchGroups = async () => {
    try {
      const data = await apiClient.getGroups();
      setGroups(data);
    } catch (error) {
      console.error("Failed to fetch groups:", error);
    }
  };

  const fetchServers = async () => {
    try {
      const data = await apiClient.getServers();
      setServers(data);
    } catch (error) {
      console.error("Failed to fetch servers:", error);
    }
    setIsLoading(false);
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

  const displayServers = servers.length > 0 ? servers : mockServers;
  
  const filteredServers = displayServers.filter((server) => {
    const matchesSearch =
      server.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.ip_address.includes(searchQuery);
    
    const matchesGroup = selectedGroup ? server.group_id === selectedGroup : true;
    
    return matchesSearch && matchesGroup;
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <Header />

        <Tabs defaultValue="servers" className="w-full">
          <TabsList className="flex w-full max-w-2xl rounded-md bg-muted p-1 text-muted-foreground">
            <TabsTrigger value="servers" className="flex-1 border-r border-border last:border-r-0">Servers</TabsTrigger>
            <TabsTrigger value="ssl" className="flex-1 border-r border-border last:border-r-0">SSL Certificates</TabsTrigger>
            <TabsTrigger value="mappings" className="flex-1">Mappings</TabsTrigger>
          </TabsList>

          <TabsContent value="servers" className="space-y-6 mt-6">
            <Card className="border-border">
              <CardContent className="pt-6 space-y-6">
                {isAdmin && groups.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedGroup(null)}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        !selectedGroup
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:border-primary"
                      }`}
                    >
                      All Servers
                    </button>
                    {groups.map((group) => (
                      <button
                        key={group.id}
                        onClick={() => setSelectedGroup(group.id)}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
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
                )}

                {isAdmin && <AddServerDialog onServerAdded={fetchServers} groups={groups} />}

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
                  <ServerTable servers={filteredServers} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <ServerIcon className="h-16 w-16 mb-4 opacity-50" />
                    <p>No servers found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ssl" className="mt-6">
            <SSLManagement />
          </TabsContent>

          <TabsContent value="mappings" className="mt-6">
            <NetworkMap servers={servers.length > 0 ? servers : mockServers} groups={groups} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
