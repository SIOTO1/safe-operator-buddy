import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  desc: string;
  detail: string;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}

const FeatureCard = ({ icon: Icon, title, desc, detail, index, expanded, onToggle }: FeatureCardProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      onClick={onToggle}
      className="group p-6 rounded-xl border border-border bg-card hover:shadow-[var(--card-hover-shadow)] transition-all duration-300 cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <Icon size={24} />
        </div>
        <motion.div
          animate={{ rotate: expanded ? 90 : 0 }}
          className="text-muted-foreground mt-1"
        >
          <ChevronRight size={18} />
        </motion.div>
      </div>
      <h3 className="font-display font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="pt-4 mt-4 border-t border-border space-y-3">
              <p className="text-sm text-foreground/80 leading-relaxed">{detail}</p>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/auth");
                }}
              >
                Get Started <ChevronRight size={14} />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FeatureCard;
