import { Users, Shield, UserPlus, Mail, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const crewMembers = [
  { name: "Mike Johnson", role: "Manager", email: "mike@example.com", status: "active", questionsToday: 12 },
  { name: "Sarah Williams", role: "Crew Member", email: "sarah@example.com", status: "active", questionsToday: 8 },
  { name: "James Davis", role: "Crew Member", email: "james@example.com", status: "active", questionsToday: 5 },
  { name: "Alex Rivera", role: "Crew Member", email: "alex@example.com", status: "inactive", questionsToday: 0 },
];

const roleColors: Record<string, string> = {
  "Owner/Admin": "bg-primary text-primary-foreground",
  Manager: "bg-accent text-accent-foreground",
  "Crew Member": "bg-muted text-muted-foreground",
};

const CrewPage = () => {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Crew Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage team members and access levels</p>
        </div>
        <Button>
          <UserPlus size={16} />
          Add Member
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left font-medium p-4">Name</th>
                <th className="text-left font-medium p-4">Role</th>
                <th className="text-left font-medium p-4 hidden sm:table-cell">Email</th>
                <th className="text-left font-medium p-4 hidden md:table-cell">Questions Today</th>
                <th className="text-left font-medium p-4">Status</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {crewMembers.map((m) => (
                <tr key={m.email} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold">
                        {m.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <span className="font-medium">{m.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", roleColors[m.role] || "bg-muted text-muted-foreground")}>
                      {m.role}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground hidden sm:table-cell">{m.email}</td>
                  <td className="p-4 hidden md:table-cell">{m.questionsToday}</td>
                  <td className="p-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-medium",
                      m.status === "active" ? "text-success" : "text-muted-foreground"
                    )}>
                      <span className={cn("w-2 h-2 rounded-full", m.status === "active" ? "bg-success" : "bg-muted-foreground")} />
                      {m.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <button className="text-muted-foreground hover:text-foreground">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CrewPage;
