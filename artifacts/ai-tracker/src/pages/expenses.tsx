import { useListExpenses } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Expenses() {
  const { data: expenses, isLoading } = useListExpenses();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : expenses && expenses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="whitespace-nowrap">{format(new Date(expense.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="font-medium">{expense.platformName || '-'}</TableCell>
                    <TableCell>{expense.projectName || '-'}</TableCell>
                    <TableCell>
                      {expense.category && <Badge variant="secondary">{expense.category}</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[200px]">{expense.description || '-'}</TableCell>
                    <TableCell className="text-right font-mono font-medium">${expense.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No expenses found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
