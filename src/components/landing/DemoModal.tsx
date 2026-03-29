import { Dialog, DialogContent } from "@/components/ui/dialog";

interface DemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DemoModal = ({ open, onOpenChange }: DemoModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-none">
        <div className="aspect-video w-full">
          <video
            src="/demo.mp4"
            controls
            autoPlay
            className="w-full h-full"
            onEnded={() => onOpenChange(false)}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DemoModal;
