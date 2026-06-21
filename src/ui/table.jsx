import { cn } from '@/lib/utils';

export function Table({ className, ...props }) {
  return (
    <div className="w-full overflow-auto rounded-xl border border-border">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }) {
  return <thead className={cn('border-b border-border bg-surface-2 [&_tr]:border-0', className)} {...props} />;
}

export function TableBody({ className, ...props }) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TableRow({ className, ...props }) {
  return <tr className={cn('border-b border-border-subtle transition-colors hover:bg-surface-2/50', className)} {...props} />;
}

export function TableHead({ className, ...props }) {
  return (
    <th
      className={cn('h-11 px-4 text-left align-middle text-xs font-medium uppercase tracking-wider text-muted', className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }) {
  return <td className={cn('px-4 py-3 align-middle', className)} {...props} />;
}

export function DataTable({ columns, data, emptyMessage = 'No data' }) {
  if (!data?.length) {
    return (
      <div className="rounded-xl border border-border bg-surface-1 px-4 py-12 text-center text-sm text-muted">
        {emptyMessage}
      </div>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map(col => (
            <TableHead key={col.key} className={col.className}>{col.header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, i) => (
          <TableRow key={row.id ?? i}>
            {columns.map(col => (
              <TableCell key={col.key} className={col.className}>
                {col.render ? col.render(row) : row[col.key]}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
