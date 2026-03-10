import { Lead, PIPELINE_STAGES } from "@/types/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Mail, Phone } from "lucide-react";

interface LeadCardProps {
  lead: Lead;
  onClick?: (lead: Lead) => void;
}

const LeadCard = ({ lead, onClick }: LeadCardProps) => {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-border"
      onClick={() => onClick?.(lead)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-semibold">{lead.name}</CardTitle>
          <Badge variant="secondary" className="text-xs capitalize">
            {lead.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 text-sm text-muted-foreground">
        {lead.company && (
          <div className="flex items-center gap-2">
            <Building2 size={14} />
            <span>{lead.company}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Mail size={14} />
          <span>{lead.email}</span>
        </div>
        {lead.phone && (
          <div className="flex items-center gap-2">
            <Phone size={14} />
            <span>{lead.phone}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeadCard;
