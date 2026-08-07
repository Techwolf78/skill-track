import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

// 1. Dashboard Skeleton (macOS Light Theme - Clean Grey/White)
export const DashboardSkeleton = () => (
  <div className="p-8 space-y-6 w-full animate-pulse bg-slate-50/50 min-h-screen rounded-2xl">
    <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
      <div className="space-y-2">
        <Skeleton className="h-7 w-52 bg-slate-200/80 rounded-lg" />
        <Skeleton className="h-4 w-80 bg-slate-200/50 rounded-md" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-9 w-28 bg-slate-200/80 rounded-xl" />
        <Skeleton className="h-9 w-32 bg-slate-300/80 rounded-xl" />
      </div>
    </div>
    {/* 4 Stat Cards */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-28 bg-slate-200/70 rounded" />
            <Skeleton className="h-8 w-8 rounded-xl bg-slate-100" />
          </div>
          <Skeleton className="h-9 w-24 bg-slate-300/80 rounded-lg" />
          <Skeleton className="h-3 w-36 bg-slate-200/60 rounded" />
        </div>
      ))}
    </div>
    {/* Charts & Feed split */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        <Skeleton className="h-6 w-48 bg-slate-200/80 rounded" />
        <Skeleton className="h-64 w-full bg-slate-100/80 rounded-xl" />
      </div>
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        <Skeleton className="h-6 w-36 bg-slate-200/80 rounded" />
        {[1, 2, 3, 4].map((j) => (
          <div key={j} className="flex gap-3 items-center py-2 border-b border-slate-100">
            <Skeleton className="h-10 w-10 rounded-full bg-slate-200/70" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-full bg-slate-200/70 rounded" />
              <Skeleton className="h-3 w-24 bg-slate-200/40 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// 2. Organisations Skeleton (Grid of Cards)
export const OrganisationsSkeleton = () => (
  <div className="p-8 space-y-6 w-full animate-pulse bg-slate-50/50 min-h-screen rounded-2xl">
    <div className="flex justify-between items-center pb-4 border-b border-slate-200/80">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 bg-slate-200/80 rounded-lg" />
        <Skeleton className="h-4 w-72 bg-slate-200/50 rounded-md" />
      </div>
      <Skeleton className="h-10 w-40 bg-slate-300/80 rounded-xl" />
    </div>
    <div className="flex gap-4">
      <Skeleton className="h-10 w-72 bg-white border border-slate-200/80 rounded-xl" />
      <Skeleton className="h-10 w-32 bg-white border border-slate-200/80 rounded-xl" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-xl bg-slate-200/80" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-32 bg-slate-300/80 rounded" />
              <Skeleton className="h-3 w-20 bg-slate-200/60 rounded" />
            </div>
          </div>
          <Skeleton className="h-12 w-full bg-slate-50 rounded-xl" />
          <div className="flex justify-between pt-2 border-t border-slate-100">
            <Skeleton className="h-4 w-24 bg-slate-200/60 rounded" />
            <Skeleton className="h-4 w-16 bg-slate-200/60 rounded" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// 3. Users Skeleton (Full Data Table layout)
export const UsersSkeleton = () => (
  <div className="p-8 space-y-6 w-full animate-pulse bg-slate-50/50 min-h-screen rounded-2xl">
    <div className="flex justify-between items-center pb-4 border-b border-slate-200/80">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40 bg-slate-200/80 rounded-lg" />
        <Skeleton className="h-4 w-64 bg-slate-200/50 rounded-md" />
      </div>
      <Skeleton className="h-10 w-36 bg-slate-300/80 rounded-xl" />
    </div>
    <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
      <div className="flex justify-between items-center gap-4">
        <Skeleton className="h-10 w-80 bg-slate-100 rounded-xl" />
        <Skeleton className="h-10 w-28 bg-slate-100 rounded-xl" />
      </div>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex items-center justify-between py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3 w-1/3">
            <Skeleton className="h-9 w-9 rounded-full bg-slate-200" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32 bg-slate-300/80 rounded" />
              <Skeleton className="h-3 w-40 bg-slate-200/50 rounded" />
            </div>
          </div>
          <Skeleton className="h-6 w-24 bg-slate-200/70 rounded-full" />
          <Skeleton className="h-4 w-28 bg-slate-200/50 rounded" />
          <Skeleton className="h-8 w-20 bg-slate-100 rounded-lg" />
        </div>
      ))}
    </div>
  </div>
);

// 4. Candidates Skeleton
export const CandidatesSkeleton = () => (
  <div className="p-8 space-y-6 w-full animate-pulse bg-slate-50/50 min-h-screen rounded-2xl">
    <div className="flex justify-between items-center pb-4 border-b border-slate-200/80">
      <div className="space-y-2">
        <Skeleton className="h-7 w-44 bg-slate-200/80 rounded-lg" />
        <Skeleton className="h-4 w-72 bg-slate-200/50 rounded-md" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-28 bg-slate-200/80 rounded-xl" />
        <Skeleton className="h-10 w-36 bg-slate-300/80 rounded-xl" />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full bg-slate-200/80" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36 bg-slate-300/80 rounded" />
              <Skeleton className="h-3 w-48 bg-slate-200/60 rounded" />
              <Skeleton className="h-3 w-28 bg-slate-200/40 rounded" />
            </div>
          </div>
          <Skeleton className="h-8 w-24 bg-slate-100 rounded-lg" />
        </div>
      ))}
    </div>
  </div>
);

