
"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { DateRange } from "react-day-picker";
import { subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DateRangePicker } from '@/components/date-range-picker';
import { SalesDataTable } from '@/components/sales-data-table';
import { DollarSign, Package, Users, ShoppingCart } from 'lucide-react';

interface Transaction {
    id: string;
    studentId: string;
    studentName: string;
    planName: string;
    amount: number;
    createdAt: Timestamp;
}

interface Sale extends Transaction {}

interface MonthlyRevenue {
    month: string;
    revenue: number;
}

interface PlanSale {
    name: string;
    count: number;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00c49f'];

export default function SalesDashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const [sales, setSales] = useState<Sale[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 29),
        to: new Date(),
    });

    const fetchSales = useCallback(async () => {
        if (!user || !dateRange?.from || !dateRange?.to) return;
        setIsLoading(true);
        try {
            const allPurchasesQuery = query(
                collection(db, 'credit_transactions'),
                where('type', '==', 'purchase')
            );

            const purchasesSnapshot = await getDocs(allPurchasesQuery);
            const allPurchases = purchasesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as any[];

            const studentsQuery = query(collection(db, 'users'), where('assignedTrainerId', '==', user.uid));
            const studentsSnapshot = await getDocs(studentsQuery);
            const trainerStudentIds = new Set(studentsSnapshot.docs.map(doc => doc.id));
            const studentMap = new Map(studentsSnapshot.docs.map(doc => [doc.id, doc.data().name || 'Unknown Student']));

            const fromTimestamp = Timestamp.fromDate(dateRange.from);
            const toTimestamp = Timestamp.fromDate(dateRange.to);

            const filteredSales = allPurchases
                .filter(p => trainerStudentIds.has(p.studentId) && p.createdAt >= fromTimestamp && p.createdAt <= toTimestamp)
                .map(p => ({
                    ...p,
                    studentName: studentMap.get(p.studentId) || 'Unknown Student',
                    planName: p.description.replace('Purchased: ', '').replace('Manual payment confirmed for ', ''),
                    amount: p.amount > 0 ? p.amount : 0, // Assuming sales are positive values, but the field is amount
                })) as Sale[];

            setSales(filteredSales.sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis()));

        } catch (error) {
            console.error("Error fetching sales data: ", error);
        } finally {
            setIsLoading(false);
        }
    }, [user, dateRange]);


    useEffect(() => {
        if (!authLoading) {
            fetchSales();
        }
    }, [authLoading, fetchSales]);

    const analytics = useMemo(() => {
        const totalRevenue = sales.reduce((acc, sale) => acc + (sale.amount / 100), 0); // Assuming amount is in cents
        const totalPlansSold = sales.length;
        
        const uniqueCustomers = new Set(sales.map(s => s.studentId));
        const newCustomers = uniqueCustomers.size; // Simple version for now

        const monthlyRevenue: MonthlyRevenue[] = sales.reduce((acc, sale) => {
            const month = sale.createdAt.toDate().toLocaleString('default', { month: 'short', year: '2-digit' });
            const existingMonth = acc.find(m => m.month === month);
            if (existingMonth) {
                existingMonth.revenue += sale.amount / 100;
            } else {
                acc.push({ month, revenue: sale.amount / 100 });
            }
            return acc;
        }, [] as MonthlyRevenue[]);

        const planSales: PlanSale[] = sales.reduce((acc, sale) => {
            const existingPlan = acc.find(p => p.name === sale.planName);
            if (existingPlan) {
                existingPlan.count += 1;
            } else {
                acc.push({ name: sale.planName, count: 1 });
            }
            return acc;
        }, [] as PlanSale[]);


        return {
            totalRevenue,
            totalPlansSold,
            newCustomers,
            avgRevenuePerStudent: newCustomers > 0 ? totalRevenue / newCustomers : 0,
            monthlyRevenue: monthlyRevenue.reverse(),
            planSales,
        };
    }, [sales]);

    if (authLoading) return <div className="p-8"><Skeleton className="h-screen w-full" /></div>;

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-slate-800">Sales Dashboard</h1>
                <DateRangePicker date={dateRange} onDateChange={setDateRange} />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Revenue" value={`$${analytics.totalRevenue.toFixed(2)}`} icon={<DollarSign className="text-green-500" />} isLoading={isLoading} />
                <StatCard title="Plans Sold" value={analytics.totalPlansSold} icon={<ShoppingCart className="text-indigo-500" />} isLoading={isLoading} />
                <StatCard title="New Customers" value={analytics.newCustomers} icon={<Users className="text-sky-500" />} isLoading={isLoading} />
                <StatCard title="Avg. Revenue" value={`$${analytics.avgRevenuePerStudent.toFixed(2)}`} icon={<Package className="text-amber-500" />} isLoading={isLoading} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Card className="lg:col-span-3">
                    <CardHeader><CardTitle>Revenue Over Time</CardTitle></CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={analytics.monthlyRevenue}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                                    <Legend />
                                    <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle>Top Selling Plans</CardTitle></CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-[300px] w-full" /> : analytics.planSales.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={analytics.planSales} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                        {analytics.planSales.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value, name) => [`${value} sales`, name]} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                             <div className="h-[300px] flex items-center justify-center text-muted-foreground">No plan sales data for this period.</div>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader><CardTitle>Recent Sales</CardTitle></CardHeader>
                <CardContent>
                    <SalesDataTable data={sales} isLoading={isLoading}/>
                </CardContent>
            </Card>
        </div>
    );
}


function StatCard({ title, value, icon, isLoading }: { title: string; value: string | number; icon: React.ReactNode; isLoading: boolean }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{value}</div>}
            </CardContent>
        </Card>
    );
}
