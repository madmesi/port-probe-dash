import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft, Terminal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ConnectionStatus = 
  | "connecting"
  | "authenticating"
  | "exchanging-keys"
  | "connected"
  | "failed";

const SSHTerminal = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    // Simulate SSH connection process
    const connectSimulation = async () => {
      setStatus("connecting");
      setStatusMessage("Establishing TCP connection...");
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setStatus("exchanging-keys");
      setStatusMessage("Exchanging SSH keys...");
      
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      setStatus("authenticating");
      setStatusMessage("Authenticating with server...");
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStatus("connected");
      setStatusMessage("SSH session established");
    };

    connectSimulation();
  }, [id]);

  const getStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case "connecting":
      case "authenticating":
      case "exchanging-keys":
        return "warning";
      case "connected":
        return "success";
      case "failed":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/server/${id}`)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Server Details
        </Button>

        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-code-bg">
            <Terminal className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">SSH Terminal</h1>
            <p className="text-muted-foreground font-mono">Server ID: {id}</p>
          </div>
          <Badge variant={getStatusColor(status)} className="ml-auto">
            {status === "connecting" && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            {status === "exchanging-keys" && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            {status === "authenticating" && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            {statusMessage}
          </Badge>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              Terminal Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-code-bg border border-border rounded-lg p-6 min-h-[500px] font-mono text-sm">
              <div className="space-y-2 text-code-green">
                <p>╭─ SSH Connection</p>
                <p>│</p>
                <p>├─ Connecting to server...</p>
                {(status === "exchanging-keys" || status === "authenticating" || status === "connected") && (
                  <>
                    <p>│  ✓ TCP connection established</p>
                    <p>│</p>
                    <p>├─ Exchanging SSH keys...</p>
                  </>
                )}
                {(status === "authenticating" || status === "connected") && (
                  <>
                    <p>│  ✓ Key exchange completed</p>
                    <p>│  ✓ Server key verified</p>
                    <p>│</p>
                    <p>├─ Authenticating...</p>
                  </>
                )}
                {status === "connected" && (
                  <>
                    <p>│  ✓ Authentication successful</p>
                    <p>│</p>
                    <p>╰─ Session ready</p>
                    <p></p>
                    <p className="text-primary">[root@server ~]# _</p>
                  </>
                )}
              </div>
            </div>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> This is a UI demonstration of the SSH connection process.
                To enable actual SSH functionality, you'll need to:
              </p>
              <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Implement a WebSocket-based SSH proxy in your Go backend</li>
                <li>Use a library like <code className="text-code-green">xterm.js</code> for terminal emulation</li>
                <li>Handle SSH key management and authentication securely</li>
                <li>Consider security implications of browser-based SSH access</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SSHTerminal;
