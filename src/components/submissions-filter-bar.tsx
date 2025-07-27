
"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Student } from "@/app/(app)/trainer/submissions/page";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "./ui/card";
import { Search } from "lucide-react";

interface SubmissionsFilterBarProps {
  students: Student[];
  filters: {
    status: string;
    student: string;
    evaluationType: string;
    search: string;
    needsAttention: boolean;
  };
  onFiltersChange: React.Dispatch<React.SetStateAction<any>>;
  onNeedsAttentionToggle: (checked: boolean) => void;
}

export function SubmissionsFilterBar({ students, filters, onFiltersChange, onNeedsAttentionToggle }: SubmissionsFilterBarProps) {
  
  const handleInputChange = (field: string, value: string) => {
    onFiltersChange((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
     <Card>
        <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by test title..."
                        value={filters.search}
                        onChange={(e) => handleInputChange('search', e.target.value)}
                        className="pl-10"
                        disabled={filters.needsAttention}
                    />
                </div>
                
                <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={filters.status} onValueChange={(value) => handleInputChange('status', value)} disabled={filters.needsAttention}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="submitted">Pending</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Student</Label>
                    <Select value={filters.student} onValueChange={(value) => handleInputChange('student', value)} disabled={students.length === 0 || filters.needsAttention}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Students</SelectItem>
                            {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Evaluation Type</Label>
                    <Select value={filters.evaluationType} onValueChange={(value) => handleInputChange('evaluationType', value)} disabled={filters.needsAttention}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="ai">AI</SelectItem>
                            <SelectItem value="manual">Trainer</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="flex items-center space-x-2 lg:col-start-4 justify-self-end">
                    <Switch
                        id="needs-attention"
                        checked={filters.needsAttention}
                        onCheckedChange={onNeedsAttentionToggle}
                    />
                    <Label htmlFor="needs-attention">Needs Attention</Label>
                </div>
            </div>
        </CardContent>
    </Card>
  );
}
