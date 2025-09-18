import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, Phone, TrendingUp } from 'lucide-react';

export const DashboardStats = () => {
  const stats = [
    {
      title: 'Total Candidates',
      value: '248',
      change: '+12%',
      icon: Users,
      color: 'text-primary',
    },
    {
      title: 'Scheduled Interviews',
      value: '18',
      change: '+8%',
      icon: Calendar,
      color: 'text-success',
    },
    {
      title: 'Voice Calls Today',
      value: '5',
      change: '+2%',
      icon: Phone,
      color: 'text-warning',
    },
    {
      title: 'Hire Rate',
      value: '24%',
      change: '+5%',
      icon: TrendingUp,
      color: 'text-success',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="transition-all duration-200 hover:shadow-md hover:bg-card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            <p className="text-xs text-success">
              {stat.change} from last month
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};