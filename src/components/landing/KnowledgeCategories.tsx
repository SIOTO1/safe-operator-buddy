import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const categories = [
  "Setup Procedures", "Takedown Procedures", "Anchoring Rules",
  "Wind & Weather", "Electrical Safety", "Inspection Protocols",
  "Safety Tip Guides", "Smart Clips", "Rental Agreements", "State Compliance",
];

const KnowledgeCategories = () => {
  const navigate = useNavigate();

  const handleClick = (category: string) => {
    toast(`Sign up to access our full "${category}" library`, {
      action: {
        label: "Sign Up",
        onClick: () => navigate("/auth"),
      },
    });
    navigate("/auth");
  };

  return (
    <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
      {categories.map((cat) => (
        <motion.button
          key={cat}
          whileHover={{ scale: 1.05 }}
          onClick={() => handleClick(cat)}
          className="px-5 py-2.5 rounded-full border border-border bg-card font-medium text-sm cursor-pointer hover:border-primary hover:text-primary transition-colors"
        >
          {cat}
        </motion.button>
      ))}
    </div>
  );
};

export default KnowledgeCategories;
