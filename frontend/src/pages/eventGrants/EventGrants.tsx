import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatAmount, formatShortDate } from '../../lib/utils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/ui/Table';
import { Calendar, Eye, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function EventGrants() {
  const navigate = useNavigate();

  const { data: events, isLoading } = useQuery({
    queryKey: ['event-grants'],
    queryFn: () => api.get<any[]>('/event-grants'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Event grants</h1>
          <p className="text-[var(--text-secondary)]">
            Track Superteam event grants: amount received, spendings, and proof (location, Luma/Creatix, attendees).
          </p>
        </div>
        <Button onClick={() => navigate('/event-grants/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Create event grant
        </Button>
      </div>

      <Card>
        {events && events.length > 0 ? (
          <Table>
            <TableHeader>
              <TableHead>Event</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount received</TableHead>
              <TableHead></TableHead>
            </TableHeader>
            <TableBody>
              {events.map((ev: any) => (
                <TableRow key={ev.id}>
                  <TableCell>
                    <p className="font-medium text-[var(--text-primary)]">{ev.title}</p>
                    {ev.location && (
                      <p className="text-sm text-[var(--text-muted)]">{ev.location}</p>
                    )}
                  </TableCell>
                  <TableCell>{formatShortDate(ev.eventDate)}</TableCell>
                  <TableCell>{formatAmount(ev.amountReceived, ev.currency || 'USDC')}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/event-grants/${ev.id}`)}
                    >
                      View <Eye className="w-4 h-4 ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-16">
            <Calendar className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No event grants yet</h3>
            <p className="text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
              Create an event grant to track the amount received from Superteam, add spendings (venue, food, travel, etc.), and provide proof (location, Luma/Creatix links, attendees).
            </p>
            <Button onClick={() => navigate('/event-grants/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Create your first event grant
            </Button>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
