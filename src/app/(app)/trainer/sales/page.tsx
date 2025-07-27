
"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp, collectionGroup } from 'firebase/firestore';
import { DateRange } from "react-day-picker";
import { subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, format as formatDate } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DateRangePicker } from '@/components/date-range-picker';
import { SalesDataTable } from '@/components/sales-data-table';
import { DollarSign, Package, Users, ShoppingCart } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';

interface Sale {
    id: string;
    studentId: string;
    studentName?: string;
    planName: string;
    amount: number; // in cents
    createdAt: Timestamp;
}

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
            const salesQuery = query(
              collectionGroup(db, 'credit_transactions'),
              where('trainerId', '==', user.uid),
              where('type', '==', 'purchase'),
              where('createdAt', '>=', dateRange.from),
              where('createdAt', '<=', dateRange.to),
              orderBy('createdAt', 'desc')
            );
            
            const salesSnapshot = await getDocs(salesQuery);
            const salesData = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
            
            // Enrich with student names
            const studentIds = [...new Set(salesData.map(s => s.studentId))];
            const studentDocs = await Promise.all(studentIds.map(id => getDoc(doc(db, 'users', id))));
            const studentMap = new Map(studentDocs.map(doc => [doc.id, doc.data()?.name || 'Unknown Student']));

            const enrichedSales = salesData.map(sale => ({
                ...sale,
                studentName: studentMap.get(sale.studentId)
            }));
            
            setSales(enrichedSales);

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
        const totalRevenue = sales.reduce((acc, sale) => acc + sale.amount, 0) / 100;
        const totalPlansSold = sales.length;
        
        const uniqueCustomers = new Set(sales.map(s => s.studentId));
        const newCustomers = uniqueCustomers.size; 

        const monthlyRevenueMap = new Map<string, number>();
        sales.forEach(sale => {
            const month = formatDate(sale.createdAt.toDate(), 'MMM yy');
            const currentRevenue = monthlyRevenueMap.get(month) || 0;
            monthlyRevenueMap.set(month, currentRevenue + sale.amount / 100);
        });
        const monthlyRevenue = Array.from(monthlyRevenueMap, ([month, revenue]) => ({ month, revenue })).reverse();


        const planSalesMap = new Map<string, number>();
        sales.forEach(sale => {
            const currentCount = planSalesMap.get(sale.planName) || 0;
            planSalesMap.set(sale.planName, currentCount + 1);
        });
        const planSales = Array.from(planSalesMap, ([name, count]) => ({ name, count }));


        return {
            totalRevenue,
            totalPlansSold,
            newCustomers,
            avgRevenuePerStudent: newCustomers > 0 ? totalRevenue / newCustomers : 0,
            monthlyRevenue,
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
                                    <YAxis tickFormatter={(value) => `$${value}`} />
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
