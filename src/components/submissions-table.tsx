
"use client";

import { Submission } from "@/app/(app)/trainer/submissions/page";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatDistanceToNow } from 'date-fns';
import { FileText, MessageSquare, Sparkles, User, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SubmissionsTableProps {
  submissions: Submission[];
  role: 'student' | 'trainer';
  pagination: {
    currentPage: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
}

export function SubmissionsTable({ submissions, role, pagination, onPageChange }: SubmissionsTableProps) {
  const router = useRouter();

  const getStatusBadge = (status: string, type?: string) => {
    if (!type && status === 'submitted') return <Badge variant="destructive">Unpaid</Badge>;
    if (status === 'completed') return <Badge variant="success">Completed</Badge>;
    if (type === 'ai') return <Badge variant="warning">Processing (AI)</Badge>;
    return <Badge variant="secondary">Pending (Trainer)</Badge>;
  };
  
  const getEvaluationType = (type?: string) => {
    if (!type) return <span className="text-muted-foreground">-</span>;
    const icon = type === 'ai' 
      ? <Sparkles className="w-4 h-4 text-amber-500" /> 
      : <User className="w-4 h-4 text-indigo-500" />;
    const text = type === 'ai' ? 'AI' : 'Trainer';
    return <div className="flex items-center gap-2">{icon} {text}</div>;
  }

  const handleActionClick = (submission: Submission) => {
    if (!submission.evaluationType && submission.status === 'submitted') {
      router.push(`/submissions/${submission.id}/evaluate`);
    } else {
      router.push(`/submissions/${submission.id}`);
    }
  };


  if (submissions.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed rounded-xl">
        <FileText className="mx-auto h-12 w-12 text-slate-400" />
        <h2 className="mt-4 text-xl font-semibold text-slate-700">No Submissions Found</h2>
        <p className="text-slate-500 mt-2 text-sm">
          No submissions match your current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile Card View */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
        {submissions.map(sub => (
          <Card key={sub.id} className="flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{sub.testTitle}</CardTitle>
                  <Link href={`/submissions/${sub.id}`}>
                    <div className="relative">
                      <MessageSquare className="h-5 w-5 text-muted-foreground" />
                      {sub.hasUnreadMessages && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                      )}
                    </div>
                  </Link>
              </div>
              {role === 'trainer' && <CardDescription>By: {sub.studentName}</CardDescription>}
            </CardHeader>
            <CardContent className="flex-grow space-y-3 text-sm">
                <div>
                   <span className="text-muted-foreground">Status: </span>
                   {getStatusBadge(sub.status, sub.evaluationType)}
                </div>
                 <div>
                   <span className="text-muted-foreground">Type: </span>
                   {getEvaluationType(sub.evaluationType)}
                </div>
                <div>
                    <span className="text-muted-foreground">Submitted: </span>
                    {formatDistanceToNow(sub.submittedAt.toDate(), { addSuffix: true })}
                </div>
            </CardContent>
            <CardFooter>
                 <Button className="w-full" size="sm" onClick={() => handleActionClick(sub)} variant={!sub.evaluationType ? 'default' : 'secondary'}>
                    {!sub.evaluationType ? 'Choose Evaluation & Pay' : 'View Feedback'} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block border rounded-lg overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Test Title</TableHead>
              {role === 'trainer' && <TableHead>Student</TableHead>}
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell className="font-medium">{sub.testTitle}</TableCell>
                {role === 'trainer' && <TableCell>{sub.studentName}</TableCell>}
                <TableCell>{formatDistanceToNow(sub.submittedAt.toDate(), { addSuffix: true })}</TableCell>
                <TableCell>{getStatusBadge(sub.status, sub.evaluationType)}</TableCell>
                <TableCell>{getEvaluationType(sub.evaluationType)}</TableCell>
                <TableCell className="text-right flex justify-end items-center gap-2">
                    <Link href={`/submissions/${sub.id}`}>
                      <div className="relative p-2">
                        <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        {sub.hasUnreadMessages && (
                           <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                          </span>
                        )}
                      </div>
                  </Link>
                  {role === 'student' && !sub.evaluationType ? (
                    <Button size="sm" onClick={() => handleActionClick(sub)}>
                      Choose Evaluation & Pay
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={`/submissions/${sub.id}`}>View</Link>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
       {/* Pagination Controls */}
      <div className="flex items-center justify-between pt-4">
        <Button 
          variant="outline" 
          onClick={() => onPageChange(pagination.currentPage - 1)} 
          disabled={pagination.currentPage === 1}
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {pagination.currentPage} of {pagination.totalPages}
        </span>
        <Button 
          variant="outline" 
          onClick={() => onPageChange(pagination.currentPage + 1)}
          disabled={pagination.currentPage >= pagination.totalPages}
        >
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

