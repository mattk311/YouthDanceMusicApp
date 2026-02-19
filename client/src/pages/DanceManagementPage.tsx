import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/Header";
import ThemeToggle from "@/components/ThemeToggle";
import UsageBadge from "@/components/UsageBadge";
import NotificationBell from "@/components/NotificationBell";
import type { User, Dance, DanceRequest } from "@shared/schema";
import { ArrowLeft, Plus, QrCode, Copy, Check, X, Clock, MapPin, Calendar, Music } from "lucide-react";

interface UsageData {
  count: number;
  remaining: number;
  isSubscribed: boolean;
}

export default function DanceManagementPage() {
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedDance, setSelectedDance] = useState<Dance | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [qrDance, setQrDance] = useState<Dance | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");

  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: usage } = useQuery<UsageData>({
    queryKey: ["/api/usage"],
    enabled: !!user,
  });

  const { data: dancesList, isLoading: dancesLoading } = useQuery<Dance[]>({
    queryKey: ["/api/dances"],
    enabled: !!user && usage?.isSubscribed === true,
  });

  const { data: requests, isLoading: requestsLoading } = useQuery<DanceRequest[]>({
    queryKey: ["/api/dances", selectedDance?.id, "requests"],
    queryFn: async () => {
      if (!selectedDance) return [];
      const res = await fetch(`/api/dances/${selectedDance.id}/requests`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch requests");
      return res.json();
    },
    enabled: !!selectedDance,
    refetchInterval: 10000,
  });

  const createDanceMutation = useMutation({
    mutationFn: async (data: { name: string; date: string; startTime: string; endTime: string; location: string }) => {
      const res = await apiRequest("POST", "/api/dances", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dances"] });
      setShowCreateForm(false);
      setName("");
      setDate("");
      setStartTime("");
      setEndTime("");
      setLocation("");
      toast({ title: "Dance created", description: "Your dance has been created successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create dance", description: error.message, variant: "destructive" });
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/requests/${requestId}`, { status });
      return res.json();
    },
    onSuccess: () => {
      if (selectedDance) {
        queryClient.invalidateQueries({ queryKey: ["/api/dances", selectedDance.id, "requests"] });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update request", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateDance = (e: React.FormEvent) => {
    e.preventDefault();
    createDanceMutation.mutate({ name, date, startTime, endTime, location });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({ title: "Code copied", description: `Dance code ${code} copied to clipboard.` });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getDanceRequestUrl = (code: string) => {
    const base = window.location.origin;
    return `${base}/request?code=${code}`;
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const pendingRequests = requests?.filter(r => r.status === "pending") || [];
  const decidedRequests = requests?.filter(r => r.status !== "pending") || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-end gap-3 p-4 border-b bg-card flex-wrap">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="link-home">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Button>
        </Link>
        {usage?.isSubscribed && <NotificationBell />}
        {usage && (
          <UsageBadge
            remaining={usage.remaining}
            isSubscribed={usage.isSubscribed}
          />
        )}
        <ThemeToggle />
      </div>

      <Header
        user={user ? { name: user.name, email: user.email, avatar: user.avatar || undefined } : undefined}
        onLogout={() => logoutMutation.mutate()}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-semibold" data-testid="text-page-title">Dance Management</h2>
              <p className="text-muted-foreground">Create and manage your dances</p>
            </div>
            <Button onClick={() => setShowCreateForm(true)} className="gap-2" data-testid="button-create-dance">
              <Plus className="h-4 w-4" />
              Create Dance
            </Button>
          </div>

          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create a New Dance</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateDance} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dance-name">Dance Name</Label>
                  <Input
                    id="dance-name"
                    placeholder="e.g. Stake Youth Dance"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    data-testid="input-dance-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dance-date">Date</Label>
                  <Input
                    id="dance-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    data-testid="input-dance-date"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Start Time</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      data-testid="input-start-time"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">End Time</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      data-testid="input-end-time"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dance-location">Location</Label>
                  <Input
                    id="dance-location"
                    placeholder="e.g. Church Cultural Hall"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                    data-testid="input-dance-location"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createDanceMutation.isPending} data-testid="button-submit-dance">
                  {createDanceMutation.isPending ? "Creating..." : "Create Dance"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {dancesLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading dances...</div>
          ) : !dancesList?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">No dances yet</p>
                <p className="text-muted-foreground mt-1">Create your first dance to get started</p>
              </CardContent>
            </Card>
          ) : selectedDance ? (
            <div className="space-y-6">
              <Button variant="ghost" onClick={() => setSelectedDance(null)} className="gap-2" data-testid="button-back-to-dances">
                <ArrowLeft className="h-4 w-4" />
                Back to all dances
              </Button>

              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle data-testid="text-dance-name">{selectedDance.name}</CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {selectedDance.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {selectedDance.startTime} - {selectedDance.endTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {selectedDance.location}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyCode(selectedDance.code)}
                        className="gap-2"
                        data-testid="button-copy-code"
                      >
                        {copiedCode === selectedDance.code ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {selectedDance.code}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setQrDance(selectedDance); setShowQR(true); }}
                        className="gap-2"
                        data-testid="button-show-qr"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        QR Code
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {requestsLoading ? (
                <div className="text-center py-4 text-muted-foreground">Loading requests...</div>
              ) : (
                <div className="space-y-6">
                  {pendingRequests.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold">Pending Requests ({pendingRequests.length})</h3>
                      {pendingRequests.map((req) => (
                        <Card key={req.id}>
                          <CardContent className="py-4">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                              <div className="flex items-center gap-3">
                                {req.albumArt && (
                                  <img src={req.albumArt} alt="" className="h-12 w-12 rounded-md object-cover" />
                                )}
                                <div>
                                  <p className="font-medium" data-testid={`text-request-song-${req.id}`}>{req.songTitle}</p>
                                  <p className="text-sm text-muted-foreground">{req.artistName}</p>
                                  <p className="text-xs text-muted-foreground mt-1">Requested by {req.requesterName}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => updateRequestMutation.mutate({ requestId: req.id, status: "accepted" })}
                                  disabled={updateRequestMutation.isPending}
                                  data-testid={`button-accept-${req.id}`}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Play
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateRequestMutation.mutate({ requestId: req.id, status: "rejected" })}
                                  disabled={updateRequestMutation.isPending}
                                  data-testid={`button-reject-${req.id}`}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Skip
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {decidedRequests.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold">Decided ({decidedRequests.length})</h3>
                      {decidedRequests.map((req) => (
                        <Card key={req.id} className="opacity-75">
                          <CardContent className="py-4">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                              <div className="flex items-center gap-3">
                                {req.albumArt && (
                                  <img src={req.albumArt} alt="" className="h-10 w-10 rounded-md object-cover" />
                                )}
                                <div>
                                  <p className="font-medium">{req.songTitle}</p>
                                  <p className="text-sm text-muted-foreground">{req.artistName}</p>
                                  <p className="text-xs text-muted-foreground">by {req.requesterName}</p>
                                </div>
                              </div>
                              <Badge variant={req.status === "accepted" ? "default" : "secondary"}>
                                {req.status === "accepted" ? "Playing" : "Skipped"}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {!pendingRequests.length && !decidedRequests.length && (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <p className="text-muted-foreground">No song requests yet. Share the QR code or dance code with attendees!</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {dancesList.map((dance) => (
                <Card
                  key={dance.id}
                  className="cursor-pointer hover-elevate"
                  onClick={() => setSelectedDance(dance)}
                  data-testid={`card-dance-${dance.id}`}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{dance.name}</CardTitle>
                    <CardDescription className="space-y-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {dance.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {dance.startTime} - {dance.endTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {dance.location}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="font-mono" data-testid={`text-dance-code-${dance.id}`}>
                        {dance.code}
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); copyCode(dance.code); }}
                          data-testid={`button-copy-${dance.id}`}
                        >
                          {copiedCode === dance.code ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); setQrDance(dance); setShowQR(true); }}
                          data-testid={`button-qr-${dance.id}`}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Dialog open={showQR} onOpenChange={setShowQR}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>QR Code - {qrDance?.name}</DialogTitle>
              </DialogHeader>
              {qrDance && (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="bg-white p-4 rounded-lg">
                    <QRCodeSVG
                      value={getDanceRequestUrl(qrDance.code)}
                      size={240}
                      level="H"
                      data-testid="qr-code-image"
                    />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Scan to request songs</p>
                    <div className="flex items-center gap-2 justify-center">
                      <span className="font-mono text-lg font-bold" data-testid="text-qr-code">{qrDance.code}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyCode(qrDance.code)}
                        data-testid="button-copy-qr-code"
                      >
                        {copiedCode === qrDance.code ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const printWindow = window.open("", "_blank");
                      if (printWindow) {
                        const svg = document.querySelector('[data-testid="qr-code-image"]');
                        printWindow.document.write(`
                          <html><head><title>QR Code - ${qrDance.name}</title>
                          <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;margin:0}
                          h1{font-size:24px;margin-bottom:8px}p{font-size:18px;color:#666;margin:4px 0}.code{font-size:36px;font-weight:bold;font-family:monospace;margin:16px 0}</style></head>
                          <body><h1>${qrDance.name}</h1>
                          <p>${qrDance.date} | ${qrDance.startTime} - ${qrDance.endTime}</p>
                          <p>${qrDance.location}</p>
                          <div style="margin:24px 0">${svg?.outerHTML || ""}</div>
                          <p>Scan to request songs</p>
                          <div class="code">${qrDance.code}</div>
                          <p>Or visit: ${getDanceRequestUrl(qrDance.code)}</p>
                          </body></html>`);
                        printWindow.document.close();
                        printWindow.print();
                      }
                    }}
                    data-testid="button-print-qr"
                  >
                    Print QR Code
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <footer className="mt-8 pt-6 border-t text-center">
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground hover:underline"
              data-testid="link-footer-privacy"
            >
              Privacy Policy
            </Link>
          </footer>
        </div>
      </main>
    </div>
  );
}
