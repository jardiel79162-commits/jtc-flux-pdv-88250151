import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift, Loader2, Save, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const DAYS_OF_WEEK = [
  { value: "0", label: "Domingo" },
  { value: "1", label: "Segunda-feira" },
  { value: "2", label: "Terça-feira" },
  { value: "3", label: "Quarta-feira" },
  { value: "4", label: "Quinta-feira" },
  { value: "5", label: "Sexta-feira" },
  { value: "6", label: "Sábado" },
];

const formatTimeLabel = (hour: number, minute: number) => {
  const h = String(hour).padStart(2, "0");
  const m = String(minute).padStart(2, "0");
  const period = hour < 12 ? "da manhã" : hour < 18 ? "da tarde" : "da noite";
  return `${h}:${m} (${period})`;
};

export default function AdminRedemption() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eventDay, setEventDay] = useState("1");
  const [eventHour, setEventHour] = useState("16");
  const [eventMinute, setEventMinute] = useState("0");
  const [eventDuration, setEventDuration] = useState("60");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings_global")
        .select("redemption_event_day, redemption_event_hour, redemption_event_minute, redemption_event_duration")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setEventDay(String((data as any).redemption_event_day ?? 1));
        setEventHour(String((data as any).redemption_event_hour ?? 16));
        setEventMinute(String((data as any).redemption_event_minute ?? 0));
        setEventDuration(String((data as any).redemption_event_duration ?? 60));
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("system_settings_global")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (!existing) throw new Error("Configuração global não encontrada");

      const { error } = await supabase
        .from("system_settings_global")
        .update({
          redemption_event_day: parseInt(eventDay),
          redemption_event_hour: parseInt(eventHour),
          redemption_event_minute: parseInt(eventMinute),
          redemption_event_duration: parseInt(eventDuration),
        } as any)
        .eq("id", existing.id);

      if (error) throw error;

      toast({
        title: "Configurações salvas!",
        description: `Evento: ${DAYS_OF_WEEK.find(d => d.value === eventDay)?.label} às ${eventHour}:00 (${eventDuration} min)`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gift className="w-6 h-6 text-primary" />
          Presente Misterioso
        </h1>
        <p className="text-muted-foreground">Configure o dia, horário e duração do evento de resgate semanal.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Configurações do Evento
          </CardTitle>
          <CardDescription>
            Defina quando o presente misterioso ficará disponível para os usuários.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="font-semibold">Dia da Semana</Label>
              <Select value={eventDay} onValueChange={setEventDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">Hora de Início</Label>
              <Select value={eventHour} onValueChange={setEventHour}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {String(i).padStart(2, "0")}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">Duração (minutos)</Label>
              <Input
                type="number"
                min={10}
                max={1440}
                value={eventDuration}
                onChange={(e) => setEventDuration(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 border">
            <p className="text-sm font-medium text-foreground mb-1">Resumo:</p>
            <p className="text-sm text-muted-foreground">
              O presente misterioso será liberado toda{" "}
              <strong className="text-primary">
                {DAYS_OF_WEEK.find(d => d.value === eventDay)?.label}
              </strong>{" "}
              às{" "}
              <strong className="text-primary">
                {String(eventHour).padStart(2, "0")}:00
              </strong>{" "}
              (horário de Brasília), com duração de{" "}
              <strong className="text-primary">{eventDuration} minutos</strong>.
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
