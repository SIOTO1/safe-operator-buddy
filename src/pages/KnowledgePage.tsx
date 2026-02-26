import { useState } from "react";
import { Search, BookOpen, ChevronRight, Shield, Wind, Zap, ClipboardCheck, FileText, Eye, Wrench, Video, Globe } from "lucide-react";
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
    { title: "Standard Bounce House Setup Procedure", preview: "Step-by-step guide for setting up residential bounce houses..." },
    { title: "Commercial Inflatable Setup Guide", preview: "For large commercial units including obstacle courses..." },
    { title: "Water Slide Setup Requirements", preview: "Special considerations for water inflatables..." },
  ],
  anchoring: [
    { title: "Grass & Dirt Anchoring (Stakes)", preview: "18\" minimum stake depth at 45° angle..." },
    { title: "Hard Surface Anchoring (Sandbags)", preview: "Weight requirements per unit size on concrete..." },
    { title: "Indoor Setup Anchoring", preview: "Sandbag-only anchoring for indoor events..." },
  ],
  wind: [
    { title: "Wind Speed Operating Limits", preview: "Safe operating ranges and emergency procedures..." },
    { title: "Using an Anemometer", preview: "Proper wind measurement techniques and tools..." },
    { title: "Severe Weather Action Plan", preview: "Steps to follow when weather turns dangerous..." },
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
          <p className="text-muted-foreground text-sm mt-1">Search SIOTO-approved safety guidelines</p>
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
