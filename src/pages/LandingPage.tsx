import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, ClipboardCheck, FileText, Users, BarChart3, ChevronRight, Zap, BookOpen } from "lucide-react";
import ShieldLogo from "@/components/ShieldLogo";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import DemoModal from "@/components/landing/DemoModal";
import FeatureCard from "@/components/landing/FeatureCard";
import KnowledgeCategories from "@/components/landing/KnowledgeCategories";

const features = [
  { icon: MessageSquare, title: "AI Safety Assistant", desc: "Get instant answers to safety questions using SIOTO-approved guidelines.", detail: "Powered by AI trained on thousands of industry-specific safety scenarios. Ask about anchoring in high winds, electrical clearance distances, or age-appropriate equipment — and get a clear, actionable answer in seconds." },
  { icon: ClipboardCheck, title: "Smart Checklists", desc: "Interactive pre-delivery, setup, wind check, and post-event checklists.", detail: "Checklists auto-adapt to your equipment type, weather conditions, and venue. Crew members check off items on their phone, and supervisors see completion status in real-time." },
  { icon: FileText, title: "Contract Generator", desc: "Create professional rental agreements with custom branding in seconds.", detail: "Choose from industry-standard templates, add your logo and terms, and send for e-signature. Includes liability waivers, damage clauses, and weather cancellation policies." },
  { icon: Users, title: "Crew Mode", desc: "Simplified interface with large buttons and quick guidance for field crews.", detail: "Designed for outdoor use with gloves. Large tap targets, high-contrast text, and offline-ready checklists so your crew stays safe even without cell service." },
  { icon: BookOpen, title: "Knowledge Base", desc: "Searchable library of setup procedures, anchoring rules, and compliance.", detail: "Over 500 guidelines across 10 safety categories — from state-by-state compliance requirements to manufacturer-specific setup procedures. Always current." },
  { icon: BarChart3, title: "Admin Dashboard", desc: "Track users, questions, risk trends, and compliance in real-time.", detail: "See which questions your crew asks most, identify training gaps, monitor checklist completion rates, and generate compliance reports for insurance providers." },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-border shadow-sm">
        <div className="container flex items-center justify-between h-16">
          <ShieldLogo size={48} />
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#knowledge" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Knowledge Base</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/auth")}>Log In</Button>
            <Button onClick={() => navigate("/auth")}>Get Started</Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-hero pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary blur-[120px]" />
          <div className="absolute bottom-10 right-20 w-96 h-96 rounded-full bg-primary blur-[150px]" />
        </div>
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 bg-primary/20 text-primary-foreground/90 rounded-full px-4 py-1.5 text-sm font-medium mb-6 border border-primary/30">
              <Zap size={14} />
              AI-Powered Safety & Operations
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-secondary-foreground leading-tight mb-6">
              Your Crew's Safety.{" "}
              <span className="text-gradient-shield">Automated.</span>
            </h1>
            <p className="text-lg md:text-xl text-secondary-foreground/60 mb-10 max-w-2xl mx-auto leading-relaxed">
              SIOTO.AI is the AI safety assistant built for inflatable and event rental operators. 
              Instant answers, smart checklists, and compliance — all in one platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="hero" onClick={() => navigate("/auth")}>
                Start Free Trial <ChevronRight size={18} />
              </Button>
              <Button variant="hero-outline" onClick={() => setDemoOpen(true)}>
                Watch Demo
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="grid grid-cols-3 gap-8 max-w-xl mx-auto mt-16"
          >
            {[
              { value: "10+", label: "Safety Categories" },
              { value: "500+", label: "Guidelines" },
              { value: "24/7", label: "AI Availability" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-display font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-secondary-foreground/50 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Everything Your Operation Needs
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From AI-powered answers to automated checklists, SIOTO.AI keeps your crew safe and your business compliant.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <FeatureCard
                key={f.title}
                icon={f.icon}
                title={f.title}
                desc={f.desc}
                detail={f.detail}
                index={i}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Knowledge Base Categories */}
      <section id="knowledge" className="py-24 bg-secondary/5">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Comprehensive Knowledge Base
            </h2>
            <p className="text-muted-foreground text-lg">
              10 categories of SIOTO-approved safety guidelines, always up to date.
            </p>
          </div>
          <KnowledgeCategories />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Simple Pricing</h2>
            <p className="text-muted-foreground text-lg">Choose the plan that fits your operation.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {[
              { name: "Starter", price: "$19", features: ["AI Safety Assistant", "Basic Checklists", "Knowledge Base Access", "1 Crew Member"] },
              { name: "Pro", price: "$59", features: ["Everything in Starter", "Unlimited Crew", "Contract Generator", "Admin Dashboard", "Priority Support"], popular: true },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative p-8 rounded-2xl border-2 ${plan.popular ? "border-primary bg-accent/30" : "border-border bg-card"}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="font-display font-bold text-2xl mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-display font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <ChevronRight size={14} className="text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant={plan.popular ? "default" : "outline"} size="lg">
                  Get Started
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-hero py-20">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-secondary-foreground mb-4">
            Ready to protect your crew?
          </h2>
          <p className="text-secondary-foreground/60 text-lg mb-8 max-w-xl mx-auto">
            Join operators who trust SIOTO.AI to keep their events safe and compliant.
          </p>
          <Button variant="hero" onClick={() => navigate("/auth")}>
            Start Your Free Trial <ChevronRight size={18} />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <ShieldLogo size={20} />
          <p className="text-xs text-muted-foreground">© 2026 SIOTO.AI. All rights reserved.</p>
        </div>
      </footer>

      <DemoModal open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
};

export default LandingPage;
