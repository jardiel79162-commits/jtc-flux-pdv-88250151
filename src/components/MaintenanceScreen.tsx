import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MaintenanceScreenProps {
  message: string;
  imageUrl?: string | null;
  onLogout?: () => void;
}

export default function MaintenanceScreen({ message, imageUrl, onLogout }: MaintenanceScreenProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md space-y-6">
        {imageUrl ? (
          <img src={imageUrl} alt="Manutenção" className="w-32 h-32 mx-auto object-contain" />
        ) : (
          <Shield className="w-20 h-20 mx-auto text-primary" />
        )}
        <h1 className="text-2xl font-bold">Sistema em Manutenção</h1>
        <p className="text-muted-foreground">
          {message || "Sistema temporariamente em manutenção. Voltaremos em breve."}
        </p>
        {onLogout && (
          <Button variant="outline" onClick={onLogout}>
            Sair
          </Button>
        )}
      </div>
    </div>
  );
}
