import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Home,
  ArrowLeft,
  AlertCircle,
  Compass,
  Zap,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { ROLES } from "@/lib/roles";

const NotFound = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleGoBack = () => {
    window.history.back();
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  const getDashboardPath = () => {
    if (!user) return null;
    switch (user.role) {
      case ROLES.SUPERADMIN:
        return "/superadmin";
      case ROLES.ADMIN:
        return "/admin";
      default:
        return "/";
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Animated background pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />

      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-accent/20 blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-primary/10 blur-3xl animate-pulse delay-700" />
      </div>

      {/* Floating particles */}
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
          }}
        >
          <GraduationCap
            className="text-primary/20 dark:text-primary/10"
            size={12 + Math.random() * 16}
          />
        </div>
      ))}

      {/* Main content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-16">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-primary">
            <span className="text-xl font-bold text-primary-foreground">R</span>
          </div>
          <span className="font-heading font-bold text-2xl">RxOne</span>
        </div>

{/* Animated 404 text with gradient */}
<div className="relative mb-8">
  <h1 className="relative text-9xl md:text-[12rem] font-black bg-gradient-to-r from-orange-300 via-orange-500 to-orange-700 bg-clip-text text-transparent animate-gradient">
    404
  </h1>
</div>

        {/* Error message */}
        <Card className="max-w-2xl mx-auto mb-8 p-8 text-center bg-background/80 backdrop-blur-sm border-primary/20 shadow-xl">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-mono">{location.pathname}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Page Not Found
            </h2>
            <p className="text-lg text-muted-foreground">
              Oops! The page you're looking for seems to have wandered off into
              the digital wilderness. Let's get you back on track.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleGoBack}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <ArrowLeft className="h-5 w-5" />
              Go Back
            </Button>
            <Button
              onClick={handleGoHome}
              size="lg"
              className="gap-2 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
            >
              <Home className="h-5 w-5" />
              Return Home
            </Button>
          </div>
        </Card>

        {/* Helpful links */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">Quick Navigation</p>
          <div className="flex flex-wrap justify-center gap-4">
            {getDashboardPath() && (
              <a
                href={getDashboardPath()}
                className="text-sm text-primary hover:text-primary/80 transition-colors hover:underline"
              >
                Dashboard
              </a>
            )}
            <a
              href="/"
              className="text-sm text-primary hover:text-primary/80 transition-colors hover:underline"
            >
              Home
            </a>
            {!user && (
              <>
                <a
                  href="/login"
                  className="text-sm text-primary hover:text-primary/80 transition-colors hover:underline"
                >
                  Login
                </a>
                <a
                  href="/register"
                  className="text-sm text-primary hover:text-primary/80 transition-colors hover:underline"
                >
                  Register
                </a>
              </>
            )}
            <a
              href="/#features"
              className="text-sm text-primary hover:text-primary/80 transition-colors hover:underline"
            >
              Features
            </a>
            <a
              href="/#contact"
              className="text-sm text-primary hover:text-primary/80 transition-colors hover:underline"
            >
              Contact
            </a>
          </div>
        </div>

        {/* Decorative compass */}
        <div className="absolute bottom-8 right-8 opacity-30 animate-spin-slow">
          <Compass className="h-16 w-16 text-primary" />
        </div>
      </div>

      <style>{`
        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          25% {
            transform: translateY(-10px) translateX(5px);
          }
          75% {
            transform: translateY(10px) translateX(-5px);
          }
        }
        
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        
        .animate-float {
          animation: float ease-in-out infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        
        .delay-1000 {
          animation-delay: 1s;
        }
        
        .delay-700 {
          animation-delay: 0.7s;
        }
        
        .bg-gradient-primary {
          background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%);
        }
        
        .gradient-hero {
          background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%);
        }
        
        .bg-grid-pattern {
          background-image: url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M0 0h40v40H0V0zm20 20h20v20H20V20zM0 20h20v20H0V20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        
        .shadow-primary {
          box-shadow: 0 4px 14px 0 rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
      `}</style>
    </div>
  );
};

export default NotFound;
