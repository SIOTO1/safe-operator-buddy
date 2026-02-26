import { useState } from "react";
import { Search, BookOpen, ChevronRight, Shield, Wind, Zap, ClipboardCheck, FileText, Eye, Wrench, Video, Globe, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const categories = [
  { id: "setup", icon: Wrench, label: "Setup Procedures", count: 24, color: "text-primary" },
  { id: "takedown", icon: ClipboardCheck, label: "Takedown Procedures", count: 18, color: "text-primary" },
  { id: "anchoring", icon: Shield, label: "Anchoring Rules", count: 15, color: "text-primary" },
  { id: "wind", icon: Wind, label: "Wind & Weather", count: 12, color: "text-primary" },
  { id: "electrical", icon: Zap, label: "Electrical Safety", count: 10, color: "text-primary" },
  { id: "inspection", icon: Eye, label: "Inspection Protocols", count: 22, color: "text-primary" },
  { id: "tips", icon: BookOpen, label: "Safety Tip Guides", count: 30, color: "text-primary" },
  { id: "clips", icon: Video, label: "Smart Clips", count: 8, color: "text-primary" },
  { id: "contracts", icon: FileText, label: "Rental Agreement Templates", count: 5, color: "text-primary" },
  { id: "compliance", icon: Globe, label: "State Compliance Rules", count: 50, color: "text-primary" },
];

const sampleArticles: Record<string, { title: string; preview: string }[]> = {
  setup: [
    { title: "Standard Bounce House Setup Procedure", preview: "Step-by-step guide for setting up residential bounce houses. Always follow your manufacturer's specific instructions." },
    { title: "Commercial Inflatable Setup Guide", preview: "For large commercial units including obstacle courses. Anchoring and electrical requirements vary by manufacturer." },
    { title: "Water Slide Setup Requirements", preview: "Special considerations for water inflatables including drainage, water supply, and slip-prevention measures." },
  ],
  anchoring: [
    { title: "Grass & Dirt Anchoring (Stakes)", preview: "Steel stakes driven at 45° angle. Stake length and depth per your manufacturer's specifications for the specific unit." },
    { title: "Hard Surface Anchoring (Sandbags)", preview: "Sandbag weight requirements vary by unit size, type, and manufacturer. Always consult your unit's manual for exact weights." },
    { title: "Indoor Setup Anchoring", preview: "Sandbag-only anchoring for indoor events. Weight requirements per manufacturer specifications." },
  ],
  wind: [
    { title: "Wind Speed Operating Limits", preview: "General guideline: 15-20 mph monitor closely, 20+ mph deflate immediately. Some manufacturers set stricter limits." },
    { title: "Using an Anemometer", preview: "Proper wind measurement techniques and tools for accurate on-site wind speed monitoring." },
    { title: "Severe Weather Action Plan", preview: "Steps to follow when weather turns dangerous. Have a written plan before every event." },
  ],
  electrical: [
    { title: "Extension Cord Selection Guide", preview: "Cord gauge requirements depend on run length and blower amperage. Consult your blower manufacturer's specifications." },
    { title: "GFCI Protection Requirements", preview: "All outdoor electrical connections must be GFCI-protected. Never daisy-chain extension cords." },
    { title: "Blower Electrical Requirements", preview: "Amperage, voltage, and dedicated circuit requirements vary by blower model. Always check your blower's nameplate." },
  ],
  inspection: [
    { title: "Pre-Event Inspection Checklist", preview: "Check seams, anchor loops, blower tubes, netting, and vinyl for damage before every setup." },
    { title: "During-Event Monitoring Protocol", preview: "Monitor occupancy, rider behavior, and wind conditions at regular intervals throughout the event." },
    { title: "Post-Event Inspection & Documentation", preview: "Document equipment condition after every event. Note any repairs needed for maintenance tracking." },
  ],
};

const KnowledgePage = () => {
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const filtered = categories.filter(c =>
    c.label.toLowerCase().includes(search.toLowerCase())
  );

  const articles = selectedCat ? (sampleArticles[selectedCat] || [
    { title: "Coming Soon", preview: "Articles for this category are being prepared..." },
  ]) : [];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground text-sm mt-1">SIOTO safety guidelines — always verify with your manufacturer's specs</p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-orange-500/30 bg-orange-500/5 max-w-3xl">
        <AlertTriangle size={20} className="text-orange-500 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-foreground">Important Disclaimer</p>
          <p className="text-muted-foreground mt-1">
            These are general safety guidelines. Specific requirements (sandbag weights, stake dimensions, electrical specs, occupancy limits)
            <strong className="text-foreground"> vary by manufacturer, unit type, and unit size</strong>. Always follow your manufacturer's recommendations and local regulations.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search categories, articles, procedures..."
          className="w-full rounded-xl border border-input bg-card pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {!selectedCat ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((cat, i) => (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedCat(cat.id)}
              className="text-left p-5 rounded-xl border border-border bg-card hover:border-primary hover:shadow-sm transition-all group"
            >
              <cat.icon size={24} className={cat.color} />
              <h3 className="font-display font-semibold mt-3 mb-1">{cat.label}</h3>
              <p className="text-xs text-muted-foreground">{cat.count} articles</p>
              <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary mt-2 transition-colors" />
            </motion.button>
          ))}
        </div>
      ) : (
        <div>
          <button
            onClick={() => setSelectedCat(null)}
            className="text-sm text-primary font-medium mb-4 flex items-center gap-1 hover:underline"
          >
            ← Back to Categories
          </button>
          <h2 className="text-xl font-display font-bold mb-4">
            {categories.find(c => c.id === selectedCat)?.label}
          </h2>
          <div className="space-y-3">
            {articles.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-4 rounded-xl border border-border bg-card hover:border-primary transition-colors cursor-pointer"
              >
                <h3 className="font-semibold text-sm mb-1">{a.title}</h3>
                <p className="text-xs text-muted-foreground">{a.preview}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgePage;
