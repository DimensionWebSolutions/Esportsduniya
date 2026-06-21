import { DashboardLayout } from '@/layouts/PageLayouts';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Button } from '@/ui/button';
import { Link } from 'react-router-dom';

export default function FifaPage() {
  return (
    <DashboardLayout
      title="FIFA Hub"
      description="World Cup standings, bracket predictions, and tournament intelligence."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tournament standings</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted">
            FIFA standings and bracket data will appear here during active tournaments.
            For general football standings, visit the Standings page.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>AI predictions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted">
            <p>Lock predictions on live football matches in the Prediction Arena.</p>
            <Button asChild><Link to="/arena">Open Arena</Link></Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
