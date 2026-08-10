import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral da sua clínica.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Bem-vindo ao FisioTrainer</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Os próximos módulos (pacientes, consultas, agenda) serão
          adicionados aqui.
        </CardContent>
      </Card>
    </div>
  );
}
