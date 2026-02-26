import { useState, useRef, useEffect } from "react";
import { Send, Shield, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const quickQuestions = [
  "How to properly anchor an inflatable?",
  "What are the wind speed limits?",
  "Sandbag requirements for a 15x15?",
  "Extension cord guidelines",
  "Can I set up on concrete?",
  "Takedown procedure steps",
];

const mockResponses: Record<string, string> = {
  "anchor": "**Anchoring Guidelines (SIOTO-Approved)**\n\n1. **Grass/Dirt:** Use minimum 18\" steel stakes at each anchor point at a 45° angle\n2. **Concrete/Asphalt:** Use 40lb sandbags per anchor point minimum\n3. **Indoor:** Use sandbags — never stakes indoors\n\n⚠️ **Every anchor point must be secured** — no exceptions.\n\n🔗 *Reference: SIOTO Anchoring Rules v3.2*",
  "wind": "**Wind Safety Limits (SIOTO-Approved)**\n\n- ✅ **0-15 mph:** Safe to operate\n- ⚠️ **15-20 mph:** Monitor closely, prepare to deflate\n- 🛑 **20+ mph:** **Immediately deflate and secure**\n\n📋 Use the Wind Check Log after each measurement.\n\n*Always check hourly during events. Use an anemometer — do not estimate.*",
  "sandbag": "**Sandbag Requirements**\n\n| Unit Size | Min. Sandbags Per Point |\n|-----------|------------------------|\n| 10x10 | 35 lbs |\n| 13x13 | 40 lbs |\n| 15x15 | 50 lbs |\n| 20x20 | 60+ lbs |\n\n⚠️ These are **minimums**. Add weight for windy conditions.\n\n*Reference: SIOTO Anchoring Rules*",
  "extension": "**Extension Cord Guidelines**\n\n1. Use **12-gauge** minimum for runs under 50ft\n2. Use **10-gauge** for runs 50-100ft\n3. **Never exceed 100ft** total cord length\n4. Cords must be **outdoor rated** and **GFCI protected**\n5. No daisy-chaining multiple cords\n6. Cover cords with **cord ramps** in pedestrian areas\n\n⚡ *Reference: SIOTO Electrical Safety Guide*",
  "concrete": "**Surface Restrictions**\n\n✅ **Approved surfaces:** Grass, dirt, sand, rubber playground surface\n⚠️ **Conditional:** Concrete, asphalt (requires sandbags, protective tarp)\n🛑 **Not recommended:** Wet surfaces, slopes >5°, near pools\n\nFor concrete setups:\n- Place a **ground tarp** under the unit\n- Use **sandbags** (not stakes) at every anchor point\n- Check for **drainage issues**",
  "takedown": "**Takedown Procedure (SIOTO-Approved)**\n\n1. ✅ Ensure all riders have exited\n2. ✅ Turn off and disconnect blower\n3. ✅ Open deflation zippers/flaps\n4. ✅ Remove all stakes/sandbags\n5. ✅ Squeeze out remaining air\n6. ✅ Clean unit surface\n7. ✅ Fold toward the blower tube\n8. ✅ Roll tightly and secure with straps\n9. ✅ Complete Post-Event Inspection checklist\n\n📝 *Log takedown in the event record.*",
};

function getResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("anchor") || lower.includes("stake")) return mockResponses.anchor;
  if (lower.includes("wind") || lower.includes("speed")) return mockResponses.wind;
  if (lower.includes("sandbag") || lower.includes("weight")) return mockResponses.sandbag;
  if (lower.includes("cord") || lower.includes("extension") || lower.includes("electric")) return mockResponses.extension;
  if (lower.includes("concrete") || lower.includes("surface") || lower.includes("asphalt")) return mockResponses.concrete;
  if (lower.includes("takedown") || lower.includes("take down") || lower.includes("deflat")) return mockResponses.takedown;
  return "I can help with safety questions about inflatable setup, anchoring, wind limits, electrical safety, surfaces, and takedown procedures. Try asking about one of these topics!\n\n*Powered by SIOTO.AI Knowledge Base*";
}

const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate AI delay
    setTimeout(() => {
      const response = getResponse(text);
      setMessages(prev => [...prev, { role: "assistant", content: response }]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Shield className="text-primary" size={32} />
            </div>
            <h2 className="text-2xl font-display font-bold mb-2">SIOTO.AI Safety Assistant</h2>
            <p className="text-muted-foreground mb-8">
              Ask any safety question about inflatable setup, anchoring, wind limits, and more.
            </p>
            <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left p-3 rounded-lg border border-border bg-card hover:border-primary hover:shadow-sm transition-all text-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}>
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  msg.role === "assistant" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                )}>
                  {msg.role === "assistant" ? <Shield size={16} /> : <User size={16} />}
                </div>
                <div className={cn(
                  "rounded-xl px-4 py-3 max-w-[80%] text-sm leading-relaxed",
                  msg.role === "assistant" ? "bg-card border border-border" : "bg-primary text-primary-foreground"
                )}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none prose-headings:font-display prose-strong:text-foreground">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                  <Shield size={16} />
                </div>
                <div className="rounded-xl px-4 py-3 bg-card border border-border">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-4 bg-card">
        <div className="max-w-3xl mx-auto flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Ask a safety question..."
            className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button onClick={() => sendMessage(input)} size="icon" className="h-11 w-11 rounded-xl">
            <Send size={18} />
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
          <Sparkles size={12} /> Powered by SIOTO-approved safety guidelines
        </p>
      </div>
    </div>
  );
};

export default ChatPage;
