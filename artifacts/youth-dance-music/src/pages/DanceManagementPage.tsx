import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import {
  DanceCardSkeletonGrid,
  RequestRowSkeletonList,
} from "@/components/skeletons";
import type { User, Dance, DanceRequest } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Plus,
  QrCode,
  Copy,
  Check,
  X,
  Clock,
  MapPin,
  Calendar,
  Music,
  Trash2,
  Lock,
} from "lucide-react";

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
  const [danceToDelete, setDanceToDelete] = useState<Dance | null>(null);

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

  const isPro = usage?.isSubscribed === true;

  const { data: dancesList, isLoading: dancesLoading } = useQuery<Dance[]>({
    queryKey: ["/api/dances"],
    enabled: !!user && isPro,
  });

  const { data: requests, isLoading: requestsLoading } = useQuery<
    DanceRequest[]
  >({
    queryKey: ["/api/dances", selectedDance?.id, "requests"],
    queryFn: async () => {
      if (!selectedDance) return [];
      const res = await fetch(`/api/dances/${selectedDance.id}/requests`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch requests");
      return res.json();
    },
    enabled: !!selectedDance,
    refetchInterval: 10000,
  });

  const createDanceMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      date: string;
      startTime: string;
      endTime: string;
      location: string;
    }) => {
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
      toast({
        title: "Dance created",
        description: "Your dance has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create dance",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({
      requestId,
      status,
    }: {
      requestId: string;
      status: string;
    }) => {
      const res = await apiRequest("PATCH", `/api/requests/${requestId}`, {
        status,
      });
      return res.json();
    },
    onSuccess: () => {
      if (selectedDance) {
        queryClient.invalidateQueries({
          queryKey: ["/api/dances", selectedDance.id, "requests"],
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteDanceMutation = useMutation({
    mutationFn: async (danceId: string) => {
      const res = await apiRequest("DELETE", `/api/dances/${danceId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dances"] });
      setDanceToDelete(null);
      if (selectedDance && selectedDance.id === danceToDelete?.id) {
        setSelectedDance(null);
      }
      toast({
        title: "Dance deleted",
        description: "The dance has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete dance",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateDance = (e: React.FormEvent) => {
    e.preventDefault();
    createDanceMutation.mutate({ name, date, startTime, endTime, location });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({
      title: "Code copied",
      description: `Dance code ${code} copied to clipboard.`,
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getDanceRequestUrl = (code: string) => {
    const base = window.location.origin;
    return `${base}/request?code=${code}`;
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("Logout failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const pendingRequests = requests?.filter((r) => r.status === "pending") || [];
  const decidedRequests = requests?.filter((r) => r.status !== "pending") || [];

  return (
    <AppShell
      user={
        user
          ? {
              name: user.name,
              email: user.email,
              avatar: user.avatar || undefined,
            }
          : undefined
      }
      usage={usage}
      onLogout={() => logoutMutation.mutate()}
    >
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto space-y-5 sm:space-y-6">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div className="space-y-1">
              <h1
                className="text-2xl sm:text-3xl font-bold tracking-tight"
                data-testid="text-page-title"
              >
                Dance Management
              </h1>
              <p className="text-sm text-muted-foreground">
                Create dances and review live song requests.
              </p>
            </div>
            {isPro && (
              <Button
                onClick={() => setShowCreateForm(true)}
                className="gap-2"
                data-testid="button-create-dance"
              >
                <Plus className="h-4 w-4" />
                Create Dance
              </Button>
            )}
          </div>

          {!isPro && (
            <EmptyState
              icon={Lock}
              title="Pro Feature"
              description="Create dances, share QR codes, and review song requests with a Pro subscription."
              variant="default"
              testId="empty-pro-required"
            />
          )}

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
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
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
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createDanceMutation.isPending}
                  data-testid="button-submit-dance"
                >
                  {createDanceMutation.isPending
                    ? "Creating..."
                    : "Create Dance"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {isPro && dancesLoading ? (
            <DanceCardSkeletonGrid count={4} />
          ) : isPro && !dancesList?.length ? (
            <EmptyState
              icon={Music}
              title="No dances yet"
              description="Create your first dance to start collecting song requests."
              testId="empty-dances"
              action={
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="gap-2"
                  data-testid="button-create-first-dance"
                >
                  <Plus className="h-4 w-4" />
                  Create Dance
                </Button>
              }
            />
          ) : isPro && selectedDance ? (
            <div className="space-y-5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDance(null)}
                className="gap-2 -ml-2"
                data-testid="button-back-to-dances"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to all dances
              </Button>

              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <CardTitle
                        className="text-lg sm:text-xl"
                        data-testid="text-dance-name"
                      >
                        {selectedDance.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-3 mt-2 flex-wrap text-xs sm:text-sm">
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
                  </div>
                  <div className="flex gap-2 flex-wrap pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyCode(selectedDance.code)}
                      className="gap-2 font-mono"
                      data-testid="button-copy-code"
                    >
                      {copiedCode === selectedDance.code ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {selectedDance.code}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setQrDance(selectedDance);
                        setShowQR(true);
                      }}
                      className="gap-2"
                      data-testid="button-show-qr"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      QR Code
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDanceToDelete(selectedDance)}
                      className="gap-2"
                      data-testid="button-delete-dance"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {requestsLoading ? (
                <RequestRowSkeletonList count={3} />
              ) : (
                <div className="space-y-5">
                  {pendingRequests.length > 0 && (
                    <div className="space-y-3">
                      <h2 className="text-base sm:text-lg font-semibold">
                        Pending Requests ({pendingRequests.length})
                      </h2>
                      {pendingRequests.map((req) => (
                        <Card key={req.id}>
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {req.albumArt ? (
                                  <img
                                    src={req.albumArt}
                                    alt=""
                                    className="h-12 w-12 rounded-md object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                                    <Music className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p
                                    className="font-medium truncate"
                                    data-testid={`text-request-song-${req.id}`}
                                  >
                                    {req.songTitle}
                                  </p>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {req.artistName}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1 truncate">
                                    Requested by {req.requesterName}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2 sm:flex-shrink-0">
                                <Button
                                  size="sm"
                                  className="flex-1 sm:flex-initial gap-1"
                                  onClick={() =>
                                    updateRequestMutation.mutate({
                                      requestId: req.id,
                                      status: "accepted",
                                    })
                                  }
                                  disabled={updateRequestMutation.isPending}
                                  data-testid={`button-accept-${req.id}`}
                                >
                                  <Check className="h-4 w-4" />
                                  Play
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 sm:flex-initial gap-1"
                                  onClick={() =>
                                    updateRequestMutation.mutate({
                                      requestId: req.id,
                                      status: "rejected",
                                    })
                                  }
                                  disabled={updateRequestMutation.isPending}
                                  data-testid={`button-reject-${req.id}`}
                                >
                                  <X className="h-4 w-4" />
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
                      <h2 className="text-base sm:text-lg font-semibold">
                        Decided ({decidedRequests.length})
                      </h2>
                      {decidedRequests.map((req) => (
                        <Card key={req.id} className="opacity-75">
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                {req.albumArt && (
                                  <img
                                    src={req.albumArt}
                                    alt=""
                                    className="h-10 w-10 rounded-md object-cover flex-shrink-0"
                                  />
                                )}
                                <div className="min-w-0">
                                  <p className="font-medium truncate">
                                    {req.songTitle}
                                  </p>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {req.artistName}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    by {req.requesterName}
                                  </p>
                                </div>
                              </div>
                              <Badge
                                variant={
                                  req.status === "accepted"
                                    ? "default"
                                    : "secondary"
                                }
                                className={
                                  req.status === "accepted"
                                    ? "bg-success text-success-foreground"
                                    : ""
                                }
                              >
                                {req.status === "accepted"
                                  ? "Playing"
                                  : "Skipped"}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {!pendingRequests.length && !decidedRequests.length && (
                    <EmptyState
                      icon={Music}
                      title="No song requests yet"
                      description="Share the dance code or QR code with attendees so they can request songs."
                      testId="empty-requests"
                    />
                  )}
                </div>
              )}
            </div>
          ) : isPro ? (
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              {dancesList!.map((dance) => (
                <Card
                  key={dance.id}
                  className="cursor-pointer hover-elevate"
                  onClick={() => setSelectedDance(dance)}
                  data-testid={`card-dance-${dance.id}`}
                >
                  <CardHeader className="space-y-2">
                    <CardTitle className="text-base sm:text-lg">
                      {dance.name}
                    </CardTitle>
                    <CardDescription className="space-y-1 text-xs sm:text-sm">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {dance.date}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {dance.startTime} - {dance.endTime}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {dance.location}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className="font-mono"
                        data-testid={`text-dance-code-${dance.id}`}
                      >
                        {dance.code}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyCode(dance.code);
                          }}
                          data-testid={`button-copy-${dance.id}`}
                          aria-label="Copy code"
                        >
                          {copiedCode === dance.code ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQrDance(dance);
                            setShowQR(true);
                          }}
                          data-testid={`button-qr-${dance.id}`}
                          aria-label="Show QR code"
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDanceToDelete(dance);
                          }}
                          data-testid={`button-delete-${dance.id}`}
                          aria-label="Delete dance"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          <AlertDialog
            open={!!danceToDelete}
            onOpenChange={(open) => {
              if (!open) setDanceToDelete(null);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Dance</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete{" "}
                  <strong>{danceToDelete?.name}</strong>? This will permanently
                  remove the dance and all of its song requests. This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-delete">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    danceToDelete &&
                    deleteDanceMutation.mutate(danceToDelete.id)
                  }
                  disabled={deleteDanceMutation.isPending}
                  data-testid="button-confirm-delete"
                >
                  {deleteDanceMutation.isPending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Dialog open={showQR} onOpenChange={setShowQR}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>QR Code - {qrDance?.name}</DialogTitle>
              </DialogHeader>
              {qrDance && (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="bg-white p-4 rounded-md">
                    <QRCodeSVG
                      value={getDanceRequestUrl(qrDance.code)}
                      size={240}
                      level="H"
                      data-testid="qr-code-image"
                    />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Scan to request songs
                    </p>
                    <div className="flex items-center gap-2 justify-center">
                      <span
                        className="font-mono text-lg font-bold"
                        data-testid="text-qr-code"
                      >
                        {qrDance.code}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyCode(qrDance.code)}
                        data-testid="button-copy-qr-code"
                        aria-label="Copy code"
                      >
                        {copiedCode === qrDance.code ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const printWindow = window.open("", "_blank");
                      if (printWindow) {
                        const svg = document.querySelector(
                          '[data-testid="qr-code-image"]',
                        );
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
        </div>
      </main>
    </AppShell>
  );
}
