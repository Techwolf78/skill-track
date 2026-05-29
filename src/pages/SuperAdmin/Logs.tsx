import { useState, useEffect, useRef } from "react";
import { logService } from "@/lib/log-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Terminal, 
  Download, 
  RefreshCw, 
  Search, 
  Trash2, 
  ChevronDown, 
  AlertCircle, 
  Pause, 
  Play 
} from "lucide-react";

export default function Logs() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [pinToBottom, setPinToBottom] = useState(true);
  
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalBodyRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      let data = "";
      if (level === "ALL") {
        data = await logService.getAllLogs();
      } else {
        data = await logService.getLogsByLevel(level);
      }
      setLogs(data || "--- No logs found ---");
    } catch (error: any) {
      console.error("Failed to load logs:", error);
      if (!silent) {
        toast({
          title: "Failed to Fetch Logs",
          description: error.message || "An error occurred while loading server logs.",
          variant: "destructive",
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [level]);

  // Handle auto-refresh polling
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, level]);

  // Pin scroll to bottom if enabled
  useEffect(() => {
    if (pinToBottom && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, pinToBottom]);

  const handleDownload = () => {
    try {
      const blob = new Blob([logs], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `system-logs-${level.toLowerCase()}-${new Date().toISOString()}.log`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download Initiated",
        description: "Logs exported successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Download Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleClear = () => {
    setLogs("--- Log screen cleared ---");
    toast({
      title: "Logs Cleared",
      description: "Screen buffer reset.",
    });
  };

  // Color code individual log lines
  const getLogLineStyle = (line: string) => {
    if (line.includes("ERROR") || line.includes("Severe") || line.includes("Exception")) {
      return "text-red-400 bg-red-950/20 px-1 rounded font-medium border-l-2 border-red-500";
    }
    if (line.includes("WARN") || line.includes("Warning")) {
      return "text-amber-400 bg-amber-950/10 px-1 rounded border-l-2 border-amber-500";
    }
    if (line.includes("INFO")) {
      return "text-emerald-400";
    }
    if (line.includes("DEBUG")) {
      return "text-blue-400 opacity-80";
    }
    if (line.includes("TRACE")) {
      return "text-purple-400 opacity-60";
    }
    return "text-zinc-300";
  };

  const splitLines = logs.split("\n");
  const filteredLines = splitLines.filter(line => 
    line.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6 animate-fade-in max-w-7xl mx-auto flex flex-col h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold flex items-center gap-2">
            <Terminal className="w-8 h-8 text-primary" />
            System Server Logs
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time diagnostics and execution logs from the Spring Boot backend
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Level selector badges */}
          <div className="flex bg-muted/60 p-1 rounded-lg border">
            {["ALL", "INFO", "WARN", "ERROR", "DEBUG"].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevel(lvl)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  level === lvl
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={() => fetchLogs()}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="hero"
            onClick={handleDownload}
            disabled={!logs || logs.startsWith("---")}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Logs
          </Button>
        </div>
      </div>

      {/* Control Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-card p-4 rounded-xl border">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Filter logs by keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Polling */}
        <div className="flex items-center justify-between border-x px-4">
          <div className="flex items-center gap-2">
            {autoRefresh ? (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1.5 flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Stream
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground gap-1.5 flex items-center">
                <Pause className="w-3 h-3" />
                Paused
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="live-mode"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <Label htmlFor="live-mode" className="text-xs font-semibold">
              Auto-poll (5s)
            </Label>
          </div>
        </div>

        {/* Scroll Pinning & Clear Screen */}
        <div className="flex items-center justify-between pl-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="pin-scroll"
              checked={pinToBottom}
              onCheckedChange={setPinToBottom}
            />
            <Label htmlFor="pin-scroll" className="text-xs font-semibold">
              Follow Terminal Tail
            </Label>
          </div>

          <Button
            variant="ghost"
            onClick={handleClear}
            className="text-destructive hover:bg-destructive/10 text-xs font-bold"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Clear Buffer
          </Button>
        </div>
      </div>

      {/* Terminal View Container */}
      <div 
        className="flex-1 min-h-[400px] border border-zinc-800 bg-zinc-950 rounded-xl overflow-hidden flex flex-col shadow-inner"
        style={{ colorScheme: "dark" }}
      >
        {/* Terminal Header */}
        <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center justify-between text-xs text-zinc-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-2 font-semibold">bash - rxone-server-stdout.log</span>
          </div>
          <div>
            Showing {filteredLines.length} of {splitLines.length} lines
          </div>
        </div>

        {/* Terminal Body */}
        <div 
          ref={terminalBodyRef}
          className="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed space-y-1.5 selection:bg-zinc-800 selection:text-white"
        >
          {loading && logs === "" ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-2">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              <span>Connecting to diagnostic log stream...</span>
            </div>
          ) : filteredLines.length === 0 ? (
            <div className="text-zinc-500 italic p-4 text-center">
              No matching log records found in buffer.
            </div>
          ) : (
            filteredLines.map((line, index) => (
              <div 
                key={index} 
                className={`hover:bg-zinc-900/60 py-0.5 px-1 transition-colors select-text break-words ${getLogLineStyle(line)}`}
              >
                <span className="text-zinc-600 mr-3 select-none text-[11px] inline-block w-8 text-right">
                  {index + 1}
                </span>
                {line}
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
}
