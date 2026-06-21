import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/ui/dialog';
import AuthGate from '@/components/AuthGate.jsx';

export function AuthModal({ open, onOpenChange, onSuccess }) {
  const handleSuccess = () => {
    onSuccess?.();
    onOpenChange(false);
    document.dispatchEvent(new CustomEvent('esd:login-success'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sign in to Esportsduniya</DialogTitle>
          <DialogDescription>
            Access predictions, fan points, and personalized sports intelligence.
          </DialogDescription>
        </DialogHeader>
        <AuthGate onLoginSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