// 5. QuestionBank Skeleton (Split View / Filterable List)
export const QuestionBankSkeleton = () => (
  <div className="p-8 space-y-6 w-full animate-pulse bg-slate-50/50 min-h-screen rounded-2xl">
    <div className="flex justify-between items-center pb-4 border-b border-slate-200/80">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 bg-slate-200/80 rounded-lg" />
        <Skeleton className="h-4 w-80 bg-slate-200/50 rounded-md" />
      </div>
      <Skeleton className="h-10 w-44 bg-slate-300/80 rounded-xl" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        <Skeleton className="h-5 w-28 bg-slate-200/80 rounded" />
        {[1, 2, 3, 4, 5].map((k) => (
          <Skeleton key={k} className="h-8 w-full bg-slate-100 rounded-lg" />
        ))}
      </div>
      <div className="lg:col-span-3 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              <Skeleton className="h-5 w-3/4 bg-slate-300/80 rounded" />
              <Skeleton className="h-6 w-16 bg-slate-200/80 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full bg-slate-200/50 rounded" />
            <div className="flex gap-3 pt-2">
              <Skeleton className="h-6 w-20 bg-slate-100 rounded-md" />
              <Skeleton className="h-6 w-24 bg-slate-100 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// 6. Tests / Assessments Skeleton
export const TestsSkeleton = () => (
  <div className="p-8 space-y-6 w-full animate-pulse bg-slate-50/50 min-h-screen rounded-2xl">
    <div className="flex justify-between items-center pb-4 border-b border-slate-200/80">
      <div className="space-y-2">
        <Skeleton className="h-7 w-52 bg-slate-200/80 rounded-lg" />
        <Skeleton className="h-4 w-72 bg-slate-200/50 rounded-md" />
      </div>
      <Skeleton className="h-10 w-36 bg-slate-300/80 rounded-xl" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <Skeleton className="h-6 w-40 bg-slate-300/80 rounded" />
            <Skeleton className="h-5 w-16 bg-slate-200/80 rounded-full" />
          </div>
          <Skeleton className="h-10 w-full bg-slate-100 rounded-xl" />
          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <Skeleton className="h-4 w-20 bg-slate-200/60 rounded" />
            <Skeleton className="h-8 w-24 bg-slate-200/80 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// 7. Proctoring Dashboard Skeleton (Grid of webcam feeds)
export const ProctoringSkeleton = () => (
  <div className="p-8 space-y-6 w-full animate-pulse bg-slate-50/50 min-h-screen rounded-2xl">
    <div className="flex justify-between items-center pb-4 border-b border-slate-200/80">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56 bg-slate-200/80 rounded-lg" />
        <Skeleton className="h-4 w-80 bg-slate-200/50 rounded-md" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 bg-emerald-100 rounded-lg" />
        <Skeleton className="h-9 w-28 bg-rose-100 rounded-lg" />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
          <Skeleton className="h-44 w-full bg-slate-200/70 rounded-xl" />
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-32 bg-slate-300/80 rounded" />
            <Skeleton className="h-5 w-16 bg-emerald-100 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// 8. Reports Skeleton (Metrics & Graphs)
export const ReportsSkeleton = () => (
  <div className="p-8 space-y-6 w-full animate-pulse bg-slate-50/50 min-h-screen rounded-2xl">
    <div className="flex justify-between items-center pb-4 border-b border-slate-200/80">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 bg-slate-200/80 rounded-lg" />
        <Skeleton className="h-4 w-64 bg-slate-200/50 rounded-md" />
      </div>
      <Skeleton className="h-10 w-36 bg-slate-300/80 rounded-xl" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
          <Skeleton className="h-4 w-28 bg-slate-200/70 rounded" />
          <Skeleton className="h-8 w-20 bg-slate-300/80 rounded-lg" />
          <Skeleton className="h-32 w-full bg-slate-100 rounded-xl" />
        </div>
      ))}
    </div>
  </div>
);

