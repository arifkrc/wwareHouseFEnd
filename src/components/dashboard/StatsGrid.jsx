import React from 'react';
import { Package, MapPin, ArrowDownToLine, ArrowUpFromLine, TrendingUp } from 'lucide-react';

export default function StatsGrid({ stats, widgetStats, locationCount, filters }) {
    return (
        <div className="stats-grid">
            <div className="stat-card">
                <div className="stat-icon" style={{ background: '#dbeafe' }}>
                    <Package size={24} color="#2563eb" />
                </div>
                <div className="stat-content">
                    <div className="dashboard-stat-value">{widgetStats.totalStockCount || 0}</div>
                    <div className="dashboard-stat-label">Toplam Stok</div>
                </div>
            </div>

            <div className="stat-card">
                <div className="stat-icon" style={{ background: '#dcfce7' }}>
                    <MapPin size={24} color="#16a34a" />
                </div>
                <div className="stat-content">
                    <div className="dashboard-stat-value">{locationCount}</div>
                    <div className="dashboard-stat-label">Lokasyon</div>
                </div>
            </div>

            <div className="stat-card">
                <div className="stat-icon" style={{ background: '#d1fae5' }}>
                    <ArrowDownToLine size={24} color="#059669" />
                </div>
                <div className="stat-content">
                    <div className="dashboard-stat-value">{stats.totalIn}</div>
                    <div className="dashboard-stat-label">Giriş ({filters.startDate ? 'Seçilen' : '30 Gün'})</div>
                </div>
            </div>

            <div className="stat-card">
                <div className="stat-icon" style={{ background: '#fee2e2' }}>
                    <ArrowUpFromLine size={24} color="#dc2626" />
                </div>
                <div className="stat-content">
                    <div className="dashboard-stat-value">{stats.totalOut}</div>
                    <div className="dashboard-stat-label">Çıkış ({filters.startDate ? 'Seçilen' : '30 Gün'})</div>
                </div>
            </div>

            <div className="stat-card">
                <div className="stat-icon" style={{ background: '#e0e7ff' }}>
                    <TrendingUp size={24} color="#4f46e5" />
                </div>
                <div className="stat-content">
                    <div className="dashboard-stat-value">{stats.totalTransfer}</div>
                    <div className="dashboard-stat-label">Transfer ({filters.startDate ? 'Seçilen' : '30 Gün'})</div>
                </div>
            </div>

            <div className="stat-card">
                <div className="stat-icon" style={{ background: '#fef3c7' }}>
                    <Package size={24} color="#d97706" />
                </div>
                <div className="stat-content">
                    <div className="dashboard-stat-value">
                        {widgetStats.totalItemCount || 0}
                    </div>
                    <div className="dashboard-stat-label">Ürün Çeşidi (Kalem)</div>
                </div>
            </div>
        </div>
    );
}
