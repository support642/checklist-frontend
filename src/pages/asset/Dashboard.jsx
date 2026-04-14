import React from 'react';
import { useGetProductsQuery } from '../../redux/asset-redux/slices/productApi';
import { Package, TrendingUp, AlertCircle, CheckCircle, Calendar, ArrowRight, QrCode } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../../components/asset-components/Footer';

const StatCard = ({ title, value, icon: Icon, color, colorLight }) => (
    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-20 h-20 ${colorLight} rounded-bl-full opacity-50`}></div>
        <div className="relative flex items-start justify-between">
            <div>
                <p className="text-xs sm:text-sm font-medium text-slate-500 mb-1">{title}</p>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">{value}</h3>
            </div>
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${color} flex items-center justify-center shadow-lg`}>
                <Icon size={20} className="text-white" />
            </div>
        </div>
    </div>
);

const Dashboard = () => {
    const user = {
        name: localStorage.getItem('user-name') || 'User',
        role: localStorage.getItem('role') || 'user'
    };
    const { data: products = [], isLoading } = useGetProductsQuery();

    if (isLoading) return <div className="p-8 text-center text-slate-500">Loading Dashboard...</div>;

    // Calculate real stats from products data
    const totalProducts = products.length;
    const activeAssets = products.filter(p => p.status === 'Active').length;
    const maintenanceDue = products.filter(p => p.maintenanceRequired === 'Yes').length;
    const totalValue = products.reduce((sum, p) => sum + (parseInt(p.cost) || 0), 0);

    const formatValue = (val) => {
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
        if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
        return `₹${val}`;
    };

    const stats = [
        { title: 'Total Products', value: totalProducts, icon: Package, color: 'bg-purple-500', colorLight: 'bg-purple-100/50' },
        { title: 'Active Assets', value: activeAssets, icon: CheckCircle, color: 'bg-emerald-500', colorLight: 'bg-emerald-100/50' },
        { title: 'Maintenance Due', value: maintenanceDue, icon: AlertCircle, color: 'bg-rose-500', colorLight: 'bg-rose-100/50' },
        { title: 'Total Value', value: formatValue(totalValue), icon: TrendingUp, color: 'bg-purple-600', colorLight: 'bg-purple-200/50' },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-[#fcf8ff]">
            <div className="flex-1 space-y-6 p-4 lg:p-6">
                {/* Header */}
                <div 
                    className="rounded-2xl p-4 sm:p-6 shadow-sm border border-purple-100"
                    style={{ background: 'linear-gradient(135deg, #f3e8ff, #d8b4fe)' }}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-full bg-purple-600/10 flex items-center justify-center border border-purple-200">
                            <span className="text-xl font-bold text-purple-700">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                        </div>
                        <div>
                            <p className="text-purple-600 text-sm font-medium">Welcome back,</p>
                            <h1 className="text-xl sm:text-2xl font-bold text-purple-900">{user?.name}</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-purple-700/80 text-sm mt-4 font-medium">
                        <Calendar size={14} />
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>

                {/* Stats Grid - 2x2 on mobile */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {stats.map((stat, index) => (
                        <StatCard key={index} {...stat} />
                    ))}
                </div>

                {/* Quick Actions - Mobile First */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <Link to="/asset/products" className="bg-white p-4 rounded-xl shadow-sm border border-purple-100 hover:border-purple-200 hover:shadow-md transition-all group">
                        <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-3 group-hover:bg-[#d8b4fe] transition-colors">
                            <Package size={24} className="text-purple-600 group-hover:text-purple-900 transition-colors" />
                        </div>
                        <h4 className="font-semibold text-slate-900 mb-1">Add Product</h4>
                        <p className="text-xs text-slate-500">Add new inventory</p>
                    </Link>
                    <Link to="/asset/products" className="bg-white p-4 rounded-xl shadow-sm border border-purple-100 hover:border-purple-200 hover:shadow-md transition-all group">
                        <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-3 group-hover:bg-[#d8b4fe] transition-colors">
                            <QrCode size={24} className="text-purple-600 group-hover:text-purple-900 transition-colors" />
                        </div>
                        <h4 className="font-semibold text-slate-900 mb-1">Scan QR</h4>
                        <p className="text-xs text-slate-500">View product details</p>
                    </Link>
                </div>

                {/* Recent Products - Card Style on Mobile */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900">Recent Products</h3>
                        <Link to="/asset/products" className="text-purple-600 text-sm font-medium flex items-center gap-1 hover:underline">
                            View All <ArrowRight size={14} />
                        </Link>
                    </div>

                    {products.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {products.slice(-5).reverse().map((product) => (
                                <div key={product.id} className="p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 truncate">{product.productName}</p>
                                            <div className="flex flex-wrap items-center gap-2 mt-1.5 mb-1.5">
                                                <span className="text-xs text-purple-600 font-mono bg-purple-50 px-2 py-0.5 rounded">{product.sn}</span>
                                                <span className="text-xs text-slate-500">{product.category}</span>
                                            </div>
                                        </div>
                                        <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${product.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {product.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                        <span>{product.brand}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                        <span>₹{parseInt(product.cost).toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-slate-500">
                            <Package size={40} className="mx-auto mb-3 text-slate-300" />
                            <p>No products found.</p>
                            <Link to="/asset/products" className="text-purple-600 text-sm hover:underline mt-2 inline-block">Add your first product</Link>
                        </div>
                    )}
                </div>

                {/* Quick Stats Summary - Mobile Only */}
                <div className="sm:hidden bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-4">
                    <p className="text-sm text-slate-600 text-center">
                        You have <span className="font-bold text-slate-900">{activeAssets}</span> active assets worth <span className="font-bold text-slate-900">{formatValue(totalValue)}</span>
                    </p>
                </div>
            </div>
            {/* Footer commented out as per request */}
            {/* <Footer className="pb-8 pt-4" /> */}
        </div>
    );
};

export default Dashboard;
