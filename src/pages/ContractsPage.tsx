import { useState } from "react";
import { FileText, Download, Calendar, MapPin, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const ContractsPage = () => {
  const [formData, setFormData] = useState({
    customerName: "",
    eventType: "",
    numberOfUnits: "1",
    date: "",
    location: "",
    setupTime: "",
    takedownTime: "",
  });
  const [generated, setGenerated] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = () => {
    if (!formData.customerName || !formData.eventType || !formData.date) return;
    setGenerated(true);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Contract Generator</h1>
        <p className="text-muted-foreground text-sm mt-1">Create rental agreements with SIOTO branding</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 max-w-5xl">
        {/* Form */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-display font-semibold text-lg">Event Details</h2>

            {[
              { label: "Customer Name", field: "customerName", icon: User, type: "text", placeholder: "John Smith" },
              { label: "Event Type", field: "eventType", icon: FileText, type: "text", placeholder: "Birthday Party, Corporate Event..." },
              { label: "Number of Units", field: "numberOfUnits", icon: FileText, type: "number", placeholder: "1" },
              { label: "Event Date", field: "date", icon: Calendar, type: "date", placeholder: "" },
              { label: "Location", field: "location", icon: MapPin, type: "text", placeholder: "123 Main St, City, State" },
              { label: "Setup Time", field: "setupTime", icon: Clock, type: "time", placeholder: "" },
              { label: "Takedown Time", field: "takedownTime", icon: Clock, type: "time", placeholder: "" },
            ].map((f) => (
              <div key={f.field}>
                <label className="text-sm font-medium mb-1.5 block">{f.label}</label>
                <div className="relative">
                  <f.icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={f.type}
                    value={formData[f.field as keyof typeof formData]}
                    onChange={e => handleChange(f.field, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            ))}

            <Button onClick={handleGenerate} className="w-full" size="lg">
              <FileText size={18} />
              Generate Contract
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div>
          {generated ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border-2 border-primary/20 bg-card p-8 space-y-6"
            >
              <div className="text-center border-b border-border pb-6">
                <h2 className="font-display font-bold text-xl text-primary">SIOTO.AI</h2>
                <p className="text-xs text-muted-foreground">Safety & Operations</p>
                <h3 className="font-display font-bold text-lg mt-4">RENTAL AGREEMENT</h3>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium">{formData.customerName}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Event Type</span>
                  <span className="font-medium">{formData.eventType}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Units</span>
                  <span className="font-medium">{formData.numberOfUnits}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{formData.date}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium">{formData.location}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Setup</span>
                  <span className="font-medium">{formData.setupTime}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Takedown</span>
                  <span className="font-medium">{formData.takedownTime}</span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground border-t border-border pt-4 space-y-2">
                <p>By signing below, the customer agrees to the SIOTO safety guidelines and rental terms.</p>
                <div className="flex justify-between pt-4">
                  <div className="border-b border-foreground w-40 pb-1 text-center text-xs">Customer Signature</div>
                  <div className="border-b border-foreground w-40 pb-1 text-center text-xs">Date</div>
                </div>
              </div>

              <Button variant="outline" className="w-full">
                <Download size={16} />
                Download PDF
              </Button>
            </motion.div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <FileText size={48} className="text-muted-foreground/30 mb-4" />
              <h3 className="font-display font-semibold text-muted-foreground">Contract Preview</h3>
              <p className="text-sm text-muted-foreground/60 mt-1">Fill in the form to generate a contract</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractsPage;
