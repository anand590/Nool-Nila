import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { AdminDashboardMetricsDto, formatInr, ORDER_STATUS_LABELS } from '@nool-and-nila/shared';
import {
  ShoppingBag,
  AlertTriangle,
  Clock,
  CheckCircle,
  Truck,
  Package,
  ArrowRight,
  PlusCircle,
  Boxes,
} from 'lucide-react';

export const AdminOverviewPage: React.FC = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const res = await fetchApi<AdminDashboardMetricsDto>('/admin/dashboard');
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Pending Confirmations',
      value: metrics?.pendingConfirmations ?? 0,
      icon: Clock,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      link: '/admin/orders?status=PENDING_CONFIRMATION',
    },
    {
      label: 'Confirmed Orders',
      value: metrics?.confirmedOrders ?? 0,
      icon: CheckCircle,
      color: 'text-blue-700 bg-blue-50 border-blue-200',
      link: '/admin/orders?status=CONFIRMED',
    },
    {
      label: 'Shipped & In Transit',
      value: metrics?.shippedOrders ?? 0,
      icon: Truck,
      color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
      link: '/admin/orders?status=SHIPPED',
    },
    {
      label: 'Low Stock Sarees (<3)',
      value: metrics?.lowStockCount ?? 0,
      icon: AlertTriangle,
      color: 'text-red-700 bg-red-50 border-red-200',
      link: '/admin/inventory',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-brand-charcoal">
            Boutique Overview
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time orders, loom inventory levels, and customer requests.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/admin/products?action=new"
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-brand-maroon hover:bg-brand-maroon-dark text-white rounded text-xs font-semibold shadow transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Saree</span>
          </Link>
          <Link
            to="/admin/inventory"
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-brand-charcoal rounded text-xs font-semibold shadow-sm transition-colors"
          >
            <Boxes className="w-4 h-4 text-brand-maroon" />
            <span>Stock Adjustment</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              to={stat.link}
              className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">{stat.label}</p>
                  <p className="font-serif text-3xl font-bold text-brand-charcoal mt-2">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg border ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 group-hover:text-brand-maroon">
                <span>View details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-brand-ivory text-brand-maroon rounded-lg">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Active Products in Catalogue</p>
              <p className="font-serif text-2xl font-bold text-brand-charcoal mt-1">
                {metrics?.totalProducts ?? 0} Handloom Sarees
              </p>
            </div>
          </div>
          <Link to="/admin/products" className="text-xs font-bold text-brand-maroon hover:underline">
            Manage →
          </Link>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-brand-ivory text-brand-maroon rounded-lg">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Lifetime Order Requests</p>
              <p className="font-serif text-2xl font-bold text-brand-charcoal mt-1">
                {metrics?.totalOrders ?? 0} Customer Requests
              </p>
            </div>
          </div>
          <Link to="/admin/orders" className="text-xs font-bold text-brand-maroon hover:underline">
            All Orders →
          </Link>
        </div>
      </div>

      {/* Recent Order Requests Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="font-serif text-lg font-bold text-brand-charcoal">
              Recent Order Requests
            </h2>
            <p className="text-xs text-gray-500">Live feed of orders awaiting confirmation or fulfillment</p>
          </div>
          <Link
            to="/admin/orders"
            className="text-xs font-semibold text-brand-maroon hover:underline flex items-center space-x-1"
          >
            <span>View All Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5">Reference</th>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Items</th>
                <th className="px-6 py-3.5">Total (₹)</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!metrics?.recentOrders || metrics.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    No recent order requests found.
                  </td>
                </tr>
              ) : (
                metrics.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-brand-charcoal">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-brand-charcoal">{order.customerName}</p>
                      <p className="text-[11px] text-gray-400">{order.customerPhone}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {order.items?.length || 1} saree(s)
                    </td>
                    <td className="px-6 py-4 font-bold text-brand-maroon">
                      {formatInr(order.totalPaise)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        {ORDER_STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/admin/orders?orderId=${order.id}`}
                        className="text-xs font-semibold text-brand-maroon hover:underline"
                      >
                        Process →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
