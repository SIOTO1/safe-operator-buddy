import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronRight, MessageSquare, ClipboardCheck, FileText, BarChart3, Users, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

const showcaseSlides = [
  {
    icon: MessageSquare,
    title: "AI Safety Assistant",
    description: "Ask any safety question and get instant, SIOTO-approved answers. Our AI is trained on industry best practices for inflatable and event rental safety.",
    highlight: "Instant answers to complex safety scenarios",
  },
  {
    icon: ClipboardCheck,
    title: "Smart Checklists",
    description: "Interactive pre-delivery, setup, wind-check, and post-event checklists that adapt to your equipment and conditions. Never miss a critical step.",
    highlight: "Auto-generated based on weather & equipment",
  },
  {
    icon: FileText,
    title: "Contract Generator",
    description: "Create professional rental agreements with your branding in seconds. Includes liability waivers, damage policies, and e-signature support.",
    highlight: "E-sign ready with custom branding",
  },
  {
    icon: BarChart3,
    title: "Admin Dashboard",
    description: "Track crew activity, safety trends, compliance scores, and incident reports in real-time. Full visibility across your entire operation.",
    highlight: "Real-time compliance & safety tracking",
  },
  {
    icon: Users,
    title: "Crew Management",
    description: "Simplified interface for field crews with large buttons, quick guidance, and offline-ready checklists. Built for the job site, not the office.",
    highlight: "Designed for gloves-on, outdoor use",
  },
  {
    icon: BookOpen,
    title: "Knowledge Base",
    description: "Searchable library covering setup procedures, anchoring rules, electrical safety, state compliance, and more — always up to date.",
    highlight: "500+ guidelines across 10 categories",
  },
];

interface DemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DemoModal = ({ open, onOpenChange }: DemoModalProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">See SIOTO.AI in Action</DialogTitle>
          <p className="text-sm text-muted-foreground">Here's what your team gets access to on day one.</p>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {showcaseSlides.map((slide) => (
            <div
              key={slide.title}
              className="flex gap-4 p-4 rounded-xl border border-border bg-accent/30 hover:bg-accent/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <slide.icon size={20} className="text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display font-semibold">{slide.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{slide.description}</p>
                <span className="inline-block text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5 mt-1">
                  {slide.highlight}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center pt-4">
          <Button
            variant="default"
            size="lg"
            onClick={() => {
              onOpenChange(false);
              navigate("/auth");
            }}
          >
            Start Free Trial <ChevronRight size={18} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DemoModal;