// 9. Audit Logs Skeleton (Timeline Feed)
export const AuditLogsSkeleton = () => (
  <div className="p-8 space-y-6 w-full animate-pulse bg-slate-50/50 min-h-screen rounded-2xl">
    <div className="flex justify-between items-center pb-4 border-b border-slate-200/80">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40 bg-slate-200/80 rounded-lg" />
        <Skeleton className="h-4 w-60 bg-slate-200/50 rounded-md" />
      </div>
    </div>
    <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex gap-4 items-start">
          <Skeleton className="h-8 w-8 rounded-full bg-slate-200/80 flex-shrink-0" />
          <div className="space-y-2 flex-1 border-b border-slate-100 pb-4">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-48 bg-slate-300/80 rounded" />
              <Skeleton className="h-3 w-24 bg-slate-200/50 rounded" />
            </div>
            <Skeleton className="h-3 w-3/4 bg-slate-200/50 rounded" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// 10. Settings Skeleton (Tabbed Form Sections)
export const SettingsSkeleton = () => (
  <div className="p-8 space-y-6 w-full animate-pulse bg-slate-50/50 min-h-screen rounded-2xl">
    <div className="flex justify-between items-center pb-4 border-b border-slate-200/80">
      <div className="space-y-2">
        <Skeleton className="h-7 w-36 bg-slate-200/80 rounded-lg" />
        <Skeleton className="h-4 w-64 bg-slate-200/50 rounded-md" />
      </div>
    </div>
    <div className="flex gap-3 border-b border-slate-200/80 pb-2">
      {[1, 2, 3, 4].map((t) => (
        <Skeleton key={t} className="h-8 w-24 bg-slate-200/70 rounded-lg" />
      ))}
    </div>
    <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-6">
      {[1, 2, 3].map((f) => (
        <div key={f} className="space-y-2">
          <Skeleton className="h-4 w-32 bg-slate-300/80 rounded" />
          <Skeleton className="h-10 w-full max-w-lg bg-slate-100 rounded-xl" />
        </div>
      ))}
      <Skeleton className="h-10 w-32 bg-slate-300/80 rounded-xl pt-2" />
    </div>
  </div>
);

// 11. Candidate Certificates Skeleton
export const CandidateCertificatesSkeleton = () => (
  <div className="p-8 space-y-6 w-full animate-pulse bg-slate-50/50 min-h-screen rounded-2xl">
    <div className="flex justify-between items-center pb-4 border-b border-slate-200/80">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 bg-slate-200/80 rounded-lg" />
        <Skeleton className="h-4 w-72 bg-slate-200/50 rounded-md" />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-xl bg-amber-100/80" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-44 bg-slate-300/80 rounded" />
              <Skeleton className="h-3 w-28 bg-slate-200/60 rounded" />
            </div>
          </div>
          <Skeleton className="h-20 w-full bg-slate-50 rounded-xl" />
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <Skeleton className="h-4 w-24 bg-slate-200/60 rounded" />
            <Skeleton className="h-9 w-28 bg-slate-300/80 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// 12. Candidate Notifications Skeleton
export const CandidateNotificationsSkeleton = () => (
  <div className="p-8 space-y-6 w-full animate-pulse bg-slate-50/50 min-h-screen rounded-2xl">
    <div className="flex justify-between items-center pb-4 border-b border-slate-200/80">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40 bg-slate-200/80 rounded-lg" />
        <Skeleton className="h-4 w-60 bg-slate-200/50 rounded-md" />
      </div>
    </div>
    <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-4 items-center p-3 rounded-xl border border-slate-100 bg-slate-50/40">
          <Skeleton className="h-10 w-10 rounded-full bg-slate-200/80 flex-shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-3/4 bg-slate-300/80 rounded" />
            <Skeleton className="h-3 w-32 bg-slate-200/50 rounded" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// 13. Candidate Support / FAQ Skeleton
export const CandidateSupportSkeleton = () => (
  <div className="p-8 space-y-6 w-full animate-pulse bg-slate-50/50 min-h-screen rounded-2xl">
    <div className="flex justify-between items-center pb-4 border-b border-slate-200/80">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 bg-slate-200/80 rounded-lg" />
        <Skeleton className="h-4 w-80 bg-slate-200/50 rounded-md" />
      </div>
    </div>
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
          <Skeleton className="h-5 w-2/3 bg-slate-300/80 rounded" />
          <Skeleton className="h-4 w-full bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  </div>
);

// 14. Profile Skeleton
export const ProfileSkeleton = () => (
  <div className="p-8 space-y-6 w-full animate-pulse bg-slate-50/50 min-h-screen rounded-2xl">
    <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-6">
      <div className="flex items-center gap-6">
        <Skeleton className="h-20 w-20 rounded-full bg-slate-200/80" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 bg-slate-300/80 rounded-lg" />
          <Skeleton className="h-4 w-36 bg-slate-200/60 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
        {[1, 2, 3, 4].map((f) => (
          <div key={f} className="space-y-2">
            <Skeleton className="h-4 w-28 bg-slate-300/70 rounded" />
            <Skeleton className="h-10 w-full bg-slate-100 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Helper function to pick the matching dedicated skeleton based on pathname
export const getDedicatedSkeleton = (pathname: string) => {
  if (pathname.includes("/organisations")) return <OrganisationsSkeleton />;
  if (pathname.includes("/users")) return <UsersSkeleton />;
  if (pathname.includes("/students") || pathname.includes("/candidates") || pathname.includes("/admin/candidates")) return <CandidatesSkeleton />;
  if (pathname.includes("/questions")) return <QuestionBankSkeleton />;
  if (pathname.includes("/tests") || pathname.includes("/test-schedules") || pathname.includes("/invitations") || pathname.includes("/assessments") || pathname.includes("/schedules")) return <TestsSkeleton />;
  if (pathname.includes("/proctoring")) return <ProctoringSkeleton />;
  if (pathname.includes("/reports") || pathname.includes("/results")) return <ReportsSkeleton />;
  if (pathname.includes("/certificates")) return <CandidateCertificatesSkeleton />;
  if (pathname.includes("/notifications")) return <CandidateNotificationsSkeleton />;
  if (pathname.includes("/support")) return <CandidateSupportSkeleton />;
  if (pathname.includes("/audit-logs")) return <AuditLogsSkeleton />;
  if (pathname.includes("/profile")) return <ProfileSkeleton />;
  if (pathname.includes("/settings")) return <SettingsSkeleton />;

  // Default fallback (Dashboard)
  return <DashboardSkeleton />;
};
