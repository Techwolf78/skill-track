import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  Mail, 
  Trophy, 
  Info, 
  CheckCheck, 
  Trash2, 
  Calendar,
  ChevronRight
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Test Invitation",
      message: "You have been invited to attempt the 'Full-Stack Web Development Assessment' by Gryphon Academy Admin. Complete before the expiration date.",
      time: "2 hours ago",
      type: "invite",
      read: false,
      actionLink: "/candidate/flow?testId=test-001"
    },
    {
      id: 2,
      title: "Certificate Issued",
      message: "Congratulations! Your evaluation for 'React & State Management' is ready. You scored 92% (96th percentile) and a skill certificate has been issued.",
      time: "1 day ago",
      type: "result",
      read: false,
      actionLink: "/candidate/certificates"
    },
    {
      id: 3,
      title: "Support Ticket Update",
      message: "Your ticket #1024 regarding 'Coding Editor Layout glitch on Safari' has been marked as resolved. Please test and close the ticket.",
      time: "3 days ago",
      type: "system",
      read: true,
      actionLink: "/candidate/support"
    },
    {
      id: 4,
      title: "Upcoming Scheduled Assessment",
      message: "Reminder: 'System Design & Scalability Mock' is scheduled to go live on June 18, 2026. Review prep syllabus in the resource portal.",
      time: "4 days ago",
      type: "system",
      read: true,
      actionLink: "/candidate/assessments"
    }
  ]);

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    toast.success("All notifications marked as read!");
  };

  const handleClearAll = () => {
    setNotifications([]);
    toast.info("All notifications cleared.");
  };

  const handleMarkRead = (id: number) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "invite":
        return { icon: Mail, bg: "bg-amber-100 text-amber-800", ring: "border-amber-200" };
      case "result":
        return { icon: Trophy, bg: "bg-emerald-100 text-emerald-800", ring: "border-emerald-200" };
      case "system":
      default:
        return { icon: Info, bg: "bg-blue-100 text-blue-800", ring: "border-blue-200" };
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            Notifications 
            {unreadCount > 0 && (
              <span className="text-xs bg-primary text-primary-foreground font-bold px-2 py-0.5 rounded-full animate-bounce">
                {unreadCount} New
              </span>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">Keep track of incoming test invitations, test results, and support replies.</p>
        </div>
        
        {notifications.length > 0 && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="border-border text-xs gap-1 hover:bg-muted"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-destructive hover:bg-destructive/10 text-xs gap-1"
              onClick={handleClearAll}
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Notifications feed */}
      <Card className="border border-border/60">
        <CardContent className="p-0">
          {notifications.length > 0 ? (
            <div className="divide-y divide-border">
              {notifications.map((notif) => {
                const config = getTypeStyle(notif.type);
                const Icon = config.icon;
                return (
                  <div 
                    key={notif.id} 
                    className={`p-6 flex items-start gap-4 transition-colors hover:bg-muted/10 ${!notif.read ? 'bg-primary/5' : ''}`}
                    onClick={() => handleMarkRead(notif.id)}
                  >
                    {/* Icon Circle */}
                    <div className={`p-3 rounded-xl border flex-shrink-0 ${config.bg} ${config.ring}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-1 min-w-0 pr-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                          {notif.title}
                          {!notif.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </h4>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> {notif.time}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">{notif.message}</p>
                      
                      {/* Interactive Link */}
                      <div className="pt-2">
                        <Button 
                          variant="link" 
                          asChild 
                          className="p-0 h-auto text-primary hover:text-primary-hover text-xs font-semibold gap-0.5"
                        >
                          <Link to={notif.actionLink}>
                            View details <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center space-y-3">
              <div className="p-4 bg-muted rounded-full w-fit mx-auto text-muted-foreground">
                <Bell className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">You are all caught up!</p>
                <p className="text-xs text-muted-foreground">No new system alerts or test invites at the moment.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
